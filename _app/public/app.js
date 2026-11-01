(() => {
  'use strict';

  // ---------- Util ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    chevronsDownUp: '<path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/>',
    chevronsUpDown: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    filePlus: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 15h6"/><path d="M12 12v6"/>',
    folderPlus: '<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  const ENVS = ['prod', 'uat', 'local'];
  const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const fmt = (t) => {
    const d = new Date(t);
    return isNaN(d.getTime()) ? '-' : dateFmt.format(d);
  };

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
  };

  // ---------- State ----------
  let rootNode = null;
  let total = 0;
  let lastSnapshot = '';
  const nodeIndex = new Map();
  let currentPath = '';
  let editing = null; // { path, dirty, saving, version, editor }
  let pendingEdit = null; // path catatan baru yang langsung dibuka di editor
  const collapsed = new Set(JSON.parse(store.get('collapsed', '[]')));

  const el = {
    sidebar: $('#sidebar'),
    scrim: $('#scrim'),
    tree: $('#tree'),
    count: $('#count'),
    content: $('#content'),
    breadcrumb: $('#breadcrumb'),
    dialog: $('#dialog'),
    cmdInput: $('#cmd-input'),
    cmdList: $('#cmd-list'),
    themeToggle: $('#theme-toggle'),
  };

  // ---------- Inisialisasi ikon statis ----------
  $('#brand-logo').innerHTML = icon('book');
  $('#search-icon').innerHTML = icon('search');
  $('#cmd-icon').innerHTML = icon('search');
  $('#menu-btn').innerHTML = icon('menu');

  function updateThemeIcon() {
    const dark = document.documentElement.classList.contains('dark');
    el.themeToggle.innerHTML = icon(dark ? 'sun' : 'moon');
  }
  updateThemeIcon();
  el.themeToggle.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    store.set('theme', dark ? 'dark' : 'light');
    updateThemeIcon();
  });

  // ---------- Data ----------
  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function indexTree(node) {
    nodeIndex.set(node.path, node);
    if (node.children) node.children.forEach(indexTree);
  }

  function countFiles(node) {
    if (node.type === 'file') return 1;
    if (node._count === undefined) node._count = node.children.reduce((n, c) => n + countFiles(c), 0);
    return node._count;
  }

  async function loadTree() {
    const data = await fetchJson('/api/tree');
    const snapshot = JSON.stringify(data.tree);
    const changed = snapshot !== lastSnapshot;
    lastSnapshot = snapshot;
    rootNode = data.tree;
    total = data.total;
    nodeIndex.clear();
    indexTree(rootNode);
    el.count.textContent = `${total} catatan`;
    updateTrashBadge(data.trash || 0);
    renderTree();
    return changed;
  }

  // ---------- Sidebar tree ----------
  function rowActions(node) {
    const p = esc(node.path);
    if (node.type === 'dir') {
      return `<span class="row-actions"><button type="button" class="icon-btn" data-act="new-note" data-path="${p}" title="Catatan baru di sini" aria-label="Catatan baru di sini">${icon('filePlus')}</button><button type="button" class="icon-btn" data-act="new-folder" data-path="${p}" title="Folder baru di sini" aria-label="Folder baru di sini">${icon('folderPlus')}</button><button type="button" class="icon-btn" data-act="rename" data-path="${p}" title="Ganti nama folder" aria-label="Ganti nama folder">${icon('pencil')}</button><button type="button" class="icon-btn" data-act="delete" data-path="${p}" title="Hapus folder" aria-label="Hapus folder">${icon('trash')}</button></span>`;
    }
    return `<span class="row-actions"><button type="button" class="icon-btn" data-act="rename" data-path="${p}" title="Ganti nama file" aria-label="Ganti nama file">${icon('pencil')}</button><button type="button" class="icon-btn" data-act="delete" data-path="${p}" title="Hapus catatan" aria-label="Hapus catatan">${icon('trash')}</button></span>`;
  }

  function renderNode(node, depth) {
    const p = esc(node.path);
    if (node.type === 'file') {
      const active = node.path === currentPath ? ' active' : '';
      return `<div class="tree-row" draggable="true" data-type="file" data-path="${p}"><a class="tree-item tree-file${active}" style="--depth:${depth}" href="${hashFor(node.path)}" title="${p}" draggable="false">${icon('file')}<span class="label">${esc(node.title || node.name)}</span></a>${rowActions(node)}</div>`;
    }
    const open = !collapsed.has(node.path);
    const dirActive = node.path === currentPath ? ' active' : '';
    const children = node.children.map((c) => renderNode(c, depth + 1)).join('');
    return `<div class="tree-group"><div class="tree-row" draggable="true" data-type="dir" data-path="${p}"><button type="button" class="tree-item tree-dir${dirActive}" style="--depth:${depth}" data-dir="${p}" aria-expanded="${open}"><span class="chev">${icon('chevron')}</span>${icon('folder')}<span class="label">${esc(node.name)}</span><span class="count">${countFiles(node)}</span></button>${rowActions(node)}</div><div class="tree-children"${open ? '' : ' hidden'}>${children}</div></div>`;
  }

  function renderTree() {
    if (!rootNode) return;
    if (!rootNode.children.length) {
      el.tree.innerHTML = '<div class="empty">Belum ada catatan.</div>';
      return;
    }
    el.tree.innerHTML = rootNode.children.map((c) => renderNode(c, 0)).join('');
  }

  el.tree.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const p = act.dataset.path;
      if (act.dataset.act === 'new-note') actionNewNote(p);
      else if (act.dataset.act === 'new-folder') actionNewFolder(p);
      else if (act.dataset.act === 'rename') actionRename(p);
      else if (act.dataset.act === 'delete') actionDelete(p);
      return;
    }
    const btn = e.target.closest('[data-dir]');
    if (!btn) return;
    const p = btn.dataset.dir;
    const toggle = () => {
      if (collapsed.has(p)) collapsed.delete(p);
      else collapsed.add(p);
      store.set('collapsed', JSON.stringify([...collapsed]));
      renderTree();
    };
    // Klik panah, atau klik folder yang sedang dibuka: buka/tutup saja.
    if (e.target.closest('.chev') || currentPath === p) {
      toggle();
      return;
    }
    // Klik folder lain: tampilkan isinya di sisi kanan dan buka cabangnya.
    if (collapsed.delete(p)) store.set('collapsed', JSON.stringify([...collapsed]));
    location.hash = hashFor(p);
  });

  function expandTo(p) {
    const parts = p.split('/');
    let changed = false;
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/');
      if (collapsed.delete(dir)) changed = true;
    }
    if (changed) store.set('collapsed', JSON.stringify([...collapsed]));
  }

  // ---------- Routing ----------
  const hashFor = (p) => '#/' + p.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const pathFromHash = () =>
    location.hash
      .replace(/^#\/?/, '')
      .split('/')
      .filter(Boolean)
      .map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      })
      .join('/');

  async function route() {
    const nextPath = pathFromHash();
    if (editing) {
      if (nextPath === editing.path) return; // sedang mengedit catatan ini
      if (editing.dirty && !confirm('Perubahan belum disimpan. Tinggalkan halaman ini?')) {
        location.hash = hashFor(editing.path);
        return;
      }
      stopEditing();
    }
    const navigated = nextPath !== currentPath;
    currentPath = nextPath;
    closeSidebar();
    if (currentPath) expandTo(currentPath);
    if (navigated) {
      const target = nodeIndex.get(currentPath);
      if (target && target.type === 'dir' && collapsed.delete(currentPath)) {
        store.set('collapsed', JSON.stringify([...collapsed]));
      }
    }
    renderTree();
    renderBreadcrumb();
    window.scrollTo(0, 0);
    $('#trash-btn').classList.toggle('active', currentPath === '_trash' || currentPath.startsWith('_trash/'));
    if (currentPath === '_trash') {
      await renderTrash();
      return;
    }
    if (currentPath.startsWith('_trash/')) {
      await renderTrashItem();
      return;
    }

    const node = nodeIndex.get(currentPath);
    if (!node) {
      el.content.innerHTML = `<div class="empty"><p><strong>Tidak ditemukan</strong></p><p>${esc(currentPath)}</p><a class="btn btn-outline" href="#/">Kembali ke beranda</a></div>`;
      document.title = 'AI Note';
      return;
    }
    if (node.type === 'dir') {
      renderDir(node);
    } else {
      await renderNote(node);
    }
  }

  function renderBreadcrumb() {
    if (currentPath === '_trash' || currentPath.startsWith('_trash/')) {
      el.breadcrumb.innerHTML = `<a href="#/">AI Note</a><span class="sep">${icon('chevron')}</span><span class="current">Sampah</span>`;
      return;
    }
    const parts = currentPath ? currentPath.split('/') : [];
    const crumbs = [`<a href="#/" data-drop="">AI Note</a>`];
    parts.forEach((part, i) => {
      const p = parts.slice(0, i + 1).join('/');
      const last = i === parts.length - 1;
      const label = esc(part === '_trash' ? 'Sampah' : part.replace(/\.md$/i, ''));
      crumbs.push(`<span class="sep">${icon('chevron')}</span>`);
      crumbs.push(last ? `<span class="current">${label}</span>` : `<a href="${hashFor(p)}" data-drop="${esc(p)}">${label}</a>`);
    });
    el.breadcrumb.innerHTML = crumbs.join('');
  }

  // ---------- Tampilan folder / beranda ----------
  function noteCard(n) {
    const tags = (n.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join('');
    return `<a class="card note-card" draggable="true" data-type="file" data-path="${esc(n.path)}" href="${hashFor(n.path)}"><div class="card-header"><h3 class="card-title">${icon('file')}<span>${esc(n.title || n.name)}</span></h3></div><div class="card-content">${n.preview ? `<p class="card-preview">${esc(n.preview)}</p>` : ''}${tags ? `<div class="card-tags">${tags}</div>` : ''}<span class="muted card-meta">${esc(fmt(n.mtime))}</span></div></a>`;
  }

  function dirCard(d) {
    const n = countFiles(d);
    return `<a class="card" draggable="true" data-type="dir" data-path="${esc(d.path)}" href="${hashFor(d.path)}"><div class="card-header"><h3 class="card-title">${icon('folder')}<span>${esc(d.name)}</span></h3><p class="card-desc">${n} catatan</p></div></a>`;
  }

  function collectFiles(node, out = []) {
    if (node.type === 'file') out.push(node);
    else node.children.forEach((c) => collectFiles(c, out));
    return out;
  }

  function renderDir(node) {
    const isRoot = node.path === '';
    const dirs = node.children.filter((c) => c.type === 'dir');
    const files = node.children.filter((c) => c.type === 'file');
    const n = countFiles(node);
    document.title = (isRoot ? 'AI Note' : node.name + ' · AI Note');

    const headText = `<h1 class="page-title">${isRoot ? 'Semua catatan' : esc(node.name)}</h1><p class="page-desc">${n} catatan${isRoot ? ' di folder ini.' : ' di dalam folder ini.'} Tekan <kbd>Ctrl K</kbd> untuk mencari di seluruh isi catatan.</p>`;
    let html = '';

    if (!n && !dirs.length) {
      html += '<div class="empty">Belum ada catatan di sini.</div>';
    }
    if (dirs.length) {
      html += `<div class="section-title">${isRoot ? 'Client' : 'Folder'}</div><div class="grid">${dirs.map(dirCard).join('')}</div>`;
    }
    if (files.length) {
      html += `<div class="section-title">Catatan</div><div class="grid">${files.map(noteCard).join('')}</div>`;
    }
    if (isRoot) {
      const recent = collectFiles(node).sort((a, b) => b.mtime - a.mtime).slice(0, 6);
      if (recent.length) {
        html += `<div class="section-title">Terakhir diubah</div><div class="grid">${recent.map(noteCard).join('')}</div>`;
      }
    }
    const dp = esc(node.path);
    const actions = `<div class="dir-actions"><div class="menu-wrap"><button type="button" class="btn btn-ghost btn-icon btn-sm" id="more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Aksi folder" title="Aksi">${icon('more')}</button><div class="menu" id="more-menu" role="menu" hidden><button type="button" role="menuitem" class="with-icon" data-action="new-note" data-path="${dp}">${icon('filePlus')}<span>Catatan baru</span></button><button type="button" role="menuitem" class="with-icon" data-action="new-folder" data-path="${dp}">${icon('folderPlus')}<span>Folder baru</span></button><button type="button" role="menuitem" class="with-icon" data-action="import" data-path="${dp}">${icon('upload')}<span>Impor Markdown</span></button>${isRoot ? '' : `<button type="button" role="menuitem" class="with-icon" data-action="rename" data-path="${dp}">${icon('pencil')}<span>Ganti nama</span></button><div class="menu-sep"></div><button type="button" role="menuitem" class="with-icon danger" data-action="delete" data-path="${dp}">${icon('trash')}<span>Hapus folder</span></button>`}</div></div></div>`;
    html = `<div class="page-head"><div class="page-head-text">${headText}</div>${actions}</div>` + html;
    el.content.innerHTML = html;
    setupMenu('#more-btn', '#more-menu');
  }

  // ---------- Tampilan catatan ----------
  // Lencana: client (folder paling atas) dan lingkungan (dari metadata `lingkungan:` di catatan).
  function badgesFor(p, lingkungan) {
    const parts = p.split('/');
    const out = [];
    if (parts.length > 1) out.push(`<span class="badge badge-default">${esc(parts[0])}</span>`);
    const env = String(lingkungan || '').toLowerCase();
    if (env) {
      const cls = env === 'prod' ? 'badge-destructive' : env === 'uat' ? 'badge-secondary' : 'badge-outline';
      out.push(`<span class="badge ${cls}">${esc(env)}</span>`);
    }
    return out.join('');
  }

  function tagsHtml(tags) {
    return (tags || []).length
      ? `<div class="note-tags">${tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>`
      : '';
  }
  function summaryHtml(data) {
    return data.ringkasan ? `<p class="note-summary">${esc(data.ringkasan)}</p>` : '';
  }

  async function renderNote(node) {
    el.content.innerHTML = '<div class="muted">Memuat...</div>';
    let data;
    try {
      data = await fetchJson('/api/note?path=' + encodeURIComponent(node.path));
    } catch (err) {
      if (currentPath !== node.path) return;
      el.content.innerHTML = `<div class="empty"><p><strong>Gagal membuka catatan</strong></p><p>${esc(err.message)}</p></div>`;
      return;
    }
    if (currentPath !== node.path) return; // pindah halaman saat memuat

    document.title = data.title + ' · AI Note';
    el.content.innerHTML = `<article><div class="note-meta">${badgesFor(node.path, data.lingkungan)}<span class="muted">Dibuat ${esc(fmt(data.created ?? data.mtime))}</span><span class="muted">·</span><span class="muted">Diubah ${esc(fmt(data.modified ?? data.mtime))}</span>${data.hasMeta ? '' : '<span class="badge badge-outline" title="File ini belum punya dibuat/diubah di bagian atas. Tanggal diambil dari file.">Tanpa metadata</span>'}<span class="spacer"></span><div class="menu-wrap"><button type="button" class="btn btn-ghost btn-icon btn-sm" id="more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Aksi catatan" title="Aksi">${icon('more')}</button><div class="menu" id="more-menu" role="menu" hidden><button type="button" role="menuitem" class="with-icon" id="edit-btn">${icon('pencil')}<span>Edit</span></button><button type="button" role="menuitem" class="with-icon" id="rename-btn">${icon('pencil')}<span>Ganti nama file</span></button><button type="button" role="menuitem" class="with-icon" id="history-btn">${icon('history')}<span>Riwayat</span></button><div class="menu-sep"></div><div class="menu-label">Ekspor</div><button type="button" role="menuitem" class="with-icon" data-export="md">${icon('download')}<span>Markdown</span><small>.md</small></button><button type="button" role="menuitem" class="with-icon" data-export="html">${icon('download')}<span>HTML</span><small>.html</small></button><button type="button" role="menuitem" class="with-icon" data-export="pdf">${icon('download')}<span>PDF</span><small>.pdf</small></button><button type="button" role="menuitem" class="with-icon" data-export="docx">${icon('download')}<span>Word</span><small>.docx</small></button><div class="menu-sep"></div><button type="button" role="menuitem" class="with-icon danger" id="delete-btn">${icon('trash')}<span>Hapus</span></button></div></div></div>${summaryHtml(data)}${tagsHtml(data.tag)}<div class="prose" id="prose">${data.html}</div></article>`;
    enhanceProse($('#prose'), node.path);
    setupExport(node.path);
    $('#edit-btn').addEventListener('click', () => startEditing(node.path, data));
    $('#rename-btn').addEventListener('click', () => actionRename(node.path));
    $('#history-btn').addEventListener('click', () => actionHistory(node.path));
    $('#delete-btn').addEventListener('click', () => actionDelete(node.path));
    if (pendingEdit === node.path) {
      pendingEdit = null;
      startEditing(node.path, data);
    }
  }

  // Menu Ekspor: unduh catatan sebagai .md, .html, .pdf atau .docx.
  // Menu titik tiga: buka/tutup, klik di luar atau Esc untuk menutup.
  function setupMenu(btnSel, menuSel) {
    const btn = $(btnSel);
    const menu = $(menuSel);
    if (!btn || !menu) return null;
    const close = () => {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
    };
    const onDoc = (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        btn.focus();
      }
    };
    btn.addEventListener('click', () => {
      if (!menu.hidden) return close();
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDoc, true);
      document.addEventListener('keydown', onKey, true);
      const first = menu.querySelector('button');
      if (first) first.focus({ preventScroll: true });
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('button')) close();
    });
    return menu;
  }

  // Menu aksi catatan: Edit, Ekspor (.md, .html, .pdf, .docx), Hapus.
  function setupExport(notePath) {
    const menu = setupMenu('#more-btn', '#more-menu');
    if (!menu) return;
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-export]');
      if (item) exportNote(notePath, item.dataset.export);
    });
  }

  async function exportNote(notePath, format) {
    const labels = { md: 'Markdown', html: 'HTML', pdf: 'PDF', docx: 'Word' };
    if (format === 'pdf' || format === 'docx') toast(`Menyiapkan ${labels[format]}...`);
    try {
      const res = await fetch(`/api/export?path=${encodeURIComponent(notePath)}&format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (format === 'pdf' && err.fallback === 'print') {
          toast('PDF otomatis tidak tersedia. Membuka halaman cetak: pilih "Simpan sebagai PDF".');
          window.open(`/api/export?path=${encodeURIComponent(notePath)}&format=print`, '_blank');
          return;
        }
        throw new Error(err.error || `HTTP ${res.status}. Jika server belum dijalankan ulang setelah pembaruan, jalankan ulang start.bat.`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      const plain = /filename="([^"]+)"/i.exec(cd);
      let name = notePath.split('/').pop().replace(/\.md$/i, '') + '.' + format;
      try {
        name = star ? decodeURIComponent(star[1]) : plain ? plain[1] : name;
      } catch {}
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      toast(`${labels[format]} diunduh: ${name}`);
    } catch (err) {
      toast('Gagal ekspor: ' + err.message);
    }
  }

  function enhanceProse(root, notePath) {
    // Blok kode: tambahkan header dan tombol salin.
    root.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      const cls = code && [...code.classList].find((c) => c.startsWith('language-'));
      const lang = cls ? cls.replace('language-', '') : 'teks';
      const wrap = document.createElement('div');
      wrap.className = 'code-block';
      wrap.innerHTML = `<div class="code-head"><span>${esc(lang)}</span><button type="button" class="btn btn-ghost btn-sm" data-copy>${icon('copy')}<span>Salin</span></button></div>`;
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
    });

    // Tautan: eksternal dibuka di tab baru, relatif ke .md diarahkan ke dalam aplikasi.
    const baseDir = notePath.includes('/') ? notePath.slice(0, notePath.lastIndexOf('/')) : '';
    root.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (/^https?:\/\//i.test(href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      } else if (/\.md(#.*)?$/i.test(href) && !href.startsWith('/')) {
        const segs = (baseDir ? baseDir.split('/') : []).concat(href.split('#')[0].split('/'));
        const out = [];
        for (const s of segs) {
          if (s === '..') out.pop();
          else if (s && s !== '.') out.push(s);
        }
        a.setAttribute('href', hashFor(out.join('/')));
      }
    });
  }

  // ---------- Mode edit (CodeMirror 6) ----------
  function setStatus(text) {
    const s = $('#edit-status');
    if (s) s.textContent = text;
  }

  function stopEditing() {
    if (editing) {
      clearTimeout(editing.timer);
      try {
        editing.editor.destroy();
      } catch {}
      editing = null;
    }
    el.content.classList.remove('wide');
  }

  const EDIT_MODES = [
    ['visual', 'Visual'],
    ['raw', 'Raw'],
    ['split', 'Terbagi'],
    ['preview', 'Preview'],
  ];

  function setMode(mode, remember) {
    if (!editing) return;
    const toVisual = mode === 'visual';
    if (toVisual !== !!editing.visual) {
      // Pindah antara editor visual dan editor raw: bawa isi terakhir ke editor tujuan.
      const text = editing.editor.value;
      try {
        editing.editor.destroy();
      } catch {}
      editing.mode = mode;
      mountEditor(mode, text);
    }
    editing.mode = mode;
    if (remember !== false) store.set('editMode', mode);
    const area = $('#edit-area');
    if (area) area.dataset.mode = mode;
    document.querySelectorAll('[data-mode-btn]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.modeBtn === mode));
    });
    el.content.classList.toggle('wide', mode === 'split');
    if (mode === 'raw' || mode === 'visual') clearTimeout(editing.timer);
    else refreshPreview();
    if (mode !== 'preview') editing.editor.focus();
  }

  function schedulePreview() {
    if (!editing || editing.mode === 'raw' || editing.mode === 'visual') return;
    clearTimeout(editing.timer);
    editing.timer = setTimeout(refreshPreview, 250);
  }

  async function refreshPreview() {
    const state = editing;
    if (!state) return;
    const mine = ++state.previewSeq;
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
        body: JSON.stringify({ content: state.editor.value, path: state.path }),
      });
      const data = await res.json().catch(() => ({}));
      if (editing !== state || mine !== state.previewSeq) return;
      const box = $('#preview');
      if (!box) return;
      if (!res.ok) {
        box.innerHTML = `<p class="muted">Preview gagal dimuat (${res.status}). Jika server belum dijalankan ulang setelah pembaruan, tutup jendela server lalu klik dua kali start.bat lagi.</p>`;
        return;
      }
      const top = box.scrollTop;
      box.innerHTML = data.html;
      enhanceProse(box, state.path);
      box.scrollTop = top;
    } catch {}
  }

  // Form metadata (ringkasan, tag, lingkungan) di atas editor. Disimpan ke frontmatter oleh server.
  const ENV_OPTIONS = ['prod', 'uat', 'local'];
  function metaFormHtml(data) {
    const env = String(data.lingkungan || '').toLowerCase();
    const opts = ENV_OPTIONS.includes(env) || !env ? ENV_OPTIONS : [...ENV_OPTIONS, env];
    const options = ['<option value="">Tidak ada</option>']
      .concat(opts.map((o) => `<option value="${esc(o)}"${o === env ? ' selected' : ''}>${esc(o)}</option>`))
      .join('');
    const tags = Array.isArray(data.tag) ? data.tag.join(', ') : String(data.tag || '');
    return `<div class="meta-form" id="meta-form"><label><span>Ringkasan</span><textarea id="meta-ringkasan" rows="2" placeholder="1-2 kalimat tentang isi catatan (tanpa password)">${esc(data.ringkasan || '')}</textarea></label><div class="meta-row"><label><span>Tag</span><input id="meta-tag" type="text" value="${esc(tags)}" placeholder="pisahkan dengan koma, mis. sre, kemenkeu" autocomplete="off" spellcheck="false"></label><label><span>Lingkungan</span><select id="meta-env">${options}</select></label></div></div>`;
  }

  function readMetaForm() {
    const r = $('#meta-ringkasan');
    const t = $('#meta-tag');
    const e = $('#meta-env');
    if (!r || !t || !e) return undefined;
    return { ringkasan: r.value, tag: t.value, lingkungan: e.value };
  }

  // Scroll preview mengikuti posisi editor raw (mode terbagi).
  function bindScroll() {
    const scroller = document.querySelector('#editor .cm-scroller');
    if (!scroller) return;
    scroller.addEventListener('scroll', () => {
      const box = $('#preview');
      if (!editing || editing.mode !== 'split' || !box) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const ratio = max > 0 ? scroller.scrollTop / max : 0;
      box.scrollTop = ratio * (box.scrollHeight - box.clientHeight);
    });
  }

  // Alamat gambar relatif (_lampiran/...) di catatan -> /files/... agar tampil di editor visual.
  function resolveImageSrc(src) {
    if (!editing || /^(https?:|data:|\/)/i.test(src)) return src;
    const base = editing.path.includes('/') ? editing.path.slice(0, editing.path.lastIndexOf('/')).split('/') : [];
    const out = [...base];
    for (const s of String(src).split('/')) {
      if (s === '..') out.pop();
      else if (s && s !== '.') out.push(s);
    }
    return '/files/' + out.map(encodeURIComponent).join('/');
  }

  // Pasang editor sesuai mode: visual (MDXEditor) atau raw (CodeMirror). Isi catatan dibawa lewat `text`.
  function mountEditor(mode, text) {
    const st = editing;
    const common = {
      onChange: () => {
        if (!editing) return;
        if (!editing.dirty) {
          editing.dirty = true;
          setStatus('Belum disimpan');
        }
        schedulePreview();
      },
      onSave: () => saveEditing(false),
    };
    if (mode === 'visual' && window.NoteEditorVisual) {
      const box = $('#visual');
      box.innerHTML = '';
      st.visual = true;
      st.editor = window.NoteEditorVisual.create(box, text, {
        ...common,
        resolveImage: resolveImageSrc,
        onError: () => {
          // Catatan yang tidak bisa dibaca editor visual dibuka di editor raw (isi tidak berubah).
          setTimeout(() => {
            if (editing !== st || !st.visual) return;
            setMode('raw', false);
            setStatus('Editor visual tidak bisa membuka catatan ini, dialihkan ke Raw.');
          }, 0);
        },
      });
    } else {
      const box = $('#editor');
      box.innerHTML = '';
      st.visual = false;
      st.editor = window.NoteEditor.create(box, text, common);
      bindScroll();
    }
  }

  function startEditing(path, data) {
    if (!window.NoteEditor) {
      alert('Editor belum termuat. Refresh halaman dengan Ctrl+F5.');
      return;
    }
    const saved = store.get('editMode', 'visual');
    const mode = EDIT_MODES.some(([m]) => m === saved) && (saved !== 'visual' || window.NoteEditorVisual) ? saved : window.NoteEditorVisual ? 'visual' : 'split';
    const seg = EDIT_MODES.map(([m, label]) => `<button type="button" data-mode-btn="${m}" aria-pressed="${m === mode}">${label}</button>`).join('');
    el.content.innerHTML = `<article><div class="note-meta">${badgesFor(path, data.lingkungan)}<span class="muted" id="edit-status">Mengedit. Ctrl S untuk menyimpan.</span><span class="spacer"></span><div class="seg" role="group" aria-label="Tampilan editor">${seg}</div><button type="button" class="btn btn-ghost btn-sm" id="cancel-btn">Batal</button><button type="button" class="btn btn-primary btn-sm" id="save-btn">${icon('save')}<span>Simpan</span></button></div>${metaFormHtml(data)}<div class="edit-area" id="edit-area" data-mode="${mode}"><div class="editor" id="editor"></div><div class="preview prose" id="preview"></div><div class="visual" id="visual"></div></div></article>`;
    editing = { path, dirty: false, saving: false, version: data.version, editor: null, mode, previewSeq: 0, timer: null, visual: false };
    mountEditor(mode, data.markdown || '');
    document.querySelectorAll('#meta-form input, #meta-form textarea, #meta-form select').forEach((f) => {
      f.addEventListener('input', () => {
        if (!editing) return;
        if (!editing.dirty) {
          editing.dirty = true;
          setStatus('Belum disimpan');
        }
      });
    });
    $('#save-btn').addEventListener('click', () => saveEditing(false));
    $('#cancel-btn').addEventListener('click', cancelEditing);
    document.querySelectorAll('[data-mode-btn]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeBtn)));

    el.content.classList.toggle('wide', mode === 'split');
    if (mode !== 'raw' && mode !== 'visual') refreshPreview();
    editing.editor.focus();
  }

  function cancelEditing() {
    if (!editing) return;
    if (editing.dirty && !confirm('Buang perubahan yang belum disimpan?')) return;
    stopEditing();
    route();
  }

  async function saveEditing(force) {
    if (!editing || editing.saving) return;
    const state = editing;
    state.saving = true;
    const btn = $('#save-btn');
    if (btn) btn.disabled = true;
    setStatus('Menyimpan...');

    let res;
    let data;
    try {
      res = await fetch('/api/note?path=' + encodeURIComponent(state.path), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
        body: JSON.stringify({ content: state.editor.value, version: state.version, force, meta: readMetaForm() }),
      });
      data = await res.json().catch(() => ({}));
    } catch (err) {
      state.saving = false;
      if (btn) btn.disabled = false;
      setStatus('Gagal menyimpan: ' + err.message);
      return;
    }

    state.saving = false;
    if (btn) btn.disabled = false;

    if (res.status === 409) {
      if (confirm('File ini berubah di disk sejak Anda membukanya. Timpa dengan versi Anda?')) {
        return saveEditing(true);
      }
      setStatus('Belum disimpan');
      return;
    }
    if (!res.ok) {
      setStatus('Gagal menyimpan: ' + (data.error || 'HTTP ' + res.status));
      return;
    }

    stopEditing();
    try {
      await loadTree();
    } catch {}
    route();
  }

  window.addEventListener('beforeunload', (e) => {
    if (editing && editing.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {}
      ta.remove();
      return ok;
    }
  }

  el.content.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const code = btn.closest('.code-block').querySelector('code');
    const ok = await copyText(code ? code.textContent : '');
    btn.innerHTML = icon(ok ? 'check' : 'copy') + `<span>${ok ? 'Tersalin' : 'Gagal'}</span>`;
    setTimeout(() => {
      btn.innerHTML = icon('copy') + '<span>Salin</span>';
    }, 1500);
  });

  // ---------- Kelola catatan & folder ----------
  const parentOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');

  function toast(message) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => (t.hidden = true), 3500);
  }

  async function api(url, body) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || `Gagal (HTTP ${res.status}). Jika server belum dijalankan ulang setelah pembaruan, jalankan ulang start.bat.`);
        return null;
      }
      return data;
    } catch (err) {
      toast('Gagal menghubungi server: ' + err.message);
      return null;
    }
  }

  function modal({ title, description = '', fields = [], confirmLabel = 'OK', destructive = false }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'dialog';
      const fieldHtml = (f) =>
        f.type === 'folder'
          ? `<div class="field fp" data-fp><span>${esc(f.label)}</span><input type="hidden" name="${f.name}" value="${esc(f.value || '')}"><button type="button" class="fp-btn" aria-haspopup="tree" aria-expanded="false"><span class="fp-ico">${icon('folder')}</span><span class="fp-label"></span><span class="fp-caret">${icon('chevron')}</span></button><div class="scope-pop fp-pop" role="tree" hidden></div></div>`
          : f.type === 'select'
          ? `<label class="field"><span>${esc(f.label)}</span><select name="${f.name}">${f.optionsHtml}</select></label>`
          : `<label class="field"><span>${esc(f.label)}</span><input name="${f.name}" type="text" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}" autocomplete="off" spellcheck="false"></label>`;
      wrap.innerHTML = `<div class="dialog-overlay"></div><form class="dialog-content modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ''}</div>${fields.length ? `<div class="modal-body">${fields.map(fieldHtml).join('')}</div>` : ''}<div class="modal-foot"><button type="button" class="btn btn-outline btn-sm" data-cancel>Batal</button><button type="submit" class="btn btn-sm ${destructive ? 'btn-destructive' : 'btn-primary'}">${esc(confirmLabel)}</button></div></form>`;
      document.body.appendChild(wrap);

      const form = $('form', wrap);
      // Pemilih folder berbentuk pohon (sama dengan filter folder di pencarian).
      form.querySelectorAll('[data-fp]').forEach((fp) => {
        const input = $('input', fp);
        const btn = $('.fp-btn', fp);
        const pop = $('.fp-pop', fp);
        const open = new Set();
        const openTo = (p) => {
          const segs = p ? p.split('/') : [];
          for (let i = 1; i < segs.length; i++) open.add(segs.slice(0, i).join('/'));
        };
        const rootLabel = 'AI Note (utama)';
        const setLabel = () => {
          $('.fp-label', fp).textContent = input.value ? input.value : rootLabel;
        };
        const rows = (node, depth, out) => {
          node.children
            .filter((c) => c.type === 'dir')
            .forEach((d) => {
              const subs = d.children.some((c) => c.type === 'dir');
              const isOpen = open.has(d.path);
              out.push(
                `<div class="scope-row${input.value === d.path ? ' selected' : ''}" role="treeitem" data-path="${esc(d.path)}" style="padding-left:${0.375 + depth}rem"><span class="scope-chev${subs ? '' : ' none'}${isOpen ? ' open' : ''}" data-toggle="${esc(d.path)}">${subs ? icon('chevron') : ''}</span>${icon('folder')}<span class="scope-name">${esc(d.name)}</span><span class="scope-count">${countFiles(d)}</span></div>`,
              );
              if (subs && isOpen) rows(d, depth + 1, out);
            });
        };
        const render = () => {
          const out = [`<div class="scope-row${input.value === '' ? ' selected' : ''}" role="treeitem" data-path=""><span class="scope-chev none"></span>${icon('folder')}<span class="scope-name">${rootLabel}</span></div>`];
          rows(rootNode, 0, out);
          pop.innerHTML = out.join('');
        };
        const setOpen = (v) => {
          pop.hidden = !v;
          btn.setAttribute('aria-expanded', String(v));
          if (v) {
            openTo(input.value);
            render();
            const sel = $('.selected', pop);
            if (sel) sel.scrollIntoView({ block: 'nearest' });
          }
        };
        fp._isOpen = () => !pop.hidden;
        fp._close = () => setOpen(false);
        setLabel();
        btn.addEventListener('click', () => setOpen(pop.hidden));
        pop.addEventListener('click', (e) => {
          const tg = e.target.closest('[data-toggle]');
          if (tg && !tg.classList.contains('none')) {
            const p = tg.dataset.toggle;
            if (open.has(p)) open.delete(p);
            else open.add(p);
            render();
            return;
          }
          const row = e.target.closest('.scope-row');
          if (!row) return;
          input.value = row.dataset.path;
          setLabel();
          setOpen(false);
          btn.focus();
        });
      });
      const close = (value) => {
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        resolve(value);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          const openFp = [...form.querySelectorAll('[data-fp]')].find((x) => x._isOpen && x._isOpen());
          if (openFp) openFp._close();
          else close(null);
        }
      };
      document.addEventListener('keydown', onKey, true);
      $('.dialog-overlay', wrap).addEventListener('click', () => close(null));
      $('[data-cancel]', wrap).addEventListener('click', () => close(null));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const values = {};
        new FormData(form).forEach((v, k) => (values[k] = String(v)));
        close(values);
      });
      const first = form.querySelector('input:not([type="hidden"]), select') || $('button[type="submit"]', form);
      first.focus();
    });
  }

  function folderOptions(selected) {
    const out = [`<option value=""${selected === '' ? ' selected' : ''}>AI Note (utama)</option>`];
    const walk = (node, depth) => {
      node.children
        .filter((c) => c.type === 'dir')
        .forEach((d) => {
          out.push(`<option value="${esc(d.path)}"${d.path === selected ? ' selected' : ''}>${'  '.repeat(depth + 1)}${esc(d.name)}</option>`);
          walk(d, depth + 1);
        });
    };
    walk(rootNode, 0);
    return out.join('');
  }

  function contextDir() {
    const node = nodeIndex.get(currentPath);
    if (!node) return '';
    return node.type === 'dir' ? node.path : parentOf(node.path);
  }

  function editingBlocks(p) {
    if (editing && (editing.path === p || editing.path.startsWith(p + '/'))) {
      toast('Selesaikan atau batalkan editing dulu.');
      return true;
    }
    return false;
  }

  async function actionNewNote(folder = contextDir()) {
    const v = await modal({
      title: 'Catatan baru',
      description: 'File .md dibuat dengan metadata dibuat dan diubah otomatis.',
      fields: [
        { name: 'folder', label: 'Folder', type: 'folder', value: folder },
        { name: 'title', label: 'Judul', placeholder: 'Contoh: Akses database UAT' },
      ],
      confirmLabel: 'Buat catatan',
    });
    if (!v) return;
    const r = await api('/api/create-note', { folder: v.folder, title: v.title });
    if (!r) return;
    collapsed.delete(v.folder);
    await loadTree();
    pendingEdit = r.path;
    location.hash = hashFor(r.path);
  }

  async function actionNewFolder(parent = contextDir()) {
    const v = await modal({
      title: 'Folder baru',
      description: 'Nama otomatis ditulis huruf kecil dengan tanda hubung, sesuai standar.',
      fields: [
        { name: 'parent', label: 'Di dalam', type: 'folder', value: parent },
        { name: 'name', label: 'Nama folder', placeholder: 'Contoh: prod' },
      ],
      confirmLabel: 'Buat folder',
    });
    if (!v) return;
    const r = await api('/api/create-folder', { parent: v.parent, name: v.name });
    if (!r) return;
    collapsed.delete(v.parent);
    await loadTree();
    location.hash = hashFor(r.path);
  }


  // ---------- Riwayat versi catatan ----------
  const HIST_LABEL = {
    app: 'Disimpan di aplikasi',
    luar: 'Diubah di luar aplikasi',
    baru: 'Catatan dibuat',
    pulih: 'Hasil pemulihan',
    awal: 'Versi awal',
  };
  const histTime = (ms) => {
    const d = new Date(ms);
    return isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }).format(d);
  };
  const histSize = (b) => (b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB');

  // Selisih per baris (LCS), dengan bagian awal dan akhir yang sama dipotong dulu.
  function lineDiff(oldText, newText) {
    const A = oldText.split('\n');
    const B = newText.split('\n');
    let s = 0;
    while (s < A.length && s < B.length && A[s] === B[s]) s++;
    let ea = A.length;
    let eb = B.length;
    while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) {
      ea--;
      eb--;
    }
    const a = A.slice(s, ea);
    const b = B.slice(s, eb);
    const out = A.slice(0, s).map((t) => ({ t: ' ', s: t }));
    if (a.length * b.length > 4e6) {
      a.forEach((x) => out.push({ t: '-', s: x }));
      b.forEach((x) => out.push({ t: '+', s: x }));
    } else {
      const w = b.length + 1;
      const dp = new Uint16Array((a.length + 1) * w);
      for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
          dp[i * w + j] = a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
        }
      }
      let i = 0;
      let j = 0;
      while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
          out.push({ t: ' ', s: a[i] });
          i++;
          j++;
        } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) out.push({ t: '-', s: a[i++] });
        else out.push({ t: '+', s: b[j++] });
      }
      while (i < a.length) out.push({ t: '-', s: a[i++] });
      while (j < b.length) out.push({ t: '+', s: b[j++] });
    }
    A.slice(ea).forEach((t) => out.push({ t: ' ', s: t }));
    return out;
  }

  function diffHtml(rows) {
    // Baris yang tidak berubah di tengah dilipat, sisakan 2 baris konteks.
    const keep = rows.map((r) => r.t !== ' ');
    const near = keep.map((_, i) => {
      for (let k = Math.max(0, i - 2); k <= Math.min(rows.length - 1, i + 2); k++) if (keep[k]) return true;
      return false;
    });
    if (!keep.some(Boolean)) return '<p class="muted hist-empty">Tidak ada perbedaan.</p>';
    const out = [];
    let skipped = 0;
    rows.forEach((r, i) => {
      if (!near[i]) {
        skipped++;
        return;
      }
      if (skipped) {
        out.push(`<div class="dl dl-skip">… ${skipped} baris sama …</div>`);
        skipped = 0;
      }
      out.push(`<div class="dl ${r.t === '+' ? 'dl-add' : r.t === '-' ? 'dl-del' : ''}"><span class="dl-m">${r.t === ' ' ? '' : r.t}</span><span class="dl-t">${esc(r.s) || '&nbsp;'}</span></div>`);
    });
    if (skipped) out.push(`<div class="dl dl-skip">… ${skipped} baris sama …</div>`);
    return `<div class="diff">${out.join('')}</div>`;
  }

  async function actionHistory(p) {
    const wrap = document.createElement('div');
    wrap.className = 'dialog';
    wrap.innerHTML = `<div class="dialog-overlay"></div><div class="dialog-content hist" role="dialog" aria-modal="true" aria-label="Riwayat catatan"><div class="hist-head"><div><h2>Riwayat</h2><p class="muted">${esc(p)}</p></div><button type="button" class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Tutup" title="Tutup">×</button></div><div class="hist-body"><div class="hist-list" id="hist-list"><p class="muted">Memuat…</p></div><div class="hist-view"><div class="hist-bar"><div class="hist-tabs"><button type="button" class="hist-tab active" data-mode="diff">Perubahan</button><button type="button" class="hist-tab" data-mode="text">Isi versi</button></div><button type="button" class="btn btn-outline btn-sm" id="hist-restore" disabled>Pulihkan versi ini</button></div><div class="hist-pane" id="hist-pane"><p class="muted hist-empty">Pilih satu versi di sebelah kiri.</p></div></div></div></div>`;
    document.body.appendChild(wrap);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const close = () => {
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
    };
    document.addEventListener('keydown', onKey, true);
    $('.dialog-overlay', wrap).addEventListener('click', close);
    $('[data-close]', wrap).addEventListener('click', close);

    let versions = [];
    let selected = null;
    let mode = 'diff';
    const cache = new Map();
    const get = async (id) => {
      if (cache.has(id)) return cache.get(id);
      const r = await fetch(`/api/history/version?path=${encodeURIComponent(p)}&id=${encodeURIComponent(id)}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Gagal memuat versi');
      cache.set(id, d);
      return d;
    };

    const renderList = () => {
      $('#hist-list', wrap).innerHTML = versions.length
        ? versions
            .map(
              (v, i) =>
                `<button type="button" class="hist-item${v.id === selected ? ' active' : ''}" data-id="${esc(v.id)}"><span class="hist-when">${esc(histTime(v.time))}${i === 0 ? ' <em>sekarang</em>' : ''}</span><span class="hist-what">${esc(HIST_LABEL[v.label] || v.label)} · ${esc(histSize(v.size))}</span></button>`,
            )
            .join('')
        : '<p class="muted">Belum ada riwayat.</p>';
    };

    const renderPane = async () => {
      const pane = $('#hist-pane', wrap);
      const idx = versions.findIndex((v) => v.id === selected);
      if (idx < 0) return;
      pane.innerHTML = '<p class="muted hist-empty">Memuat…</p>';
      try {
        const cur = await get(selected);
        if (mode === 'text') {
          pane.innerHTML = `<pre class="hist-text">${esc(cur.content)}</pre>`;
        } else {
          const prev = versions[idx + 1] ? (await get(versions[idx + 1].id)).content : '';
          const note = versions[idx + 1] ? 'Dibanding versi sebelumnya.' : 'Versi tertua: semua isi dianggap baru.';
          pane.innerHTML = `<p class="muted hist-note">${note}</p>${diffHtml(lineDiff(prev, cur.content))}`;
        }
      } catch (err) {
        pane.innerHTML = `<p class="muted hist-empty">${esc(err.message)}</p>`;
      }
    };

    const select = (id) => {
      selected = id;
      renderList();
      const idx = versions.findIndex((v) => v.id === id);
      $('#hist-restore', wrap).disabled = idx <= 0; // versi paling atas = isi sekarang
      renderPane();
    };

    $('#hist-list', wrap).addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (b) select(b.dataset.id);
    });
    wrap.querySelectorAll('.hist-tab').forEach((t) =>
      t.addEventListener('click', () => {
        mode = t.dataset.mode;
        wrap.querySelectorAll('.hist-tab').forEach((x) => x.classList.toggle('active', x === t));
        renderPane();
      }),
    );
    $('#hist-restore', wrap).addEventListener('click', async () => {
      if (!selected || editingBlocks(p)) return;
      const v = versions.find((x) => x.id === selected);
      const ok = await modal({
        title: 'Pulihkan versi ini?',
        description: `Isi catatan diganti dengan versi ${histTime(v.time)}. Isi sekarang tetap tersimpan di riwayat, jadi bisa dibatalkan.`,
        confirmLabel: 'Pulihkan',
      });
      if (!ok) return;
      const r = await api('/api/history/restore', { path: p, id: selected });
      if (!r) return;
      close();
      toast('Catatan dipulihkan ke versi ' + histTime(v.time));
      await loadTree();
      route();
    });

    try {
      const r = await fetch(`/api/history?path=${encodeURIComponent(p)}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Gagal memuat riwayat');
      versions = d.versions || [];
    } catch (err) {
      $('#hist-list', wrap).innerHTML = `<p class="muted">${esc(err.message)}</p>`;
      return;
    }
    renderList();
    if (versions.length) select(versions.length > 1 ? versions[0].id : versions[0].id);
  }


  // ---------- Impor Markdown (beberapa file sekaligus) ----------
  const IMPORT_EXT = /\.(md|markdown|txt)$/i;
  async function importFiles(folder, files) {
    const list = [...files].filter((f) => IMPORT_EXT.test(f.name));
    const skipped = files.length - list.length;
    if (!list.length) {
      toast('Tidak ada file .md, .markdown, atau .txt yang dipilih.');
      return;
    }
    let ok = 0;
    let last = null;
    const failed = [];
    for (const f of list) {
      if (f.size > 2 * 1024 * 1024) {
        failed.push(f.name + ' (lebih dari 2 MB)');
        continue;
      }
      let content;
      try {
        content = await f.text();
      } catch {
        failed.push(f.name);
        continue;
      }
      const r = await api('/api/import', { folder, name: f.name, content });
      if (r) {
        ok++;
        last = r.path;
      } else failed.push(f.name);
    }
    collapsed.delete(folder);
    await loadTree();
    const parts = [`${ok} catatan diimpor`];
    if (skipped) parts.push(`${skipped} file dilewati (bukan .md)`);
    if (failed.length) parts.push(`gagal: ${failed.join(', ')}`);
    toast(parts.join('. ') + '.');
    if (ok === 1 && last) location.hash = hashFor(last);
    else route();
  }

  function actionImport(folder = contextDir()) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.md,.markdown,.txt,text/markdown,text/plain';
    input.addEventListener('change', () => {
      if (input.files && input.files.length) importFiles(folder, input.files);
    });
    input.click();
  }

  // Seret file .md dari komputer ke jendela: diimpor ke folder yang sedang dibuka.
  const hasFiles = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  document.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  document.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); // cegah browser membuka file yang dijatuhkan
    if (currentPath === '_trash' || currentPath.startsWith('_trash/')) return;
    importFiles(contextDir(), e.dataTransfer.files);
  });

  async function actionDelete(p) {
    const node = nodeIndex.get(p);
    if (!node || editingBlocks(p)) return;
    const isDir = node.type === 'dir';
    const label = isDir ? node.name : node.title || node.name;
    const ok = await modal({
      title: isDir ? 'Hapus folder?' : 'Hapus catatan?',
      description: `"${label}"${isDir ? ` beserta ${countFiles(node)} catatan di dalamnya` : ''} akan dipindahkan ke folder _trash di dalam AI Note. Aplikasi tidak menampilkannya lagi, tapi Anda masih bisa memulihkannya dari sana.`,
      confirmLabel: 'Hapus',
      destructive: true,
    });
    if (!ok) return;
    const r = await api('/api/delete', { path: p });
    if (!r) return;
    const viewing = currentPath === p || currentPath.startsWith(p + '/');
    await loadTree();
    toast(isDir ? 'Folder dipindahkan ke _trash' : 'Catatan dipindahkan ke _trash');
    if (viewing) location.hash = hashFor(parentOf(p));
    else route();
  }

  async function actionRename(p) {
    const node = nodeIndex.get(p);
    if (!node || editingBlocks(p)) return;
    const isFile = node.type === 'file';
    const v = await modal({
      title: isFile ? 'Ganti nama file' : 'Ganti nama folder',
      description: isFile
        ? 'Nama otomatis ditulis huruf kecil dengan tanda hubung, sesuai standar. Lampiran ikut diganti namanya.'
        : 'Nama otomatis ditulis huruf kecil dengan tanda hubung, sesuai standar. Catatan di dalamnya ikut pindah.',
      fields: [{ name: 'name', label: isFile ? 'Nama file (tanpa .md)' : 'Nama folder', value: isFile ? node.name.replace(/\.md$/i, '') : node.name }],
      confirmLabel: 'Simpan',
    });
    if (!v) return;
    const r = await api('/api/rename', { path: p, name: v.name });
    if (!r) return;
    if (r.path === p) {
      toast(isFile ? 'Nama file tidak berubah' : 'Nama folder tidak berubah');
      return;
    }
    const remap = (x) => (x === p || x.startsWith(p + '/') ? r.path + x.slice(p.length) : x);
    const next = [...collapsed].map(remap);
    collapsed.clear();
    next.forEach((x) => collapsed.add(x));
    store.set('collapsed', JSON.stringify([...collapsed]));
    const viewing = currentPath === p || currentPath.startsWith(p + '/');
    await loadTree();
    toast((isFile ? 'File' : 'Folder') + ' diganti namanya menjadi ' + r.path.split('/').pop());
    if (viewing) location.hash = hashFor(remap(currentPath));
    else route();
  }

  // Lebar sidebar bisa diseret. Tersimpan; tombol reset muncul bila lebarnya bukan default.
  (function setupSidebarResize() {
    const DEFAULT_W = 272; // 17rem
    const MIN_W = 200;
    const handle = $('#sidebar-resizer');
    const resetBtn = $('#reset-width');
    const root = document.documentElement;
    resetBtn.innerHTML = icon('reset');
    const maxW = () => Math.max(MIN_W, Math.min(720, Math.round(window.innerWidth * 0.6)));
    const clamp = (w) => Math.max(MIN_W, Math.min(maxW(), Math.round(w)));
    let width = DEFAULT_W;

    function apply(w, save) {
      width = w;
      if (w === DEFAULT_W) root.style.removeProperty('--sidebar-w');
      else root.style.setProperty('--sidebar-w', w + 'px');
      resetBtn.hidden = w === DEFAULT_W;
      if (save) store.set('sidebarWidth', String(w));
    }
    const saved = parseInt(store.get('sidebarWidth', ''), 10);
    if (Number.isFinite(saved)) apply(clamp(saved), false);

    function reset() {
      apply(DEFAULT_W, true);
    }
    resetBtn.addEventListener('click', reset);
    handle.addEventListener('dblclick', reset);

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add('resizing');
      const left = el.sidebar.getBoundingClientRect().left;
      const move = (ev) => apply(clamp(ev.clientX - left), false);
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        document.body.classList.remove('resizing');
        store.set('sidebarWidth', String(width));
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
    // Keyboard: panah kiri/kanan mengubah lebar, Home/Esc mengembalikan default.
    handle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') apply(clamp(width - 16), true);
      else if (e.key === 'ArrowRight') apply(clamp(width + 16), true);
      else if (e.key === 'Home' || e.key === 'Escape') reset();
      else return;
      e.preventDefault();
    });
    window.addEventListener('resize', () => {
      if (width !== DEFAULT_W && width > maxW()) apply(maxW(), false);
    });
  })();

  // Buka / tutup semua folder di sidebar
  $('#expand-all').innerHTML = icon('chevronsUpDown');
  $('#collapse-all').innerHTML = icon('chevronsDownUp');
  $('#expand-all').addEventListener('click', () => {
    collapsed.clear();
    store.set('collapsed', '[]');
    renderTree();
  });
  $('#collapse-all').addEventListener('click', () => {
    collapsed.clear();
    nodeIndex.forEach((n) => {
      if (n.type === 'dir' && n.path !== '') collapsed.add(n.path);
    });
    store.set('collapsed', JSON.stringify([...collapsed]));
    renderTree();
  });

  async function actionMove(from, toFolder) {
    if (editingBlocks(from)) return;
    const r = await api('/api/move', { from, to: toFolder });
    if (!r) return;
    collapsed.delete(toFolder);
    const viewing = currentPath === from || currentPath.startsWith(from + '/');
    await loadTree();
    toast('Dipindahkan ke ' + (toFolder || 'AI Note (utama)'));
    if (viewing) location.hash = hashFor(r.path + currentPath.slice(from.length));
    else route();
  }

  // Tombol di sidebar dan di halaman folder
  $('#side-more-btn').innerHTML = icon('more');
  setupMenu('#side-more-btn', '#side-more-menu');
  $('#new-note-btn').innerHTML = icon('filePlus') + '<span>Catatan baru</span>';
  $('#new-folder-btn').innerHTML = icon('folderPlus') + '<span>Folder baru</span>';
  $('#new-note-btn').addEventListener('click', () => actionNewNote());
  $('#new-folder-btn').addEventListener('click', () => actionNewFolder());
  $('#import-btn').innerHTML = icon('upload') + '<span>Impor Markdown</span>';
  $('#import-btn').addEventListener('click', () => actionImport());
  el.content.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const p = b.dataset.path;
    if (b.dataset.action === 'new-note') actionNewNote(p);
    else if (b.dataset.action === 'new-folder') actionNewFolder(p);
    else if (b.dataset.action === 'import') actionImport(p);
    else if (b.dataset.action === 'rename') actionRename(p);
    else if (b.dataset.action === 'delete') actionDelete(p);
  });

  // Seret dan lepas di sidebar: catatan atau folder dipindah ke folder lain.
  let dragPath = null;

  function validDrop(from, dest) {
    return dest !== parentOf(from) && dest !== from && !dest.startsWith(from + '/');
  }

  function dropInfo(e) {
    const row = e.target.closest('.tree-row');
    const dest = row ? (row.dataset.type === 'dir' ? row.dataset.path : parentOf(row.dataset.path)) : '';
    return dest;
  }

  function clearDrop() {
    el.tree.classList.remove('drop-root');
    el.tree.querySelectorAll('.drop-target').forEach((r) => r.classList.remove('drop-target'));
  }

  function showDrop(dest) {
    clearDrop();
    if (dest === '') el.tree.classList.add('drop-root');
    else {
      const row = el.tree.querySelector(`.tree-row[data-type="dir"][data-path="${CSS.escape(dest)}"]`);
      if (row) row.classList.add('drop-target');
    }
  }

  // Seret dan lepas di sisi kanan: kartu catatan/folder ke kartu folder, atau ke breadcrumb (naik ke folder induk).
  const clearCardDrop = () => {
    document.querySelectorAll('#content .drop-target, #breadcrumb .drop-target').forEach((n) => n.classList.remove('drop-target'));
  };
  const dropTargetAt = (e) => {
    const card = e.target.closest('#content .card[data-type="dir"]');
    if (card) return { node: card, dest: card.dataset.path };
    const crumb = e.target.closest('#breadcrumb [data-drop]');
    if (crumb) return { node: crumb, dest: crumb.dataset.drop };
    return null;
  };

  el.content.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card[data-path]');
    if (!card) return;
    dragPath = card.dataset.path;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragPath);
    card.classList.add('dragging');
  });
  const endCardDrag = () => {
    dragPath = null;
    clearCardDrop();
    document.querySelectorAll('#content .dragging').forEach((n) => n.classList.remove('dragging'));
  };
  el.content.addEventListener('dragend', endCardDrag);
  [el.content, el.breadcrumb].forEach((zone) => {
    zone.addEventListener('dragover', (e) => {
      if (dragPath === null) return;
      const t = dropTargetAt(e);
      clearCardDrop();
      if (!t || !validDrop(dragPath, t.dest)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      t.node.classList.add('drop-target');
    });
    zone.addEventListener('dragleave', (e) => {
      const t = dropTargetAt(e);
      if (t && !t.node.contains(e.relatedTarget)) t.node.classList.remove('drop-target');
    });
    zone.addEventListener('drop', (e) => {
      if (dragPath === null) return;
      const t = dropTargetAt(e);
      if (!t) return;
      e.preventDefault();
      const from = dragPath;
      dragPath = null;
      clearCardDrop();
      if (validDrop(from, t.dest)) actionMove(from, t.dest);
    });
  });

  el.tree.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.tree-row');
    if (!row) return;
    dragPath = row.dataset.path;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragPath);
    row.classList.add('dragging');
  });
  el.tree.addEventListener('dragend', () => {
    dragPath = null;
    clearDrop();
    el.tree.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
  });
  el.tree.addEventListener('dragover', (e) => {
    if (dragPath === null) return;
    const dest = dropInfo(e);
    if (!validDrop(dragPath, dest)) {
      clearDrop();
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    showDrop(dest);
  });
  el.tree.addEventListener('dragleave', (e) => {
    if (!el.tree.contains(e.relatedTarget)) clearDrop();
  });
  el.tree.addEventListener('drop', (e) => {
    if (dragPath === null) return;
    e.preventDefault();
    const from = dragPath;
    const dest = dropInfo(e);
    dragPath = null;
    clearDrop();
    if (validDrop(from, dest)) actionMove(from, dest);
  });

  // ---------- Sampah ----------
  function updateTrashBadge(n) {
    const b = $('#trash-badge');
    if (!b) return;
    b.textContent = n > 99 ? '99+' : String(n);
    b.hidden = n === 0;
  }

  $('#trash-btn').innerHTML = icon('trash') + '<span class="trash-badge" id="trash-badge" hidden></span>';
  $('#trash-btn').addEventListener('click', () => {
    if (currentPath === '_trash') route();
    else location.hash = '#/_trash';
  });

  // ---------- Mulai ulang aplikasi ----------
  $('#restart-btn').innerHTML = icon('reset');
  $('#restart-btn').addEventListener('click', async () => {
    if (editing) {
      toast('Selesaikan atau batalkan editing dulu.');
      return;
    }
    const ok = await modal({
      title: 'Mulai ulang aplikasi?',
      description: 'Server dimulai ulang (misalnya setelah pembaruan). Halaman dimuat ulang otomatis, biasanya dalam beberapa detik.',
      confirmLabel: 'Mulai ulang',
    });
    if (!ok) return;
    const r = await api('/api/restart', {});
    if (!r) return;
    toast('Memulai ulang…');
    await new Promise((res) => setTimeout(res, 1200));
    for (let i = 0; i < 60; i++) {
      try {
        const x = await fetch('/api/tree', { cache: 'no-store' });
        if (x.ok) {
          location.reload();
          return;
        }
      } catch {}
      await new Promise((res) => setTimeout(res, 500));
    }
    toast('Server belum menyala. Jalankan _app\\start.bat secara manual.');
  });

  async function renderTrash() {
    document.title = 'Sampah · AI Note';
    el.content.innerHTML = '<div class="muted">Memuat...</div>';
    let items;
    try {
      items = (await fetchJson('/api/trash')).items;
    } catch (err) {
      if (currentPath !== '_trash') return;
      el.content.innerHTML = `<div class="empty"><p><strong>Gagal memuat sampah</strong></p><p>${esc(err.message)}</p><p>Jika server belum dijalankan ulang setelah pembaruan, jalankan ulang start.bat.</p></div>`;
      return;
    }
    if (currentPath !== '_trash') return;
    updateTrashBadge(items.length);
    const rows = items
      .map(
        (it) =>
          `<div class="card trash-item"><a class="trash-main" href="${hashFor('_trash/' + it.id)}">${icon(it.type === 'dir' ? 'folder' : 'file')}<div class="trash-text"><div class="trash-title">${esc(it.title || it.name)}</div><div class="trash-from muted">Asal: ${esc(it.from)}${it.type === 'dir' ? ` · ${it.notes} catatan` : ''} · Dihapus ${esc(fmt(it.deleted))}</div></div></a><div class="trash-actions"><button type="button" class="btn btn-outline btn-sm" data-trash="restore" data-id="${esc(it.id)}">Pulihkan</button><button type="button" class="btn btn-ghost btn-sm btn-danger-text" data-trash="purge" data-id="${esc(it.id)}">${icon('trash')}<span>Hapus permanen</span></button></div></div>`,
      )
      .join('');
    el.content.innerHTML = `<h1 class="page-title">Sampah</h1><p class="page-desc">${items.length ? `${items.length} item.` : 'Kosong.'} Item yang dihapus dari aplikasi disimpan di sini sampai Anda menghapusnya permanen.</p>${
      items.length
        ? `<div class="dir-actions"><button type="button" class="btn btn-outline btn-sm btn-danger-text" data-trash="empty">${icon('trash')}<span>Kosongkan sampah</span></button></div><div class="trash-list">${rows}</div>`
        : '<div class="empty">Tidak ada item di sampah.</div>'
    }`;
  }

  el.content.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-trash]');
    if (!b) return;
    const kind = b.dataset.trash;
    const id = b.dataset.id;
    let restoredPath = null;
    if (kind === 'restore') {
      const r = await api('/api/trash/restore', { id });
      if (!r) return;
      restoredPath = r.path;
      toast('Dipulihkan ke ' + r.path);
    } else if (kind === 'purge') {
      const ok = await modal({
        title: 'Hapus permanen?',
        description: 'Item ini akan dihapus dari komputer dan tidak bisa dipulihkan lagi.',
        confirmLabel: 'Hapus permanen',
        destructive: true,
      });
      if (!ok || !(await api('/api/trash/purge', { id }))) return;
    } else if (kind === 'empty') {
      const ok = await modal({
        title: 'Kosongkan sampah?',
        description: 'Semua item di sampah akan dihapus dari komputer dan tidak bisa dipulihkan lagi.',
        confirmLabel: 'Kosongkan',
        destructive: true,
      });
      if (!ok || !(await api('/api/trash/purge', { all: true }))) return;
    }
    try {
      await loadTree();
    } catch {}
    if (currentPath === '_trash') renderTrash();
    else if (currentPath.startsWith('_trash/')) location.hash = restoredPath ? hashFor(restoredPath) : '#/_trash';
  });

  // Lihat isi item di sampah (hanya baca): catatan ditampilkan, folder menampilkan isinya.
  async function renderTrashItem() {
    const at = currentPath;
    const parts = at.split('/').slice(1);
    const id = parts[0];
    const subParts = parts.slice(1);
    document.title = 'Sampah · AI Note';
    el.content.innerHTML = '<div class="muted">Memuat...</div>';

    let data;
    try {
      data = await fetchJson('/api/trash/item?id=' + encodeURIComponent(id) + '&sub=' + encodeURIComponent(subParts.join('/')));
    } catch (err) {
      if (currentPath !== at) return;
      el.content.innerHTML = `<div class="empty"><p><strong>Tidak bisa membuka item di sampah</strong></p><p>${esc(err.message)}</p><a class="btn btn-outline" href="#/_trash">Kembali ke sampah</a></div>`;
      return;
    }
    if (currentPath !== at) return;

    // Breadcrumb: AI Note > Sampah > nama item > subfolder...
    const sep = `<span class="sep">${icon('chevron')}</span>`;
    const rootHref = hashFor('_trash/' + id);
    const crumbs = [`<a href="#/">AI Note</a>`, sep, `<a href="#/_trash">Sampah</a>`, sep];
    crumbs.push(subParts.length ? `<a href="${rootHref}">${esc(data.name.replace(/\.md$/i, ''))}</a>` : `<span class="current">${esc(data.name.replace(/\.md$/i, ''))}</span>`);
    subParts.forEach((part, i) => {
      const last = i === subParts.length - 1;
      const label = esc(part.replace(/\.md$/i, ''));
      crumbs.push(sep, last ? `<span class="current">${label}</span>` : `<a href="${hashFor('_trash/' + id + '/' + subParts.slice(0, i + 1).join('/'))}">${label}</a>`);
    });
    el.breadcrumb.innerHTML = crumbs.join('');

    const banner = `<div class="trash-banner"><span>Item ini ada di sampah dan hanya bisa dibaca. Asal: <strong>${esc(data.from)}</strong></span><span class="spacer"></span><button type="button" class="btn btn-outline btn-sm" data-trash="restore" data-id="${esc(id)}">Pulihkan</button><button type="button" class="btn btn-ghost btn-sm btn-danger-text" data-trash="purge" data-id="${esc(id)}">${icon('trash')}<span>Hapus permanen</span></button></div>`;

    if (data.type === 'dir') {
      const base = '_trash/' + id + (data.sub ? '/' + data.sub : '');
      const cards = data.children
        .map((c) =>
          c.type === 'dir'
            ? `<a class="card" href="${hashFor(base + '/' + c.name)}"><div class="card-header"><h3 class="card-title">${icon('folder')}<span>${esc(c.name)}</span></h3><p class="card-desc">${c.notes} catatan</p></div></a>`
            : `<a class="card" href="${hashFor(base + '/' + c.name)}"><div class="card-header"><h3 class="card-title">${icon('file')}<span>${esc(c.title || c.name)}</span></h3><p class="card-desc">${esc(c.name)}</p></div></a>`,
        )
        .join('');
      el.content.innerHTML = `${banner}<h1 class="page-title">${esc(subParts.length ? subParts[subParts.length - 1] : data.name)}</h1><p class="page-desc">${data.children.length ? `${data.children.length} item di dalam folder ini.` : 'Folder ini kosong.'}</p>${cards ? `<div class="grid">${cards}</div>` : ''}`;
      return;
    }

    el.content.innerHTML = `${banner}<article><div class="note-meta"><span class="muted">Dibuat ${esc(fmt(data.created))}</span><span class="muted">·</span><span class="muted">Diubah ${esc(fmt(data.modified))}</span></div><div class="prose" id="prose">${data.html}</div></article>`;
    enhanceProse($('#prose'), data.from);
  }

  // ---------- Sidebar mobile ----------
  function openSidebar() {
    el.sidebar.classList.add('open');
    el.scrim.classList.add('show');
  }
  function closeSidebar() {
    el.sidebar.classList.remove('open');
    el.scrim.classList.remove('show');
  }
  const mobileQuery = window.matchMedia('(max-width: 860px)');
  const appEl = $('.app');
  if (store.get('sidebar', 'open') === 'closed') appEl.classList.add('sidebar-collapsed');

  function toggleSidebar() {
    if (mobileQuery.matches) {
      if (el.sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    } else {
      const collapsed = appEl.classList.toggle('sidebar-collapsed');
      store.set('sidebar', collapsed ? 'closed' : 'open');
    }
  }
  $('#menu-btn').addEventListener('click', toggleSidebar);
  el.scrim.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // ---------- Dialog pencarian ----------
  let results = [];
  let active = 0;
  let timer = null;
  let seq = 0;
  let terms = [];

  function highlight(text, list) {
    if (!list.length) return esc(text);
    const re = new RegExp('(' + list.map(reEsc).join('|') + ')', 'gi');
    return text
      .split(re)
      .map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)))
      .join('');
  }

  function renderResults(q) {
    if (!results.length) {
      const where = scopePath ? ` di folder ${esc(scopePath)}` : '';
      el.cmdList.innerHTML = `<div class="cmd-empty">${q ? `Tidak ada hasil untuk "${esc(q)}"${where}.` : `Belum ada catatan${where}.`}</div>`;
      return;
    }
    const label = q ? `Hasil (${results.length})` : 'Terakhir diubah';
    el.cmdList.innerHTML =
      `<div class="cmd-group">${label}</div>` +
      results
        .map(
          (r, i) =>
            `<button type="button" class="cmd-item" role="option" data-i="${i}" aria-selected="${i === active}">${icon('file')}<div class="cmd-text"><div class="cmd-title">${highlight(r.title, terms)}</div><div class="cmd-path">${highlight(r.path, terms)}</div>${r.snippet ? `<div class="cmd-snippet">${highlight(r.snippet, terms)}</div>` : ''}</div></button>`,
        )
        .join('');
  }

  function setActive(i, scroll = true) {
    if (!results.length) return;
    active = (i + results.length) % results.length;
    el.cmdList.querySelectorAll('.cmd-item').forEach((b, idx) => {
      b.setAttribute('aria-selected', String(idx === active));
      if (scroll && idx === active) b.scrollIntoView({ block: 'nearest' });
    });
  }

  async function runSearch(q) {
    const mine = ++seq;
    terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    try {
      const scope = scopePath;
      const data = await fetchJson('/api/search?q=' + encodeURIComponent(q) + (scope ? '&folder=' + encodeURIComponent(scope) : ''));
      if (mine !== seq) return;
      results = data.results;
      active = 0;
      renderResults(q);
    } catch (err) {
      if (mine !== seq) return;
      el.cmdList.innerHTML = `<div class="cmd-empty">Gagal mencari: ${esc(err.message)}</div>`;
    }
  }

  // Filter folder pencarian: tombol di kanan kolom cari, popup berisi pohon folder. Bawaan: semua folder.
  let scopePath = '';
  const scopeOpen = new Set();
  const scopeBtn = $('#scope-btn');
  const scopePop = $('#scope-pop');
  $('#scope-icon').innerHTML = icon('folder');

  function updateScopeBtn() {
    $('#scope-label').textContent = scopePath ? scopePath.split('/').pop() : 'Semua folder';
    scopeBtn.title = scopePath ? 'Folder: ' + scopePath : 'Batasi pencarian ke folder';
    scopeBtn.classList.toggle('active', !!scopePath);
    $('#scope-clear').hidden = !scopePath;
    el.cmdInput.placeholder = scopePath ? `Cari di folder ${scopePath}...` : 'Cari di semua catatan...';
  }

  function scopeRows(node, depth, out) {
    node.children
      .filter((c) => c.type === 'dir')
      .forEach((d) => {
        const subs = d.children.some((c) => c.type === 'dir');
        const open = scopeOpen.has(d.path);
        out.push(
          `<div class="scope-row${scopePath === d.path ? ' selected' : ''}" role="treeitem" data-path="${esc(d.path)}" style="padding-left:${0.375 + depth * 1}rem" aria-selected="${scopePath === d.path}"><span class="scope-chev${subs ? '' : ' none'}${open ? ' open' : ''}" data-toggle="${esc(d.path)}">${subs ? icon('chevron') : ''}</span>${icon('folder')}<span class="scope-name">${esc(d.name)}</span><span class="scope-count">${countFiles(d)}</span></div>`,
        );
        if (subs && open) scopeRows(d, depth + 1, out);
      });
  }

  function renderScope() {
    const out = [
      `<div class="scope-row${scopePath === '' ? ' selected' : ''}" role="treeitem" data-path="" aria-selected="${scopePath === ''}"><span class="scope-chev none"></span>${icon('folder')}<span class="scope-name">Semua folder</span></div>`,
    ];
    scopeRows(nodeIndex.get(''), 0, out);
    scopePop.innerHTML = out.join('');
  }

  function openScope() {
    // Buka cabang menuju folder terpilih.
    if (scopePath) {
      const segs = scopePath.split('/');
      for (let i = 1; i < segs.length; i++) scopeOpen.add(segs.slice(0, i).join('/'));
    }
    renderScope();
    scopePop.hidden = false;
    scopeBtn.setAttribute('aria-expanded', 'true');
    const sel = scopePop.querySelector('.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function closeScope() {
    scopePop.hidden = true;
    scopeBtn.setAttribute('aria-expanded', 'false');
  }
  function setScope(p) {
    scopePath = p;
    updateScopeBtn();
    closeScope();
    runSearch(el.cmdInput.value.trim());
    el.cmdInput.focus();
  }

  scopeBtn.addEventListener('click', (e) => {
    if (e.target.id === 'scope-clear') {
      setScope('');
      return;
    }
    if (scopePop.hidden) openScope();
    else closeScope();
  });
  scopePop.addEventListener('click', (e) => {
    e.stopPropagation(); // isi popup dirender ulang, jangan dianggap klik di luar
    const tg = e.target.closest('[data-toggle]');
    if (tg && tg.classList.contains('none') === false) {
      const p = tg.dataset.toggle;
      if (scopeOpen.has(p)) scopeOpen.delete(p);
      else scopeOpen.add(p);
      const top = scopePop.scrollTop;
      renderScope();
      scopePop.scrollTop = top;
      return;
    }
    const row = e.target.closest('.scope-row');
    if (row) setScope(row.dataset.path);
  });
  document.addEventListener('click', (e) => {
    if (!scopePop.hidden && !e.target.closest('.scope-wrap')) closeScope();
  });
  // Esc menutup popup dulu, baru dialog.
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && !scopePop.hidden) {
        e.preventDefault();
        e.stopPropagation();
        closeScope();
        el.cmdInput.focus();
      }
    },
    true,
  );

  function openDialog() {
    // Bawaan: folder yang sedang dibuka (atau folder induk catatan yang sedang dibuka).
    let sp = /\.md$/i.test(currentPath) ? currentPath.split('/').slice(0, -1).join('/') : currentPath;
    if (sp === '_trash' || sp.startsWith('_trash/')) sp = '';
    scopePath = sp;
    closeScope();
    updateScopeBtn();
    el.dialog.hidden = false;
    el.cmdInput.value = '';
    el.cmdInput.focus();
    runSearch('');
  }
  function closeDialog() {
    el.dialog.hidden = true;
  }
  function openResult(i) {
    const r = results[i];
    if (!r) return;
    closeDialog();
    location.hash = hashFor(r.path);
  }

  $('#open-search').addEventListener('click', openDialog);
  $('#dialog-overlay').addEventListener('click', closeDialog);
  el.cmdInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(el.cmdInput.value.trim()), 120);
  });
  el.cmdInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      openResult(active);
    }
  });
  el.cmdList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) openResult(Number(b.dataset.i));
  });
  el.cmdList.addEventListener('mousemove', (e) => {
    const b = e.target.closest('[data-i]');
    if (b && Number(b.dataset.i) !== active) setActive(Number(b.dataset.i), false);
  });

  // Klik gambar di catatan untuk memperbesar. Klik lagi untuk ukuran asli, Esc atau klik latar untuk menutup.
  function openLightbox(src, alt) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<div class="lightbox-bar"><span class="lightbox-cap"></span><span class="lightbox-hint">Klik gambar untuk ukuran asli · Esc untuk menutup</span><button type="button" class="btn btn-outline btn-sm" data-close>Tutup</button></div><div class="lightbox-stage"><img alt=""></div>';
    const img = box.querySelector('img');
    img.src = src;
    img.alt = alt || '';
    box.querySelector('.lightbox-cap').textContent = alt || '';
    const close = () => {
      document.removeEventListener('keydown', onKey, true);
      box.remove();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    box.addEventListener('click', (e) => {
      if (e.target === img) {
        box.classList.toggle('actual');
      } else if (e.target === box || e.target.matches('.lightbox-stage, [data-close]')) {
        close();
      }
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(box);
  }
  document.addEventListener('click', (e) => {
    const img = e.target instanceof Element ? e.target.closest('.prose img') : null;
    if (img && img.getAttribute('src')) openLightbox(img.currentSrc || img.src, img.alt);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (el.dialog.hidden) openDialog();
      else closeDialog();
    } else if (e.key === 'Escape' && !el.dialog.hidden) {
      closeDialog();
    } else if (e.key === '/' && el.dialog.hidden && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      e.preventDefault();
      openDialog();
    }
  });

  // ---------- Mulai ----------
  window.addEventListener('hashchange', route);

  // Muat ulang daftar saat jendela kembali aktif, supaya catatan baru muncul.
  let refreshing = false;
  window.addEventListener('focus', async () => {
    if (refreshing) return;
    refreshing = true;
    try {
      if (await loadTree()) route();
    } catch {}
    refreshing = false;
  });

  loadTree()
    .then(route)
    .catch((err) => {
      el.content.innerHTML = `<div class="empty"><p><strong>Gagal memuat catatan</strong></p><p>${esc(err.message)}</p></div>`;
    });
})();
