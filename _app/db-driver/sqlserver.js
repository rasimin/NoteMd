'use strict';
// Driver SQL Server untuk db.js (paket "mssql" / tedious).
//
// Kontrak driver (untuk menambah jenis lain, mis. mysql.js atau postgres.js, salin berkas ini dan
// implementasikan fungsi yang sama; db.js memuat ./db-driver/<jenis>.js dari field "jenis:" di catatan):
//   connect(cfg) -> conn            tutup(conn)
//   info(conn) -> { versi, db, login, server }
//   daftarTabel(conn) -> [{ skema, tabel, kolom, baris }]
//   detailObjek(conn, nama) -> [{ objek, jenis, baris, kolom:[{no,nama,tipe,nullable,ket,bawaan,pk}],
//                                 fkKeluar:[{fk,dari,kolomDari,ke,kolomKe}], fkMasuk:[...], indeks:[{indeks,tipe,uniq,pk,kolom}] }]
//   cari(conn, kata, { isi }) -> [{ jenis, objek, kolom }]
//   daftarKode(conn, jenis) -> [{ objek, diubah }]        jenis: 'sp' | 'view' | 'fungsi'
//   definisiKode(conn, jenis, nama) -> [{ objek, definisi }]
//   query(conn, sql, { maks }) -> [{ kolom:[nama], baris:[[nilai]], terpotong }]

function muat() {
  try {
    return require('mssql');
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' && /mssql/.test(e.message)) {
      throw new Error('Paket "mssql" belum terpasang. Jalankan: cd _app && npm install');
    }
    throw e;
  }
}

async function connect(cfg) {
  const sql = muat();
  const options = {
    encrypt: !!cfg.enkripsi,
    trustServerCertificate: cfg.percayaSertifikat !== false,
    readOnlyIntent: true,
    appName: 'AI Note db.js',
  };
  if (cfg.tlsMin) options.cryptoCredentialsDetails = { minVersion: cfg.tlsMin }; // server lama: TLSv1 / TLSv1.1
  const conf = {
    server: cfg.server, // boleh "host\\instance"
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    pool: { max: 1, min: 0 },
    options,
  };
  if (cfg.port) conf.port = Number(cfg.port);
  const pool = new sql.ConnectionPool(conf);
  await pool.connect();
  return { pool, sql, cfg };
}

async function tutup(conn) {
  try { await conn.pool.close(); } catch {}
}

async function ambil(conn, text, params = {}) {
  const req = conn.pool.request();
  for (const [k, v] of Object.entries(params)) req.input(k, conn.sql.NVarChar(512), v);
  const r = await req.query(text);
  return r.recordset || [];
}

function pecahNama(nama) {
  const p = String(nama).split('.').map((x) => x.trim().replace(/^\[|\]$/g, '').replace(/^"|"$/g, ''));
  const n = p.pop();
  return { skema: p.length ? p.pop() : null, nama: n };
}

