(() => {
  'use strict';

  // Sesi habis atau belum login: kembali ke halaman login.
  const rawFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await rawFetch(...args);
    if (res.status === 401) location.href = '/login.html';
    return res;
  };

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
    moreV: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
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
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
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
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    chevronUp: '<path d="m18 15-6-6-6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    wrapText: '<line x1="3" x2="21" y1="6" y2="6"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><polyline points="16 16 14 18 16 20"/><line x1="3" x2="10" y1="18" y2="18"/>',
    folderOpen: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
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
  let activeViewerCleanup = null; // pembersih penampil lampiran aktif saat pindah halaman
  let pendingScroll = null; // posisi scroll yang dipulihkan saat kembali/maju
  let pendingJump = null; // {path, terms}: setelah catatan dibuka dari pencarian, loncat ke kata yang dicari
  let pendingEdit = null; // path catatan baru yang langsung dibuka di editor
  let authInfo = { auth: false, user: null, role: 'admin', readOnly: false };
  const isReadOnly = () => !!authInfo.readOnly;
  window.isReadOnlyUser = isReadOnly;
  const collapsed = new Set(JSON.parse(store.get('collapsed', '[]')));

  const el = {
    sidebar: $('#sidebar'),
    scrim: $('#scrim'),
    tree: $('#tree'),
    count: $('#count'),
    content: $('#content'),
    breadcrumb: $('#breadcrumb'),
    panel: $('#search-panel'),
    cmdInput: $('#cmd-input'),
    cmdList: $('#cmd-list'),
    themeToggle: $('#theme-toggle'),
  };

  // Pengaturan dari _app/settings.json. imageResize: ubah ukuran gambar di editor visual (bawaan mati).
  let notesBaseDir = '';
  let pathSep = '\\';
  let shareOrigin = null;
  document.documentElement.classList.add('no-image-resize');
  fetch('/api/settings')
    .then((r) => (r.ok ? r.json() : {}))
    .then((s) => {
      document.documentElement.classList.toggle('no-image-resize', !s.imageResize);
      if (s.notesDir) notesBaseDir = s.notesDir;
      if (s.sep) pathSep = s.sep;
      if (s.shareOrigin) shareOrigin = s.shareOrigin;
    })
    .catch(() => {});

  function shareOriginBase() {
    const curHost = location.hostname.toLowerCase();
    const isLocal = curHost === 'localhost' || curHost === '127.0.0.1' || curHost === '::1';
    return isLocal && shareOrigin ? shareOrigin : location.origin;
  }

  function shareUrlFor(p) {
    const origin = shareOriginBase();
    const clean = String(p || '').replace(/^\/+|\/+$/g, '');
    return clean ? `${origin}/?open=${encodeURIComponent(clean)}` : `${origin}/`;
  }

  function publicShareUrl(urlPath) {
    return urlPath ? `${shareOriginBase()}${urlPath}` : '';
  }

  async function copyTextSafe(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {}
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    return ok;
  }

  async function copyShareLink(p) {
    const url = shareUrlFor(p);
    const ok = await copyTextSafe(url);
    if (ok) {
      const curHost = location.hostname.toLowerCase();
      const isLocal = curHost === 'localhost' || curHost === '127.0.0.1' || curHost === '::1';
      if (isLocal && !shareOrigin) {
        toast('Link disalin (masih localhost; atur host "0.0.0.0" di settings.json untuk intranet)');
      } else {
        toast('Link disalin');
      }
      return;
    }
    await modal({
      title: 'Salin link',
      description: 'Salin URL berikut untuk dibagikan di jaringan internal:',
      fields: [{ name: 'link', label: 'Link', value: url }],
      confirmLabel: 'Tutup',
    });
  }

  // ---------- Inisialisasi ikon statis ----------
  $('#brand-logo').innerHTML = icon('book');
  $('#open-search').innerHTML = icon('search');
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
    const label = node.type === 'dir' ? 'Aksi folder' : 'Aksi catatan';
    return `<span class="row-actions"><button type="button" class="icon-btn" data-act="menu" data-path="${p}" title="${label}" aria-label="${label}" aria-haspopup="menu">${icon('more')}</button></span>`;
  }

  // Menu titik tiga di baris sidebar: tiap aksi punya deskripsi singkat.
  let rowMenuEl = null;
  function closeRowMenu() {
    if (!rowMenuEl) return;
    rowMenuEl.remove();
    rowMenuEl = null;
    document.querySelectorAll('.tree-row.menu-open').forEach((r) => r.classList.remove('menu-open'));
    document.removeEventListener('click', onRowMenuDoc, true);
    document.removeEventListener('keydown', onRowMenuKey, true);
    document.removeEventListener('scroll', closeRowMenu, true);
    window.removeEventListener('resize', closeRowMenu);
  }
  function onRowMenuDoc(e) {
    if (rowMenuEl && !rowMenuEl.contains(e.target)) closeRowMenu();
  }
  function onRowMenuKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeRowMenu();
    }
  }
  function openRowMenu(btn, p) {
    const reopen = rowMenuEl && rowMenuEl.dataset.path === p;
    closeRowMenu();
    if (reopen) return;
    const node = nodeIndex.get(p);
    if (!node) return;
    const items = isReadOnly()
      ? [['copy-link', 'link', 'Salin link', 'Bagikan link ke pengguna di jaringan internal']]
      : node.type === 'dir'
        ? [
            ['copy-link', 'link', 'Salin link', 'Bagikan link folder ini di jaringan internal'],
            ['new-note', 'filePlus', 'Catatan baru', 'Buat catatan baru di folder ini'],
            ['new-folder', 'folderPlus', 'Folder baru', 'Buat subfolder di dalam folder ini'],
            ['rename', 'pencil', 'Ganti nama folder', 'Ubah nama folder, lampiran ikut diganti'],
            ['delete', 'trash', 'Hapus folder', 'Pindahkan ke _trash, masih bisa dipulihkan', true],
          ]
        : [
            ['copy-link', 'link', 'Salin link', 'Bagikan link catatan ini di jaringan internal'],
            ['rename', 'pencil', 'Ganti nama file', 'Ubah nama file, lampiran ikut diganti'],
            ['delete', 'trash', 'Hapus catatan', 'Pindahkan ke _trash, masih bisa dipulihkan', true],
          ];
    const m = document.createElement('div');
    m.className = 'menu row-menu';
    m.setAttribute('role', 'menu');
    m.dataset.path = p;
    m.innerHTML = items
      .map(
        ([act, ic, label, desc, danger]) =>
          `<button type="button" role="menuitem" class="with-icon has-desc${danger ? ' danger' : ''}" data-act="${act}">${icon(ic)}<span class="mi-text"><span class="mi-label">${label}</span><span class="mi-desc">${desc}</span></span></button>`,
      )
      .join('');
    document.body.appendChild(m);
    const r = btn.getBoundingClientRect();
    const mw = m.offsetWidth;
    const mh = m.offsetHeight;
    let left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
    let top = r.bottom + 4;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    rowMenuEl = m;
    const row = btn.closest('.tree-row');
    if (row) row.classList.add('menu-open');
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      closeRowMenu();
      if (act === 'copy-link') copyShareLink(p);
      else if (act === 'new-note') actionNewNote(p);
      else if (act === 'new-folder') actionNewFolder(p);
      else if (act === 'rename') actionRename(p);
      else if (act === 'delete') actionDelete(p);
    });
    document.addEventListener('click', onRowMenuDoc, true);
    document.addEventListener('keydown', onRowMenuKey, true);
    document.addEventListener('scroll', closeRowMenu, true);
    window.addEventListener('resize', closeRowMenu);
    if (window.gsap) gsap.fromTo(m, { opacity: 0, y: -4, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.14, ease: 'power2.out' });
  }

  function renderNode(node, depth) {
    const p = esc(node.path);
    const dragAttr = isReadOnly() ? 'false' : 'true';
    if (node.type === 'file') {
      const active = node.path === currentPath ? ' active' : '';
      return `<div class="tree-row" draggable="${dragAttr}" data-type="file" data-path="${p}"><a class="tree-item tree-file${active}" style="--depth:${depth}" href="${hashFor(node.path)}" title="${p}" draggable="false">${icon('file')}<span class="label">${esc(node.title || node.name)}</span></a>${rowActions(node)}</div>`;
    }
    const open = !collapsed.has(node.path);
    const dirActive = node.path === currentPath ? ' active' : '';
    const children = node.children.map((c) => renderNode(c, depth + 1)).join('');
    return `<div class="tree-group"><div class="tree-row" draggable="${dragAttr}" data-type="dir" data-path="${p}"><button type="button" class="tree-item tree-dir${dirActive}" style="--depth:${depth}" data-dir="${p}" aria-expanded="${open}"><span class="chev">${icon('chevron')}</span>${icon('folder')}<span class="label">${esc(node.name)}</span><span class="count">${countFiles(node)}</span></button>${rowActions(node)}</div><div class="tree-children"${open ? '' : ' hidden'}>${children}</div></div>`;
  }

  function renderTree() {
    if (document.body.classList.contains('kanban-mode')) return;
    if (!rootNode) return;
    if (!rootNode.children.length) {
      el.tree.innerHTML = '<div class="empty">Belum ada catatan.</div>';
      return;
    }
    el.tree.innerHTML = rootNode.children.map((c) => renderNode(c, 0)).join('');
  }
  window.renderNoteTree = () => {
    if (!rootNode) return;
    if (!rootNode.children.length) {
      el.tree.innerHTML = '<div class="empty">Belum ada catatan.</div>';
      return;
    }
    el.tree.innerHTML = rootNode.children.map((c) => renderNode(c, 0)).join('');
    updateTreeActive();
  };

  function updateTreeActive() {
    el.tree.querySelectorAll('.tree-item.active').forEach((x) => x.classList.remove('active'));
    if (!currentPath) return;
    const escPath = currentPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const dirBtn = el.tree.querySelector(`.tree-dir[data-dir="${escPath}"]`);
    if (dirBtn) dirBtn.classList.add('active');
    const fileRow = el.tree.querySelector(`.tree-row[data-type="file"][data-path="${escPath}"] .tree-file`);
    if (fileRow) fileRow.classList.add('active');
  }

  function toggleTreeGroup(dirPath, forceState, animate = true) {
    const escPath = dirPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const btn = el.tree.querySelector(`.tree-dir[data-dir="${escPath}"]`);
    if (!btn) return;
    const group = btn.closest('.tree-group');
    if (!group) return;
    const children = group.querySelector(':scope > .tree-children');
    if (!children) return;

    const isCurrentlyOpen = btn.getAttribute('aria-expanded') === 'true' && !children.hidden;
    const shouldOpen = forceState !== undefined ? !!forceState : !isCurrentlyOpen;
    if (shouldOpen === isCurrentlyOpen) return;

    if (shouldOpen) {
      collapsed.delete(dirPath);
      store.set('collapsed', JSON.stringify([...collapsed]));
      btn.setAttribute('aria-expanded', 'true');
      children.hidden = false;
      if (animate && window.gsap) {
        gsap.killTweensOf(children);
        children.style.overflow = 'hidden';
        const currentH = children.offsetHeight;
        children.style.height = 'auto';
        const targetH = children.scrollHeight;
        children.style.height = currentH + 'px';
        gsap.to(children, {
          height: targetH,
          opacity: 1,
          duration: Math.min(0.3, Math.max(0.18, targetH * 0.0008 + 0.15)),
          ease: 'power2.out',
          onComplete: () => {
            children.style.height = '';
            children.style.overflow = '';
            children.style.opacity = '';
          },
        });
        const childRows = children.querySelectorAll(':scope > .tree-row, :scope > .tree-group > .tree-row');
        if (childRows.length && childRows.length <= 25) {
          gsap.killTweensOf(childRows);
          gsap.fromTo(
            childRows,
            { opacity: 0, x: -4 },
            { opacity: 1, x: 0, duration: 0.18, stagger: 0.015, ease: 'power1.out' }
          );
        }
      }
    } else {
      collapsed.add(dirPath);
      store.set('collapsed', JSON.stringify([...collapsed]));
      btn.setAttribute('aria-expanded', 'false');
      if (animate && window.gsap) {
        gsap.killTweensOf(children);
        children.style.overflow = 'hidden';
        const currentH = children.offsetHeight;
        gsap.to(children, {
          height: 0,
          opacity: 0,
          duration: Math.min(0.24, Math.max(0.14, currentH * 0.0007 + 0.12)),
          ease: 'power2.inOut',
          onComplete: () => {
            children.hidden = true;
            children.style.height = '';
            children.style.overflow = '';
            children.style.opacity = '';
          },
        });
      } else {
        children.hidden = true;
      }
    }
  }

  // ---------- Bottom Sheet untuk Mobile (Aksi Long-Press) ----------
  function openBottomSheet(path, type) {
    const node = nodeIndex.get(path);
    const title = node ? (node.title || node.name) : (path.split('/').pop() || path);
    const isDir = type === 'dir';
    const ro = isReadOnly();

    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `
      <div class="sheet-overlay"></div>
      <div class="sheet-content" role="dialog" aria-modal="true" aria-label="Aksi untuk ${esc(title)}">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <div class="sheet-icon">${icon(isDir ? 'folder' : 'file')}</div>
          <div class="sheet-head-text">
            <div class="sheet-title">${esc(title)}</div>
            <div class="sheet-desc">${esc(path)}</div>
          </div>
        </div>
        <div class="sheet-actions">
          <button type="button" class="sheet-btn" data-act="open">${icon(isDir ? 'folder' : 'file')}<span>Buka ${isDir ? 'folder' : 'catatan'}</span></button>
          <button type="button" class="sheet-btn" data-act="copy-link">${icon('link')}<span>Salin link</span></button>
          ${ro ? '' : isDir ? `
            <button type="button" class="sheet-btn" data-act="new-note">${icon('filePlus')}<span>Catatan baru di folder ini</span></button>
            <button type="button" class="sheet-btn" data-act="new-folder">${icon('folderPlus')}<span>Folder baru di sini</span></button>
            <button type="button" class="sheet-btn" data-act="rename">${icon('pencil')}<span>Ganti nama folder</span></button>
            <button type="button" class="sheet-btn danger" data-act="delete">${icon('trash')}<span>Hapus folder</span></button>
          ` : `
            <button type="button" class="sheet-btn" data-act="rename">${icon('pencil')}<span>Ganti nama file</span></button>
            <button type="button" class="sheet-btn danger" data-act="delete">${icon('trash')}<span>Hapus catatan</span></button>
          `}
        </div>
        <button type="button" class="sheet-cancel">Batal</button>
      </div>
    `;
    document.body.appendChild(wrap);

    const overlay = wrap.querySelector('.sheet-overlay');
    const content = wrap.querySelector('.sheet-content');

    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      document.removeEventListener('keydown', onKey, true);
      if (window.gsap) {
        gsap.to(content, { y: '100%', duration: 0.2, ease: 'power2.in' });
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => wrap.remove(),
        });
      } else {
        wrap.remove();
      }
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('click', close);
    wrap.querySelector('.sheet-cancel').addEventListener('click', close);

    wrap.querySelector('.sheet-actions').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      close();
      if (act === 'copy-link') copyShareLink(path);
      else if (act === 'new-note') actionNewNote(path);
      else if (act === 'new-folder') actionNewFolder(path);
      else if (act === 'rename') actionRename(path);
      else if (act === 'delete') actionDelete(path);
      else if (act === 'open') location.hash = hashFor(path);
    });

    if (window.gsap) {
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' });
      gsap.fromTo(content, { y: '100%' }, { y: '0%', duration: 0.28, ease: 'power3.out' });
    }
  }

  // Deteksi Long-Press (~450ms) pada baris pohon di layar sentuh
  let lpTimer = null;
  let lpStartX = 0;
  let lpStartY = 0;
  let lpRow = null;
  let suppressClick = false;

  el.tree.addEventListener(
    'touchstart',
    (e) => {
      const row = e.target.closest('.tree-row');
      if (!row) return;
      const touch = e.touches[0];
      lpStartX = touch.clientX;
      lpStartY = touch.clientY;
      lpRow = row;
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => {
        suppressClick = true;
        if (navigator.vibrate) {
          try {
            navigator.vibrate(25);
          } catch {}
        }
        if (window.gsap) {
          gsap.fromTo(lpRow, { scale: 0.98 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
        }
        openBottomSheet(lpRow.dataset.path, lpRow.dataset.type);
        setTimeout(() => {
          suppressClick = false;
        }, 400);
      }, 450);
    },
    { passive: true },
  );

  el.tree.addEventListener(
    'touchmove',
    (e) => {
      if (!lpTimer) return;
      const touch = e.touches[0];
      if (Math.hypot(touch.clientX - lpStartX, touch.clientY - lpStartY) > 10) {
        clearTimeout(lpTimer);
        lpTimer = null;
      }
    },
    { passive: true },
  );

  el.tree.addEventListener(
    'touchend',
    () => {
      clearTimeout(lpTimer);
      lpTimer = null;
    },
    { passive: true },
  );

  el.tree.addEventListener(
    'touchcancel',
    () => {
      clearTimeout(lpTimer);
      lpTimer = null;
    },
    { passive: true },
  );

  // Klik kanan di desktop atau long-press contextmenu
  el.tree.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.tree-row');
    if (row) {
      e.preventDefault();
      openBottomSheet(row.dataset.path, row.dataset.type);
    }
  });

  el.tree.addEventListener('click', (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      const p = act.dataset.path;
      if (act.dataset.act === 'menu') {
        e.preventDefault();
        e.stopPropagation();
        openRowMenu(act, p);
        return;
      }
      if (act.dataset.act === 'new-note') actionNewNote(p);
      else if (act.dataset.act === 'new-folder') actionNewFolder(p);
      else if (act.dataset.act === 'rename') actionRename(p);
      else if (act.dataset.act === 'delete') actionDelete(p);
      return;
    }
    const btn = e.target.closest('[data-dir]');
    if (!btn) return;
    const p = btn.dataset.dir;

    // Klik panah, atau klik folder yang sedang dibuka: buka/tutup saja dengan animasi GSAP.
    if (e.target.closest('.chev') || currentPath === p) {
      toggleTreeGroup(p);
      return;
    }
    // Klik folder lain: tampilkan isinya di sisi kanan dan buka cabangnya.
    toggleTreeGroup(p, true, true);
    location.hash = hashFor(p);
  });

  function expandTo(p, animate = true) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/');
      toggleTreeGroup(dir, true, animate);
    }
  }

  // ---------- Routing ----------
  const WORD_EXT = /\.docx?$/i;
  const TEXT_CODE_EXT = /\.(txt|log|sql|csv|tsv|json|xml|html|htm|css|scss|less|js|mjs|cjs|jsx|ts|mts|cts|tsx|py|cs|java|go|php|rb|rs|c|h|cpp|hpp|sh|bash|ps1|bat|cmd|yaml|yml|toml|ini|conf|env|properties|md|diff|patch|http)$/i;
  const VIEWABLE = /\.(pdf|docx?|txt|log|sql|csv|tsv|json|xml|html|htm|css|scss|less|js|mjs|cjs|jsx|ts|mts|cts|tsx|py|cs|java|go|php|rb|rs|c|h|cpp|hpp|sh|bash|ps1|bat|cmd|yaml|yml|toml|ini|conf|env|properties|md|diff|patch|http)$/i;
  const VIEW_PREFIX = '~lihat/';
  const DRAFT_PATH = '~tulis'; // Live Preview Markdown (draf tanpa file)
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
      if (editing.dirty && !editing.draft && !(await AppDialog.confirm({ title: 'Tinggalkan halaman ini?', message: 'Perubahan belum disimpan dan akan hilang jika Anda pindah.', confirmLabel: 'Tinggalkan', cancelLabel: 'Tetap di sini', destructive: true }))) {
        location.hash = hashFor(editing.path);
        return;
      }
      if (editing.draft) saveDraftLocal(true);
      cleanupUploads(editing, null);
      stopEditing();
    }
    const navigated = nextPath !== currentPath;
    if (activeViewerCleanup) {
      activeViewerCleanup();
      activeViewerCleanup = null;
    }
    currentPath = nextPath;
    closeSidebar();
    if (!el.tree.querySelector('.tree-row')) {
      renderTree();
    } else {
      updateTreeActive();
      if (currentPath) expandTo(currentPath, true);
      if (navigated) {
        const target = nodeIndex.get(currentPath);
        if (target && target.type === 'dir') {
          toggleTreeGroup(currentPath, true, true);
        }
      }
    }
    renderBreadcrumb();
    if (pendingScroll === null) window.scrollTo(0, 0);
    $('#trash-btn').classList.toggle('active', currentPath === '_trash' || currentPath.startsWith('_trash/'));
    if (currentPath.startsWith(VIEW_PREFIX)) {
      await renderViewer(currentPath.slice(VIEW_PREFIX.length));
      restoreScroll();
      return;
    }
    if (currentPath === DRAFT_PATH) {
      startDraft();
      return;
    }
    if (currentPath === '_recordings' || currentPath.startsWith('_recordings/')) {
      const focusId = currentPath.startsWith('_recordings/') ? currentPath.slice('_recordings/'.length) : '';
      if (typeof window.renderRecordingsPage === 'function') {
        await window.renderRecordingsPage(focusId);
      }
      return;
    }
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
    restoreScroll();
  }

  // Pulihkan posisi scroll ke target ({ y, atBottom, ratio } atau angka pixel), menunggu editor/gambar siap bila perlu.
  function applyScrollRestore(target, opts = {}) {
    let done = false;
    const isAlive = () => (!opts.active || opts.active());
    const finishLayout = () => {
      if (done) return;
      done = true;
      el.content.style.minHeight = '';
      if (opts.onReady) opts.onReady();
    };
    if (target === null || target === undefined) {
      finishLayout();
      return;
    }
    let touched = false;
    const stop = () => (touched = true);
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => window.addEventListener(t, stop, { once: true, passive: true }));
    const resolveY = () => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (typeof target === 'number') return target;
      if (target.ratio !== null && target.ratio !== undefined) return Math.round(target.ratio * max);
      if (target.atBottom) return Math.max(target.y, max);
      return target.y;
    };
    const imgScope = opts.scope || el.content;
    const imgsReady = () => {
      const imgs = imgScope ? imgScope.querySelectorAll('img') : [];
      for (const img of imgs) {
        if (!img.complete) return false;
      }
      return true;
    };
    const isReady = () => (opts.ready ? opts.ready() : true) && imgsReady();
    const go = (forceClear = false) => {
      if (!isAlive()) {
        done = true;
        return true;
      }
      if (!forceClear && !isReady()) return false;
      finishLayout();
      const y = resolveY();
      if (!touched && Math.abs(window.scrollY - y) > 4) window.scrollTo(0, y);
      return true;
    };
    if (!go(false)) {
      let tries = 0;
      const waitReady = () => {
        if (done || !isAlive()) return;
        if (touched) {
          finishLayout();
          return;
        }
        if (go(tries >= 24)) return;
        tries += 1;
        requestAnimationFrame(waitReady);
      };
      if (imgScope) {
        imgScope.querySelectorAll('img').forEach((img) => {
          if (!img.complete) {
            const onImg = () => { if (!done && !touched && isAlive()) go(false); };
            img.addEventListener('load', onImg, { once: true });
            img.addEventListener('error', onImg, { once: true });
          }
        });
      }
      requestAnimationFrame(waitReady);
    } else {
      requestAnimationFrame(() => go(false));
    }
    // Gambar/diagram/preview yang dimuat belakangan bisa mengubah tinggi halaman.
    setTimeout(() => go(true), 250);
    setTimeout(() => go(true), 800);
  }

  // Kembali ke posisi baca terakhir halaman ini (saat kembali/maju atau keluar dari editor).
  function restoreScroll() {
    const target = pendingScroll;
    pendingScroll = null;
    const pathAtStart = currentPath;
    applyScrollRestore(target, { active: () => currentPath === pathAtStart && !editing });
  }

  function renderBreadcrumb() {
    if (currentPath === DRAFT_PATH) {
      el.breadcrumb.innerHTML = `<a href="#/">AI Note</a><span class="sep">${icon('chevron')}</span><span class="current">Live Preview Markdown</span>`;
      return;
    }
    if (currentPath.startsWith(VIEW_PREFIX)) {
      const rel = currentPath.slice(VIEW_PREFIX.length);
      const owner = rel.split('/_lampiran/')[0].split('/').filter(Boolean);
      const crumbs = [`<a href="#/">AI Note</a>`];
      owner.forEach((part, i) => {
        crumbs.push(`<span class="sep">${icon('chevron')}</span><a href="${hashFor(owner.slice(0, i + 1).join('/'))}">${esc(part)}</a>`);
      });
      crumbs.push(`<span class="sep">${icon('chevron')}</span><span class="current">${esc(rel.split('/').pop())}</span>`);
      el.breadcrumb.innerHTML = crumbs.join('');
      return;
    }
    if (currentPath === '_recordings' || currentPath.startsWith('_recordings/')) {
      el.breadcrumb.innerHTML = `<a href="#/">AI Note</a><span class="sep">${icon('chevron')}</span><span class="current">Rekaman Meeting</span>`;
      return;
    }
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

  function codeToolsHtml() {
    const saveBtnHtml = isReadOnly()
      ? ''
      : `<button type="button" class="btn btn-ghost btn-sm" data-code-save title="Save changes (Ctrl+S)" disabled>${icon('save')}<span>Save</span></button>`;
    return `<button type="button" class="btn btn-ghost btn-sm pdfv-find-toggle" data-code-find-toggle title="Find text (Ctrl+F)" aria-pressed="false" disabled>${icon('search')}<span>Find</span></button><button type="button" class="btn btn-ghost btn-sm viewer-wrap-btn" data-code-wrap title="Toggle Word Wrap" aria-pressed="false">${icon('wrapText')}<span>Word Wrap</span></button><button type="button" class="btn btn-ghost btn-sm" data-code-copy title="Copy content" disabled>${icon('copy')}<span>Copy</span></button>${saveBtnHtml}`;
  }

  function collectTextNodes(rootEl) {
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest('style, script, noscript, svg')) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    const nodes = [];
    let offset = 0;
    let tn;
    while ((tn = walker.nextNode())) {
      const len = tn.nodeValue.length;
      nodes.push({ node: tn, start: offset, end: offset + len });
      offset += len;
    }
    return nodes;
  }

  function applyRangesToTextNodes(nodes, lineMatches, activeIdx) {
    for (const item of nodes) {
      const hits = [];
      for (const m of lineMatches) {
        if (m.end > item.start && m.start < item.end) {
          hits.push({
            from: Math.max(0, m.start - item.start),
            to: Math.min(item.node.nodeValue.length, m.end - item.start),
            globalIdx: m.globalIdx,
          });
        }
      }
      if (!hits.length) continue;
      const txt = item.node.nodeValue;
      const frag = document.createDocumentFragment();
      let pos = 0;
      for (const h of hits) {
        const s = Math.max(pos, h.from);
        const e = Math.max(s, h.to);
        if (s > pos) frag.append(document.createTextNode(txt.slice(pos, s)));
        if (e > s) {
          const mk = document.createElement('mark');
          mk.className = 'pdfv-hl' + (h.globalIdx === activeIdx ? ' is-active' : '');
          mk.dataset.match = String(h.globalIdx);
          mk.textContent = txt.slice(s, e);
          frag.append(mk);
        }
        pos = e;
      }
      if (pos < txt.length) frag.append(document.createTextNode(txt.slice(pos)));
      item.node.replaceWith(frag);
    }
  }

  function highlightCodeLine(lineEl, lineMatches, activeIdx) {
    applyRangesToTextNodes(collectTextNodes(lineEl), lineMatches, activeIdx);
  }

  function mountCodeViewer({ viewerEl, bodyEl, rel, src, where, signal }) {
    const findBar = viewerEl.querySelector('.pdfv-findbar');
    const findInput = viewerEl.querySelector('.pdfv-find-input');
    const findCount = viewerEl.querySelector('.pdfv-find-count');
    const findPrev = viewerEl.querySelector('[data-find="prev"]');
    const findNext = viewerEl.querySelector('[data-find="next"]');
    const findClose = viewerEl.querySelector('[data-find="close"]');
    const findToggle = viewerEl.querySelector('[data-code-find-toggle]');
    const wrapBtn = viewerEl.querySelector('[data-code-wrap]');
    const copyBtn = viewerEl.querySelector('[data-code-copy]');
    const saveBtn = viewerEl.querySelector('[data-code-save]');
    const dlBtn = viewerEl.querySelector('.viewer-dl');
    const subEl = viewerEl.querySelector('[data-viewer-sub]');

    const fileName = rel.split('/').pop();
    const fileExt = (fileName.match(/\.[^.]+$/) || [''])[0].toLowerCase();

    let destroyed = false;
    let loaded = false;
    let rawText = '';
    let savedText = '';
    let langLabel = '';
    let dirty = false;
    let saving = false;
    let confirming = false;
    let plainLines = [];
    let linesHtml = [];
    let lineEls = [];
    let dirtyLines = [];
    let matches = [];
    let activeMatch = -1;
    let lastQuery = '';
    let searchTimer = null;
    let copyTimer = null;
    let hlTimer = null;
    let hlSeq = 0;
    let editorWrap = null;
    let preEl = null;
    let taEl = null;

    if (findInput) findInput.placeholder = 'Find text in file...';

    const updateSubtitle = () => {
      if (!subEl) return;
      const parts = [where, langLabel, `${plainLines.length} lines`].filter(Boolean);
      if (dirty) parts.push('Unsaved');
      subEl.textContent = parts.join(' · ');
    };

    const syncSaveUi = () => {
      if (saveBtn) {
        saveBtn.disabled = !loaded || !dirty || saving;
        saveBtn.classList.toggle('btn-primary', dirty);
        saveBtn.classList.toggle('btn-ghost', !dirty);
        saveBtn.innerHTML = `${icon('save')}<span>${saving ? 'Saving…' : 'Save'}</span>`;
      }
      if (dlBtn) {
        dlBtn.classList.toggle('btn-primary', !dirty);
        dlBtn.classList.toggle('btn-outline', dirty);
      }
      updateSubtitle();
    };

    const updateFindUi = () => {
      if (!findCount) return;
      const hasQ = !!lastQuery;
      findCount.classList.toggle('is-empty', hasQ && matches.length === 0);
      if (!hasQ) findCount.textContent = '';
      else if (matches.length === 0) findCount.textContent = 'Not found';
      else findCount.textContent = `${activeMatch + 1} / ${matches.length}`;
      const ok = matches.length > 0;
      if (findPrev) findPrev.disabled = !ok;
      if (findNext) findNext.disabled = !ok;
    };

    const clearHighlights = () => {
      for (const idx of dirtyLines) {
        if (lineEls[idx]) lineEls[idx].innerHTML = linesHtml[idx] || '';
      }
      dirtyLines = [];
    };

    const activateMatch = (idx, noScroll = false) => {
      if (!matches.length || destroyed) return;
      activeMatch = ((idx % matches.length) + matches.length) % matches.length;
      updateFindUi();
      bodyEl.querySelectorAll('.pdfv-hl.is-active').forEach((m) => m.classList.remove('is-active'));
      const marks = bodyEl.querySelectorAll(`.pdfv-hl[data-match="${activeMatch}"]`);
      marks.forEach((m) => m.classList.add('is-active'));
      if (!noScroll && marks.length) marks[0].scrollIntoView({ block: 'center', inline: 'nearest' });
    };

    const applyFindMarks = (noScroll = false) => {
      clearHighlights();
      matches = [];
      activeMatch = -1;
      if (!lastQuery || !plainLines.length) {
        updateFindUi();
        return;
      }
      const ql = lastQuery.toLowerCase();
      const byLine = new Map();
      for (let i = 0; i < plainLines.length; i++) {
        const lineLower = plainLines[i].toLowerCase();
        let pos = 0;
        let hit;
        while ((hit = lineLower.indexOf(ql, pos)) !== -1) {
          const entry = { globalIdx: matches.length, lineIdx: i, start: hit, end: hit + ql.length };
          matches.push(entry);
          let list = byLine.get(i);
          if (!list) byLine.set(i, (list = []));
          list.push(entry);
          pos = hit + ql.length;
        }
      }
      if (matches.length) activeMatch = 0;
      for (const [lineIdx, lineMatches] of byLine) {
        const lineEl = lineEls[lineIdx];
        if (!lineEl) continue;
        highlightCodeLine(lineEl, lineMatches, activeMatch);
        dirtyLines.push(lineIdx);
      }
      updateFindUi();
      if (matches.length) activateMatch(0, noScroll);
    };

    const runFind = (rawQ, opts = {}) => {
      lastQuery = String(rawQ || '');
      applyFindMarks(!!opts.noScroll);
    };

    const openFind = () => {
      if (!findBar || !plainLines.length) return;
      findBar.hidden = false;
      if (findToggle) {
        findToggle.classList.add('active');
        findToggle.setAttribute('aria-pressed', 'true');
      }
      if (findInput) {
        findInput.focus();
        findInput.select();
      }
    };

    const closeFind = () => {
      if (!findBar) return;
      clearTimeout(searchTimer);
      findBar.hidden = true;
      if (findToggle) {
        findToggle.classList.remove('active');
        findToggle.setAttribute('aria-pressed', 'false');
      }
      lastQuery = '';
      matches = [];
      activeMatch = -1;
      clearHighlights();
      updateFindUi();
      if (taEl) taEl.focus({ preventScroll: true });
    };

    if (findToggle) findToggle.addEventListener('click', () => (findBar && findBar.hidden ? openFind() : closeFind()));
    if (findClose) findClose.addEventListener('click', closeFind);
    if (findPrev) findPrev.addEventListener('click', () => activateMatch(activeMatch - 1));
    if (findNext) findNext.addEventListener('click', () => activateMatch(activeMatch + 1));
    if (findInput) {
      findInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => runFind(findInput.value), 120);
      });
      findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(searchTimer);
          if (findInput.value !== lastQuery) runFind(findInput.value);
          else if (matches.length) activateMatch(activeMatch + (e.shiftKey ? -1 : 1));
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeFind();
        }
      });
    }

    const setWrap = (on) => {
      if (editorWrap) editorWrap.classList.toggle('wrap', on);
      if (wrapBtn) {
        wrapBtn.setAttribute('aria-pressed', String(on));
        wrapBtn.classList.toggle('active', on);
      }
    };
    if (wrapBtn) {
      wrapBtn.addEventListener('click', () => {
        if (!editorWrap) return;
        const on = !editorWrap.classList.contains('wrap');
        setWrap(on);
        store.set('viewerWrap', on ? '1' : '0');
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        if (!loaded) return;
        try {
          await navigator.clipboard.writeText(rawText);
          copyBtn.innerHTML = `${icon('check')}<span>Copied</span>`;
          clearTimeout(copyTimer);
          copyTimer = setTimeout(() => {
            if (!destroyed) copyBtn.innerHTML = `${icon('copy')}<span>Copy</span>`;
          }, 1600);
        } catch {
          toast('Failed to copy to clipboard.');
        }
      });
    }

    const patchHighlightedLines = (nextLinesHtml) => {
      if (!preEl || !Array.isArray(nextLinesHtml)) return;
      if (nextLinesHtml.length !== lineEls.length) {
        linesHtml = nextLinesHtml;
        preEl.innerHTML = linesHtml.map((h, i) => `<span class="codev-line" data-line="${i}">${h}</span>`).join('');
        lineEls = [...preEl.querySelectorAll('.codev-line')];
        dirtyLines = [];
      } else {
        for (let i = 0; i < nextLinesHtml.length; i++) {
          if (linesHtml[i] !== nextLinesHtml[i]) {
            linesHtml[i] = nextLinesHtml[i];
            if (lineEls[i]) lineEls[i].innerHTML = nextLinesHtml[i];
          }
        }
      }
      if (findBar && !findBar.hidden && lastQuery) applyFindMarks(true);
    };

    const scheduleHighlight = () => {
      clearTimeout(hlTimer);
      const seq = ++hlSeq;
      const textSnap = rawText;
      hlTimer = setTimeout(async () => {
        if (destroyed || seq !== hlSeq || textSnap.length > 512 * 1024) return;
        try {
          const res = await fetch('/api/code/highlight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
            body: JSON.stringify({ ext: fileExt, text: textSnap }),
            signal,
          });
          if (!res.ok || destroyed || seq !== hlSeq) return;
          const data = await res.json().catch(() => null);
          if (!data || !Array.isArray(data.linesHtml) || destroyed || seq !== hlSeq) return;
          if (data.linesHtml.length === plainLines.length) patchHighlightedLines(data.linesHtml);
        } catch {}
      }, 160);
    };

    const handleEditInput = () => {
      if (!taEl || !preEl || destroyed) return;
      rawText = taEl.value;
      dirty = rawText !== savedText;
      const nextPlain = rawText.replace(/\r\n?/g, '\n').split('\n');
      if (nextPlain.length === plainLines.length) {
        for (let i = 0; i < nextPlain.length; i++) {
          if (nextPlain[i] !== plainLines[i]) {
            const h = esc(nextPlain[i]);
            linesHtml[i] = h;
            if (lineEls[i]) lineEls[i].innerHTML = h;
          }
        }
      } else {
        const oldMap = new Map();
        for (let i = 0; i < plainLines.length; i++) {
          if (!oldMap.has(plainLines[i])) oldMap.set(plainLines[i], linesHtml[i]);
        }
        linesHtml = nextPlain.map((l, i) => (plainLines[i] === l && linesHtml[i] !== undefined ? linesHtml[i] : oldMap.get(l) ?? esc(l)));
        preEl.innerHTML = linesHtml.map((h, i) => `<span class="codev-line" data-line="${i}">${h}</span>`).join('');
        lineEls = [...preEl.querySelectorAll('.codev-line')];
        dirtyLines = [];
      }
      plainLines = nextPlain;
      syncSaveUi();
      if (findBar && !findBar.hidden && lastQuery) applyFindMarks(true);
      scheduleHighlight();
    };

    async function saveFile() {
      if (isReadOnly() || !loaded || !dirty || saving || destroyed) return false;
      saving = true;
      syncSaveUi();
      const snapshot = rawText;
      try {
        const res = await fetch('/api/attachment/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
          body: JSON.stringify({ file: rel, content: snapshot }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        if (destroyed) return true;
        savedText = snapshot;
        dirty = rawText !== savedText;
        if (!dirty && Array.isArray(data.linesHtml) && data.linesHtml.length === plainLines.length) {
          patchHighlightedLines(data.linesHtml);
        }
        toast('Saved: ' + fileName);
        return true;
      } catch (err) {
        if (!destroyed) {
          await AppDialog.alert({ type: 'error', title: 'Failed to save', message: err.message || String(err) });
        }
        return false;
      } finally {
        saving = false;
        if (!destroyed) syncSaveUi();
      }
    }

    if (saveBtn) saveBtn.addEventListener('click', () => saveFile());

    async function confirmDiscard() {
      if (!dirty) return true;
      if (confirming) return false;
      confirming = true;
      try {
        return await AppDialog.confirm({
          title: 'Discard changes?',
          message: `Unsaved changes to "${fileName}" will be lost.`,
          confirmLabel: 'Discard',
          cancelLabel: 'Keep editing',
          destructive: true,
        });
      } finally {
        confirming = false;
      }
    }

    const onBeforeUnload = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    async function load() {
      try {
        let data = null;
        const apiRes = await fetch('/api/code?file=' + encodeURIComponent(rel), { cache: 'no-store', signal });
        if (apiRes.ok) {
          data = await apiRes.json();
        } else if (apiRes.status === 404) {
          // Cadangan bila server belum direstart: baca teks mentah dari /files/.
          const rawRes = await fetch(src, { cache: 'no-store', signal });
          if (!rawRes.ok) throw new Error(rawRes.status === 404 ? 'File not found.' : 'HTTP ' + rawRes.status);
          const size = Number(rawRes.headers.get('content-length') || 0);
          if (size > 8 * 1024 * 1024) throw new Error('File too large to display (' + Math.round(size / 1048576) + ' MB). Please download.');
          const text = await rawRes.text();
          const lines = text.replace(/\r\n?/g, '\n').split('\n');
          data = { text, lang: 'plaintext', linesHtml: lines.map((l) => esc(l)) };
        } else {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData.error || 'HTTP ' + apiRes.status);
        }
        if (destroyed) return;
        rawText = data.text || '';
        savedText = rawText;
        plainLines = rawText.replace(/\r\n?/g, '\n').split('\n');
        linesHtml = Array.isArray(data.linesHtml) ? data.linesHtml : plainLines.map((l) => esc(l));
        while (linesHtml.length < plainLines.length) linesHtml.push('');
        langLabel = data.lang && data.lang !== 'plaintext' ? data.lang.toUpperCase() : '';
        bodyEl.innerHTML = `<div class="codev-editor"><pre class="hljs codev-pre" aria-hidden="true">${linesHtml.map((h, i) => `<span class="codev-line" data-line="${i}">${h}</span>`).join('')}</pre><textarea class="codev-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" aria-label="Edit ${esc(fileName)}"${isReadOnly() ? ' readonly' : ''}></textarea></div>`;
        editorWrap = bodyEl.querySelector('.codev-editor');
        preEl = bodyEl.querySelector('.codev-pre');
        taEl = bodyEl.querySelector('.codev-input');
        taEl.value = rawText;
        lineEls = [...preEl.querySelectorAll('.codev-line')];
        if (!isReadOnly()) {
          taEl.addEventListener('input', handleEditInput);
          taEl.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
              e.preventDefault();
              e.stopPropagation();
              saveFile();
              return;
            }
            if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
              e.preventDefault();
              if (!document.execCommand('insertText', false, '    ')) {
                const s = taEl.selectionStart;
                const end = taEl.selectionEnd;
                taEl.setRangeText('    ', s, end, 'end');
                handleEditInput();
              }
            }
          });
        }
        loaded = true;
        setWrap(store.get('viewerWrap', '0') === '1');
        if (findToggle) findToggle.disabled = false;
        if (copyBtn) copyBtn.disabled = false;
        syncSaveUi();
      } catch (err) {
        if (destroyed || (err && err.name === 'AbortError')) return;
        bodyEl.innerHTML = `<div class="viewer-msg"><p><strong>Unable to display file</strong></p><p class="muted">${esc(err.message || String(err))}</p></div>`;
      }
    }

    load();
    return {
      openFind,
      closeFind,
      saveFile,
      confirmDiscard,
      isDirty: () => dirty,
      hasOpenFind: () => !!(findBar && !findBar.hidden),
      hasMatches: () => matches.length > 0,
      stepMatch: (dir) => activateMatch(activeMatch + dir),
      destroy: () => {
        destroyed = true;
        clearTimeout(searchTimer);
        clearTimeout(copyTimer);
        clearTimeout(hlTimer);
        window.removeEventListener('beforeunload', onBeforeUnload);
      },
    };
  }

  function openCodeViewer(rel) {
    const old = document.querySelector('.code-overlay');
    if (old && old.__close) old.__close();
    const name = rel.split('/').pop();
    const ext = (name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
    const src = '/files/' + rel.split('/').map(encodeURIComponent).join('/');
    const where = rel.split('/_lampiran/')[0];

    const ov = document.createElement('div');
    ov.className = 'pdf-overlay code-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', name);
    ov.innerHTML = `<div class="viewer"><div class="viewer-bar"><span class="viewer-badge">${esc((ext.slice(1) || 'TXT').toUpperCase())}</span><div class="viewer-name"><strong title="${esc(name)}">${esc(name)}</strong><span data-viewer-sub>${esc(where)}</span></div><span class="spacer"></span>${codeToolsHtml()}<a class="btn btn-primary btn-sm viewer-dl" href="${src}" download="${esc(name)}">${icon('download')}<span>Download</span></a><button type="button" class="btn btn-ghost btn-sm viewer-close" data-code-close title="Close (Esc)">${icon('close')}<span>Close</span></button></div>${pdfFindBarHtml()}<div class="viewer-body code-body"><div class="viewer-msg muted">Loading…</div></div></div>`;

    const viewerEl = ov.querySelector('.viewer');
    const bodyEl = ov.querySelector('.viewer-body');
    const ac = new AbortController();
    const ctrl = mountCodeViewer({ viewerEl, bodyEl, rel, src, where, signal: ac.signal });
    let closed = false;

    const close = async () => {
      if (closed) return;
      if (!(await ctrl.confirmDiscard())) return;
      if (closed) return;
      closed = true;
      ac.abort();
      ctrl.destroy();
      document.removeEventListener('keydown', onKey, true);
      ov.remove();
    };
    const onKey = (e) => {
      if (document.querySelector('.dialog-overlay')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        ctrl.saveFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        ctrl.openFind();
        return;
      }
      if (e.key === 'F3' && (ctrl.hasOpenFind() || ctrl.hasMatches())) {
        e.preventDefault();
        e.stopPropagation();
        ctrl.stepMatch(e.shiftKey ? -1 : 1);
        return;
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (ctrl.hasOpenFind()) ctrl.closeFind();
        else close();
      }
    };
    ov.__close = () => {
      if (closed) return;
      closed = true;
      ac.abort();
      ctrl.destroy();
      document.removeEventListener('keydown', onKey, true);
      ov.remove();
    };
    ov.addEventListener('click', (e) => {
      if (e.target === ov || e.target.closest('[data-code-close]')) close();
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(ov);
    if (window.gsap) gsap.fromTo(viewerEl, { opacity: 0, y: 12, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out', clearProps: 'opacity,transform' });
    ov.querySelector('[data-code-close]').focus({ preventScroll: true });
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Gagal memuat ' + src));
      document.head.appendChild(s);
    });
  }

  let docxLoader = null;
  function loadDocxPreview() {
    if (window.docx && window.JSZip) return Promise.resolve(window.docx);
    if (!docxLoader) {
      docxLoader = (async () => {
        if (!window.JSZip) await loadScriptOnce('/vendor/jszip.min.js');
        if (!window.docx) await loadScriptOnce('/vendor/docx-preview.min.js');
        if (!window.docx) throw new Error('Pustaka docx-preview termuat tetapi tidak dikenali.');
        return window.docx;
      })().catch((err) => {
        docxLoader = null;
        throw err;
      });
    }
    return docxLoader;
  }

  function createWordController({ viewerEl, bodyEl, pagesEl }) {
    const findBar = viewerEl.querySelector('.pdfv-findbar');
    const findInput = viewerEl.querySelector('.pdfv-find-input');
    const findCount = viewerEl.querySelector('.pdfv-find-count');
    const findPrev = viewerEl.querySelector('[data-find="prev"]');
    const findNext = viewerEl.querySelector('[data-find="next"]');
    const findClose = viewerEl.querySelector('[data-find="close"]');
    const findToggle = viewerEl.querySelector('[data-pdf-find-toggle]');
    const zoomBtns = [...viewerEl.querySelectorAll('[data-zoom]')];
    const zoomLabel = viewerEl.querySelector('.pdfv-zoom-label');
    const pageNav = viewerEl.querySelector('.pdfv-page-nav');
    const pageInput = viewerEl.querySelector('.pdfv-page-input');
    const pageTotal = viewerEl.querySelector('.pdfv-page-total');

    let stageEl = null;
    let pageEls = [];
    let basePageW = 794;
    let zoom = 1;
    let currentPage = 1;
    let destroyed = false;
    let lastClientW = bodyEl.clientWidth;
    let resizeTimer = null;
    let scrollRaf = 0;

    let matches = [];
    let activeMatch = -1;
    let lastQuery = '';
    let searchTimer = null;

    if (findInput) findInput.placeholder = 'Find text in document...';

    const syncButtons = () => {
      const ready = !!stageEl;
      if (findToggle) findToggle.disabled = !ready;
      zoomBtns.forEach((z) => (z.disabled = !ready));
      if (pageNav) pageNav.hidden = !ready || pageEls.length <= 1;
    };

    const applyZoom = (preserveScroll) => {
      if (!stageEl || destroyed) return;
      const ratio = preserveScroll && bodyEl.scrollHeight > 0 ? bodyEl.scrollTop / bodyEl.scrollHeight : 0;
      const avail = Math.max(200, bodyEl.clientWidth - 32);
      const fit = Math.min(avail / basePageW, 1.15);
      stageEl.style.zoom = String(fit * zoom);
      if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + '%';
      if (preserveScroll) bodyEl.scrollTop = Math.round(ratio * bodyEl.scrollHeight);
    };

    const ro = new ResizeObserver(() => {
      if (destroyed || !stageEl) return;
      const w = bodyEl.clientWidth;
      if (Math.abs(w - lastClientW) <= 2) return;
      lastClientW = w;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => applyZoom(true), 140);
    });
    ro.observe(bodyEl);

    const updateCurrentPage = () => {
      scrollRaf = 0;
      if (!pageEls.length || destroyed) return;
      const topLimit = bodyEl.getBoundingClientRect().top + bodyEl.clientHeight * 0.25;
      let best = 1;
      for (let i = 0; i < pageEls.length; i++) {
        if (pageEls[i].getBoundingClientRect().top <= topLimit) best = i + 1;
        else break;
      }
      currentPage = best;
      if (pageInput && document.activeElement !== pageInput) pageInput.value = String(currentPage);
    };

    const onScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(updateCurrentPage);
    };
    bodyEl.addEventListener('scroll', onScroll, { passive: true });

    const goToPage = (n) => {
      if (!pageEls.length) return;
      const target = Math.max(1, Math.min(pageEls.length, Math.round(n)));
      const pEl = pageEls[target - 1];
      if (!pEl) return;
      currentPage = target;
      if (pageInput) pageInput.value = String(target);
      const dy = pEl.getBoundingClientRect().top - bodyEl.getBoundingClientRect().top + bodyEl.scrollTop - 16;
      bodyEl.scrollTop = Math.max(0, dy);
    };

    if (pageInput) {
      pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          goToPage(Number(pageInput.value) || currentPage);
          pageInput.blur();
        }
      });
      pageInput.addEventListener('change', () => goToPage(Number(pageInput.value) || currentPage));
    }

    const updateFindUi = () => {
      if (!findCount) return;
      const hasQ = !!lastQuery;
      findCount.classList.toggle('is-empty', hasQ && matches.length === 0);
      if (!hasQ) findCount.textContent = '';
      else if (matches.length === 0) findCount.textContent = 'Not found';
      else findCount.textContent = `${activeMatch + 1} / ${matches.length}`;
      const ok = matches.length > 0;
      if (findPrev) findPrev.disabled = !ok;
      if (findNext) findNext.disabled = !ok;
    };

    const clearHighlights = () => {
      if (!stageEl) return;
      stageEl.querySelectorAll('mark.pdfv-hl').forEach((m) => m.replaceWith(document.createTextNode(m.textContent)));
      stageEl.normalize();
    };

    const activateMatch = (idx) => {
      if (!matches.length || destroyed || !stageEl) return;
      activeMatch = ((idx % matches.length) + matches.length) % matches.length;
      updateFindUi();
      stageEl.querySelectorAll('mark.pdfv-hl.is-active').forEach((m) => m.classList.remove('is-active'));
      const marks = stageEl.querySelectorAll(`mark.pdfv-hl[data-match="${activeMatch}"]`);
      marks.forEach((m) => m.classList.add('is-active'));
      if (marks.length) marks[0].scrollIntoView({ block: 'center', inline: 'nearest' });
    };

    const runFind = (rawQ) => {
      const q = String(rawQ || '').trim();
      lastQuery = q;
      clearHighlights();
      matches = [];
      activeMatch = -1;
      if (!q || !stageEl) {
        updateFindUi();
        return;
      }
      const ql = q.toLowerCase();
      const selector = 'p, h1, h2, h3, h4, h5, h6, li, td, th, .docv-p';
      const rawBlocks = [...stageEl.querySelectorAll(selector)].filter((b) => !b.querySelector(selector));
      const blocks = rawBlocks.length ? rawBlocks : [stageEl];
      for (const blk of blocks) {
        const nodes = collectTextNodes(blk);
        if (!nodes.length) continue;
        const text = nodes.map((n) => n.node.nodeValue).join('');
        const textLower = text.toLowerCase();
        const blkMatches = [];
        let pos = 0;
        let hit;
        while ((hit = textLower.indexOf(ql, pos)) !== -1) {
          const entry = { globalIdx: matches.length, start: hit, end: hit + ql.length };
          matches.push(entry);
          blkMatches.push(entry);
          pos = hit + ql.length;
        }
        if (blkMatches.length) applyRangesToTextNodes(nodes, blkMatches, 0);
      }
      if (matches.length) activeMatch = 0;
      updateFindUi();
      if (matches.length) activateMatch(0);
    };

    const openFind = () => {
      if (!findBar || !stageEl) return;
      findBar.hidden = false;
      if (findToggle) {
        findToggle.classList.add('active');
        findToggle.setAttribute('aria-pressed', 'true');
      }
      if (findInput) {
        findInput.focus();
        findInput.select();
      }
    };

    const closeFind = () => {
      if (!findBar) return;
      clearTimeout(searchTimer);
      findBar.hidden = true;
      if (findToggle) {
        findToggle.classList.remove('active');
        findToggle.setAttribute('aria-pressed', 'false');
      }
      lastQuery = '';
      matches = [];
      activeMatch = -1;
      clearHighlights();
      updateFindUi();
    };

    if (findToggle) findToggle.addEventListener('click', () => (findBar && findBar.hidden ? openFind() : closeFind()));
    if (findClose) findClose.addEventListener('click', closeFind);
    if (findPrev) findPrev.addEventListener('click', () => activateMatch(activeMatch - 1));
    if (findNext) findNext.addEventListener('click', () => activateMatch(activeMatch + 1));
    if (findInput) {
      findInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => runFind(findInput.value), 160);
      });
      findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(searchTimer);
          const q = findInput.value.trim();
          if (q !== lastQuery) runFind(findInput.value);
          else if (matches.length) activateMatch(activeMatch + (e.shiftKey ? -1 : 1));
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeFind();
        }
      });
    }

    zoomBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!stageEl) return;
        const act = btn.dataset.zoom;
        zoom = act === 'reset' ? 1 : Math.min(3, Math.max(0.5, Math.round((zoom + (act === 'in' ? 0.25 : -0.25)) * 100) / 100));
        applyZoom(true);
      });
    });

    function setStage(stage, pages) {
      stageEl = stage;
      pageEls = pages && pages.length ? pages : [stage];
      zoom = 1;
      currentPage = 1;
      lastClientW = bodyEl.clientWidth;
      basePageW = Math.max(320, pageEls[0].offsetWidth || 794);
      if (pageInput) {
        pageInput.max = String(pageEls.length);
        pageInput.value = '1';
      }
      if (pageTotal) pageTotal.textContent = '/ ' + pageEls.length;
      applyZoom(false);
      bodyEl.scrollTop = 0;
      syncButtons();
    }

    syncButtons();
    return {
      setStage,
      openFind,
      closeFind,
      hasOpenFind: () => !!(findBar && !findBar.hidden),
      hasMatches: () => matches.length > 0,
      stepMatch: (dir) => activateMatch(activeMatch + dir),
      destroy: () => {
        destroyed = true;
        clearTimeout(resizeTimer);
        clearTimeout(searchTimer);
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        ro.disconnect();
        bodyEl.removeEventListener('scroll', onScroll);
      },
    };
  }

  // ---------- Penampil lampiran (PDF / Word / teks), satu halaman penuh ----------
  async function renderViewer(rel) {
    if (activeViewerCleanup) {
      activeViewerCleanup();
      activeViewerCleanup = null;
    }
    const name = rel.split('/').pop();
    const ext = (name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
    const src = '/files/' + rel.split('/').map(encodeURIComponent).join('/');
    const where = rel.split('/_lampiran/')[0];
    document.title = name + ' · AI Note';
    const isPdf = ext === '.pdf';
    const isWord = WORD_EXT.test(ext);
    const isPaper = isPdf || isWord;
    let ctrl = null;
    let disposed = false;
    const closeViewer = async () => {
      if (ctrl && typeof ctrl.confirmDiscard === 'function' && !(await ctrl.confirmDiscard())) return;
      if (history.state && history.state.nav > 0) history.back();
      else location.hash = where ? hashFor(where) : '#/';
    };
    const barTools = isPdf
      ? `${pdfToolsHtml()}<a class="btn btn-ghost btn-sm" href="${src}?view=1" target="_blank" rel="noopener">Open in new tab</a>`
      : isWord
        ? pdfToolsHtml()
        : codeToolsHtml();
    el.content.innerHTML = `<div class="viewer"><div class="viewer-bar"><span class="viewer-badge">${esc((ext.slice(1) || 'FILE').toUpperCase())}</span><div class="viewer-name"><strong title="${esc(name)}">${esc(name)}</strong><span data-viewer-sub>${esc(where)}</span></div><span class="spacer"></span>${barTools}<a class="btn btn-primary btn-sm viewer-dl" href="${src}" download="${esc(name)}">${icon('download')}<span>Download</span></a><button type="button" class="btn btn-ghost btn-sm viewer-close" id="viewer-close" title="Close (Esc)">${icon('close')}<span>Close</span></button></div>${pdfFindBarHtml()}<div class="viewer-body${isPaper ? ' is-pdf' : ' code-body'}" id="viewer-body">${isPaper ? '<div class="pdfv-pages"></div>' : '<div class="viewer-msg muted">Loading…</div>'}</div></div>`;
    const viewerEl = el.content.querySelector('.viewer');
    const body = $('#viewer-body');
    const closeBtn = $('#viewer-close');
    closeBtn.addEventListener('click', closeViewer);
    if (window.gsap) gsap.fromTo(viewerEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'opacity,transform' });

    const mine = currentPath;
    const ac = new AbortController();

    const hasModalOpen = () => !!document.querySelector('.pdf-overlay, .lightbox, .dialog-overlay, #ticket-modal-backdrop:not([hidden])');
    const onKey = (e) => {
      if (disposed || !viewerEl.isConnected) {
        cleanup();
        return;
      }
      if (hasModalOpen()) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && ctrl && typeof ctrl.saveFile === 'function') {
        e.preventDefault();
        ctrl.saveFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (ctrl) ctrl.openFind();
        return;
      }
      if (e.key === 'F3' && ctrl && (ctrl.hasOpenFind() || ctrl.hasMatches())) {
        e.preventDefault();
        ctrl.stepMatch(e.shiftKey ? -1 : 1);
        return;
      }
      if (e.key === 'Escape') {
        if (el.panel.contains(document.activeElement)) return;
        if (ctrl && ctrl.hasOpenFind()) {
          e.preventDefault();
          ctrl.closeFind();
          return;
        }
        const ae = document.activeElement;
        if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && !viewerEl.contains(ae)) return;
        e.preventDefault();
        closeViewer();
      }
    };
    function cleanup() {
      if (disposed) return;
      disposed = true;
      ac.abort();
      document.removeEventListener('keydown', onKey);
      if (ctrl) ctrl.destroy(true);
      if (activeViewerCleanup === cleanup) activeViewerCleanup = null;
    }
    activeViewerCleanup = cleanup;
    document.addEventListener('keydown', onKey);

    if (isPdf) {
      const pagesEl = viewerEl.querySelector('.pdfv-pages');
      const subEl = viewerEl.querySelector('[data-viewer-sub]');
      const dark = document.documentElement.classList.contains('dark');
      ctrl = createPdfController({ viewerEl, bodyEl: body, pagesEl });
      pagesEl.innerHTML = `<div class="pdfv-loading" role="status"><div class="pdfv-skel portrait${dark ? ' is-dark' : ''}"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><div class="pdfv-spinner"></div></div><p>Loading PDF…</p></div>`;
      try {
        const [lib, buf] = await Promise.all([
          loadPdfjs(),
          fetch(src, { cache: 'no-store', signal: ac.signal }).then((res) => {
            if (!res.ok) throw new Error(res.status === 404 ? 'File not found.' : 'HTTP ' + res.status);
            return res.arrayBuffer();
          }),
        ]);
        if (disposed || currentPath !== mine) return;
        const pdfDoc = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
        if (disposed || currentPath !== mine) {
          pdfDoc.destroy();
          return;
        }
        if (subEl) subEl.textContent = (where ? where + ' · ' : '') + pdfDoc.numPages + ' pages';
        await ctrl.setDocument(pdfDoc, lib);
      } catch (err) {
        if (disposed || currentPath !== mine || (err && err.name === 'AbortError')) return;
        pagesEl.innerHTML = `<div class="viewer-msg pdfv-msg"><p><strong>Unable to display PDF</strong></p><p>${esc(err.message || String(err))}</p><p style="margin-top:0.75rem"><a class="btn btn-outline btn-sm" href="${src}?view=1" target="_blank" rel="noopener">Open in new tab</a></p></div>`;
      }
      return;
    }

    if (isWord) {
      const pagesEl = viewerEl.querySelector('.pdfv-pages');
      const subEl = viewerEl.querySelector('[data-viewer-sub]');
      const dark = document.documentElement.classList.contains('dark');
      ctrl = createWordController({ viewerEl, bodyEl: body, pagesEl });
      pagesEl.innerHTML = `<div class="pdfv-loading" role="status"><div class="pdfv-skel portrait${dark ? ' is-dark' : ''}"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><div class="pdfv-spinner"></div></div><p>Loading document…</p></div>`;
      try {
        const stage = document.createElement('div');
        stage.className = 'docv-stage';
        if (ext === '.docx') {
          const [docxLib, buf] = await Promise.all([
            loadDocxPreview(),
            fetch(src, { cache: 'no-store', signal: ac.signal }).then((res) => {
              if (!res.ok) throw new Error(res.status === 404 ? 'File not found.' : 'HTTP ' + res.status);
              return res.arrayBuffer();
            }),
          ]);
          if (disposed || currentPath !== mine) return;
          pagesEl.replaceChildren(stage);
          await docxLib.renderAsync(buf, stage, null, {
            className: 'docx',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: false,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
            useBase64URL: true,
          });
          if (disposed || currentPath !== mine) return;
          const pageEls = [...stage.querySelectorAll('section.docx')];
          if (subEl) {
            const count = pageEls.length || 1;
            subEl.textContent = (where ? where + ' · ' : '') + count + (count === 1 ? ' page' : ' pages');
          }
          ctrl.setStage(stage, pageEls);
        } else {
          const res = await fetch('/api/doc?file=' + encodeURIComponent(rel), { cache: 'no-store', signal: ac.signal });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || (res.status === 404 ? 'File not found.' : 'HTTP ' + res.status));
          if (disposed || currentPath !== mine) return;
          const toParagraphs = (txt) =>
            String(txt || '')
              .replace(/\r\n?/g, '\n')
              .split('\n')
              .map((line) => `<p class="docv-p">${esc(line) || '&nbsp;'}</p>`)
              .join('');
          const sections = [];
          if (data.header && data.header.trim()) sections.push(`<header class="docv-doc-header">${toParagraphs(data.header)}</header>`);
          sections.push(`<div class="docv-doc-body">${toParagraphs(data.body)}</div>`);
          if (data.textboxes && data.textboxes.trim()) sections.push(`<aside class="docv-doc-notes">${toParagraphs(data.textboxes)}</aside>`);
          if (data.footnotes && data.footnotes.trim()) sections.push(`<footer class="docv-doc-notes">${toParagraphs(data.footnotes)}</footer>`);
          if (data.endnotes && data.endnotes.trim()) sections.push(`<footer class="docv-doc-notes">${toParagraphs(data.endnotes)}</footer>`);
          stage.innerHTML = `<div class="docx-wrapper"><article class="docv-paper">${sections.join('')}</article></div>`;
          pagesEl.replaceChildren(stage);
          const paper = stage.querySelector('.docv-paper');
          if (subEl) subEl.textContent = (where ? where + ' · ' : '') + 'Word 97-2003 (.doc)';
          ctrl.setStage(stage, [paper]);
        }
      } catch (err) {
        if (disposed || currentPath !== mine || (err && err.name === 'AbortError')) return;
        pagesEl.innerHTML = `<div class="viewer-msg pdfv-msg"><p><strong>Unable to display document</strong></p><p>${esc(err.message || String(err))}</p><p class="muted" style="margin-top:0.5rem">Silakan gunakan tombol Download untuk membuka di Microsoft Word.</p></div>`;
      }
      return;
    }

    ctrl = mountCodeViewer({ viewerEl, bodyEl: body, rel, src, where, signal: ac.signal });
  }

  // ---------- Tampilan folder / beranda ----------
  function noteCard(n) {
    const tags = (n.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join('');
    return `<a class="card note-card" draggable="${isReadOnly() ? 'false' : 'true'}" data-type="file" data-path="${esc(n.path)}" href="${hashFor(n.path)}"><div class="card-header"><h3 class="card-title">${icon('file')}<span>${esc(n.title || n.name)}</span></h3></div><div class="card-content">${n.preview ? `<p class="card-preview">${esc(n.preview)}</p>` : ''}${tags ? `<div class="card-tags">${tags}</div>` : ''}<span class="muted card-meta">${esc(fmt(n.mtime))}</span></div></a>`;
  }

  function dirCard(d) {
    const n = countFiles(d);
    return `<a class="card" draggable="${isReadOnly() ? 'false' : 'true'}" data-type="dir" data-path="${esc(d.path)}" href="${hashFor(d.path)}"><div class="card-header"><h3 class="card-title">${icon('folder')}<span>${esc(d.name)}</span></h3><p class="card-desc">${n} catatan</p></div></a>`;
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
    const linkBtnHtml = `<button type="button" class="btn btn-ghost btn-icon btn-sm" id="copy-dir-link-btn" aria-label="Salin link folder" title="Salin link folder">${icon('link')}</button>`;
    const moreMenuHtml = isReadOnly()
      ? ''
      : `<div class="menu-wrap"><button type="button" class="btn btn-ghost btn-icon btn-sm" id="more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Aksi folder" title="Aksi">${icon('more')}</button><div class="menu" id="more-menu" role="menu" hidden><button type="button" role="menuitem" class="with-icon" data-action="new-note" data-path="${dp}">${icon('filePlus')}<span>Catatan baru</span></button><button type="button" role="menuitem" class="with-icon" data-action="new-folder" data-path="${dp}">${icon('folderPlus')}<span>Folder baru</span></button><button type="button" role="menuitem" class="with-icon" data-action="import" data-path="${dp}">${icon('upload')}<span>Impor Markdown</span></button>${isRoot ? '' : `<button type="button" role="menuitem" class="with-icon" data-action="rename" data-path="${dp}">${icon('pencil')}<span>Ganti nama</span></button><div class="menu-sep"></div><button type="button" role="menuitem" class="with-icon danger" data-action="delete" data-path="${dp}">${icon('trash')}<span>Hapus folder</span></button>`}</div></div>`;
    const actions = `<div class="dir-actions">${linkBtnHtml}${moreMenuHtml}</div>`;
    html = `<div class="page-head"><div class="page-head-text">${headText}</div>${actions}</div>` + html;
    el.content.innerHTML = html;
    $('#copy-dir-link-btn')?.addEventListener('click', () => copyShareLink(node.path));
    if (!isReadOnly()) setupMenu('#more-btn', '#more-menu');
    if (window.gsap) {
      gsap.fromTo('.page-head', { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' });
      const cards = el.content.querySelectorAll('.card');
      if (cards.length) {
        gsap.fromTo(cards, { opacity: 0, y: 12, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, stagger: 0.025, ease: 'power2.out' });
      }
    }
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
    const ro = isReadOnly();
    const editBtnHtml = ro ? '' : `<button type="button" class="btn btn-ghost btn-icon btn-sm" id="edit-btn" aria-label="Edit">${icon('pencil')}</button>`;
    const copyLinkBtnHtml = `<div class="menu-wrap link-pop-wrap"><div class="link-btn-group"><button type="button" class="pub-ind-pill" id="link-pub-ind" hidden title="Halaman ini dipublish ke publik (tanpa login). Klik untuk kelola."><span class="pub-ind-dot"></span><span>Publik</span></button><button type="button" class="btn btn-ghost btn-icon btn-sm" id="copy-link-btn" aria-haspopup="dialog" aria-expanded="false" aria-label="Bagikan / salin link catatan" title="Bagikan / salin link catatan">${icon('link')}</button></div><div class="link-pop" id="link-pop" role="dialog" aria-label="Bagikan link catatan" hidden></div></div>`;
    const renameMenuHtml = ro ? '' : `<button type="button" role="menuitem" class="with-icon" id="rename-btn">${icon('pencil')}<span>Ganti nama file</span></button><div class="menu-sep"></div>`;
    const deleteMenuHtml = ro ? '' : `<div class="menu-sep"></div><button type="button" role="menuitem" class="with-icon danger" id="delete-btn">${icon('trash')}<span>Hapus</span></button>`;
    el.content.innerHTML = `<article class="note-view"><div class="note-meta">${badgesFor(node.path, data.lingkungan)}<span class="muted">Dibuat ${esc(fmt(data.created ?? data.mtime))}</span><span class="muted">·</span><span class="muted">Diubah ${esc(fmt(data.modified ?? data.mtime))}</span>${data.hasMeta ? '' : '<span class="badge badge-outline" title="File ini belum punya dibuat/diubah di bagian atas. Tanggal diambil dari file.">Tanpa metadata</span>'}<span class="spacer"></span><div class="note-actions">${copyLinkBtnHtml}${editBtnHtml}<button type="button" class="btn btn-ghost btn-icon btn-sm" id="history-btn" aria-label="Riwayat">${icon('history')}</button><div class="menu-wrap"><button type="button" class="btn btn-ghost btn-icon btn-sm" id="more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Aksi catatan" title="Aksi">${icon('more')}</button><div class="menu" id="more-menu" role="menu" hidden><button type="button" role="menuitem" class="with-icon" id="copy-link-menu-btn">${icon('link')}<span>Salin link</span></button><div class="menu-sep"></div>${renameMenuHtml}<div class="menu-label">Ekspor</div><button type="button" role="menuitem" class="with-icon" data-export="md">${icon('download')}<span>Markdown</span><small>.md</small></button><button type="button" role="menuitem" class="with-icon" data-export="html">${icon('download')}<span>HTML</span><small>.html</small></button><button type="button" role="menuitem" class="with-icon" data-export="pdf">${icon('download')}<span>PDF</span><small>.pdf</small></button><button type="button" role="menuitem" class="with-icon" data-export="docx">${icon('download')}<span>Word</span><small>.docx</small></button>${deleteMenuHtml}</div></div></div></div>${summaryHtml(data)}${tagsHtml(data.tag)}<div class="prose" id="prose">${data.html}</div></article>`;
    if (window.gsap) {
      gsap.fromTo('#content > article', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' });
    }
    enhanceProse($('#prose'), node.path, { mermaid: true });
    setupTasks($('#prose'), data);
    setupExport(node.path);
    // Panel cari dalam mode "catatan ini": ikut pindah ke catatan yang baru dibuka.
    if (!el.panel.hidden && scopeNote) {
      if (scopeNote !== node.path) {
        scopeNote = node.path;
        updateScopeBtn();
      }
      runSearch(el.cmdInput.value.trim());
    }
    if (pendingJump && pendingJump.path === node.path) {
      const t = pendingJump.terms;
      pendingJump = null;
      setTimeout(() => {
        if (currentPath === node.path) jumpToTerms($('#prose'), t);
      }, 80);
    }
    const editBtnEl = $('#edit-btn');
    if (editBtnEl) {
      editBtnEl.addEventListener('click', async () => {
        let d = data;
        if (data.taskSync) {
          await data.taskSync();
          if (data.taskDirty) {
            try {
              d = await fetchJson('/api/note?path=' + encodeURIComponent(node.path));
            } catch {}
          }
        }
        startEditing(node.path, d);
      });
    }
    setupLinkPopover(node.path);
    $('#copy-link-menu-btn')?.addEventListener('click', () => copyShareLink(node.path));
    $('#rename-btn')?.addEventListener('click', () => actionRename(node.path));
    $('#history-btn').addEventListener('click', () => actionHistory(node.path));
    $('#delete-btn')?.addEventListener('click', () => actionDelete(node.path));
    if (pendingEdit === node.path) {
      pendingEdit = null;
      if (!ro) startEditing(node.path, data);
    }
  }

  function setupLinkPopover(notePath) {
    const btn = $('#copy-link-btn');
    const indBtn = $('#link-pub-ind');
    const pop = $('#link-pop');
    if (!btn || !pop) return;
    let pubState = { loading: true, published: false, urlPath: null, error: '' };
    let busy = false;

    const syncIndicator = () => {
      const pub = !!pubState.published;
      btn.classList.toggle('is-published', pub);
      btn.title = pub ? 'Link publik aktif · Klik untuk kelola' : 'Bagikan / salin link catatan';
      if (indBtn) indBtn.hidden = !pub;
    };

    const close = () => {
      if (pop.hidden) return;
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    };
    const onDoc = (e) => {
      if (!pop.contains(e.target) && !btn.contains(e.target) && !(indBtn && indBtn.contains(e.target))) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        btn.focus();
      }
    };

    const renderPop = () => {
      const defUrl = shareUrlFor(notePath);
      const pubUrl = pubState.published && pubState.urlPath ? publicShareUrl(pubState.urlPath) : '';
      const ro = isReadOnly();
      const statusBadge = pubState.loading
        ? '<span class="badge badge-outline">Memuat…</span>'
        : pubState.published
          ? '<span class="badge badge-secondary link-pub-badge">Publik aktif</span>'
          : '<span class="badge badge-outline">Belum dipublish</span>';

      let pubBodyHtml = '';
      if (pubState.loading) {
        pubBodyHtml = '<p class="muted link-pop-hint">Memeriksa status publish…</p>';
      } else if (pubState.error) {
        pubBodyHtml = `<p class="muted link-pop-hint">${esc(pubState.error)}</p>`;
      } else if (pubState.published && pubUrl) {
        pubBodyHtml = `
          <div class="link-pop-row">
            <input type="text" class="link-pop-input" id="link-pub-input" readonly value="${esc(pubUrl)}">
            <button type="button" class="btn btn-primary btn-sm" id="link-pub-copy">Salin</button>
          </div>
          <p class="muted link-pop-hint">Terbuka tanpa login (khusus 1 halaman ini saja).</p>
          <div class="link-pop-foot">
            <a class="btn btn-ghost btn-sm" href="${esc(pubUrl)}" target="_blank" rel="noopener noreferrer">Buka halaman</a>
            ${ro ? '' : `<button type="button" class="btn btn-ghost btn-sm btn-danger-text" id="link-pub-unpublish"${busy ? ' disabled' : ''}>Batalkan publish</button>`}
          </div>`;
      } else {
        pubBodyHtml = `
          <p class="muted link-pop-hint">Jika dipublish, hanya 1 halaman ini saja yang bisa dibuka tanpa login.</p>
          ${ro ? '<p class="muted link-pop-hint">Hanya admin yang bisa mempublish halaman.</p>' : `<button type="button" class="btn btn-primary btn-sm link-pop-fullbtn" id="link-pub-enable"${busy ? ' disabled' : ''}>${busy ? 'Mempublish…' : 'Publish ke publik (tanpa login)'}</button>`}`;
      }

      pop.innerHTML = `
        <div class="link-pop-sec">
          <div class="link-pop-head">
            <span class="link-pop-title">Link default</span>
            <span class="badge badge-outline">Wajib login</span>
          </div>
          <div class="link-pop-row">
            <input type="text" class="link-pop-input" id="link-def-input" readonly value="${esc(defUrl)}">
            <button type="button" class="btn btn-outline btn-sm" id="link-def-copy">Salin</button>
          </div>
        </div>
        <div class="menu-sep"></div>
        <div class="link-pop-sec">
          <div class="link-pop-head">
            <span class="link-pop-title">Publikasi</span>
            ${statusBadge}
          </div>
          ${pubBodyHtml}
        </div>`;

      const defInput = $('#link-def-input', pop);
      defInput?.addEventListener('focus', () => defInput.select());
      $('#link-def-copy', pop)?.addEventListener('click', () => copyShareLink(notePath));

      const pubInput = $('#link-pub-input', pop);
      pubInput?.addEventListener('focus', () => pubInput.select());
      $('#link-pub-copy', pop)?.addEventListener('click', async () => {
        if (!pubUrl) return;
        const ok = await copyTextSafe(pubUrl);
        toast(ok ? 'Link publik disalin' : 'Gagal menyalin link');
      });

      $('#link-pub-enable', pop)?.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        renderPop();
        const r = await api('/api/publish', { path: notePath, publish: true });
        busy = false;
        if (r && r.ok) {
          pubState = { loading: false, published: !!r.published, urlPath: r.urlPath || null, error: '' };
          syncIndicator();
          renderPop();
          if (r.urlPath) {
            const full = publicShareUrl(r.urlPath);
            const copied = await copyTextSafe(full);
            toast(copied ? 'Halaman dipublish & link disalin' : 'Halaman dipublish');
          }
        } else {
          renderPop();
        }
      });

      $('#link-pub-unpublish', pop)?.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        renderPop();
        const r = await api('/api/publish', { path: notePath, publish: false });
        busy = false;
        if (r && r.ok) {
          pubState = { loading: false, published: false, urlPath: null, error: '' };
          syncIndicator();
          toast('Publish dibatalkan');
        }
        renderPop();
      });
    };

    const refreshStatus = async (forceRenderPop = false) => {
      pubState.loading = true;
      if (forceRenderPop && !pop.hidden) renderPop();
      try {
        const d = await fetchJson('/api/publish?path=' + encodeURIComponent(notePath));
        if (currentPath !== notePath) return;
        pubState = { loading: false, published: !!d.published, urlPath: d.urlPath || null, error: '' };
      } catch (err) {
        if (currentPath !== notePath) return;
        pubState = { loading: false, published: false, urlPath: null, error: err.message || 'Gagal memuat status' };
      }
      syncIndicator();
      if (!pop.hidden) renderPop();
    };

    const togglePop = () => {
      if (!pop.hidden) return close();
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDoc, true);
      document.addEventListener('keydown', onKey, true);
      if (window.gsap) {
        gsap.killTweensOf(pop);
        gsap.fromTo(pop, { opacity: 0, y: -6, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.16, ease: 'power2.out' });
      }
      refreshStatus(true);
    };

    btn.addEventListener('click', togglePop);
    indBtn?.addEventListener('click', togglePop);
    refreshStatus(false);
  }

  // Menu Ekspor: unduh catatan sebagai .md, .html, .pdf atau .docx.
  // Menu titik tiga: buka/tutup, klik di luar atau Esc untuk menutup.
  function setupMenu(btnSel, menuSel) {
    const btn = $(btnSel);
    const menu = $(menuSel);
    if (!btn || !menu) return null;
    const close = () => {
      if (menu.hidden) return;
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
      if (window.gsap) {
        gsap.to(menu, {
          opacity: 0,
          y: -4,
          scale: 0.96,
          duration: 0.12,
          ease: 'power1.in',
          onComplete: () => {
            menu.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
          },
        });
      } else {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
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
      if (window.gsap) {
        gsap.killTweensOf(menu);
        gsap.fromTo(
          menu,
          { opacity: 0, y: -6, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.16, ease: 'power2.out' }
        );
      }
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

  // Diagram mermaid untuk ekspor: blok yang sedang tampil sebagai "Diagram" dikirim sebagai gambar PNG (tema terang);
  // blok yang dipilih "Kode" dikirim null, jadi PDF/Word memuat kode mentahnya.
  async function mermaidToPng(mm, code, dark) {
    const fit = { useMaxWidth: false, htmlLabels: false };
    mm.initialize({ ...mermaidConfig(), theme: dark ? 'dark' : 'default', htmlLabels: false, flowchart: fit });
    const id = 'mmx-' + ++mermaidSeq;
    let svg;
    try {
      ({ svg } = await mm.render(id, code));
    } finally {
      for (const x of [id, 'd' + id]) {
        const stray = document.getElementById(x);
        if (stray) stray.remove();
      }
    }
    const el = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    const vb = (el.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const w = vb.length === 4 && vb[2] > 0 ? vb[2] : parseFloat(el.getAttribute('width'));
    const h = vb.length === 4 && vb[3] > 0 ? vb[3] : parseFloat(el.getAttribute('height'));
    if (!(w > 0) || !(h > 0)) throw new Error('Ukuran diagram tidak diketahui');
    el.setAttribute('width', String(w));
    el.setAttribute('height', String(h));
    el.removeAttribute('style');
    const xml = new XMLSerializer().serializeToString(el);
    const img = new Image();
    await new Promise((ok, bad) => {
      img.onload = ok;
      img.onerror = () => bad(new Error('Gambar diagram gagal dimuat'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    });
    const scale = Math.max(1, Math.min(2, 4096 / Math.max(w, h)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale);
    canvas.height = Math.ceil(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = dark ? '#18181b' : '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { png: canvas.toDataURL('image/png'), w: Math.round(w), h: Math.round(h) };
  }

  async function exportDiagrams(dark) {
    const wraps = [...document.querySelectorAll('#prose .code-block[data-mermaid]')];
    if (!wraps.length) return [];
    const mm = await loadMermaid().catch(() => null);
    const out = [];
    for (const w of wraps) {
      if (!mm || w.dataset.mmMode !== 'diagram' || w.classList.contains('mm-failed')) {
        out.push(null);
        continue;
      }
      try {
        out.push(await mermaidToPng(mm, w.querySelector('pre code').textContent, dark));
      } catch {
        out.push(null);
      }
    }
    if (mm) mm.initialize(mermaidConfig());
    return out;
  }

  function pdfToolsHtml() {
    return `<span class="pdfv-page-nav" hidden><input type="number" class="pdfv-page-input" min="1" value="1" aria-label="Page number"><span class="pdfv-page-total">/ 1</span></span><button type="button" class="btn btn-ghost btn-sm pdfv-find-toggle" data-pdf-find-toggle title="Find text in PDF (Ctrl+F)" aria-pressed="false" disabled>${icon('search')}<span>Find</span></button><span class="pdfv-zoom"><button type="button" class="btn btn-ghost btn-sm" data-zoom="out" aria-label="Zoom out" title="Zoom out" disabled>−</button><button type="button" class="btn btn-ghost btn-sm pdfv-zoom-label" data-zoom="reset" title="Reset to 100%" disabled>100%</button><button type="button" class="btn btn-ghost btn-sm" data-zoom="in" aria-label="Zoom in" title="Zoom in" disabled>+</button></span>`;
  }

  function pdfFindBarHtml() {
    return `<div class="pdfv-findbar" hidden><span class="pdfv-find-icon">${icon('search')}</span><input type="text" class="pdfv-find-input" placeholder="Find text in PDF..." autocomplete="off" spellcheck="false" aria-label="Find text in PDF"><span class="pdfv-find-count" aria-live="polite"></span><button type="button" class="btn btn-ghost btn-icon btn-sm" data-find="prev" title="Previous (Shift+Enter)" aria-label="Previous match" disabled>${icon('chevronUp')}</button><button type="button" class="btn btn-ghost btn-icon btn-sm" data-find="next" title="Next (Enter)" aria-label="Next match" disabled>${icon('chevronDown')}</button><button type="button" class="btn btn-ghost btn-icon btn-sm" data-find="close" title="Close find (Esc)" aria-label="Close find">${icon('close')}</button></div>`;
  }

  // Pengontrol penampil PDF berbasis pdf.js: lazy render per halaman, lapisan teks terseleksi, zoom, dan cari teks.
  function createPdfController({ viewerEl, bodyEl, pagesEl }) {
    const findBar = viewerEl.querySelector('.pdfv-findbar');
    const findInput = viewerEl.querySelector('.pdfv-find-input');
    const findCount = viewerEl.querySelector('.pdfv-find-count');
    const findPrev = viewerEl.querySelector('[data-find="prev"]');
    const findNext = viewerEl.querySelector('[data-find="next"]');
    const findClose = viewerEl.querySelector('[data-find="close"]');
    const findToggle = viewerEl.querySelector('[data-pdf-find-toggle]');
    const zoomBtns = [...viewerEl.querySelectorAll('[data-zoom]')];
    const zoomLabel = viewerEl.querySelector('.pdfv-zoom-label');
    const pageNav = viewerEl.querySelector('.pdfv-page-nav');
    const pageInput = viewerEl.querySelector('.pdfv-page-input');
    const pageTotal = viewerEl.querySelector('.pdfv-page-total');

    const MAX_RENDERED = 20;
    let doc = null;
    let lib = null;
    let zoom = 1;
    let destroyed = false;
    let enabled = true;
    let renderEpoch = 0;
    let pages = [];
    const visibleSet = new Set();
    const renderedSet = new Set();
    let currentPage = 1;
    let lastClientW = bodyEl.clientWidth;
    let resizeTimer = null;
    let scrollRaf = 0;

    let searchSeq = 0;
    let searchTimer = null;
    let lastQuery = '';
    let matches = [];
    let matchesByPage = new Map();
    let activeMatch = -1;

    const calcScale = (vp1) => Math.min(Math.max(200, bodyEl.clientWidth - 32) / vp1.width, 1.5) * zoom;

    const syncButtons = () => {
      const ready = enabled && !!doc;
      if (findToggle) findToggle.disabled = !ready;
      zoomBtns.forEach((z) => (z.disabled = !ready));
      if (pageNav) pageNav.hidden = !doc;
    };

    const updateZoomLabel = () => {
      if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + '%';
    };

    const cancelPageTasks = (p) => {
      if (p.renderTask) {
        try { p.renderTask.cancel(); } catch {}
        p.renderTask = null;
      }
      if (p.textTask) {
        try { p.textTask.cancel(); } catch {}
        p.textTask = null;
      }
    };

    const evictPage = (p) => {
      cancelPageTasks(p);
      p.el.replaceChildren();
      p.textDivs = null;
      p.dirtyDivs = null;
      p.state = 'idle';
      renderedSet.delete(p.pageNum);
    };

    const evictFarPages = (keepPage) => {
      if (renderedSet.size <= MAX_RENDERED) return;
      const candidates = [...renderedSet]
        .filter((n) => n !== keepPage && !visibleSet.has(n))
        .sort((a, b) => Math.abs(b - keepPage) - Math.abs(a - keepPage));
      while (renderedSet.size > MAX_RENDERED && candidates.length) {
        const n = candidates.shift();
        evictPage(pages[n - 1]);
      }
    };

    function clearPageHighlights(p) {
      if (p.dirtyDivs) {
        for (const { idx, div } of p.dirtyDivs) {
          if (div) div.textContent = (p.textItems && p.textItems[idx]) ?? '';
        }
        p.dirtyDivs = null;
      }
    }

    function applyPageHighlights(pageNum) {
      const p = pages[pageNum - 1];
      if (!p || !p.textDivs) return;
      clearPageHighlights(p);
      const pageMatches = matchesByPage.get(pageNum);
      if (!pageMatches || !pageMatches.length) return;

      const byItem = new Map();
      for (const m of pageMatches) {
        for (const sp of m.spans) {
          let list = byItem.get(sp.itemIdx);
          if (!list) byItem.set(sp.itemIdx, (list = []));
          list.push({ from: sp.from, to: sp.to, matchIdx: m.globalIdx });
        }
      }
      const dirty = [];
      for (const [idx, ranges] of byItem) {
        const div = p.textDivs[idx];
        if (!div || !div.isConnected) continue;
        const raw = (p.textItems && p.textItems[idx]) ?? div.textContent;
        ranges.sort((a, b) => a.from - b.from);
        const frag = document.createDocumentFragment();
        let pos = 0;
        for (const r of ranges) {
          const s = Math.max(pos, r.from);
          const e = Math.max(s, r.to);
          if (s > pos) frag.append(document.createTextNode(raw.slice(pos, s)));
          if (e > s) {
            const mark = document.createElement('mark');
            mark.className = 'pdfv-hl' + (r.matchIdx === activeMatch ? ' is-active' : '');
            mark.dataset.match = String(r.matchIdx);
            mark.textContent = raw.slice(s, e);
            frag.append(mark);
          }
          pos = e;
        }
        if (pos < raw.length) frag.append(document.createTextNode(raw.slice(pos)));
        div.replaceChildren(frag);
        dirty.push({ idx, div });
      }
      p.dirtyDivs = dirty;
    }

    async function renderPage(pageNum) {
      const p = pages[pageNum - 1];
      if (!p || !doc || destroyed) return;
      const myEpoch = renderEpoch;
      if (p.state === 'ready' && p.epoch === myEpoch) return p.readyPromise;
      if (p.state === 'rendering' && p.epoch === myEpoch && p.readyPromise) return p.readyPromise;

      cancelPageTasks(p);
      p.state = 'rendering';
      p.epoch = myEpoch;
      p.readyPromise = (async () => {
        try {
          const page = await doc.getPage(pageNum);
          if (destroyed || p.epoch !== myEpoch) return;
          const vp1 = page.getViewport({ scale: 1 });
          p.vp1 = vp1;
          const scale = calcScale(vp1);
          const cssW = Math.floor(vp1.width * scale);
          const cssH = Math.floor(vp1.height * scale);
          if (p.w !== cssW || p.h !== cssH) {
            p.w = cssW;
            p.h = cssH;
            p.el.style.width = cssW + 'px';
            p.el.style.height = cssH + 'px';
          }
          const dpr = window.devicePixelRatio || 1;
          const vpCanvas = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(vpCanvas.width);
          canvas.height = Math.floor(vpCanvas.height);
          canvas.style.width = cssW + 'px';
          canvas.style.height = cssH + 'px';
          canvas.setAttribute('aria-label', 'Halaman ' + pageNum);

          const textLayer = document.createElement('div');
          textLayer.className = 'textLayer';
          textLayer.style.setProperty('--scale-factor', String(scale));

          p.textDivs = null;
          p.dirtyDivs = null;
          p.el.replaceChildren(canvas, textLayer);

          p.renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport: vpCanvas });
          await p.renderTask.promise;
          p.renderTask = null;
          if (destroyed || p.epoch !== myEpoch) return;

          if (!p.textContent) p.textContent = await page.getTextContent();
          if (destroyed || p.epoch !== myEpoch) return;

          const vpCss = page.getViewport({ scale });
          const textDivs = [];
          p.textTask = lib.renderTextLayer({ textContentSource: p.textContent, container: textLayer, viewport: vpCss, textDivs });
          await p.textTask.promise;
          p.textTask = null;
          if (destroyed || p.epoch !== myEpoch) return;

          p.textDivs = textDivs;
          p.state = 'ready';
          renderedSet.add(pageNum);
          if (matchesByPage.has(pageNum)) applyPageHighlights(pageNum);
          evictFarPages(pageNum);
        } catch (err) {
          if (err && (err.name === 'RenderingCancelledException' || err.name === 'AbortException')) return;
          if (!destroyed && p.epoch === myEpoch) p.state = 'idle';
        }
      })();
      return p.readyPromise;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (destroyed || !doc) return;
        for (const entry of entries) {
          const n = Number(entry.target.dataset.page);
          if (!n) continue;
          if (entry.isIntersecting) {
            visibleSet.add(n);
            renderPage(n);
          } else {
            visibleSet.delete(n);
          }
        }
      },
      { root: bodyEl, rootMargin: '800px 0px', threshold: 0 },
    );

    function layoutPlaceholders() {
      updateZoomLabel();
      for (const p of pages) {
        const scale = calcScale(p.vp1);
        p.w = Math.floor(p.vp1.width * scale);
        p.h = Math.floor(p.vp1.height * scale);
        p.el.style.width = p.w + 'px';
        p.el.style.height = p.h + 'px';
      }
    }

    function relayout(preserveScroll) {
      if (!doc || destroyed) return;
      const ratio = preserveScroll && bodyEl.scrollHeight > 0 ? bodyEl.scrollTop / bodyEl.scrollHeight : 0;
      renderEpoch++;
      for (const p of pages) evictPage(p);
      layoutPlaceholders();
      if (preserveScroll) bodyEl.scrollTop = Math.round(ratio * bodyEl.scrollHeight);
      for (const n of visibleSet) renderPage(n);
    }

    const ro = new ResizeObserver(() => {
      if (destroyed || !doc) return;
      const w = bodyEl.clientWidth;
      if (Math.abs(w - lastClientW) <= 2) return;
      lastClientW = w;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => relayout(true), 180);
    });
    ro.observe(bodyEl);

    const updateCurrentPageFromScroll = () => {
      scrollRaf = 0;
      if (!pages.length || destroyed) return;
      const targetY = bodyEl.scrollTop + bodyEl.clientHeight * 0.25;
      let lo = 0;
      let hi = pages.length - 1;
      let best = 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const elPage = pages[mid].el;
        if (elPage.offsetTop <= targetY) {
          best = mid + 1;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      currentPage = best;
      if (pageInput && document.activeElement !== pageInput) pageInput.value = String(currentPage);
    };

    const onScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(updateCurrentPageFromScroll);
    };
    bodyEl.addEventListener('scroll', onScroll, { passive: true });

    function goToPage(n) {
      if (!doc || !pages.length) return;
      const target = Math.max(1, Math.min(doc.numPages, Math.round(n)));
      const p = pages[target - 1];
      if (!p) return;
      currentPage = target;
      if (pageInput) pageInput.value = String(target);
      bodyEl.scrollTop = Math.max(0, p.el.offsetTop - 16);
      renderPage(target);
    }

    if (pageInput) {
      pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          goToPage(Number(pageInput.value) || currentPage);
          pageInput.blur();
        }
      });
      pageInput.addEventListener('change', () => {
        goToPage(Number(pageInput.value) || currentPage);
      });
    }

    async function ensurePageText(pageNum) {
      const p = pages[pageNum - 1];
      if (!p || p.textStr !== null) return;
      if (!p.textContent) {
        const page = await doc.getPage(pageNum);
        p.textContent = await page.getTextContent();
      }
      const textItems = [];
      let str = '';
      const segs = [];
      for (const it of p.textContent.items) {
        if (it.str === undefined) continue;
        const itemIdx = textItems.length;
        textItems.push(it.str);
        if (it.str.length > 0) {
          segs.push({ itemIdx, start: str.length, end: str.length + it.str.length });
          str += it.str;
        }
        if (it.hasEOL && !/\s$/.test(it.str)) str += '\n';
      }
      p.textItems = textItems;
      p.textStr = str;
      p.segments = segs;
    }

    function spansForRange(segs, mStart, mEnd) {
      let lo = 0;
      let hi = segs.length - 1;
      let first = segs.length;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (segs[mid].end > mStart) {
          first = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      const out = [];
      for (let i = first; i < segs.length && segs[i].start < mEnd; i++) {
        const seg = segs[i];
        out.push({
          itemIdx: seg.itemIdx,
          from: Math.max(0, mStart - seg.start),
          to: Math.min(seg.end - seg.start, mEnd - seg.start),
        });
      }
      return out;
    }

    function updateFindUi() {
      if (!findCount) return;
      const hasQ = !!lastQuery;
      findCount.classList.toggle('is-empty', hasQ && matches.length === 0);
      if (!hasQ) {
        findCount.textContent = '';
      } else if (matches.length === 0) {
        findCount.textContent = 'Not found';
      } else {
        findCount.textContent = `${activeMatch + 1} / ${matches.length}`;
      }
      const hasMatchesNow = matches.length > 0;
      if (findPrev) findPrev.disabled = !hasMatchesNow;
      if (findNext) findNext.disabled = !hasMatchesNow;
    }

    async function activateMatch(idx) {
      if (!matches.length || destroyed) return;
      activeMatch = ((idx % matches.length) + matches.length) % matches.length;
      updateFindUi();
      for (const mEl of pagesEl.querySelectorAll('.pdfv-hl.is-active')) {
        mEl.classList.remove('is-active');
      }
      const target = matches[activeMatch];
      const p = pages[target.pageNum - 1];
      if (!p) return;
      if (p.state !== 'ready') {
        bodyEl.scrollTop = Math.max(0, p.el.offsetTop - 16);
        await renderPage(target.pageNum);
        if (destroyed) return;
      }
      const marks = p.el.querySelectorAll(`.pdfv-hl[data-match="${activeMatch}"]`);
      marks.forEach((mEl) => mEl.classList.add('is-active'));
      if (marks.length) {
        marks[0].scrollIntoView({ block: 'center', inline: 'nearest' });
      } else {
        p.el.scrollIntoView({ block: 'center' });
      }
    }

    async function runFind(rawQ) {
      const seq = ++searchSeq;
      const q = rawQ.trim();
      lastQuery = q;
      matches = [];
      matchesByPage = new Map();
      activeMatch = -1;
      for (const n of renderedSet) clearPageHighlights(pages[n - 1]);
      if (!q || !doc) {
        updateFindUi();
        return;
      }
      const scanTimer = setTimeout(() => {
        if (seq === searchSeq && findCount) {
          findCount.classList.remove('is-empty');
          findCount.textContent = 'Scanning…';
        }
      }, 120);
      const pattern = q.split(/\s+/).map(reEsc).join('\\s+');
      const re = new RegExp(pattern, 'gi');
      const all = [];
      const byPage = new Map();
      try {
        for (let n = 1; n <= doc.numPages; n++) {
          await ensurePageText(n);
          if (seq !== searchSeq || destroyed) return;
          const p = pages[n - 1];
          re.lastIndex = 0;
          let m;
          const pageList = [];
          while ((m = re.exec(p.textStr)) !== null) {
            if (m[0].length === 0) {
              re.lastIndex++;
              continue;
            }
            const spans = spansForRange(p.segments, m.index, m.index + m[0].length);
            if (!spans.length) continue;
            const entry = { globalIdx: all.length, pageNum: n, spans };
            all.push(entry);
            pageList.push(entry);
          }
          if (pageList.length) byPage.set(n, pageList);
        }
      } finally {
        clearTimeout(scanTimer);
      }
      if (seq !== searchSeq || destroyed) return;
      matches = all;
      matchesByPage = byPage;
      if (matches.length) {
        const firstNear = matches.findIndex((m) => m.pageNum >= currentPage);
        activeMatch = firstNear >= 0 ? firstNear : 0;
      }
      for (const n of renderedSet) {
        if (matchesByPage.has(n)) applyPageHighlights(n);
      }
      updateFindUi();
      if (matches.length) await activateMatch(activeMatch);
    }

    function openFind() {
      if (!findBar || !doc) return;
      findBar.hidden = false;
      if (findToggle) {
        findToggle.classList.add('active');
        findToggle.setAttribute('aria-pressed', 'true');
      }
      if (findInput) {
        findInput.focus();
        findInput.select();
      }
    }

    function closeFind() {
      if (!findBar) return;
      clearTimeout(searchTimer);
      searchSeq++;
      findBar.hidden = true;
      if (findToggle) {
        findToggle.classList.remove('active');
        findToggle.setAttribute('aria-pressed', 'false');
      }
      lastQuery = '';
      matches = [];
      matchesByPage = new Map();
      activeMatch = -1;
      for (const n of renderedSet) clearPageHighlights(pages[n - 1]);
      updateFindUi();
    }

    if (findToggle) {
      findToggle.addEventListener('click', () => {
        if (findBar && findBar.hidden) openFind();
        else closeFind();
      });
    }
    if (findClose) findClose.addEventListener('click', closeFind);
    if (findPrev) findPrev.addEventListener('click', () => activateMatch(activeMatch - 1));
    if (findNext) findNext.addEventListener('click', () => activateMatch(activeMatch + 1));
    if (findInput) {
      findInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => runFind(findInput.value), 160);
      });
      findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(searchTimer);
          const q = findInput.value.trim();
          if (q !== lastQuery) runFind(findInput.value);
          else if (matches.length) activateMatch(activeMatch + (e.shiftKey ? -1 : 1));
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeFind();
        }
      });
    }

    zoomBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!doc || !enabled) return;
        const act = btn.dataset.zoom;
        zoom = act === 'reset' ? 1 : Math.min(3, Math.max(0.5, Math.round((zoom + (act === 'in' ? 0.25 : -0.25)) * 100) / 100));
        relayout(true);
      });
    });

    async function setDocument(newDoc, pdfLib) {
      clear(false);
      doc = newDoc;
      lib = pdfLib;
      zoom = 1;
      currentPage = 1;
      lastClientW = bodyEl.clientWidth;
      if (pageInput) {
        pageInput.max = String(doc.numPages);
        pageInput.value = '1';
      }
      if (pageTotal) pageTotal.textContent = '/ ' + doc.numPages;

      const p1 = await doc.getPage(1);
      if (destroyed || doc !== newDoc) return;
      const vp1 = p1.getViewport({ scale: 1 });
      pages = [];
      const frag = document.createDocumentFragment();
      for (let n = 1; n <= doc.numPages; n++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'pdfv-page';
        pageEl.dataset.page = String(n);
        pages.push({
          pageNum: n,
          el: pageEl,
          vp1,
          w: 0,
          h: 0,
          state: 'idle',
          epoch: 0,
          textItems: null,
          textContent: null,
          textDivs: null,
          dirtyDivs: null,
          textStr: null,
          segments: null,
          renderTask: null,
          textTask: null,
          readyPromise: null,
        });
        frag.appendChild(pageEl);
      }
      pagesEl.replaceChildren(frag);
      layoutPlaceholders();
      bodyEl.scrollTop = 0;
      for (const p of pages) io.observe(p.el);
      syncButtons();
      if (lastQuery && findBar && !findBar.hidden) runFind(lastQuery);
    }

    function clear(destroyDoc = false) {
      searchSeq++;
      clearTimeout(searchTimer);
      renderEpoch++;
      io.disconnect();
      visibleSet.clear();
      renderedSet.clear();
      for (const p of pages) cancelPageTasks(p);
      pages = [];
      matches = [];
      matchesByPage = new Map();
      activeMatch = -1;
      if (destroyDoc && doc) {
        try { doc.destroy(); } catch {}
      }
      doc = null;
      syncButtons();
      updateFindUi();
    }

    function setEnabled(b) {
      enabled = b;
      syncButtons();
    }

    function destroy(destroyDoc = false) {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(resizeTimer);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      ro.disconnect();
      bodyEl.removeEventListener('scroll', onScroll);
      clear(destroyDoc);
    }

    syncButtons();
    return {
      setDocument,
      clear,
      setEnabled,
      openFind,
      closeFind,
      hasOpenFind: () => !!(findBar && !findBar.hidden),
      hasMatches: () => matches.length > 0,
      stepMatch: (dir) => activateMatch(activeMatch + dir),
      goToPage,
      destroy,
    };
  }

  // Penampil PDF hasil ekspor (popup sendiri, halaman digambar dengan pdf.js). Unduh dari tombol di dalamnya.
  let pdfjsLoader = null;
  function loadPdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfjsLoader) {
      pdfjsLoader = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/vendor/pdf.min.js';
        s.onload = () => {
          const lib = window.pdfjsLib;
          if (!lib) return reject(new Error('Pustaka pdf.js termuat tetapi tidak dikenali.'));
          lib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
          resolve(lib);
        };
        s.onerror = () => {
          pdfjsLoader = null;
          reject(new Error('Pustaka pdf.js tidak bisa dimuat. Jalankan "npm install" di folder APP, lalu mulai ulang aplikasi.'));
        };
        document.head.appendChild(s);
      });
    }
    return pdfjsLoader;
  }

  // opts.generate(orientation) membuat PDF di server dan mengembalikan { id, name }. Dipanggil saat dibuka (potret)
  // dan saat tombol Lanskap/Potret diklik; selama proses, halaman diganti animasi memuat.
  function openPdfViewer({ name, dark, generate }) {
    const old = document.querySelector('.pdf-overlay');
    if (old && old.__close) old.__close();
    const ov = document.createElement('div');
    ov.className = 'pdf-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Pratinjau PDF');
    ov.innerHTML = `<div class="viewer"><div class="viewer-bar"><span class="viewer-badge">PDF</span><div class="viewer-name"><strong data-pdf-name></strong><span data-pdf-info>Generating PDF…</span></div><span class="spacer"></span><button type="button" class="btn btn-ghost btn-sm pdfv-orient" data-orient disabled><span class="pdfv-orient-icon" aria-hidden="true"></span><span data-orient-label>Landscape</span></button>${pdfToolsHtml()}<button type="button" class="btn btn-primary btn-sm viewer-dl" data-pdf-dl disabled>${icon('download')}<span>Download</span></button><button type="button" class="btn btn-ghost btn-sm viewer-close" data-pdf-close title="Close (Esc)">${icon('close')}<span>Close</span></button></div>${pdfFindBarHtml()}<div class="viewer-body"><div class="pdfv-pages"></div></div></div>`;
    const viewerEl = ov.querySelector('.viewer');
    const pagesEl = ov.querySelector('.pdfv-pages');
    const bodyEl = ov.querySelector('.viewer-body');
    const nameEl = ov.querySelector('[data-pdf-name]');
    const info = ov.querySelector('[data-pdf-info]');
    const dlBtn = ov.querySelector('[data-pdf-dl]');
    const orientBtn = ov.querySelector('[data-orient]');
    const orientLabel = ov.querySelector('[data-orient-label]');
    const ctrl = createPdfController({ viewerEl, bodyEl, pagesEl });
    let closed = false;
    let busy = false;
    let doc = null;
    let lib = null;
    let blobUrl = null;
    let curName = name;
    let orientation = 'portrait';

    const setName = (n) => {
      curName = n;
      nameEl.textContent = n;
      nameEl.title = n;
    };
    setName(name);

    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        if (!busy && doc) ctrl.openFind();
        return;
      }
      if (e.key === 'F3' && (ctrl.hasOpenFind() || ctrl.hasMatches())) {
        e.preventDefault();
        e.stopPropagation();
        ctrl.stepMatch(e.shiftKey ? -1 : 1);
        return;
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (ctrl.hasOpenFind()) ctrl.closeFind();
        else close();
      }
    };
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      ctrl.destroy(false);
      if (doc) doc.destroy();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      ov.remove();
    }
    ov.__close = close;

    function setBusy(b) {
      busy = b;
      orientBtn.disabled = b;
      dlBtn.disabled = b || !blobUrl;
      ctrl.setEnabled(!b && !!doc);
      ov.classList.toggle('is-busy', b);
    }

    function showLoading(target) {
      ctrl.clear(false);
      const label = target === 'landscape' ? 'lanskap' : 'potret';
      pagesEl.innerHTML = `<div class="pdfv-loading" role="status"><div class="pdfv-skel ${target}${dark ? ' is-dark' : ''}"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><div class="pdfv-spinner"></div></div><p>Membuat PDF ${label}…</p></div>`;
      bodyEl.scrollTop = 0;
      if (window.gsap) gsap.fromTo(pagesEl.querySelector('.pdfv-skel'), { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' });
    }

    async function load(target) {
      if (busy || closed) return;
      setBusy(true);
      showLoading(target);
      info.textContent = target === 'landscape' ? 'Membuat versi lanskap…' : 'Membuat PDF…';
      try {
        const r = await generate(target);
        if (closed) return;
        const [loadedLib, buf] = await Promise.all([
          loadPdfjs(),
          fetch('/api/export/file?id=' + encodeURIComponent(r.id), { cache: 'no-store' }).then((res) => {
            if (!res.ok) throw new Error(res.status === 404 ? 'PDF sudah kedaluwarsa. Ekspor ulang.' : 'HTTP ' + res.status);
            return res.arrayBuffer();
          }),
        ]);
        if (closed) return;
        const newDoc = await loadedLib.getDocument({ data: new Uint8Array(buf.slice(0)), isEvalSupported: false }).promise;
        if (closed) return newDoc.destroy();
        if (doc) doc.destroy();
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        doc = newDoc;
        lib = loadedLib;
        blobUrl = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
        orientation = target;
        setName(r.name || curName);
        orientLabel.textContent = orientation === 'landscape' ? 'Portrait' : 'Landscape';
        orientBtn.classList.toggle('is-landscape', orientation === 'landscape');
        orientBtn.title = orientation === 'landscape' ? 'Regenerate PDF in portrait' : 'Regenerate PDF in landscape';
        info.textContent = doc.numPages + ' pages · ' + (orientation === 'landscape' ? 'Landscape' : 'Portrait');
        setBusy(false);
        await ctrl.setDocument(doc, lib);
      } catch (err) {
        if (closed) return;
        if (err && err.fallback) return close();
        setBusy(false);
        if (doc) {
          // Versi sebelumnya masih ada: tampilkan lagi, beri tahu lewat toast.
          toast('Failed to generate PDF: ' + (err.message || err));
          info.textContent = doc.numPages + ' pages · ' + (orientation === 'landscape' ? 'Landscape' : 'Portrait');
          ctrl.setDocument(doc, lib);
        } else {
          info.textContent = 'Failed';
          pagesEl.innerHTML = '<div class="viewer-msg pdfv-msg"><p><strong>Unable to generate PDF</strong></p><p>' + esc(err.message || String(err)) + '</p></div>';
        }
      }
    }

    ov.addEventListener('click', (e) => {
      if (e.target === ov || e.target.closest('[data-pdf-close]')) return close();
      if (busy) return;
      if (e.target.closest('[data-orient]')) return load(orientation === 'landscape' ? 'portrait' : 'landscape');
      if (e.target.closest('[data-pdf-dl]') && blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = curName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast('PDF diunduh: ' + curName);
      }
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(ov);
    if (window.gsap) gsap.fromTo(viewerEl, { opacity: 0, y: 12, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out', clearProps: 'opacity,transform' });
    ov.querySelector('[data-pdf-close]').focus({ preventScroll: true });
    load('portrait');
  }

  // PDF: penampil langsung terbuka dengan animasi memuat, PDF dibuat di server (ikut tema aplikasi).
  // Diagram mermaid dihitung sekali lalu dipakai ulang saat ganti orientasi.
  function exportPdf(notePath, draft = null) {
    const dark = document.documentElement.classList.contains('dark');
    let diagrams = null;
    openPdfViewer({
      name: draft ? draft.name.replace(/[\\/:*?"<>|]+/g, '-') + '.pdf' : notePath.split('/').pop().replace(/\.md$/i, '') + '.pdf',
      dark,
      async generate(orientation) {
        if (!diagrams) diagrams = exportDiagrams(dark);
        const mermaid = await diagrams;
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
          body: JSON.stringify(
            draft
              ? { content: draft.content, name: draft.name, format: 'pdf', theme: dark ? 'dark' : 'light', orientation, mermaid: [] }
              : { path: notePath, format: 'pdf', theme: dark ? 'dark' : 'light', orientation, mermaid },
          ),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (err.fallback === 'print' && !draft) {
            toast('PDF otomatis tidak tersedia. Membuka halaman cetak: pilih "Simpan sebagai PDF".');
            window.open(`/api/export?path=${encodeURIComponent(notePath)}&format=print`, '_blank');
            throw Object.assign(new Error('PDF otomatis tidak tersedia'), { fallback: true });
          }
          throw new Error(err.error || 'HTTP ' + res.status + '. Jika server belum dijalankan ulang setelah pembaruan, jalankan restart.bat.');
        }
        return res.json();
      },
    });
  }

  async function exportNote(notePath, format) {
    if (format === 'pdf') return exportPdf(notePath);
    const labels = { md: 'Markdown', html: 'HTML', docx: 'Word' };
    if (format === 'docx') toast('Menyiapkan Word...');
    try {
      const res =
        format === 'docx'
          ? await fetch('/api/export', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
              body: JSON.stringify({ path: notePath, format, theme: 'light', mermaid: await exportDiagrams(false) }),
            })
          : await fetch(`/api/export?path=${encodeURIComponent(notePath)}&format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}. Jika server belum dijalankan ulang setelah pembaruan, jalankan restart.bat.`);
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

  // Ceklis daftar tugas langsung di mode baca. Disimpan ke file lewat server, tanpa mencatat riwayat versi.
  function setupTasks(root, data) {
    // Bungkus teks tiap item (sampai sub-daftar) dengan span, supaya coretan "selesai" tidak ikut mengenai sub-tugas.
    root.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      const span = document.createElement('span');
      span.className = 'task-text';
      let n = cb.nextSibling;
      while (n && !(n.nodeType === 1 && /^(UL|OL)$/.test(n.nodeName))) {
        const next = n.nextSibling;
        span.appendChild(n);
        n = next;
      }
      cb.after(span);
    });
    const boxes = root.querySelectorAll('input[type="checkbox"][data-task]');
    if (!boxes.length || isReadOnly()) return;
    let chain = Promise.resolve();
    data.taskSync = () => chain;
    boxes.forEach((box) => {
      box.disabled = false;
      box.addEventListener('change', () => {
        const checked = box.checked;
        const index = Number(box.dataset.task);
        chain = chain.then(async () => {
          try {
            const res = await fetch('/api/note/task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
              body: JSON.stringify({ path: data.path, index, checked, version: data.version }),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(out.error || 'Gagal menyimpan (' + res.status + ')');
            data.version = out.version;
            data.taskDirty = true;
          } catch (err) {
            box.checked = !checked;
            AppDialog.alert({ type: 'error', title: 'Ceklis tidak tersimpan', message: err.message });
          }
        });
      });
    });
  }

  // ---------- Diagram mermaid (mode baca) ----------
  // Blok kode berbahasa "mermaid" digambar sebagai diagram. Tombol Diagram/Kode di header blok memilih tampilan;
  // pilihan terakhir diingat di browser sebagai bawaan. Pustakanya baru dimuat saat dibutuhkan.
  let mermaidLoader = null;
  let mermaidSeq = 0;

  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (!mermaidLoader) {
      mermaidLoader = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/vendor/mermaid.min.js';
        s.onload = () => (window.mermaid ? resolve(window.mermaid) : reject(new Error('Pustaka mermaid termuat tetapi tidak dikenali.')));
        s.onerror = () => {
          mermaidLoader = null;
          reject(new Error('Pustaka mermaid tidak bisa dimuat. Jalankan "npm install" di folder APP, lalu mulai ulang aplikasi.'));
        };
        document.head.appendChild(s);
      });
    }
    return mermaidLoader;
  }

  function mermaidConfig() {
    const fit = { useMaxWidth: false }; // ukuran asli; diagram lebar digulir ke samping
    return {
      startOnLoad: false,
      securityLevel: 'strict',
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif',
      sequence: fit, flowchart: fit, class: fit, er: fit, state: fit, gantt: fit, journey: fit, pie: fit, gitGraph: fit, mindmap: fit, timeline: fit,
    };
  }

  async function renderMermaidBlock(wrap) {
    const view = wrap.querySelector('.mm-view');
    const code = wrap.querySelector('pre code');
    if (!view || !code) return;
    const token = (wrap.__mmToken = (wrap.__mmToken || 0) + 1);
    wrap.classList.remove('mm-failed');
    if (!view.firstChild) view.innerHTML = '<span class="muted">Menggambar diagram...</span>';
    const id = 'mm-' + ++mermaidSeq;
    try {
      const mm = await loadMermaid();
      mm.initialize(mermaidConfig());
      const { svg } = await mm.render(id, code.textContent);
      if (wrap.__mmToken !== token) return;
      view.innerHTML = svg;
      applyMermaidScale(wrap);
      wrap.dataset.mmDone = '1';
    } catch (err) {
      for (const x of [id, 'd' + id]) {
        const stray = document.getElementById(x);
        if (stray) stray.remove();
      }
      if (wrap.__mmToken !== token) return;
      const msg = String((err && err.message) || err || 'Kesalahan tidak diketahui').split('\n').slice(0, 8).join('\n');
      view.innerHTML = '<div class="mm-err"><strong>Diagram tidak bisa digambar.</strong><pre>' + esc(msg) + '</pre></div>';
      wrap.classList.add('mm-failed');
      wrap.dataset.mmDone = '1';
    }
  }

  function setMermaidMode(wrap, mode, remember) {
    wrap.dataset.mmMode = mode;
    wrap.querySelectorAll('[data-mm]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mm === mode)));
    if (remember) store.set('mermaidMode', mode);
    if (mode === 'diagram' && !wrap.dataset.mmDone) renderMermaidBlock(wrap);
  }

  // Skala diagram (bawaan 75%). Berlaku untuk semua diagram dan diingat di browser.
  const MM_SCALE_DEFAULT = 0.75;
  let mmScale = (() => {
    const v = parseFloat(store.get('mermaidScale', String(MM_SCALE_DEFAULT)));
    return v >= 0.3 && v <= 2 ? v : MM_SCALE_DEFAULT;
  })();

  function applyMermaidScale(wrap) {
    const svg = wrap.querySelector('.mm-view svg');
    if (!svg) return;
    if (!svg.dataset.w) {
      const vb = svg.viewBox && svg.viewBox.baseVal;
      const w = vb && vb.width ? vb.width : parseFloat(svg.getAttribute('width'));
      const h = vb && vb.height ? vb.height : parseFloat(svg.getAttribute('height'));
      if (!(w > 0) || !(h > 0)) return;
      svg.dataset.w = String(w);
      svg.dataset.h = String(h);
    }
    svg.setAttribute('width', String(Math.round(svg.dataset.w * mmScale)));
    svg.setAttribute('height', String(Math.round(svg.dataset.h * mmScale)));
  }

  function updateMermaidScaleUi() {
    document.querySelectorAll('.code-block[data-mermaid]').forEach((w) => {
      applyMermaidScale(w);
      const l = w.querySelector('.mm-zoom-label');
      if (l) l.textContent = Math.round(mmScale * 100) + '%';
    });
  }

  function stepMermaidScale(action) {
    if (action === 'reset') mmScale = MM_SCALE_DEFAULT;
    else mmScale = Math.min(2, Math.max(0.3, Math.round((mmScale + (action === 'in' ? 0.1 : -0.1)) * 100) / 100));
    store.set('mermaidScale', String(mmScale));
    updateMermaidScaleUi();
  }

  // Ganti tema: gambar ulang diagram dengan warna yang sesuai.
  let mmLastDark = document.documentElement.classList.contains('dark');
  new MutationObserver(() => {
    const dark = document.documentElement.classList.contains('dark');
    if (dark === mmLastDark) return;
    mmLastDark = dark;
    document.querySelectorAll('.code-block[data-mermaid]').forEach((w) => {
      delete w.dataset.mmDone;
      if (w.dataset.mmMode === 'diagram') renderMermaidBlock(w);
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  function enhanceProse(root, notePath, opts = {}) {
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
      if (opts.mermaid && lang === 'mermaid') {
        wrap.dataset.mermaid = '1';
        const head = wrap.querySelector('.code-head');
        const ctrl = document.createElement('span');
        ctrl.className = 'mm-controls';
        ctrl.innerHTML =
          '<span class="mm-toggle"><button type="button" data-mm="diagram">Diagram</button><button type="button" data-mm="code">Kode</button></span>' +
          '<span class="mm-zoom"><button type="button" data-mmz="out" title="Perkecil" aria-label="Perkecil">−</button>' +
          '<button type="button" data-mmz="reset" class="mm-zoom-label" title="Klik untuk kembali ke 75%"></button>' +
          '<button type="button" data-mmz="in" title="Perbesar" aria-label="Perbesar">+</button></span>';
        ctrl.querySelector('.mm-zoom-label').textContent = Math.round(mmScale * 100) + '%';
        head.insertBefore(ctrl, head.querySelector('[data-copy]'));
        const view = document.createElement('div');
        view.className = 'mm-view';
        wrap.insertBefore(view, pre);
        ctrl.addEventListener('click', (e) => {
          const b = e.target.closest('[data-mm]');
          if (b) return setMermaidMode(wrap, b.dataset.mm, true);
          const z = e.target.closest('[data-mmz]');
          if (z) stepMermaidScale(z.dataset.mmz);
        });
        setMermaidMode(wrap, store.get('mermaidMode', 'diagram') === 'code' ? 'code' : 'diagram', false);
      }
    });

    // Tautan: eksternal dibuka di tab baru, relatif ke .md diarahkan ke dalam aplikasi.
    const baseDir = notePath.includes('/') ? notePath.slice(0, notePath.lastIndexOf('/')) : '';
    root.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (/^https?:\/\//i.test(href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      } else if (/^\/files\//.test(href)) {
        const cleanHref = href.split(/[?#]/)[0];
        a.dataset.fileSrc = cleanHref;
        a.classList.add('file-link');
        if (VIEWABLE.test(cleanHref)) {
          // Lampiran PDF/teks/kode dibuka di penampil dalam aplikasi; file teks/kode dibuka lewat popup.
          const rawRel = cleanHref.slice(7);
          a.setAttribute('href', '#/~lihat/' + rawRel);
          if (TEXT_CODE_EXT.test(rawRel)) {
            try {
              a.dataset.codeRel = decodeURIComponent(rawRel);
            } catch {
              a.dataset.codeRel = rawRel;
            }
          }
        }
      } else if (/^file:/i.test(href)) {
        // Tautan absolut ke file di disk (file:///d:/.../AI Note/x/y.md): cocokkan ke catatan yang ada.
        const target = notePathFromFile(href);
        if (target) a.setAttribute('href', hashFor(target));
        else a.dataset.missingHref = href;
      } else if (/\.md(#.*)?$/i.test(href) && !href.startsWith('/')) {
        const segs = (baseDir ? baseDir.split('/') : []).concat(href.split('#')[0].split('/'));
        const out = [];
        for (const s of segs) {
          if (s === '..') out.pop();
          else if (s && s !== '.') out.push(s);
        }
        a.setAttribute('href', hashFor(out.join('/')));
      } else if (!/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('#') && !href.startsWith('/')) {
        a.dataset.missingHref = href;
      }
    });
  }

  // file:///D:/Rasimin/AI%20Note/smbci/akses/x.md -> smbci/akses/x.md (bagian ujung path yang cocok dengan catatan).
  function notePathFromFile(href) {
    let p;
    try {
      p = decodeURIComponent(href.replace(/^file:\/*/i, '').split(/[?#]/)[0]);
    } catch {
      return null;
    }
    if (!/\.md$/i.test(p) || !rootNode) return null;
    const paths = new Set();
    const walk = (n) => (n.children || []).forEach((c) => (c.type === 'dir' ? walk(c) : paths.add(c.path)));
    walk(rootNode);
    const segs = p.split(/[\\/]/).filter(Boolean);
    for (let i = 0; i < segs.length; i++) {
      const cand = segs.slice(i).join('/');
      if (paths.has(cand)) return cand;
    }
    return null;
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
    el.content.style.position = '';
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
    if (remember !== false) store.set(editing.draft ? 'draftMode' : 'editMode', mode);
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
    src = fromRelMark(src);
    if (!editing || /^(https?:|data:|\/)/i.test(src)) return src;
    const base = editing.path.includes('/') ? editing.path.slice(0, editing.path.lastIndexOf('/')).split('/') : [];
    const out = [...base];
    for (let s of String(src).split(/[?#]/)[0].split('/')) {
      try {
        s = decodeURIComponent(s);
      } catch {}
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
        editing.editSeq += 1;
        if (!editing.dirty) {
          editing.dirty = true;
          setStatus(editing.draft ? 'Tersimpan otomatis di browser · belum jadi file' : 'Belum disimpan');
        }
        if (editing.draft) saveDraftLocal();
        schedulePreview();
      },
      onSave: () => saveEditing(false),
    };
    if (mode === 'visual' && window.NoteEditorVisual) {
      const box = $('#visual');
      box.innerHTML = '';
      st.visual = true;
      const vis = window.NoteEditorVisual.create(box, text, {
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
      // Dialog pengaturan gambar (ikon gear): label berbahasa Indonesia dan alamat gambar ditampilkan relatif.
      const DIALOG_TEXT = { 'Upload an image': 'Pengaturan gambar', 'Add an image from an URL:': 'Alamat gambar', 'Alt:': 'Deskripsi (alt)', 'Title:': 'Judul (opsional)', Save: 'Simpan', Cancel: 'Batal' };
      const fixDialog = () => {
        box.querySelectorAll('[role="dialog"]:not([data-ai-note])').forEach((d) => {
          d.dataset.aiNote = '1';
          d.querySelectorAll('h2, label, button').forEach((n) => {
            const t = DIALOG_TEXT[n.textContent.trim()];
            if (!t) return;
            n.textContent = t;
            if (n.hasAttribute('title')) n.title = t;
            if (n.hasAttribute('aria-label')) n.setAttribute('aria-label', t);
          });
          const fixSrc = () => {
            const src = d.querySelector('input[name="src"]');
            if (src && src.value.includes(REL_MARK)) {
              src.value = fromRelMark(src.value);
              src.dispatchEvent(new Event('input', { bubbles: true }));
            }
          };
          fixSrc();
          requestAnimationFrame(fixSrc);
        });
      };
      const dialogWatch = new MutationObserver(fixDialog);
      dialogWatch.observe(box, { childList: true, subtree: true });
      st.editor = {
        get value() {
          return fromRelMark(vis.value);
        },
        focus: () => vis.focus(),
        destroy: () => {
          dialogWatch.disconnect();
          vis.destroy();
        },
      };
    } else {
      const box = $('#editor');
      box.innerHTML = '';
      st.visual = false;
      st.editor = window.NoteEditor.create(box, text, common);
      bindScroll();
    }
  }

  // ---------- Tempel / seret / lampirkan file & gambar ke editor ----------
  // File diunggah ke <folder catatan>/_lampiran/<nama-catatan>/NN-<nama>.<ext>, lalu tautannya
  // disisipkan. Unggahan sesi ini dicatat di editing.uploads: dihapus lagi bila edit dibatalkan,
  // atau bila file-nya sudah tidak dipakai saat catatan disimpan.
  const PASTE_IMG_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  const isPasteImage = (f) => PASTE_IMG_TYPES.includes(f.type);
  const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  // Editor visual mengubah src/href hasil tempel jadi alamat absolut. Penanda ini dipakai agar
  // alamatnya bisa dikembalikan ke path relatif (_lampiran/...) saat isi editor dibaca.
  const REL_MARK = '/__rel__/';
  const fromRelMark = (text) => String(text).split(location.origin + REL_MARK).join('');
  const currentRange = () => {
    const sel = window.getSelection();
    return sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  };

  async function attachMixedFiles(fileList, range) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    const imgs = files.filter(isPasteImage);
    const others = files.filter((f) => !isPasteImage(f));
    if (imgs.length) {
      await insertImages(imgs, range);
      range = null;
    }
    if (others.length) {
      await insertFiles(others, range);
    }
  }

  function bindImagePaste(area) {
    area.addEventListener('paste', (e) => {
      if (!editing) return;
      const files = [...((e.clipboardData && e.clipboardData.files) || [])];
      if (!files.length) return;
      // Isi teks ikut tersalin (mis. sel Excel): biarkan editor menempel teksnya seperti biasa.
      if ((e.clipboardData.getData('text/plain') || '').trim()) return;
      if (editing.draft) {
        e.preventDefault();
        toast('Simpan Live Preview jadi catatan dulu untuk melampirkan file.');
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      attachMixedFiles(files, currentRange());
    }, true);
    area.addEventListener('dragover', (e) => {
      if (editing && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
    }, true);
    area.addEventListener('drop', (e) => {
      if (!editing) return;
      const files = [...((e.dataTransfer && e.dataTransfer.files) || [])];
      if (!files.length) return;
      if (editing.draft) {
        e.preventDefault();
        toast('Simpan Live Preview jadi catatan dulu untuk melampirkan file.');
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      attachMixedFiles(files, document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null);
    }, true);
  }

  async function insertFiles(files, range) {
    const state = editing;
    for (const file of files) {
      if (editing !== state) return;
      const fname = file.name || 'lampiran';
      setStatus('Mengunggah ' + fname + '...');
      let data;
      try {
        const res = await fetch(`/api/attachment?note=${encodeURIComponent(state.path)}&name=${encodeURIComponent(fname)}`, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Requested-With': 'ai-note' },
          body: file,
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status + '. Jika server belum dijalankan ulang setelah pembaruan, jalankan restart.bat.');
      } catch (err) {
        setStatus('Gagal mengunggah lampiran');
        await AppDialog.alert({ type: 'error', title: 'Gagal mengunggah lampiran', message: err.message });
        return;
      }
      if (editing !== state) return;
      (state.uploads = state.uploads || []).push(data.name);
      const label = fname.replace(/[\[\]\r\n]/g, ' ');
      const src = data.path.split('/').map(encodeURIComponent).join('/');
      if (data.kind === 'image') {
        await insertIntoEditor(state, `![${label}](${src})`, `<img src="${escAttr(location.origin + REL_MARK + src)}" alt="${escAttr(label)}">`, range);
      } else {
        await insertIntoEditor(state, `- [${label}](${src})`, `<a href="${escAttr(location.origin + REL_MARK + src)}">${esc(label)}</a>`, range, { listItem: true });
      }
      range = null;
      setStatus('Lampiran disisipkan: ' + data.name);
    }
  }

  async function insertImages(files, range) {
    const state = editing;
    for (const file of files) {
      if (editing !== state) return;
      const kb = Math.max(1, Math.round(file.size / 1024));
      const desc = await AppDialog.prompt({
        title: 'Deskripsi gambar',
        message: `${file.name || 'Gambar dari clipboard'} · ${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}`,
        label: 'Deskripsi (boleh dikosongkan)',
        placeholder: 'mis. login vpn gagal',
        required: false,
        confirmLabel: 'Sisipkan',
      });
      if (desc === null || editing !== state) return;
      setStatus('Mengunggah gambar...');
      let data;
      try {
        const res = await fetch(`/api/attachment?note=${encodeURIComponent(state.path)}&desc=${encodeURIComponent(desc)}`, {
          method: 'POST',
          headers: { 'Content-Type': file.type, 'X-Requested-With': 'ai-note' },
          body: file,
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status + '. Jika server belum dijalankan ulang setelah pembaruan, jalankan restart.bat.');
      } catch (err) {
        setStatus('Gagal mengunggah gambar');
        await AppDialog.alert({ type: 'error', title: 'Gagal mengunggah gambar', message: err.message });
        return;
      }
      if (editing !== state) return;
      (state.uploads = state.uploads || []).push(data.name);
      const alt = (desc.trim() || 'gambar').replace(/[\[\]\r\n]/g, ' ');
      const src = data.path.split('/').map(encodeURIComponent).join('/');
      await insertIntoEditor(state, `![${alt}](${src})`, `<img src="${escAttr(location.origin + REL_MARK + src)}" alt="${escAttr(alt)}">`, range);
      range = null; // gambar berikutnya menyusul setelah yang baru disisipkan
      setStatus('Gambar disisipkan: ' + data.name);
    }
  }

  // Sisipkan di posisi kursor dengan "paste" buatan, sehingga editor (CodeMirror / MDXEditor) memprosesnya sendiri.
  async function insertIntoEditor(state, md, html, range, opts = {}) {
    const target = state.visual ? $('#visual [contenteditable="true"]') : $('#editor .cm-content');
    if (!target) return;
    const tick = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    target.focus({ preventScroll: true });
    // Kembalikan posisi kursor saat gambar ditempel/dijatuhkan (dialog deskripsi sempat memindah fokus).
    if (range && target.contains(range.startContainer)) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      await tick();
    }
    const paste = (dt) => target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    const dt = new DataTransfer();
    if (!state.visual) {
      dt.setData('text/plain', rawPrefix(opts.listItem) + md + '\n');
      paste(dt);
      await tick();
      return;
    }
    // Visual: gambar di paragraf sendiri, setelah paragraf tempat kursor berada.
    const enter = () => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    const caretPara = () => {
      const n = window.getSelection()?.anchorNode;
      const node = n && (n.nodeType === 1 ? n : n.parentElement);
      const blk = node && node.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, pre');
      return blk && blk.tagName === 'P' && target.contains(blk) ? blk : null;
    };
    const hasText = (p) => !!(p && p.textContent.trim());
    const para = caretPara();
    if (hasText(para)) {
      // Taruh gambar setelah paragraf tempat kursor berada (tidak memotong kalimat).
      const r = document.createRange();
      r.selectNodeContents(para);
      r.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      await tick();
      enter();
      await tick();
    }
    dt.setData('text/html', html);
    dt.setData('text/plain', md);
    paste(dt);
    await tick();
    if (hasText(caretPara())) enter();
  }
  // Raw: gambar/daftar lampiran jadi paragraf sendiri (dipisah baris kosong dari teks sebelumnya).
  function rawPrefix(isListItem = false) {
    const sel = window.getSelection();
    const node = sel && sel.anchorNode;
    const line = node && (node.nodeType === 1 ? node : node.parentElement)?.closest('.cm-line');
    if (!line) return '';
    if (line.textContent.trim()) return isListItem && /^\s*[-*]\s/.test(line.textContent) ? '\n' : '\n\n';
    const prev = line.previousElementSibling;
    if (!prev || !prev.classList.contains('cm-line') || !prev.textContent.trim()) return '';
    if (isListItem && /^\s*[-*]\s/.test(prev.textContent)) return '';
    return '\n';
  }

  // Hapus unggahan sesi ini: semuanya (content null = batal) atau yang tidak dipakai di isi yang disimpan.
  function cleanupUploads(state, content) {
    if (!state || !state.uploads || !state.uploads.length) return;
    const files = state.uploads.filter((n) => content == null || !content.includes(n));
    state.uploads = [];
    if (!files.length) return;
    fetch('/api/attachment/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
      body: JSON.stringify({ note: state.path, files }),
    }).catch(() => {});
  }

  function startEditing(path, data, opts = {}) {
    if (isReadOnly()) {
      toast('Mode baca saja (guest)');
      return;
    }
    if (!window.NoteEditor) {
      AppDialog.alert({ type: 'error', title: 'Editor belum termuat', message: 'Muat ulang halaman dengan Ctrl+F5.' });
      return;
    }
    const saved = opts.draft ? store.get('draftMode', 'split') : store.get('editMode', 'visual');
    const mode = EDIT_MODES.some(([m]) => m === saved) && (saved !== 'visual' || window.NoteEditorVisual) ? saved : window.NoteEditorVisual ? 'visual' : 'split';
    const scrollY = window.scrollY;
    const readMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const atBottom = scrollY > 0 && window.innerHeight + scrollY >= document.documentElement.scrollHeight - 24;
    const scrollRatio = scrollY > 0 && readMax > 0 ? Math.min(1, scrollY / readMax) : 0;
    const preserveScroll = !opts.draft && scrollY > 0;
    const oldArticle = preserveScroll && mode !== 'split' ? el.content.querySelector('article.note-view') : null;
    if (preserveScroll && mode !== 'split' && !oldArticle) {
      const prevHeight = el.content.offsetHeight;
      if (prevHeight > 0) el.content.style.minHeight = prevHeight + 'px';
    }
    const seg = EDIT_MODES.map(([m, label]) => `<button type="button" data-mode-btn="${m}" aria-pressed="${m === mode}">${label}</button>`).join('');
    const actionBtns = opts.draft
      ? `<button type="button" class="btn btn-ghost btn-sm" id="cancel-btn">Batal</button><button type="button" class="btn btn-primary btn-sm" id="save-btn">${icon('save')}<span>Simpan</span></button>`
      : `<button type="button" class="btn btn-primary btn-sm" id="save-btn">${icon('save')}<span>Simpan</span></button><button type="button" class="btn btn-ghost btn-icon btn-sm" id="cancel-btn" title="Keluar dari editor" aria-label="Keluar dari editor">${icon('close')}</button>`;
    const html = `<article><div class="note-meta edit-bar${opts.draft ? ' draft-bar' : ''}">${opts.draft ? `<span class="badge draft-badge">${icon('pencil')}<span>Live Preview</span></span>` : `<span class="edit-badges" id="edit-badges">${badgesFor(path, data.lingkungan)}</span>`}<span class="muted" id="edit-status">${opts.draft ? 'Belum jadi file. Isi tetap ada walau pindah halaman.' : 'Mengedit. Ctrl S untuk menyimpan.'}</span><span class="spacer"></span>${opts.draft ? `<button type="button" class="btn btn-ghost btn-sm" id="draft-import" title="Buka file Markdown (.md) ke Live Preview">${icon('upload')}<span>Impor</span></button><button type="button" class="btn btn-ghost btn-sm" id="draft-pdf" title="Ekspor ke PDF tanpa menyimpan file">${icon('download')}<span>PDF</span></button>` : `<button type="button" class="btn btn-ghost btn-sm" id="attach-btn" title="Lampirkan file (SQL, TXT, CSV, PDF, gambar, dll.)">${icon('paperclip')}<span>Lampirkan</span></button><input type="file" id="attach-input" multiple hidden>`}<div class="seg" role="group" aria-label="Tampilan editor">${seg}</div>${actionBtns}</div>${metaFormHtml(data)}<div class="edit-area" id="edit-area" data-mode="${mode}"><div class="editor" id="editor"></div><div class="preview prose" id="preview"></div><div class="visual" id="visual"></div></div></article>`;
    let editArticle = null;
    if (oldArticle) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      editArticle = tmp.firstElementChild;
      oldArticle.style.pointerEvents = 'none';
      oldArticle.setAttribute('aria-hidden', 'true');
      const cs = getComputedStyle(el.content);
      editArticle.style.cssText = `position:absolute;left:${cs.paddingLeft};right:${cs.paddingRight};top:${cs.paddingTop};opacity:0;pointer-events:none;margin:0;`;
      el.content.style.position = 'relative';
      el.content.appendChild(editArticle);
    } else {
      el.content.innerHTML = html;
      editArticle = el.content.firstElementChild;
    }
    editing = { path, dirty: false, saving: false, version: data.version, editor: null, mode, previewSeq: 0, timer: null, visual: false, draft: !!opts.draft, editSeq: 0 };
    mountEditor(mode, data.markdown || '');
    bindImagePaste($('#edit-area'));
    if (!opts.draft) {
      const attachBtn = $('#attach-btn');
      const attachInput = $('#attach-input');
      let savedRange = null;
      attachBtn.addEventListener('mousedown', () => {
        savedRange = currentRange();
      });
      attachBtn.addEventListener('click', () => attachInput.click());
      attachInput.addEventListener('change', async () => {
        const files = [...(attachInput.files || [])];
        attachInput.value = '';
        if (files.length) await attachMixedFiles(files, savedRange || currentRange());
        savedRange = null;
      });
    }
    document.querySelectorAll('#meta-form input, #meta-form textarea, #meta-form select').forEach((f) => {
      f.addEventListener('input', () => {
        if (!editing) return;
        editing.editSeq += 1;
        if (!editing.dirty) {
          editing.dirty = true;
          setStatus('Belum disimpan');
        }
      });
    });
    $('#save-btn').addEventListener('click', () => saveEditing(false));
    $('#cancel-btn').addEventListener('click', cancelEditing);
    if (opts.draft) {
      $('#draft-import').addEventListener('click', draftImport);
      $('#draft-pdf').addEventListener('click', draftPdf);
      $('#save-btn').title = 'Simpan jadi catatan (pilih folder dan nama file). Ctrl S';
      $('#cancel-btn').title = 'Buang isi Live Preview';
      document.querySelectorAll('#meta-form input, #meta-form textarea, #meta-form select').forEach((f) => f.addEventListener('input', () => saveDraftLocal()));
    }
    document.querySelectorAll('[data-mode-btn]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeBtn)));

    el.content.classList.toggle('wide', mode === 'split');
    const previewDone = mode !== 'raw' && mode !== 'visual' ? refreshPreview() : null;
    if (preserveScroll) {
      if (mode === 'split') {
        window.scrollTo(0, 0);
        const scroller = $('#editor .cm-scroller');
        if (scroller && scroller.scrollHeight > scroller.clientHeight) {
          scroller.scrollTop = Math.round(scrollRatio * (scroller.scrollHeight - scroller.clientHeight));
        }
        if (previewDone) {
          previewDone.then(() => {
            const box = $('#preview');
            if (box && box.scrollHeight > box.clientHeight) {
              box.scrollTop = Math.round(scrollRatio * (box.scrollHeight - box.clientHeight));
            }
          });
        }
      } else {
        let previewReady = mode !== 'preview';
        if (mode === 'preview' && previewDone) previewDone.finally(() => { previewReady = true; });
        const ready =
          mode === 'visual'
            ? () => !!$('#visual .note-visual-content')
            : mode === 'preview'
              ? () => previewReady
              : () => !!$('#editor .cm-editor');
        const reveal = oldArticle
          ? () => {
              if (oldArticle.parentNode === el.content) oldArticle.remove();
              if (editArticle) editArticle.style.cssText = '';
              el.content.style.position = '';
            }
          : undefined;
        const st = editing;
        applyScrollRestore({ y: scrollY, atBottom }, { ready, scope: editArticle, onReady: reveal, active: () => editing === st });
      }
    } else {
      editing.editor.focus();
    }
  }

  // ---------- Live Preview Markdown: menulis/menempel Markdown tanpa file ----------
  // Isi disimpan di browser (localStorage) supaya tidak hilang saat pindah halaman; bisa disimpan jadi catatan,
  // diimpor dari file .md, atau diekspor ke PDF tanpa disimpan.
  let draftTimer = null;
  function saveDraftLocal(now) {
    clearTimeout(draftTimer);
    const run = () => {
      if (!editing || !editing.draft) return;
      store.set('draftMd', editing.editor.value);
      const m = readMetaForm();
      if (m) store.set('draftMeta', JSON.stringify(m));
    };
    if (now) run();
    else draftTimer = setTimeout(run, 400);
  }
  function clearDraftLocal() {
    clearTimeout(draftTimer);
    try {
      localStorage.removeItem('draftMd');
      localStorage.removeItem('draftMeta');
    } catch {}
  }
  function startDraft() {
    if (isReadOnly()) {
      toast('Mode baca saja (guest)');
      location.hash = '#/';
      return;
    }
    document.title = 'Live Preview Markdown · AI Note';
    let meta = {};
    try {
      meta = JSON.parse(store.get('draftMeta', '{}')) || {};
    } catch {}
    startEditing(DRAFT_PATH, { markdown: store.get('draftMd', ''), ringkasan: meta.ringkasan, tag: meta.tag, lingkungan: meta.lingkungan }, { draft: true });
    if (window.gsap) gsap.fromTo('#content > article', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'opacity,transform' });
  }
  const draftTitle = (text) => {
    const m = String(text).match(/^#\s+(.+)$/m);
    return m ? m[1].replace(/[*_`]/g, '').trim() : '';
  };
  function parseFront(text) {
    text = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const m = text.match(/^---\n([\s\S]*?)\n---[ \t]*(\n|$)/);
    if (!m) return { meta: {}, body: text };
    const meta = {};
    m[1].split('\n').forEach((l) => {
      const i = l.indexOf(':');
      if (i > 0) meta[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
    });
    return { meta, body: text.slice(m[0].length).replace(/^\s*\n/, '') };
  }
  function draftImport() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.md,.markdown,.txt,text/markdown,text/plain';
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      if (!f || !editing || !editing.draft) return;
      if (f.size > 2 * 1024 * 1024) return toast('File terlalu besar (maks 2 MB).');
      const text = await f.text();
      if (editing.editor.value.trim() && !(await AppDialog.confirm({ title: 'Ganti isi Live Preview?', message: `Isi sekarang akan diganti dengan ${f.name}.`, confirmLabel: 'Ganti', cancelLabel: 'Batal' }))) return;
      const st = editing;
      if (!st || !st.draft) return;
      const { meta, body } = parseFront(text);
      try {
        st.editor.destroy();
      } catch {}
      mountEditor(st.mode, body);
      const r = $('#meta-ringkasan');
      const t = $('#meta-tag');
      const e = $('#meta-env');
      if (r) r.value = meta.ringkasan || '';
      if (t) t.value = meta.tag || '';
      if (e) {
        const env = String(meta.lingkungan || '').toLowerCase();
        if (env && ![...e.options].some((o) => o.value === env)) e.add(new Option(env, env));
        e.value = env;
      }
      st.dirty = true;
      setStatus('Diimpor dari ' + f.name + ' · belum jadi file');
      saveDraftLocal(true);
      if (st.mode !== 'raw' && st.mode !== 'visual') refreshPreview();
      toast('Diimpor: ' + f.name);
    });
    inp.click();
  }
  function draftPdf() {
    if (!editing || !editing.draft) return;
    const text = editing.editor.value;
    if (!text.trim()) return toast('Live Preview masih kosong.');
    exportPdf(null, { content: text, name: draftTitle(text) || 'live-preview' });
  }
  async function saveDraft() {
    const state = editing;
    if (!state || state.saving) return;
    const text = state.editor.value;
    if (!text.trim()) return toast('Live Preview masih kosong.');
    const v = await modal({
      title: 'Simpan jadi catatan',
      description: 'Pilih folder dan nama file. Nama file otomatis disesuaikan standar (huruf kecil, tanda hubung).',
      fields: [
        { name: 'folder', label: 'Folder', type: 'folder', value: store.get('draftFolder', '') },
        { name: 'title', label: 'Nama file', value: draftTitle(text), placeholder: 'Contoh: catatan rapat sprint' },
      ],
      confirmLabel: 'Simpan',
    });
    if (!v || editing !== state) return;
    if (!String(v.title || '').trim()) return toast('Nama file wajib diisi.');
    state.saving = true;
    setStatus('Menyimpan...');
    const r = await api('/api/create-note', { folder: v.folder, title: v.title });
    if (!r) {
      state.saving = false;
      setStatus('Gagal menyimpan');
      return;
    }
    try {
      const res = await fetch('/api/note?path=' + encodeURIComponent(r.path), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
        body: JSON.stringify({ content: text, force: true, meta: readMetaForm() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'HTTP ' + res.status);
    } catch (err) {
      state.saving = false;
      setStatus('File ' + r.path + ' sudah dibuat, tapi isinya gagal disimpan: ' + err.message);
      return;
    }
    store.set('draftFolder', v.folder || '');
    clearDraftLocal();
    stopEditing();
    collapsed.delete(v.folder);
    try {
      await loadTree();
    } catch {}
    toast('Tersimpan: ' + r.path);
    location.hash = hashFor(r.path);
  }
  async function cancelDraft() {
    const st = editing;
    if (st.editor.value.trim() && !(await AppDialog.confirm({ title: 'Buang isi Live Preview?', message: 'Isi yang belum disimpan jadi file akan dihapus dan tidak bisa dikembalikan.', confirmLabel: 'Buang', cancelLabel: 'Lanjut menulis', destructive: true }))) return;
    if (editing !== st) return;
    clearDraftLocal();
    stopEditing();
    if (history.state && history.state.nav > 0) history.back();
    else location.hash = '#/';
  }

  async function cancelEditing() {
    if (!editing) return;
    if (editing.draft) return cancelDraft();
    if (editing.dirty && !(await AppDialog.confirm({ title: 'Buang perubahan?', message: 'Perubahan yang belum disimpan akan hilang.', confirmLabel: 'Buang', cancelLabel: 'Lanjut mengedit', destructive: true }))) return;
    if (!editing) return;
    const scrollY = window.scrollY;
    const atBottom = scrollY > 0 && window.innerHeight + scrollY >= document.documentElement.scrollHeight - 24;
    let splitRatio = null;
    if (editing.mode === 'split' && scrollY < 40) {
      const scroller = $('#editor .cm-scroller');
      const box = $('#preview');
      const elS = scroller && scroller.scrollTop > 0 ? scroller : box && box.scrollTop > 0 ? box : null;
      if (elS && elS.scrollHeight > elS.clientHeight) {
        splitRatio = elS.scrollTop / (elS.scrollHeight - elS.clientHeight);
      }
    }
    if (scrollY > 0 || splitRatio !== null) {
      pendingScroll = { y: scrollY, atBottom, ratio: splitRatio };
      el.content.style.minHeight = el.content.offsetHeight + 'px';
    }
    cleanupUploads(editing, null);
    stopEditing();
    try {
      await route();
    } finally {
      el.content.style.minHeight = '';
    }
  }

  async function saveEditing(force) {
    if (editing && editing.draft) return saveDraft();
    if (!editing || editing.saving) return;
    const state = editing;
    const savedContent = state.editor.value;
    const savedMeta = readMetaForm();
    const seqAtStart = state.editSeq;
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
        body: JSON.stringify({ content: savedContent, version: state.version, force, meta: savedMeta }),
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
      if (await AppDialog.confirm({ title: 'File berubah di disk', message: 'File ini berubah sejak Anda membukanya. Timpa dengan versi Anda?', confirmLabel: 'Timpa', cancelLabel: 'Batal', destructive: true })) {
        return saveEditing(true);
      }
      setStatus(state.dirty ? 'Belum disimpan' : 'Mengedit. Ctrl S untuk menyimpan.');
      return;
    }
    if (!res.ok) {
      setStatus('Gagal menyimpan: ' + (data.error || 'HTTP ' + res.status));
      return;
    }

    cleanupUploads(state, savedContent);
    if (editing !== state) {
      try {
        await loadTree();
      } catch {}
      return;
    }
    if (typeof data.version === 'number') state.version = data.version;
    if (state.editSeq === seqAtStart) {
      state.dirty = false;
      setStatus('Sudah tersimpan');
    } else {
      state.dirty = true;
      setStatus('Belum disimpan');
    }
    const badgesEl = $('#edit-badges');
    if (badgesEl && savedMeta) badgesEl.innerHTML = badgesFor(state.path, savedMeta.lingkungan);
    toast('Sudah tersimpan');
    try {
      await loadTree();
      updateTreeActive();
      if (currentPath) expandTo(currentPath, false);
    } catch {}
  }

  window.addEventListener('beforeunload', (e) => {
    if (editing && editing.dirty && !editing.draft) {
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
    if (window.gsap) {
      gsap.fromTo(btn, { scale: 0.88 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' });
    }
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
    if (window.gsap) {
      gsap.killTweensOf(t);
      gsap.fromTo(
        t,
        { opacity: 0, y: 20, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.5)' }
      );
      t._timer = setTimeout(() => {
        gsap.to(t, {
          opacity: 0,
          y: 12,
          scale: 0.95,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            t.hidden = true;
          },
        });
      }, 3500);
    } else {
      t._timer = setTimeout(() => (t.hidden = true), 3500);
    }
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
      if (window.gsap) {
        const overlay = wrap.querySelector('.dialog-overlay');
        const content = wrap.querySelector('.dialog-content');
        if (overlay) gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' });
        if (content) gsap.fromTo(content, { opacity: 0, y: -18, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: 'back.out(1.4)' });
      }

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
          if (v) {
            pop.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
            openTo(input.value);
            render();
            if (window.gsap) {
              gsap.fromTo(
                pop,
                { opacity: 0, y: -6, scale: 0.96 },
                { opacity: 1, y: 0, scale: 1, duration: 0.16, ease: 'power2.out' }
              );
            }
            const sel = $('.selected', pop);
            if (sel) sel.scrollIntoView({ block: 'nearest' });
          } else {
            if (window.gsap && !pop.hidden) {
              gsap.to(pop, {
                opacity: 0,
                y: -4,
                scale: 0.98,
                duration: 0.12,
                ease: 'power1.in',
                onComplete: () => {
                  pop.hidden = true;
                  btn.setAttribute('aria-expanded', 'false');
                },
              });
            } else {
              pop.hidden = true;
              btn.setAttribute('aria-expanded', 'false');
            }
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
      let closing = false;
      const close = (value) => {
        if (closing) return;
        closing = true;
        document.removeEventListener('keydown', onKey, true);
        if (window.gsap) {
          const overlay = wrap.querySelector('.dialog-overlay');
          const content = wrap.querySelector('.dialog-content');
          if (content) gsap.to(content, { opacity: 0, y: -10, scale: 0.97, duration: 0.14, ease: 'power1.in' });
          if (overlay) {
            gsap.to(overlay, {
              opacity: 0,
              duration: 0.14,
              ease: 'power1.in',
              onComplete: () => {
                wrap.remove();
                resolve(value);
              },
            });
          } else {
            wrap.remove();
            resolve(value);
          }
        } else {
          wrap.remove();
          resolve(value);
        }
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
    if (isReadOnly()) {
      toast('Mode baca saja (guest)');
      return;
    }
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
    if (isReadOnly()) {
      toast('Mode baca saja (guest)');
      return;
    }
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
    wrap.innerHTML = `<div class="dialog-overlay"></div><div class="dialog-content hist" role="dialog" aria-modal="true" aria-label="Riwayat catatan"><div class="hist-head"><div><h2>Riwayat</h2><p class="muted">${esc(p)}</p></div><button type="button" class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Tutup" title="Tutup">×</button></div><div class="hist-body"><div class="hist-list" id="hist-list"><p class="muted">Memuat…</p></div><div class="hist-view"><div class="hist-bar"><div class="hist-tabs"><button type="button" class="hist-tab active" data-mode="diff">Perubahan</button><button type="button" class="hist-tab" data-mode="text">Isi versi</button></div><div class="hist-actions"${isReadOnly() ? ' hidden' : ''}><button type="button" class="btn btn-outline btn-sm" id="hist-new-note" disabled title="Simpan versi ini sebagai catatan baru">Buat catatan baru</button><button type="button" class="btn btn-outline btn-sm" id="hist-restore" disabled title="Pulihkan ke catatan ini">Pulihkan versi ini</button></div></div><div class="hist-pane" id="hist-pane"><p class="muted hist-empty">Pilih satu versi di sebelah kiri.</p></div></div></div></div>`;
    document.body.appendChild(wrap);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const dialogs = document.querySelectorAll('.dialog');
        if (dialogs[dialogs.length - 1] !== wrap) return;
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
      $('#hist-new-note', wrap).disabled = idx < 0;
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
    $('#hist-new-note', wrap).addEventListener('click', async () => {
      if (!selected) return;
      const v = versions.find((x) => x.id === selected);
      if (!v) return;
      const baseName = p.split('/').pop().replace(/\.md$/i, '');
      const val = await modal({
        title: 'Buat catatan baru dari versi ini',
        description: `Versi ${histTime(v.time)}. Pilih folder dan nama file tujuan.`,
        fields: [
          { name: 'folder', label: 'Folder', type: 'folder', value: parentOf(p) },
          { name: 'title', label: 'Judul / Nama file', value: `${baseName}-pulih`, placeholder: 'Contoh: catatan-versi-lama' },
        ],
        confirmLabel: 'Buat catatan',
      });
      if (!val) return;
      if (!String(val.title || '').trim()) return toast('Nama file wajib diisi.');
      const r = await api('/api/history/restore', { path: p, id: selected, mode: 'new', folder: val.folder, title: val.title });
      if (!r) return;
      close();
      collapsed.delete(val.folder);
      toast('Catatan baru dibuat: ' + r.path);
      await loadTree();
      location.hash = hashFor(r.path);
    });
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
    if (isReadOnly()) {
      toast('Mode baca saja (guest)');
      return;
    }
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
    if (isReadOnly()) return;
    if (currentPath === '_trash' || currentPath.startsWith('_trash/')) return;
    importFiles(contextDir(), e.dataTransfer.files);
  });

  async function actionDelete(p) {
    if (isReadOnly()) {
      toast('Mode baca saja (guest)');
      return;
    }
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
    if (isReadOnly()) {
      toast('Mode baca saja (guest)');
      return;
    }
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

  // Buka / tutup semua folder di sidebar dengan GSAP
  $('#expand-all').innerHTML = icon('chevronsUpDown');
  $('#collapse-all').innerHTML = icon('chevronsDownUp');
  $('#expand-all').addEventListener('click', () => {
    collapsed.clear();
    store.set('collapsed', '[]');
    if (window.gsap) {
      const groups = el.tree.querySelectorAll('.tree-group');
      let delay = 0;
      groups.forEach((group) => {
        const btn = group.querySelector(':scope > .tree-row > .tree-dir');
        const ch = group.querySelector(':scope > .tree-children');
        if (btn && ch && (ch.hidden || btn.getAttribute('aria-expanded') === 'false')) {
          btn.setAttribute('aria-expanded', 'true');
          ch.hidden = false;
          ch.style.overflow = 'hidden';
          ch.style.height = 'auto';
          const h = ch.scrollHeight;
          gsap.killTweensOf(ch);
          gsap.fromTo(
            ch,
            { height: 0, opacity: 0 },
            {
              height: h,
              opacity: 1,
              duration: 0.25,
              delay: Math.min(delay, 0.2),
              ease: 'power2.out',
              onComplete: () => {
                ch.style.height = '';
                ch.style.overflow = '';
                ch.style.opacity = '';
              },
            }
          );
          delay += 0.02;
        }
      });
    } else {
      renderTree();
    }
  });
  $('#collapse-all').addEventListener('click', () => {
    collapsed.clear();
    nodeIndex.forEach((n) => {
      if (n.type === 'dir' && n.path !== '') collapsed.add(n.path);
    });
    store.set('collapsed', JSON.stringify([...collapsed]));
    if (window.gsap) {
      const openCh = el.tree.querySelectorAll('.tree-children:not([hidden])');
      let delay = 0;
      openCh.forEach((ch) => {
        const group = ch.closest('.tree-group');
        const btn = group ? group.querySelector(':scope > .tree-row > .tree-dir') : null;
        if (btn) btn.setAttribute('aria-expanded', 'false');
        ch.style.overflow = 'hidden';
        const h = ch.offsetHeight;
        gsap.killTweensOf(ch);
        gsap.fromTo(
          ch,
          { height: h, opacity: 1 },
          {
            height: 0,
            opacity: 0,
            duration: 0.2,
            delay: Math.min(delay, 0.15),
            ease: 'power2.inOut',
            onComplete: () => {
              ch.hidden = true;
              ch.style.height = '';
              ch.style.overflow = '';
              ch.style.opacity = '';
            },
          }
        );
        delay += 0.015;
      });
    } else {
      renderTree();
    }
  });

  async function actionMove(from, toFolder) {
    if (isReadOnly()) {
      toast('Mode baca saja (guest)');
      return;
    }
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
  // Menu titik tiga di footer: Kanban View dan Live Preview Markdown.
  $('#footer-more-btn').innerHTML = icon('moreV');
  const refreshFooterMenu = () => {
    const lbl = $('#mode-label');
    $('#menu-kanban').innerHTML = icon('columns') + `<span>${esc((lbl && lbl.textContent.trim()) || 'Kanban View')}</span>`;
  };
  refreshFooterMenu();
  $('#footer-more-btn').addEventListener('click', refreshFooterMenu);
  setupMenu('#footer-more-btn', '#footer-more-menu');
  $('#menu-live').innerHTML = icon('pencil') + '<span>Live Preview Markdown</span><small>tanpa file</small>';
  $('#menu-recordings').innerHTML = icon('mic') + '<span>Rekaman Meeting</span>';
  const recBtnEl = $('#record-btn');
  if (recBtnEl) recBtnEl.innerHTML = icon('mic');
  $('#menu-kanban').addEventListener('click', () => $('#mode-switch-btn').click());
  $('#menu-recordings').addEventListener('click', () => {
    location.hash = '#/_recordings';
  });
  $('#menu-live').addEventListener('click', () => {
    location.hash = '#/' + DRAFT_PATH;
  });
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
    if (isReadOnly()) return;
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
    if (isReadOnly()) return;
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
    // Badge hanya muncul jika isi Sampah lebih dari 100 file/folder (pengingat untuk dikosongkan).
    const TRASH_BADGE_MIN = 100;
    b.textContent = '100+';
    b.hidden = n <= TRASH_BADGE_MIN;
    $('#trash-btn').title = n > 0 ? `Sampah (${n} item)` : 'Sampah';
  }

  $('#trash-btn').innerHTML = icon('trash') + '<span class="trash-badge" id="trash-badge" hidden></span>';
  $('#trash-btn').addEventListener('click', () => {
    if (currentPath === '_trash') route();
    else location.hash = '#/_trash';
  });

  // ---------- Mulai ulang aplikasi ----------
  // Tombol Keluar (tampil hanya bila login aktif).
  const logoutBtn = $('#logout-btn');
  function applyAuthUi() {
    const ro = isReadOnly();
    document.body.classList.toggle('is-readonly', ro);
    const sideMoreBtn = $('#side-more-btn');
    if (sideMoreBtn) sideMoreBtn.hidden = ro;
    const trashBtn = $('#trash-btn');
    if (trashBtn) trashBtn.hidden = ro;
    const restartBtn = $('#restart-btn');
    if (restartBtn) restartBtn.hidden = ro;
    const liveMenuBtn = $('#menu-live');
    if (liveMenuBtn) liveMenuBtn.hidden = ro;
    const recordBtn = $('#record-btn');
    if (recordBtn) recordBtn.hidden = ro;
    const brandSub = $('.brand-sub');
    if (brandSub) brandSub.textContent = ro ? 'Guest · Hanya baca' : 'Catatan lokal';
    if (logoutBtn && authInfo.auth) {
      logoutBtn.hidden = false;
      logoutBtn.title = 'Keluar' + (authInfo.user ? ' (' + authInfo.user + (ro ? ' · hanya baca' : '') + ')' : '');
    }
  }
  async function loadAuth() {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      const d = await r.json();
      if (d && typeof d === 'object') {
        authInfo = {
          auth: !!d.auth,
          user: d.user || null,
          role: d.role || 'admin',
          readOnly: !!d.readOnly,
        };
      }
    } catch {}
    applyAuthUi();
  }
  if (logoutBtn) {
    logoutBtn.innerHTML = icon('logout');
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/logout', { method: 'POST', headers: { 'X-Requested-With': 'ai-note' } });
      } catch {}
      location.href = '/login.html';
    });
  }
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
    if (isReadOnly()) {
      document.title = 'Mode Baca · AI Note';
      el.content.innerHTML = '<div class="empty"><p><strong>Mode baca saja (guest)</strong></p><p>Akun guest tidak dapat membuka atau mengelola Sampah.</p></div>';
      return;
    }
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
    if (window.gsap) {
      gsap.fromTo('#content > article', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' });
    }
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

  // ---------- Tombol Kembali / Maju (seperti browser) ----------
  // Posisi di riwayat disimpan di history.state.nav supaya tahu kapan tombol bisa dipakai.
  (function setupNavButtons() {
    const back = $('#nav-back');
    const fwd = $('#nav-fwd');
    back.innerHTML = icon('arrowLeft');
    fwd.innerHTML = icon('arrowRight');
    let max = 0;
    try {
      max = parseInt(sessionStorage.getItem('navMax') || '0', 10) || 0;
    } catch {}
    let idx = history.state && typeof history.state.nav === 'number' ? history.state.nav : 0;
    if (idx > max) max = idx;
    const save = () => {
      try {
        sessionStorage.setItem('navMax', String(max));
      } catch {}
    };
    const update = () => {
      back.disabled = idx <= 0;
      fwd.disabled = idx >= max;
    };
    history.replaceState(Object.assign({}, history.state, { nav: idx }), '');
    update();
    // Posisi scroll disimpan di entri riwayat yang sedang aktif (setelah berhenti scroll, dan sebelum klik link).
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    let saveTimer = null;
    const saveScroll = () => {
      clearTimeout(saveTimer);
      try {
        history.replaceState(Object.assign({}, history.state, { scroll: Math.round(window.scrollY) }), '');
      } catch {}
    };
    window.addEventListener('scroll', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveScroll, 200);
    }, { passive: true });
    document.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('a[href^="#"], .cmd-item, .tree-row, .breadcrumb a')) saveScroll();
    }, true);
    window.addEventListener('hashchange', () => {
      clearTimeout(saveTimer);
      const st = history.state;
      if (st && typeof st.nav === 'number') {
        idx = st.nav; // tombol kembali/maju (atau Alt+panah, tombol mouse)
        pendingScroll = typeof st.scroll === 'number' ? st.scroll : null;
      } else {
        pendingScroll = null;
        idx += 1; // halaman baru: riwayat maju di depannya hilang
        max = idx;
        history.replaceState(Object.assign({}, st, { nav: idx }), '');
      }
      save();
      update();
    });
    back.addEventListener('click', () => {
      if (idx > 0) history.back();
    });
    fwd.addEventListener('click', () => {
      if (idx < max) history.forward();
    });
  })();
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
            `<button type="button" class="cmd-item${r.path === currentPath ? ' current' : ''}" role="option" data-i="${i}" aria-selected="${i === active}">${icon('file')}<div class="cmd-text"><div class="cmd-title">${highlight(r.title, terms)}</div><div class="cmd-path">${highlight(r.path, terms)}</div>${r.snippet ? `<div class="cmd-snippet">${highlight(r.snippet, terms)}</div>` : ''}</div></button>`,
        )
        .join('');
    if (window.gsap) {
      const items = el.cmdList.querySelectorAll('.cmd-item');
      if (items.length) {
        gsap.killTweensOf(items);
        gsap.fromTo(
          items,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.28, stagger: 0.022, ease: 'power3.out', clearProps: 'opacity,transform' }
        );
      }
    }
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
    if (scopeNote) {
      runNoteSearch(q);
      return;
    }
    // Belum mengetik: panel kosong, tidak menampilkan semua catatan.
    if (!q) {
      results = [];
      active = 0;
      const where = scopePath ? ` di folder <strong>${esc(scopePath)}</strong>` : '';
      el.cmdList.innerHTML = `<div class="cmd-empty cmd-hint">Ketik kata kunci untuk mencari${where}.</div>`;
      return;
    }
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
  let scopeNote = ''; // bila terisi: cari hanya di dalam catatan ini (di halaman yang sedang tampil)
  const scopeNoteBtn = $('#scope-note');
  const scopeWrap = document.querySelector('.sp-scope .scope-wrap');
  // Tombol "Ikuti halaman ini": samakan filter dengan folder/catatan yang sedang dibuka. Muncul hanya bila berbeda.
  const syncBtn = $('#scope-sync');
  $('#scope-sync-icon').innerHTML = icon('locate');
  function currentTarget() {
    const p = currentPath;
    if (p.startsWith(VIEW_PREFIX)) return { note: '', folder: p.slice(VIEW_PREFIX.length).split('/_lampiran/')[0] };
    if (p === '_trash' || p.startsWith('_trash/') || p === DRAFT_PATH) return { note: '', folder: '' };
    if (/\.md$/i.test(p)) return { note: p, folder: p.split('/').slice(0, -1).join('/') };
    return { note: '', folder: p };
  }
  function updateSync() {
    const t = currentTarget();
    syncBtn.hidden = t.note ? scopeNote === t.note : !scopeNote && scopePath === t.folder;
    const n = t.note && nodeIndex.get(t.note);
    const label = t.note ? (n && n.title) || t.note.split('/').pop().replace(/\.md$/i, '') : t.folder ? t.folder.split('/').pop() : 'Semua folder';
    syncBtn.title = 'Samakan filter dengan yang sedang dibuka: ' + label;
    $('#scope-sync-label').textContent = t.note ? 'Catatan ini' : 'Folder ini';
  }
  syncBtn.addEventListener('click', () => {
    const t = currentTarget();
    if (scopeNote && scopeNote !== t.note) clearHits($('#prose'));
    scopeNote = t.note;
    scopePath = t.folder;
    closeScope();
    updateScopeBtn();
    runSearch(el.cmdInput.value.trim());
    el.cmdInput.focus();
    if (window.gsap) gsap.fromTo('.sp-scope .scope-btn:not([hidden])', { scale: 0.92 }, { scale: 1, duration: 0.3, ease: 'back.out(2.5)', clearProps: 'transform' });
  });
  $('#scope-note-icon').innerHTML = icon('file');
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
    scopeNoteBtn.hidden = !scopeNote;
    scopeWrap.hidden = !!scopeNote;
    if (scopeNote) {
      const n = nodeIndex.get(scopeNote);
      const name = (n && n.title) || scopeNote.split('/').pop().replace(/\.md$/i, '');
      $('#scope-note-label').textContent = name;
      scopeNoteBtn.title = 'Mencari di catatan ini: ' + scopeNote;
      el.cmdInput.placeholder = 'Cari di catatan ini...';
    }
    updateSync();
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
    if (window.gsap) {
      gsap.fromTo(
        scopePop,
        { opacity: 0, y: -6, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.16, ease: 'power2.out' }
      );
    }
    const sel = scopePop.querySelector('.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function closeScope() {
    if (scopePop.hidden) return;
    if (window.gsap) {
      gsap.to(scopePop, {
        opacity: 0,
        y: -4,
        scale: 0.98,
        duration: 0.12,
        ease: 'power1.in',
        onComplete: () => {
          scopePop.hidden = true;
          scopeBtn.setAttribute('aria-expanded', 'false');
        },
      });
    } else {
      scopePop.hidden = true;
      scopeBtn.setAttribute('aria-expanded', 'false');
    }
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

  // Panel pencarian di kanan: tetap terbuka saat berpindah catatan, ditutup lewat tombol × atau Esc.
  const mobileMQ = window.matchMedia('(max-width: 860px)');
  const openBtn = $('#open-search');
  const isPanelOpen = () => !el.panel.hidden;

  const spInner = el.panel.querySelector('.sp-inner');
  let panelClosing = false;

  // Animasi buka: panel melebar dengan easing lembut, isi menyusul sedikit dari kanan.
  function panelIn() {
    if (!window.gsap) return;
    gsap.killTweensOf([el.panel, spInner]);
    if (mobileMQ.matches) {
      gsap.fromTo(el.panel, { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'expo.out', clearProps: 'transform' });
    } else {
      gsap.set(el.panel, { clearProps: 'width' });
      const w = el.panel.getBoundingClientRect().width;
      gsap.fromTo(el.panel, { width: 0 }, { width: w, duration: 0.5, ease: 'expo.out', clearProps: 'width' });
    }
    gsap.fromTo(spInner, { opacity: 0, x: 28 }, { opacity: 1, x: 0, duration: 0.45, delay: 0.05, ease: 'power3.out', clearProps: 'opacity,transform' });
  }
  function panelOut(done) {
    if (!window.gsap) return done();
    gsap.killTweensOf([el.panel, spInner]);
    gsap.to(spInner, { opacity: 0, x: 18, duration: 0.2, ease: 'power2.in' });
    const finish = () => {
      done();
      gsap.set([el.panel, spInner], { clearProps: 'all' });
    };
    if (mobileMQ.matches) gsap.to(el.panel, { xPercent: 100, duration: 0.3, ease: 'power3.in', onComplete: finish });
    else gsap.to(el.panel, { width: 0, duration: 0.34, ease: 'power3.inOut', onComplete: finish });
  }

  function openPanel(focus = true) {
    if (!isPanelOpen() || panelClosing) {
      panelClosing = false;
      // Bawaan: folder yang sedang dibuka (atau folder induk catatan yang sedang dibuka).
      let sp = /\.md$/i.test(currentPath) ? currentPath.split('/').slice(0, -1).join('/') : currentPath;
      if (sp === '_trash' || sp.startsWith('_trash/') || sp.startsWith('~')) sp = '';
      scopePath = sp;
      scopeNote = /\.md$/i.test(currentPath) && !currentPath.startsWith('_trash') ? currentPath : '';
      closeScope();
      updateScopeBtn();
      el.panel.hidden = false;
      openBtn.hidden = true;
      store.set('search', 'open');
      el.cmdInput.value = '';
      panelIn();
      runSearch('');
    }
    if (focus) {
      el.cmdInput.focus({ preventScroll: true });
      el.cmdInput.select();
    }
  }
  function closePanel() {
    if (!isPanelOpen() || panelClosing) return;
    panelClosing = true;
    closeScope();
    if (scopeNote) clearHits($('#prose'));
    store.set('search', 'closed');
    panelOut(() => {
      if (!panelClosing) return; // dibuka lagi sebelum animasi selesai
      panelClosing = false;
      el.panel.hidden = true;
      openBtn.hidden = false;
      if (window.gsap) gsap.fromTo(openBtn, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)', clearProps: 'opacity,transform' });
    });
  }
  function markCurrent() {
    el.cmdList.querySelectorAll('.cmd-item').forEach((b) => {
      const r = results[Number(b.dataset.i)];
      b.classList.toggle('current', !!r && r.path === currentPath);
    });
  }
  // ---------- Loncat ke kata yang dicari di catatan ----------
  // Semua kata yang cocok ditandai; yang aktif di-scroll ke sepertiga atas layar. Navigasi ↑ ↓ (atau F3 / Shift+F3).
  function clearHits(root) {
    hitCtrl = null;
    if (root) {
      root.querySelectorAll('mark.search-hit').forEach((m) => m.replaceWith(document.createTextNode(m.textContent)));
      root.normalize();
    }
    el.content.querySelectorAll('.hit-nav').forEach((n) => n.remove());
  }
  function scrollToHit(h, smooth) {
    const y = h.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
    window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
  }
  let hitCtrl = null;
  // Tandai semua kata yang cocok di root. Mengembalikan {hits, go(i)} atau null bila tidak ada.
  function markHits(root, list) {
    if (!root || !list || !list.length) return null;
    clearHits(root);
    const re = new RegExp(list.map(reEsc).join('|'), 'gi');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest('svg, script, style, textarea, input, button, .mermaid')) return NodeFilter.FILTER_REJECT;
        re.lastIndex = 0;
        return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const hits = [];
    nodes.forEach((n) => {
      const text = n.nodeValue;
      const frag = document.createDocumentFragment();
      let last = 0;
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(text))) {
        if (!m[0]) {
          re.lastIndex++;
          continue;
        }
        frag.append(text.slice(last, m.index));
        const mk = document.createElement('mark');
        mk.className = 'search-hit';
        mk.textContent = m[0];
        frag.append(mk);
        hits.push(mk);
        last = m.index + m[0].length;
      }
      frag.append(text.slice(last));
      n.replaceWith(frag);
    });
    if (!hits.length) return null;

    const nav = document.createElement('div');
    nav.className = 'hit-nav';
    nav.innerHTML = `<span class="hit-count"></span><button type="button" class="hit-btn" data-hit="prev" title="Sebelumnya (Shift+F3)" aria-label="Sebelumnya">↑</button><button type="button" class="hit-btn" data-hit="next" title="Berikutnya (F3)" aria-label="Berikutnya">↓</button><button type="button" class="hit-btn" data-hit="close" title="Hapus tanda" aria-label="Hapus tanda">×</button>`;
    (root.closest('article') || root.parentElement).appendChild(nav);
    const ctrl = { hits, idx: 0, onGo: null };
    ctrl.go = (i, smooth = true) => {
      hits[ctrl.idx].classList.remove('active');
      ctrl.idx = (i + hits.length) % hits.length;
      const h = hits[ctrl.idx];
      for (let d = h.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
      void h.offsetWidth; // ulang animasi denyut
      h.classList.add('active');
      nav.querySelector('.hit-count').textContent = `${ctrl.idx + 1} / ${hits.length}`;
      scrollToHit(h, smooth);
      if (ctrl.onGo) ctrl.onGo(ctrl.idx);
      // Gambar/diagram yang selesai dimuat bisa menggeser posisi; rapikan sekali lagi bila kata keluar layar.
      const at = ctrl.idx;
      setTimeout(() => {
        if (ctrl.idx !== at || !h.isConnected) return;
        const r = h.getBoundingClientRect();
        if (r.top < 60 || r.bottom > window.innerHeight) scrollToHit(h, true);
      }, 600);
    };
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('[data-hit]');
      if (!b) return;
      if (b.dataset.hit === 'close') clearHits(root);
      else ctrl.go(ctrl.idx + (b.dataset.hit === 'next' ? 1 : -1));
    });
    hitCtrl = ctrl;
    return ctrl;
  }
  function jumpToTerms(root, list) {
    const c = markHits(root, list);
    if (c) c.go(0);
  }

  // Potongan teks di sekitar kemunculan dan judul bagian terdekat, untuk daftar hasil "catatan ini".
  function hitSnippet(h) {
    const block = h.closest('p, li, td, th, pre, h1, h2, h3, h4, h5, h6, blockquote, dt, dd') || h.parentElement;
    const rg = document.createRange();
    rg.setStart(block, 0);
    rg.setEndBefore(h);
    const before = rg.toString().replace(/\s+/g, ' ');
    const after = (h.textContent + (block.textContent.slice(rg.toString().length + h.textContent.length) || '')).replace(/\s+/g, ' ');
    const pre = before.length > 50 ? '…' + before.slice(-50).replace(/^\S*\s/, '') : before.trimStart();
    const post = after.length > 90 ? after.slice(0, 90).replace(/\s\S*$/, '') + '…' : after;
    return (pre + post).trim();
  }
  function runNoteSearch(q) {
    const root = $('#prose');
    clearHits(root);
    results = [];
    active = 0;
    if (!q) {
      el.cmdList.innerHTML = '<div class="cmd-empty cmd-hint">Ketik kata kunci untuk mencari di catatan ini.</div>';
      return;
    }
    if (!root || currentPath !== scopeNote) {
      el.cmdList.innerHTML = '<div class="cmd-empty cmd-hint">Memuat catatan…</div>';
      return;
    }
    const ctrl = markHits(root, terms);
    if (!ctrl) {
      el.cmdList.innerHTML = `<div class="cmd-empty">Tidak ada "${esc(q)}" di catatan ini.</div>`;
      return;
    }
    const heads = [...root.querySelectorAll('h1, h2, h3, h4')];
    results = ctrl.hits.map((h, i) => {
      let where = '';
      for (const hd of heads) {
        if (hd.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING || hd.contains(h)) where = hd.textContent.trim();
        else break;
      }
      return { hit: i, where, snippet: hitSnippet(h) };
    });
    el.cmdList.innerHTML =
      `<div class="cmd-group">Di catatan ini (${results.length})</div>` +
      results
        .map(
          (r, i) =>
            `<button type="button" class="cmd-item note-hit" role="option" data-i="${i}" aria-selected="${i === 0}"><span class="hit-no">${i + 1}</span><div class="cmd-text">${r.where ? `<div class="cmd-path">${esc(r.where)}</div>` : ''}<div class="cmd-snippet">${highlight(r.snippet, terms)}</div></div></button>`,
        )
        .join('');
    ctrl.onGo = (i) => setActive(i);
    ctrl.go(0);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'F3') return;
    const nav = el.content.querySelector('.hit-nav');
    if (!nav) return;
    e.preventDefault();
    nav.querySelector(e.shiftKey ? '[data-hit="prev"]' : '[data-hit="next"]').click();
  });

  function openResult(i) {
    const r = results[i];
    if (!r) return;
    if (scopeNote) {
      if (hitCtrl) hitCtrl.go(r.hit);
      if (mobileMQ.matches) closePanel();
      return;
    }
    const t = terms.slice();
    if (r.path === currentPath && $('#prose')) jumpToTerms($('#prose'), t); // catatan yang sama: langsung loncat
    else {
      pendingJump = { path: r.path, terms: t };
      location.hash = hashFor(r.path);
    }
    if (mobileMQ.matches) closePanel(); // di layar kecil panel menutupi catatan
  }

  openBtn.addEventListener('click', () => openPanel());
  $('#search-close').addEventListener('click', closePanel);
  window.addEventListener('hashchange', () =>
    setTimeout(() => {
      markCurrent();
      updateSync();
      if (scopeNote && !/\.md$/i.test(currentPath)) {
        scopeNote = '';
        scopePath = /^(_trash|~)/.test(currentPath) ? '' : currentPath;
        updateScopeBtn();
        runSearch(el.cmdInput.value.trim());
      }
    }, 120),
  );
  scopeNoteBtn.addEventListener('click', (e) => {
    if (e.target.id !== 'scope-note-clear') return;
    clearHits($('#prose'));
    scopeNote = '';
    updateScopeBtn();
    runSearch(el.cmdInput.value.trim());
    el.cmdInput.focus();
  });

  // Lebar panel pencarian bisa diseret dari tepi kirinya. Tersimpan; klik dua kali untuk default.
  (function setupSearchResize() {
    const DEFAULT_W = 384; // 24rem
    const MIN_W = 280;
    const handle = $('#sp-resizer');
    const root = document.documentElement;
    const maxW = () => Math.max(MIN_W, Math.min(760, Math.round(window.innerWidth * 0.6)));
    const clamp = (w) => Math.max(MIN_W, Math.min(maxW(), Math.round(w)));
    let width = DEFAULT_W;
    function apply(w, save) {
      width = w;
      if (w === DEFAULT_W) root.style.removeProperty('--search-w');
      else root.style.setProperty('--search-w', w + 'px');
      if (save) store.set('searchWidth', String(w));
    }
    const saved = parseInt(store.get('searchWidth', ''), 10);
    if (Number.isFinite(saved)) apply(clamp(saved), false);
    const reset = () => apply(DEFAULT_W, true);
    handle.addEventListener('dblclick', reset);
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add('resizing');
      const right = el.panel.getBoundingClientRect().right;
      const move = (ev) => apply(clamp(right - ev.clientX), false);
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        document.body.classList.remove('resizing');
        store.set('searchWidth', String(width));
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
    handle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') apply(clamp(width + 16), true);
      else if (e.key === 'ArrowRight') apply(clamp(width - 16), true);
      else if (e.key === 'Home') reset();
      else return;
      e.preventDefault();
    });
    window.addEventListener('resize', () => {
      if (width !== DEFAULT_W && width > maxW()) apply(maxW(), false);
    });
  })();
  // Tunggu jeda mengetik dulu, supaya tidak mencari di setiap ketukan.
  const SEARCH_DELAY = 450;
  let pending = null;
  el.cmdInput.addEventListener('input', () => {
    clearTimeout(timer);
    const q = el.cmdInput.value.trim();
    if (!q) {
      pending = null;
      runSearch('');
      return;
    }
    pending = q;
    timer = setTimeout(() => {
      pending = null;
      runSearch(q);
    }, SEARCH_DELAY);
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
      // Enter sebelum jeda habis: langsung cari, lalu buka hasil teratas.
      if (pending !== null) {
        clearTimeout(timer);
        const q = pending;
        pending = null;
        runSearch(q).then(() => openResult(0));
      } else {
        openResult(active);
      }
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
    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      document.removeEventListener('keydown', onKey, true);
      if (window.gsap) {
        gsap.to(box, {
          opacity: 0,
          duration: 0.16,
          ease: 'power1.in',
          onComplete: () => box.remove(),
        });
      } else {
        box.remove();
      }
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
    if (window.gsap) {
      gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' });
      gsap.fromTo(img, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.24, ease: 'power2.out' });
    }
  }
  function attachmentRelFromSrc(fileSrc) {
    const raw = String(fileSrc || '').replace(/^\/files\//, '').split(/[?#]/)[0];
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  function realAttachmentPath(rel) {
    const parts = String(rel || '').split('/').filter(Boolean);
    if (!notesBaseDir) return parts.join(pathSep);
    return notesBaseDir.replace(/[\\/]+$/, '') + pathSep + parts.join(pathSep);
  }

  // Popover saat hover tautan lampiran: menampilkan path asli di disk, tombol Copy Path, dan tombol buka folder lokasi.
  (function setupAttachmentHover() {
    let pop = null;
    let pathEl = null;
    let copyBtn = null;
    let openBtn = null;
    let activeLink = null;
    let currentRel = '';
    let currentFull = '';
    let showTimer = null;
    let hideTimer = null;
    let copyTimer = null;

    function ensurePop() {
      if (pop) return;
      pop = document.createElement('div');
      pop.className = 'file-hover-pop';
      pop.setAttribute('role', 'tooltip');
      pop.hidden = true;
      pop.innerHTML = `<span class="fhp-path"></span><div class="fhp-actions"><button type="button" class="btn btn-ghost btn-icon btn-sm fhp-btn" data-fhp-copy title="Copy file path" aria-label="Copy file path">${icon('copy')}</button>${isReadOnly() ? '' : `<button type="button" class="btn btn-ghost btn-icon btn-sm fhp-btn" data-fhp-open title="Open folder location" aria-label="Open folder location">${icon('folderOpen')}</button>`}</div>`;
      pathEl = pop.querySelector('.fhp-path');
      copyBtn = pop.querySelector('[data-fhp-copy]');
      openBtn = pop.querySelector('[data-fhp-open]');

      pop.addEventListener('pointerenter', () => clearTimeout(hideTimer));
      pop.addEventListener('pointerleave', () => scheduleHide());
      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentFull) return;
        try {
          await navigator.clipboard.writeText(currentFull);
          copyBtn.innerHTML = icon('check');
          copyBtn.classList.add('active');
          clearTimeout(copyTimer);
          copyTimer = setTimeout(() => {
            if (copyBtn) {
              copyBtn.innerHTML = icon('copy');
              copyBtn.classList.remove('active');
            }
          }, 1400);
          toast('Path copied');
        } catch {
          toast('Failed to copy path');
        }
      });
      if (openBtn) {
        openBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!currentRel || openBtn.disabled) return;
          openBtn.disabled = true;
          try {
            const res = await fetch('/api/attachment/reveal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
              body: JSON.stringify({ file: currentRel }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              await AppDialog.alert({
                type: 'error',
                title: 'File tidak ditemukan',
                message: data.error || 'File atau folder lokasi tidak ditemukan.',
              });
            } else {
              hideNow();
            }
          } catch {
            toast('Failed to open folder location');
          } finally {
            openBtn.disabled = false;
          }
        });
      }
      document.body.appendChild(pop);
    }

    function hideNow() {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      activeLink = null;
      if (pop) pop.hidden = true;
    }

    function scheduleHide() {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideNow, 220);
    }

    function showFor(link) {
      ensurePop();
      activeLink = link;
      currentRel = attachmentRelFromSrc(link.dataset.fileSrc);
      currentFull = realAttachmentPath(currentRel);
      pathEl.textContent = currentFull;
      pathEl.title = currentFull;
      copyBtn.innerHTML = icon('copy');
      copyBtn.classList.remove('active');
      pop.style.visibility = 'hidden';
      pop.hidden = false;
      const rect = link.getBoundingClientRect();
      const popW = pop.offsetWidth;
      const popH = pop.offsetHeight;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - popW - 8));
      const fitsBelow = rect.bottom + 6 + popH <= window.innerHeight - 8;
      const top = fitsBelow || rect.top - 6 - popH < 8 ? rect.bottom + 6 : rect.top - 6 - popH;
      pop.style.left = Math.round(left) + 'px';
      pop.style.top = Math.round(top) + 'px';
      pop.style.visibility = '';
    }

    document.addEventListener('pointerover', (e) => {
      const link = e.target instanceof Element ? e.target.closest('a[data-file-src]') : null;
      if (!link || !link.closest('.prose') || link.closest('.visual')) return;
      clearTimeout(hideTimer);
      if (activeLink === link && pop && !pop.hidden) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(() => {
        if (link.isConnected) showFor(link);
      }, 90);
    });

    document.addEventListener('pointerout', (e) => {
      const link = e.target instanceof Element ? e.target.closest('a[data-file-src]') : null;
      if (!link) return;
      const rel = e.relatedTarget;
      if (rel instanceof Node && (link.contains(rel) || (pop && pop.contains(rel)))) return;
      scheduleHide();
    });

    document.addEventListener('click', (e) => {
      if (pop && !pop.hidden && e.target instanceof Node && !pop.contains(e.target)) hideNow();
    });
    window.addEventListener('scroll', hideNow, true);
    window.addEventListener('hashchange', hideNow);
  })();

  async function checkFileExists(fileSrc) {
    try {
      const res = await fetch(fileSrc, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch {
      return false;
    }
  }

  document.addEventListener('click', async (e) => {
    const img = e.target instanceof Element ? e.target.closest('.prose img') : null;
    // Di editor visual, klik gambar untuk memilihnya (tombol hapus/pengaturan), bukan membuka lightbox.
    if (img && img.getAttribute('src') && !img.closest('.visual')) openLightbox(img.currentSrc || img.src, img.alt);

    const fileLink = e.target instanceof Element ? e.target.closest('a[data-file-src], a[data-missing-href]') : null;
    if (!fileLink || fileLink.closest('.visual') || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (fileLink.dataset.checking) return;
    const label = (fileLink.textContent || fileLink.getAttribute('href') || 'file').trim();
    const fileSrc = fileLink.dataset.fileSrc;
    if (!fileSrc) {
      await AppDialog.alert({
        type: 'error',
        title: 'File tidak ditemukan',
        message: `File "${label}" tidak ditemukan atau tautan tidak valid.`,
      });
      return;
    }
    fileLink.dataset.checking = '1';
    const ok = await checkFileExists(fileSrc);
    delete fileLink.dataset.checking;
    if (!ok) {
      await AppDialog.alert({
        type: 'error',
        title: 'File tidak ditemukan',
        message: `File "${label}" tidak ditemukan atau sudah dihapus.`,
      });
      return;
    }
    if (fileLink.dataset.codeRel) {
      openCodeViewer(fileLink.dataset.codeRel);
      return;
    }
    const href = fileLink.getAttribute('href') || '';
    if (href.startsWith('#/~lihat/')) {
      location.hash = href;
      return;
    }
    const dl = document.createElement('a');
    dl.href = fileSrc;
    dl.download = label;
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  });

  document.addEventListener('keydown', (e) => {
    if (!e.defaultPrevented && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && editing && !$('.ad-root')) {
      e.preventDefault();
      saveEditing(false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (!isPanelOpen()) openPanel();
      else if (document.activeElement === el.cmdInput) closePanel();
      else el.cmdInput.focus();
    } else if (e.key === 'Escape' && isPanelOpen() && el.panel.contains(document.activeElement)) {
      closePanel();
    } else if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      e.preventDefault();
      openPanel();
    }
  });

  // ---------- Bridge untuk modul eksternal (recordings.js) ----------
  window.getCurrentNotePath = () => {
    const n = currentPath ? nodeIndex.get(currentPath) : null;
    return n && n.type === 'file' ? n.path : '';
  };
  window.getAllNotePaths = () =>
    Array.from(nodeIndex.values())
      .filter((n) => n.type === 'file')
      .map((n) => ({ path: n.path, title: n.title || n.name }))
      .sort((a, b) => a.path.localeCompare(b.path, 'id'));
  window.aiNoteToast = toast;
  window.aiNoteHashFor = hashFor;
  window.aiNoteCopy = copyTextSafe;
  window.setActiveViewCleanup = (fn) => {
    activeViewerCleanup = typeof fn === 'function' ? fn : null;
  };

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

  Promise.all([loadAuth(), loadTree()])
    .then(() => {
      const openParam = new URLSearchParams(location.search).get('open');
      if (openParam !== null) {
        const clean = openParam.replace(/^\/+|\/+$/g, '');
        history.replaceState(null, '', '/' + (clean ? hashFor(clean) : '#/'));
      }
      renderTree();
      route();
      if (store.get('search', 'closed') === 'open' && !mobileMQ.matches) openPanel(false);
    })
    .catch((err) => {
      el.content.innerHTML = `<div class="empty"><p><strong>Gagal memuat catatan</strong></p><p>${esc(err.message)}</p></div>`;
    });
})();
