// Dashboard dokumen: statistik folder catatan.
// Data baru dihitung saat pengguna menekan "Scan" (GET /api/dashboard/scan), tidak saat aplikasi dibuka.
// Hasil scan terakhir disimpan di localStorage supaya bisa dilihat lagi tanpa scan ulang.
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const STORE_KEY = 'ainote.dashboard.last';
  const nf = new Intl.NumberFormat('id-ID');
  const num = (n) => nf.format(n || 0);
  const dtFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const dayFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
  const dayFmtLong = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const hashFor = (p) => (window.aiNoteHashFor ? window.aiNoteHashFor(p) : '#/' + p.split('/').map(encodeURIComponent).join('/'));
  const bytes = (b) => {
    if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
    if (b >= 1024) return Math.round(b / 1024) + ' KB';
    return b + ' B';
  };

  let state = null; // hasil scan yang sedang ditampilkan
  let resizeTimer = null;
  let lastSeries = null; // deret chart terakhir, untuk digambar ulang saat lebar berubah
  let popups = {}; // isi popup "Lihat semua" per kartu
  const LIMIT = 6; // jumlah baris di kartu; sisanya lewat popup, supaya tinggi kartu seragam
  let tip = null;

  // Hasil scan dari versi lama (bentuk datanya beda) tidak dipakai; pengguna diminta scan ulang.
  const SCAN_VERSION = 2;
  let staleCache = false;
  function loadCached() {
    staleCache = false;
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (data && data.version !== SCAN_VERSION) {
        staleCache = true;
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  // ---------- Tooltip ----------
  function ensureTip() {
    if (tip && document.body.contains(tip)) return tip;
    tip = document.createElement('div');
    tip.className = 'dash-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(html, x, y) {
    const t = ensureTip();
    t.innerHTML = html;
    t.hidden = false;
    const r = t.getBoundingClientRect();
    let left = x + 14;
    let top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    t.style.left = Math.max(8, left) + 'px';
    t.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() {
    if (tip) tip.hidden = true;
  }

  // ---------- Komponen ----------
  // Kartu dengan isi ringkas; `more` = { key, label } menampilkan tombol yang membuka popup tabel lengkap.
  const card = (title, sub, inner, more) =>
    `<section class="dash-card"><header class="dash-card-head"><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</header><div class="dash-card-body">${inner}</div>${
      more ? `<footer class="dash-card-foot"><button type="button" class="dash-more" data-pop="${esc(more.key)}">${esc(more.label)}</button></footer>` : ''
    }</section>`;

  // Sel tabel: angka (rata kanan), teks, atau { html } untuk tautan.
  const cell = (v) => (v && typeof v === 'object' ? v.html : typeof v === 'number' ? num(v) : esc(v));
  const tableOf = (cols, rows) =>
    rows.length
      ? `<div class="dash-table-scroll"><table><thead><tr>${cols.map((c, i) => `<th${typeof rows[0][i] === "number" ? ' class="num"' : ""}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((v) => `<td${typeof v === 'number' ? ' class="num"' : ''}>${cell(v)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      : '<p class="dash-empty">Belum ada data.</p>';

  // ---------- Popup tabel lengkap ----------
  function closePopup() {
    const m = $('.dash-modal-backdrop');
    if (m) m.remove();
    document.removeEventListener('keydown', onPopupKey);
  }
  function onPopupKey(e) {
    if (e.key === 'Escape') closePopup();
  }
  function openPopup(key) {
    const p = popups[key];
    if (!p) return;
    closePopup();
    hideTip();
    const wrap = document.createElement('div');
    wrap.className = 'dash-modal-backdrop';
    wrap.innerHTML = `<div class="dash-modal" role="dialog" aria-modal="true" aria-labelledby="dash-modal-title">
      <header class="dash-modal-head">
        <h3 id="dash-modal-title">${esc(p.title)}</h3>
        <input type="search" class="dash-modal-filter" placeholder="Saring…" aria-label="Saring baris">
        <button type="button" class="dash-modal-close" aria-label="Tutup">&times;</button>
      </header>
      <div class="dash-modal-body">${p.body || ''}</div>
    </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('.dash-modal-close') || e.target.closest('.dash-modal-body a')) closePopup();
    });
    const filter = wrap.querySelector('.dash-modal-filter');
    const body = wrap.querySelector('.dash-modal-body');
    // Saring: baris utama yang tidak cocok disembunyikan; baris rincian ikut baris induknya.
    const refilter = () => {
      const q = filter.value.trim().toLowerCase();
      body.querySelectorAll('tbody tr').forEach((tr) => {
        if (tr.classList.contains('dash-row-detail')) return;
        const own = tr.textContent.toLowerCase();
        const det = tr.nextElementSibling && tr.nextElementSibling.classList.contains('dash-row-detail') ? tr.nextElementSibling : null;
        const detHit = !!(q && det && det.textContent.toLowerCase().includes(q));
        const hit = !q || own.includes(q) || detHit;
        tr.hidden = !hit;
        // rincian ikut terbuka bila yang cocok ada di dalamnya
        if (det) det.hidden = !hit || !(tr.classList.contains('is-open') || detHit);
      });
    };
    filter.addEventListener('input', refilter);
    if (p.render) p.render(body, refilter);
    document.addEventListener('keydown', onPopupKey);
    filter.focus();
  }

  // ---------- Tabel dengan bar (popup) ----------
  // columns: [{ key, label, num?, link?(row) }]; bar digambar di kolom angka yang sedang dipakai mengurutkan
  // (atau `barKey` bila urutan berdasarkan kolom teks). detail(row) -> html baris rincian yang bisa dibuka.
  function barTable(box, { columns, rows, sortKey, sortDir = 'desc', barKey, detail }, refilter) {
    let key = sortKey;
    let dir = sortDir;
    const open = new Set();
    const draw = () => {
      const col = columns.find((c) => c.key === key);
      const sorted = rows.slice().sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        const r = col && col.num ? va - vb : String(va).localeCompare(String(vb), 'id');
        return dir === 'asc' ? r : -r;
      });
      const bk = col && col.num ? key : barKey;
      const max = Math.max(...rows.map((r) => r[bk] || 0), 1);
      const head = columns
        .map((c) => {
          const on = c.key === key;
          const arrow = on ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
          return `<th class="${c.num ? 'num' : ''}${c.key === bk ? ' bar-col' : ''}" aria-sort="${on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="dash-sort" data-key="${esc(c.key)}">${esc(c.label)}${arrow}</button></th>`;
        })
        .join('');
      const lines = sorted
        .map((r, i) => {
          const id = String(r[columns[0].key]);
          const isOpen = open.has(id);
          const cells = columns
            .map((c, ci) => {
              let v = c.fmt ? esc(c.fmt(r[c.key])) : c.num ? num(r[c.key]) : esc(r[c.key]);
              if (c.link) v = `<a href="${esc(c.link(r))}">${v}</a>`;
              if (ci === 0 && detail) v = `<button type="button" class="dash-expand" data-id="${esc(id)}" aria-expanded="${isOpen}">${isOpen ? '▾' : '▸'}</button>${v}`;
              if (c.key === bk) {
                const w = Math.max(((r[c.key] || 0) / max) * 100, r[c.key] ? 1.5 : 0);
                return `<td class="num bar-col"><span class="dash-cellbar"><span class="dash-cellbar-track"><span class="dash-hbar-fill" style="width:${w}%"></span></span><span>${v}</span></span></td>`;
              }
              return `<td class="${c.num ? 'num' : ''}">${v}</td>`;
            })
            .join('');
          const det = detail ? `<tr class="dash-row-detail"${isOpen ? '' : ' hidden'}><td colspan="${columns.length}">${detail(r)}</td></tr>` : '';
          return `<tr class="dash-row${isOpen ? ' is-open' : ''}">${cells}</tr>${det}`;
        })
        .join('');
      box.innerHTML = rows.length
        ? `<div class="dash-table-scroll"><table class="dash-bartable"><thead><tr>${head}</tr></thead><tbody>${lines}</tbody></table></div>`
        : '<p class="dash-empty">Belum ada data.</p>';
      refilter();
    };
    box.addEventListener('click', (e) => {
      const s = e.target.closest('.dash-sort');
      if (s) {
        const c = columns.find((x) => x.key === s.dataset.key);
        if (key === s.dataset.key) dir = dir === 'asc' ? 'desc' : 'asc';
        else {
          key = s.dataset.key;
          dir = c && c.num ? 'desc' : 'asc';
        }
        draw();
        return;
      }
      const x = e.target.closest('.dash-expand');
      if (x) {
        if (open.has(x.dataset.id)) open.delete(x.dataset.id);
        else open.add(x.dataset.id);
        draw();
      }
    });
    draw();
  }

  // ---------- Popup grafik waktu: grafik besar + tabel ----------
  function timePopup(box, { kind, series, table, ranges }, refilter) {
    let range = ranges ? ranges[0].days : 0;
    const draw = () => {
      const data = range ? series.slice(-range) : series;
      box.innerHTML = `${
        ranges
          ? `<div class="dash-range" role="group" aria-label="Rentang">${ranges
              .map((r) => `<button type="button" data-days="${r.days}" class="${r.days === range ? 'is-on' : ''}">${esc(r.label)}</button>`)
              .join('')}</div>`
          : ''
      }<div class="dash-chart dash-chart-big"></div><div class="dash-modal-table">${table(data)}</div>`;
      const chartBox = box.querySelector('.dash-chart-big');
      if (kind === 'line') drawLine(chartBox, data, { valueLabel: 'Total catatan', height: 300 });
      else if (data.length) drawColumns(chartBox, data, { valueLabel: 'Catatan baru', height: 280 });
      else chartBox.innerHTML = '<p class="dash-empty">Belum ada data.</p>';
      refilter();
    };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-days]');
      if (!b) return;
      range = +b.dataset.days;
      draw();
    });
    draw();
  }

  // Bar horizontal (peringkat). Skala dihitung dari seluruh data (`all`), yang ditampilkan hanya `items`.
  function hbars(items, all = items, { link } = {}) {
    if (!items.length) return '<p class="dash-empty">Belum ada data.</p>';
    const max = Math.max(...all.map((d) => d.value), 1);
    return `<div class="dash-hbars">${items
      .map((d, i) => {
        const w = Math.max((d.value / max) * 100, d.value ? 1.5 : 0);
        const label = link ? `<a href="${esc(link(d))}">${esc(d.label)}</a>` : esc(d.label);
        return `<div class="dash-hbar" data-i="${i}"><span class="dash-hbar-label" title="${esc(d.label)}">${label}</span><span class="dash-hbar-track"><span class="dash-hbar-fill" style="width:${w}%"></span></span><span class="dash-hbar-val">${d.text ?? num(d.value)}</span></div>`;
      })
      .join('')}</div>`;
  }
  function bindHbars(root, items, tipFor) {
    if (!tipFor) return;
    root.querySelectorAll('.dash-hbar').forEach((row) => {
      const d = items[+row.dataset.i];
      row.addEventListener('mousemove', (e) => showTip(tipFor(d), e.clientX, e.clientY));
      row.addEventListener('mouseleave', hideTip);
    });
  }

  // Deret harian dari tanggal pertama sampai hari ini (tanggal kosong = 0).
  function dailySeries(byDay) {
    const keys = Object.keys(byDay || {}).sort();
    if (!keys.length) return [];
    const toDate = (k) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const out = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    for (let d = toDate(keys[0]); d <= end; d.setDate(d.getDate() + 1)) {
      out.push({ date: new Date(d), value: byDay[key(d)] || 0 });
    }
    return out;
  }

  const niceMax = (v) => {
    if (v <= 5) return Math.max(v, 1);
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
    return v;
  };

  // Garis kumulatif (SVG), crosshair + tooltip.
  function drawLine(box, series, { valueLabel, height = 220 }) {
    const W = Math.max(box.clientWidth, 200);
    const H = height;
    const m = { t: 12, r: 16, b: 28, l: 44 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    if (!series.length) {
      box.innerHTML = '<p class="dash-empty">Belum ada data.</p>';
      return;
    }
    const max = niceMax(Math.max(...series.map((d) => d.value)));
    const x = (i) => m.l + (series.length === 1 ? iw / 2 : (i / (series.length - 1)) * iw);
    const y = (v) => m.t + ih - (v / max) * ih;
    const ticks = [0, max / 2, max];
    const pts = series.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
    const area = `${m.l},${m.t + ih} ${pts} ${x(series.length - 1).toFixed(1)},${m.t + ih}`;
    const xl = [0, Math.floor((series.length - 1) / 2), series.length - 1].filter((v, i, a) => a.indexOf(v) === i);
    box.innerHTML = `<svg class="dash-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik ${esc(valueLabel)}">
      ${ticks.map((t) => `<line class="dash-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="dash-axis" x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${num(Math.round(t))}</text>`).join('')}
      ${xl.map((i) => `<text class="dash-axis" x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}">${esc(dayFmt.format(series[i].date))}</text>`).join('')}
      <polygon class="dash-area" points="${area}"/>
      <polyline class="dash-line" points="${pts}"/>
      <line class="dash-cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>
      <circle class="dash-dot" r="4.5" cx="0" cy="0" visibility="hidden"/>
      <circle class="dash-dot-end" r="4.5" cx="${x(series.length - 1)}" cy="${y(series[series.length - 1].value)}"/>
      <rect class="dash-hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/>
    </svg>`;
    const svg = box.querySelector('svg');
    const cross = svg.querySelector('.dash-cross');
    const dot = svg.querySelector('.dash-dot');
    svg.querySelector('.dash-hit').addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = e.clientX - r.left;
      const i = Math.max(0, Math.min(series.length - 1, Math.round(((px - m.l) / iw) * (series.length - 1))));
      const d = series[i];
      cross.setAttribute('x1', x(i));
      cross.setAttribute('x2', x(i));
      cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x(i));
      dot.setAttribute('cy', y(d.value));
      dot.setAttribute('visibility', 'visible');
      showTip(`<strong>${esc(dayFmtLong.format(d.date))}</strong><span>${esc(valueLabel)}: <b>${num(d.value)}</b></span>${d.added ? `<span>Baru hari itu: ${num(d.added)}</span>` : ''}`, e.clientX, e.clientY);
    });
    svg.querySelector('.dash-hit').addEventListener('mouseleave', () => {
      cross.setAttribute('visibility', 'hidden');
      dot.setAttribute('visibility', 'hidden');
      hideTip();
    });
  }

  // Kolom per hari (SVG), tooltip per kolom.
  function drawColumns(box, series, { valueLabel, height = 200 }) {
    const W = Math.max(box.clientWidth, 200);
    const H = height;
    const m = { t: 12, r: 8, b: 28, l: 36 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    const max = niceMax(Math.max(...series.map((d) => d.value), 1));
    const step = iw / series.length;
    const bw = Math.max(step - 2, 1); // celah 2px antar kolom
    const y = (v) => m.t + ih - (v / max) * ih;
    const ticks = [0, max / 2, max];
    const xl = [0, Math.floor((series.length - 1) / 2), series.length - 1];
    const bars = series
      .map((d, i) => {
        if (!d.value) return '';
        const x0 = m.l + i * step + 1;
        const h = Math.max(ih - (y(d.value) - m.t), 2);
        const top = m.t + ih - h;
        const r = Math.min(4, bw / 2, h);
        // ujung atas membulat 4px, dasar rata di garis nol
        return `<path class="dash-col" d="M${x0},${m.t + ih} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${m.t + ih} Z"/>`;
      })
      .join('');
    box.innerHTML = `<svg class="dash-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik ${esc(valueLabel)}">
      ${ticks.map((t) => `<line class="dash-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="dash-axis" x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${num(Math.round(t * 10) / 10)}</text>`).join('')}
      ${xl.map((i) => `<text class="dash-axis" x="${m.l + i * step + step / 2}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}">${esc(dayFmt.format(series[i].date))}</text>`).join('')}
      ${bars}
      <rect class="dash-hover" x="0" y="${m.t}" width="${step}" height="${ih}" visibility="hidden"/>
      <rect class="dash-hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/>
    </svg>`;
    const svg = box.querySelector('svg');
    const hov = svg.querySelector('.dash-hover');
    svg.querySelector('.dash-hit').addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(series.length - 1, Math.floor((e.clientX - r.left - m.l) / step)));
      const d = series[i];
      hov.setAttribute('x', m.l + i * step);
      hov.setAttribute('visibility', 'visible');
      showTip(`<strong>${esc(dayFmtLong.format(d.date))}</strong><span>${esc(valueLabel)}: <b>${num(d.value)}</b></span>`, e.clientX, e.clientY);
    });
    svg.querySelector('.dash-hit').addEventListener('mouseleave', () => {
      hov.setAttribute('visibility', 'hidden');
      hideTip();
    });
  }

  // ---------- Render isi ----------
  function renderBody() {
    const body = $('#dash-body');
    if (!body) return;
    hideTip();
    if (!state) {
      body.innerHTML = staleCache
        ? `<div class="dash-placeholder"><p><strong>Perlu scan ulang</strong></p><p>Dashboard sudah diperbarui dan hasil scan sebelumnya memakai format lama. Tekan <b>Scan sekarang</b> untuk menghitung ulang.</p></div>`
        : `<div class="dash-placeholder"><p><strong>Belum ada data</strong></p><p>Tekan <b>Scan sekarang</b> untuk menghitung statistik folder catatan. Scan hanya berjalan saat diminta, jadi tidak membebani aplikasi saat dibuka.</p></div>`;
      return;
    }
    const d = state;
    const T = d.totals;
    const daily = dailySeries(d.createdByDay);
    let run = 0;
    const cumulative = daily.map((p) => ({ date: p.date, value: (run += p.value), added: p.value }));
    const last30 = daily.slice(-30);
    const added30 = last30.reduce((s, p) => s + p.value, 0);
    const clients = d.clients.map((c) => ({ label: c.name, value: c.notes, c }));
    const issues = d.clients.filter((c) => c.issues > 0).map((c) => ({ label: c.name, value: c.issues, c })).sort((a, b) => b.value - a.value);
    const tags = d.tags.map((t) => ({ label: t.name, value: t.count }));
    const sizes = d.clients
      .map((c) => ({ label: c.name, value: c.bytes || 0, text: bytes(c.bytes || 0), c }))
      .sort((a, b) => b.value - a.value);
    const totalBytes = sizes.reduce((s, x) => s + x.value, 0);
    const top = (arr) => arr.slice(0, LIMIT);
    const link = (href, text) => ({ html: `<a href="${esc(href)}">${esc(text)}</a>` });

    // Isi popup "Lihat semua" per kartu: tabel dengan bar (bisa diurutkan) atau grafik besar + tabel.
    run = 0;
    const monthRows = Object.entries(d.createdByMonth).sort().map(([k, v]) => [k, v, (run += v)]);
    const issuesBy = {};
    for (const x of d.issueList || []) (issuesBy[x.client] = issuesBy[x.client] || []).push(x);
    popups = {
      growth: {
        title: 'Pertumbuhan catatan',
        render: (box, refilter) =>
          timePopup(box, {
            kind: 'line',
            series: cumulative,
            table: () => tableOf(['Bulan', 'Catatan baru', 'Total kumulatif'], monthRows.slice().reverse()),
          }, refilter),
      },
      daily: {
        title: 'Catatan baru per hari',
        render: (box, refilter) =>
          timePopup(box, {
            kind: 'columns',
            series: daily,
            ranges: [
              { days: 30, label: '30 hari' },
              { days: 90, label: '90 hari' },
              { days: 0, label: 'Semua' },
            ],
            table: (data) => tableOf(['Tanggal', 'Catatan baru'], data.slice().reverse().map((p) => [dayFmtLong.format(p.date), p.value])),
          }, refilter),
      },
      clients: {
        title: 'Catatan per folder utama',
        render: (box, refilter) =>
          barTable(box, {
            columns: [
              { key: 'name', label: 'Folder', link: (r) => hashFor(r.name) },
              { key: 'notes', label: 'Catatan', num: true },
              { key: 'folders', label: 'Subfolder', num: true },
              { key: 'issues', label: 'Issue', num: true },
              { key: 'autoCreate', label: 'AutoCreateAI', num: true },
              { key: 'attachments', label: 'Lampiran', num: true },
            ],
            rows: d.clients,
            sortKey: 'notes',
            barKey: 'notes',
          }, refilter),
      },
      issues: {
        title: 'Issue per client',
        render: (box, refilter) =>
          barTable(box, {
            columns: [
              { key: 'name', label: 'Client', link: (r) => hashFor(r.name + '/issue') },
              { key: 'issues', label: 'Issue', num: true },
            ],
            rows: d.clients.filter((c) => c.issues > 0),
            sortKey: 'issues',
            barKey: 'issues',
            detail: (r) =>
              `<ul class="dash-issue-list">${(issuesBy[r.name] || [])
                .map((x) => `<li><a href="${esc(hashFor(x.path))}">${esc(x.name)}</a></li>`)
                .join('')}</ul>`,
          }, refilter),
      },
      tags: {
        title: 'Semua tag',
        render: (box, refilter) =>
          barTable(box, {
            columns: [
              { key: 'name', label: 'Tag' },
              { key: 'count', label: 'Catatan', num: true },
            ],
            rows: d.tags,
            sortKey: 'count',
            barKey: 'count',
          }, refilter),
      },
      size: {
        title: 'Ukuran per client',
        render: (box, refilter) =>
          barTable(box, {
            columns: [
              { key: 'name', label: 'Folder', link: (r) => hashFor(r.name) },
              { key: 'bytes', label: 'Total', num: true, fmt: bytes },
              { key: 'noteBytes', label: 'Catatan (.md)', num: true, fmt: bytes },
              { key: 'attachmentBytes', label: 'Lampiran', num: true, fmt: bytes },
              { key: 'attachments', label: 'Jumlah lampiran', num: true },
            ],
            rows: d.clients.map((c) => ({ ...c, bytes: c.bytes || 0, noteBytes: c.noteBytes || 0, attachmentBytes: c.attachmentBytes || 0 })),
            sortKey: 'bytes',
            barKey: 'bytes',
          }, refilter),
      },
      recent: {
        title: 'Catatan terakhir diubah',
        body: tableOf(['Judul', 'Lokasi', 'Diubah'], d.recent.map((r) => [link(hashFor(r.path), r.title), r.path.split('/').slice(0, -1).join('/'), { html: `<span class="nowrap">${esc(dtFmt.format(new Date(r.modified)))}</span>` }])),
      },
    };
    const more = (key, n) => ({ key, label: n ? `Lihat semua (${num(n)})` : 'Lihat detail' });

    const kpi = (label, value, note) =>
      `<div class="dash-kpi"><span class="dash-kpi-label">${esc(label)}</span><span class="dash-kpi-value">${value}</span>${note ? `<span class="dash-kpi-note">${note}</span>` : ''}</div>`;

    body.innerHTML = `
      <div class="dash-kpis">
        ${kpi('Total catatan', num(T.notes), `+${num(added30)} dalam 30 hari`)}
        ${kpi('Folder utama', num(T.clients), 'client & folder induk')}
        ${kpi('Subfolder', num(T.folders))}
        ${kpi('Issue', num(T.issues), 'folder issue/NNN-…')}
        ${kpi('AutoCreateAI', num(T.autoCreate), 'catatan mandiri AI')}
        ${kpi('Lampiran', num(T.attachments), esc(bytes(T.attachmentBytes)))}
        ${kpi('Diubah 7 hari', num(T.changed7), `${num(T.changed30)} dalam 30 hari`)}
        ${kpi('Jumlah kata', num(T.words))}
        ${kpi('Sampah', num(T.trash), 'item')}
      </div>
      <div class="dash-grid-2">
        ${card('Pertumbuhan catatan', 'Total catatan kumulatif berdasarkan tanggal dibuat', '<div class="dash-chart" id="dash-growth"></div>', more('growth'))}
        ${card('Catatan baru per hari', '30 hari terakhir', '<div class="dash-chart" id="dash-daily"></div>', more('daily'))}
      </div>
      <div class="dash-grid-2">
        ${card('Catatan per folder utama', `${num(clients.length)} folder · arahkan kursor untuk rincian`, `<div id="dash-clients">${hbars(top(clients), clients)}</div>`, more('clients', clients.length))}
        ${card('Issue per client', `${num(T.issues)} issue tercatat`, `<div id="dash-issues">${hbars(top(issues), issues, { link: (x) => hashFor(x.label + '/issue') })}</div>`, more('issues', T.issues))}
      </div>
      <div class="dash-grid-2">
        ${card('Tag terbanyak', `${num(tags.length)} tag`, `<div id="dash-tags">${hbars(top(tags), tags)}</div>`, more('tags', tags.length))}
        ${card('Ukuran per client', `Total ${bytes(totalBytes)} · catatan + lampiran`, `<div id="dash-size">${hbars(top(sizes), sizes, { link: (x) => hashFor(x.label) })}</div>`, more('size', sizes.length))}
      </div>
      <div class="dash-grid-1">
        ${card('Terakhir diubah', 'Catatan terbaru', `<ol class="dash-recent">${d.recent
          .slice(0, LIMIT)
          .map((r) => `<li><a href="${esc(hashFor(r.path))}">${esc(r.title)}</a><span>${esc(r.path)}</span><time>${esc(dtFmt.format(new Date(r.modified)))}</time></li>`)
          .join('')}</ol>`, more('recent', d.recent.length))}
      </div>`;

    bindHbars($('#dash-clients'), top(clients), (x) =>
      `<strong>${esc(x.label)}</strong><span>Catatan: <b>${num(x.c.notes)}</b></span><span>Subfolder: ${num(x.c.folders)}</span><span>Issue: ${num(x.c.issues)}</span><span>AutoCreateAI: ${num(x.c.autoCreate)}</span><span>Lampiran: ${num(x.c.attachments)}</span>`,
    );
    bindHbars($('#dash-issues'), top(issues), (x) => `<strong>${esc(x.label)}</strong><span>Issue: <b>${num(x.value)}</b></span>`);
    bindHbars($('#dash-size'), top(sizes), (x) =>
      `<strong>${esc(x.label)}</strong><span>Total: <b>${esc(bytes(x.c.bytes || 0))}</b></span><span>Catatan (.md): ${esc(bytes(x.c.noteBytes || 0))}</span><span>Lampiran: ${esc(bytes(x.c.attachmentBytes || 0))} (${num(x.c.attachments)} file)</span>`,
    );
    bindHbars($('#dash-tags'), top(tags), (x) => `<strong>#${esc(x.label)}</strong><span>Catatan: <b>${num(x.value)}</b></span>`);
    body.querySelectorAll('[data-pop]').forEach((b) => b.addEventListener('click', () => openPopup(b.dataset.pop)));
    drawCharts(cumulative, last30);
  }

  function drawCharts(cumulative, last30) {
    lastSeries = { cumulative, last30 };
    const g = $('#dash-growth');
    const c = $('#dash-daily');
    if (g) drawLine(g, cumulative, { valueLabel: 'Total catatan' });
    if (c) {
      if (last30.length) drawColumns(c, last30, { valueLabel: 'Catatan baru' });
      else c.innerHTML = '<p class="dash-empty">Belum ada data.</p>';
    }
  }

  function renderStatus(msg) {
    const s = $('#dash-status');
    if (!s) return;
    if (msg) s.textContent = msg;
    else if (state) s.textContent = `Hasil scan ${dtFmt.format(new Date(state.scannedAt))} · ${num(state.durationMs)} ms`;
    else s.textContent = 'Belum pernah di-scan';
  }

  async function scan() {
    const btn = $('#dash-scan');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.classList.add('is-busy');
    renderStatus('Sedang scan folder catatan…');
    try {
      const res = await fetch('/api/dashboard/scan', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      state = data;
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
      } catch {}
      renderBody();
      renderStatus();
    } catch (err) {
      renderStatus('Gagal scan: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-busy');
    }
  }

  window.renderDashboardPage = function renderDashboardPage() {
    const contentEl = $('#content');
    if (!contentEl) return;
    document.title = 'Dashboard · AI Note';
    state = loadCached();
    contentEl.innerHTML = `<div class="dash">
      <header class="dash-head">
        <div>
          <h1 class="page-title">Dashboard Dokumen</h1>
          <p class="page-desc">Statistik folder catatan: jumlah, pertumbuhan, issue, dan aktivitas.</p>
        </div>
        <div class="dash-actions">
          <span class="dash-status muted" id="dash-status"></span>
          <button type="button" class="btn btn-primary" id="dash-scan"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg><span>Scan sekarang</span></button>
        </div>
      </header>
      <div id="dash-body"></div>
    </div>`;
    $('#dash-scan').addEventListener('click', scan);
    renderStatus();
    renderBody();

    // Gambar ulang chart SVG saat lebar area konten berubah (jendela di-resize, sidebar dibuka/ditutup).
    // Hanya chart SVG yang digambar ulang, supaya tabel yang sedang dibuka tidak tertutup.
    let lastW = 0;
    const ro = typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
          const w = Math.round(entries[0].contentRect.width);
          if (!state || !lastSeries || w === lastW) return;
          lastW = w;
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => drawCharts(lastSeries.cumulative, lastSeries.last30), 120);
        })
      : null;
    if (ro) ro.observe($('#dash-body'));
    if (typeof window.setActiveViewCleanup === 'function') {
      window.setActiveViewCleanup(() => {
        hideTip();
        closePopup();
        if (ro) ro.disconnect();
      });
    }
  };
})();