function pola(kata) {
  return '%' + String(kata).replace(/[[%_]/g, (c) => '[' + c + ']') + '%';
}

async function info(conn) {
  const r = await ambil(conn, 'SELECT @@VERSION AS versi, DB_NAME() AS db, SUSER_SNAME() AS login, @@SERVERNAME AS server');
  return r[0];
}

async function daftarTabel(conn) {
  return ambil(conn, `
    SELECT s.name AS skema, t.name AS tabel,
      (SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = t.object_id) AS kolom,
      (SELECT SUM(p.rows) FROM sys.partitions p WHERE p.object_id = t.object_id AND p.index_id IN (0, 1)) AS baris
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
    ORDER BY s.name, t.name`);
}

const TIPE = `
  CASE
    WHEN ty.name IN ('varchar','char','varbinary','binary') THEN ty.name + '(' + CASE WHEN c.max_length = -1 THEN 'max' ELSE CAST(c.max_length AS varchar(10)) END + ')'
    WHEN ty.name IN ('nvarchar','nchar') THEN ty.name + '(' + CASE WHEN c.max_length = -1 THEN 'max' ELSE CAST(c.max_length / 2 AS varchar(10)) END + ')'
    WHEN ty.name IN ('decimal','numeric') THEN ty.name + '(' + CAST(c.precision AS varchar(10)) + ',' + CAST(c.scale AS varchar(10)) + ')'
    WHEN ty.name IN ('datetime2','time','datetimeoffset') THEN ty.name + '(' + CAST(c.scale AS varchar(10)) + ')'
    ELSE ty.name END`;

async function detailObjek(conn, nama) {
  const { skema, nama: n } = pecahNama(nama);
  const objs = await ambil(conn, `
    SELECT o.object_id AS id, s.name + '.' + o.name AS objek, o.type AS tipe,
      (SELECT SUM(p.rows) FROM sys.partitions p WHERE p.object_id = o.object_id AND p.index_id IN (0, 1)) AS baris
    FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.type IN ('U', 'V') AND o.name = @nama AND (@skema IS NULL OR s.name = @skema)
    ORDER BY s.name`, { nama: n, skema });
  const out = [];
  for (const o of objs) {
    const id = String(o.id);
    const kolom = await ambil(conn, `
      SELECT c.column_id AS no, c.name AS nama, ${TIPE} AS tipe,
        CASE WHEN c.is_nullable = 1 THEN 'NULL' ELSE 'NOT NULL' END AS nullable,
        CASE WHEN c.is_identity = 1 THEN 'identity' WHEN c.is_computed = 1 THEN 'computed' ELSE '' END AS ket,
        ISNULL(dc.definition, '') AS bawaan,
        CASE WHEN EXISTS (SELECT 1 FROM sys.index_columns ic JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                          WHERE i.is_primary_key = 1 AND ic.object_id = c.object_id AND ic.column_id = c.column_id) THEN 'PK' ELSE '' END AS pk
      FROM sys.columns c
      JOIN sys.types ty ON ty.user_type_id = c.user_type_id
      LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
      WHERE c.object_id = CAST(@id AS int)
      ORDER BY c.column_id`, { id });
    const fkSql = (kondisi) => `
      SELECT fk.name AS fk,
        OBJECT_SCHEMA_NAME(fk.parent_object_id) + '.' + OBJECT_NAME(fk.parent_object_id) AS dari,
        STUFF((SELECT ', ' + pc.name FROM sys.foreign_key_columns fkc JOIN sys.columns pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
               WHERE fkc.constraint_object_id = fk.object_id ORDER BY fkc.constraint_column_id FOR XML PATH('')), 1, 2, '') AS kolomDari,
        OBJECT_SCHEMA_NAME(fk.referenced_object_id) + '.' + OBJECT_NAME(fk.referenced_object_id) AS ke,
        STUFF((SELECT ', ' + rc.name FROM sys.foreign_key_columns fkc JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
               WHERE fkc.constraint_object_id = fk.object_id ORDER BY fkc.constraint_column_id FOR XML PATH('')), 1, 2, '') AS kolomKe
      FROM sys.foreign_keys fk WHERE ${kondisi} ORDER BY fk.name`;
    const fkKeluar = await ambil(conn, fkSql('fk.parent_object_id = CAST(@id AS int)'), { id });
    const fkMasuk = await ambil(conn, fkSql('fk.referenced_object_id = CAST(@id AS int) AND fk.parent_object_id <> fk.referenced_object_id'), { id });
    const indeks = await ambil(conn, `
      SELECT i.name AS indeks, i.type_desc AS tipe, CASE WHEN i.is_unique = 1 THEN 'unique' ELSE '' END AS uniq,
        CASE WHEN i.is_primary_key = 1 THEN 'PK' ELSE '' END AS pk,
        STUFF((SELECT ', ' + c.name + CASE WHEN ic.is_descending_key = 1 THEN ' DESC' ELSE '' END
               FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
               WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0 ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 2, '') AS kolom
      FROM sys.indexes i WHERE i.object_id = CAST(@id AS int) AND i.index_id > 0 ORDER BY i.index_id`, { id });
    out.push({ objek: o.objek, jenis: o.tipe === 'V' ? 'view' : 'tabel', baris: o.baris, kolom, fkKeluar, fkMasuk, indeks });
  }
  return out;
}

const JENIS_KODE = { sp: ['P'], view: ['V'], fungsi: ['FN', 'IF', 'TF'] };

async function cari(conn, kata, { isi } = {}) {
  const p = pola(kata);
  const nama = await ambil(conn, `
    SELECT CASE o.type WHEN 'U' THEN 'tabel' WHEN 'V' THEN 'view' WHEN 'P' THEN 'sp' ELSE 'fungsi' END AS jenis,
      s.name + '.' + o.name AS objek, '' AS kolom
    FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.is_ms_shipped = 0 AND o.type IN ('U','V','P','FN','IF','TF') AND o.name LIKE @p
    UNION ALL
    SELECT 'kolom', s.name + '.' + o.name, c.name
    FROM sys.columns c JOIN sys.objects o ON o.object_id = c.object_id JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.is_ms_shipped = 0 AND o.type IN ('U','V') AND c.name LIKE @p
    ORDER BY 2, 3`, { p });
  if (!isi) return nama;
  const kode = await ambil(conn, `
    SELECT 'isi-kode' AS jenis, s.name + '.' + o.name AS objek, '' AS kolom
    FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.is_ms_shipped = 0 AND m.definition LIKE @p ORDER BY 2`, { p });
  return nama.concat(kode);
}

async function daftarKode(conn, jenis) {
  const tipe = JENIS_KODE[jenis];
  return ambil(conn, `
    SELECT s.name + '.' + o.name AS objek, CONVERT(varchar(19), o.modify_date, 120) AS diubah
    FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.is_ms_shipped = 0 AND o.type IN (${tipe.map((t) => `'${t}'`).join(',')}) ORDER BY s.name, o.name`);
}

async function definisiKode(conn, jenis, nama) {
  const { skema, nama: n } = pecahNama(nama);
  const tipe = JENIS_KODE[jenis];
  return ambil(conn, `
    SELECT s.name + '.' + o.name AS objek, m.definition AS definisi
    FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.type IN (${tipe.map((t) => `'${t}'`).join(',')}) AND o.name = @nama AND (@skema IS NULL OR s.name = @skema)
    ORDER BY s.name`, { nama: n, skema });
}

// Jalankan query dengan streaming; berhenti setelah `maks` baris per hasil supaya tabel besar tidak memenuhi memori.
function query(conn, text, { maks = 100 } = {}) {
  return new Promise((resolve, reject) => {
    const req = conn.pool.request();
    req.stream = true;
    req.arrayRowMode = true;
    const sets = [];
    let cur = null;
    let batal = false;
    req.on('recordset', (cols) => {
      cur = { kolom: cols.map((c) => c.name), baris: [], terpotong: false };
      sets.push(cur);
    });
    req.on('row', (row) => {
      if (!cur || batal) return;
      if (cur.baris.length >= maks) {
        cur.terpotong = true;
        batal = true;
        try { req.cancel(); } catch {}
        return;
      }
      cur.baris.push(row);
    });
    req.on('error', (err) => (batal ? resolve(sets) : reject(err)));
    req.on('done', () => resolve(sets));
    req.query(text);
  });
}

module.exports = { jenis: 'sqlserver', connect, tutup, info, daftarTabel, detailObjek, cari, daftarKode, definisiKode, query };
