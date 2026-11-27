(() => {
  'use strict';

  const QUICK_FOLDER = 'Catatan Cepat';
  const STORAGE_TABS = 'ainote_cepat_tabs_v1';
  const STORAGE_ACTIVE = 'ainote_cepat_active_v1';
  const STORAGE_RECENT = 'ainote_cepat_recent_folders_v1';
  const REL_MARK = '/__rel__/';
  const PASTE_IMG_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const fromRelMark = (text) => String(text ?? '').split(location.origin + REL_MARK).join('');
  const isPasteImage = (f) => f && PASTE_IMG_TYPES.includes(f.type);

  const el = {
    tabs: $('#qc-tabs'),
    tabsLeft: $('#qc-tabs-left'),
    tabsRight: $('#qc-tabs-right'),
    newTab: $('#qc-new-tab'),
    tabListBtn: $('#qc-tab-list-btn'),
    tabListPop: $('#qc-tab-list-pop'),
    themeBtn: $('#qc-theme-btn'),
    homeLink: $('#qc-home-link'),
    visual: $('#qc-visual'),
    editorWrap: $('#qc-editor-wrap'),
    banner: $('#qc-banner'),
    bannerMsg: $('#qc-banner-msg'),
    bannerActions: $('#qc-banner-actions'),
    folderBtn: $('#qc-folder-btn'),
    folderIcon: $('#qc-folder-icon'),
    folderLabel: $('#qc-folder-label'),
    status: $('#qc-status'),
    detailBtn: $('#qc-detail-btn'),
    attachBtn: $('#qc-attach-btn'),
    attachInput: $('#qc-attach-input'),
    saveBtn: $('#qc-save-btn'),
    modalRoot: $('#qc-modal-root'),
    toast: $('#qc-toast'),
    moreBtn: $('#qc-more-btn'),
    morePop: $('#qc-more-pop'),
  };

  // Icons
  const SVG = (p, size = 15) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICONS = {
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
  };
  const iconSvg = (name) =>
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  el.folderIcon.innerHTML = SVG(ICONS.folder, 14);
  el.homeLink.innerHTML = SVG('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', 14) + '<span>Buka AI Note lengkap</span>';
  function syncThemeIcon() {
    const dark = document.documentElement.classList.contains('dark');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#1a1a1a' : '#ffffff');
    el.themeBtn.innerHTML = (dark
      ? SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>', 14)
      : SVG('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', 14)) + '<span>' + (dark ? 'Tema terang' : 'Tema gelap') + '</span>';
  }
  syncThemeIcon();

  // State
  let tabs = [];
  let activeId = null;
  let activeEditor = null;
  let dialogObserver = null;
  let readOnly = false;
  let modalOpen = false;
  let cachedTree = null;
  let toastTimer = null;
  const saveTimers = new Map();
  const savingInFlight = new Map();
  // Jendela utama menyimpan daftar tab di STORAGE_TABS. Jendela tambahan (koordinasi satu jendela gagal,
  // atau ?newwin=1) memakai kunci sendiri supaya tidak menimpa daftar tab jendela utama.
  let isSecondary = false;
  let tabsStorageKey = STORAGE_TABS;
  const EXTRA_TABS_PREFIX = STORAGE_TABS + ':win:';

  function uid() {
    return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function nowStamp(ms = Date.now()) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function formatTime(ms = Date.now()) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function isEmptyMd(md) {
    return !String(md || '').replace(/[\s\u200B]+/g, '').length;
  }

  function firstLineOf(md) {
    const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    for (const raw of lines) {
      let line = raw
        .replace(/^\s*#{1,6}\s+/, '')
        .replace(/^\s*>\s?/, '')
        .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, '')
        .replace(/^\s*[-*+]\s+/, '')
        .replace(/^\s*\d+\.\s+/, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*_`~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (line) return line;
    }
    return '';
  }

  function slugifyFirstLine(line) {
    const s = String(line || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9._ -]+/g, ' ')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 50)
      .replace(/-+$/, '');
    return s || 'catatan';
  }

  function baseNameOf(rel) {
    if (!rel) return '';
    return rel.split('/').pop().replace(/\.md$/i, '');
  }

  function folderOf(rel) {
    if (!rel || !rel.includes('/')) return QUICK_FOLDER;
    return rel.slice(0, rel.lastIndexOf('/'));
  }

  function normalizeAttRefs(tab, md) {
    let out = fromRelMark(md);
    if (tab && tab.attMap) {
      for (const [oldBase, newBase] of Object.entries(tab.attMap)) {
        if (!oldBase || !newBase || oldBase === newBase) continue;
        out = out.split(`_lampiran/${oldBase}/`).join(`_lampiran/${newBase}/`);
        const encOld = encodeURIComponent(oldBase);
        if (encOld !== oldBase) {
          out = out.split(`_lampiran/${encOld}/`).join(`_lampiran/${encodeURIComponent(newBase)}/`);
        }
      }
    }
    return out;
  }

  function activeTab() {
    return tabs.find((t) => t.id === activeId) || null;
  }

  // Catatan kosong hanya boleh dihapus otomatis kalau masih catatan cepat biasa:
  // nama otomatis (tanggal_jam-...), di folder Catatan Cepat, dan belum pernah diberi nama sendiri.
  // Selain itu isi kosong disimpan biasa, jadi file dan riwayatnya tetap ada.
  const AUTO_NAME_RE = /^\d{4}-\d{2}-\d{2}_\d{4}(?:-|$)/;
  function canAutoRemove(tab) {
    return !!tab.path && !tab.customNamed && folderOf(tab.path) === QUICK_FOLDER && AUTO_NAME_RE.test(baseNameOf(tab.path));
  }

  function toast(msg, action) {
    clearTimeout(toastTimer);
    el.toast.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    el.toast.appendChild(span);
    el.toast.classList.toggle('has-action', !!action);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'qc-toast-action';
      b.textContent = action.label;
      b.addEventListener('click', () => {
        clearTimeout(toastTimer);
        el.toast.hidden = true;
        action.onClick();
      });
      el.toast.appendChild(b);
    }
    el.toast.hidden = false;
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, action ? 5000 : 2400);
  }

  function setStatus(text, kind = '') {
    el.status.textContent = text;
    el.status.className = 'qc-status-text' + (kind ? ' ' + kind : '');
  }

  function showBanner(msg, buttons = [], kind = 'error') {
    el.bannerMsg.textContent = msg;
    el.banner.className = 'qc-banner' + (kind === 'warn' ? ' warn' : '');
    el.bannerActions.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm ' + (b.primary ? 'btn-primary' : 'btn-outline');
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      el.bannerActions.appendChild(btn);
    }
    el.banner.hidden = false;
  }

  function hideBanner() {
    el.banner.hidden = true;
    el.bannerActions.innerHTML = '';
  }

  // ---------- Persistence ----------
  function saveStateLocal() {
    try {
      const serialized = tabs.map((t) => ({
        id: t.id,
        path: t.path || null,
        folder: t.folder || QUICK_FOLDER,
        customNamed: !!t.customNamed,
        createdStamp: t.createdStamp || null,
        autoSlug: t.autoSlug || null,
        title: t.title || '',
        meta: t.meta || { ringkasan: '', tag: '', lingkungan: '' },
        version: t.version || null,
        localDraft: t.localDraft !== undefined ? t.localDraft : (t.dirty ? t.content : undefined),
      }));
      localStorage.setItem(tabsStorageKey, JSON.stringify(serialized));
      if (activeId && !isSecondary) localStorage.setItem(STORAGE_ACTIVE, activeId);
    } catch {}
  }

  function getRecentFolders() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_RECENT) || '[]');
      return Array.isArray(list) ? list.filter((f) => typeof f === 'string' && f && f !== QUICK_FOLDER) : [];
    } catch {
      return [];
    }
  }

  function pushRecentFolder(folder) {
    if (!folder || folder === QUICK_FOLDER) return;
    try {
      const next = [folder, ...getRecentFolders().filter((f) => f !== folder)].slice(0, 6);
      localStorage.setItem(STORAGE_RECENT, JSON.stringify(next));
    } catch {}
  }

  function newEmptyTab(folder = QUICK_FOLDER) {
    return {
      id: uid(),
      path: null,
      folder,
      customNamed: false,
      createdStamp: null,
      autoSlug: null,
      title: '',
      content: '',
      meta: { ringkasan: '', tag: '', lingkungan: '' },
      version: null,
      dirty: false,
      localDraft: undefined,
      attMap: {},
      lastSavedAt: null,
    };
  }

  // ---------- Rendering Tabs & Bar ----------
  function updateTabOverflow() {
    if (!el.tabs) return;
    const overflow = el.tabs.scrollWidth > el.tabs.clientWidth + 2;
    el.tabsLeft.hidden = !overflow;
    el.tabsRight.hidden = !overflow;
    if (overflow) {
      el.tabsLeft.disabled = el.tabs.scrollLeft <= 1;
      el.tabsRight.disabled = el.tabs.scrollLeft + el.tabs.clientWidth >= el.tabs.scrollWidth - 1;
    }
    el.tabListBtn.hidden = !(overflow || tabs.length > 1);
  }

  function closeTabListPop() {
    if (!el.tabListPop || el.tabListPop.hidden) return;
    el.tabListPop.hidden = true;
    el.tabListBtn.setAttribute('aria-expanded', 'false');
  }

  function renderTabListPop() {
    el.tabListPop.innerHTML = '';
    for (const t of tabs) {
      const item = document.createElement('div');
      item.className = 'qc-tab-list-item' + (t.id === activeId ? ' active' : '');
      item.setAttribute('role', 'menuitem');

      if (t.dirty || t.localDraft !== undefined) {
        const dot = document.createElement('span');
        dot.className = 'qc-tab-dot';
        item.appendChild(dot);
      }

      const textBox = document.createElement('span');
      textBox.className = 'qc-tab-list-text';
      const label = firstLineOf(t.content) || t.title || (t.path ? baseNameOf(t.path) : '') || 'Catatan baru';
      const nameEl = document.createElement('span');
      nameEl.className = 'qc-tab-list-name';
      nameEl.textContent = label;
      textBox.appendChild(nameEl);
      if (t.folder && t.folder !== QUICK_FOLDER) {
        const subEl = document.createElement('span');
        subEl.className = 'qc-tab-list-sub';
        subEl.textContent = t.folder;
        textBox.appendChild(subEl);
      }
      item.appendChild(textBox);

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'qc-tab-close';
      close.title = 'Tutup tab';
      close.setAttribute('aria-label', 'Tutup tab');
      close.textContent = '×';
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTabListPop();
        closeTab(t.id);
      });
      item.appendChild(close);

      item.addEventListener('click', () => {
        closeTabListPop();
        switchTab(t.id);
      });
      el.tabListPop.appendChild(item);
    }
  }

  function renderTabs() {
    el.tabs.innerHTML = '';
    let activeBtn = null;
    for (const t of tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.role = 'tab';
      btn.className = 'qc-tab' + (t.id === activeId ? ' active' : '');
      btn.setAttribute('aria-selected', t.id === activeId ? 'true' : 'false');
      const label = firstLineOf(t.content) || t.title || (t.path ? baseNameOf(t.path) : '') || 'Catatan baru';
      btn.title = t.path ? `${label}\n${t.path}` : label;

      if (t.dirty || t.localDraft !== undefined) {
        const dot = document.createElement('span');
        dot.className = 'qc-tab-dot';
        dot.title = 'Belum tersimpan ke server';
        btn.appendChild(dot);
      }

      const span = document.createElement('span');
      span.className = 'qc-tab-title';
      span.textContent = label;
      btn.appendChild(span);

      const close = document.createElement('span');
      close.className = 'qc-tab-close';
      close.setAttribute('role', 'button');
      close.setAttribute('aria-label', 'Tutup tab');
      close.title = 'Tutup tab (Ctrl+W)';
      close.textContent = '×';
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(t.id);
      });
      btn.appendChild(close);

      btn.dataset.id = t.id;
      btn.addEventListener('click', () => switchTab(t.id));
      btn.addEventListener('dblclick', (e) => {
        if (e.target.closest('.qc-tab-close')) return;
        e.preventDefault();
        startRenameTab(t.id);
      });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openTabMenu(t.id, e.clientX, e.clientY);
      });
      btn.addEventListener('auxclick', (e) => {
        if (e.button === 1) { e.preventDefault(); closeTab(t.id); }
      });
      if (t.id === activeId) activeBtn = btn;
      el.tabs.appendChild(btn);
    }

    const cur = activeTab();
    if (cur) {
      el.folderLabel.textContent = cur.folder || QUICK_FOLDER;
      const tLabel = firstLineOf(cur.content) || cur.title || 'Catatan baru';
      document.title = `${tLabel.slice(0, 40)} · Note Cepat`;
    }

    if (el.tabListPop && !el.tabListPop.hidden) renderTabListPop();
    requestAnimationFrame(() => {
      if (activeBtn && activeBtn.scrollIntoView) {
        activeBtn.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      }
      updateTabOverflow();
    });
  }

  // ---------- Editor Mounting ----------
  function resolveImageSrc(src) {
    src = fromRelMark(src);
    const cur = activeTab();
    if (!cur || /^(https?:|data:|\/)/i.test(src)) return src;
    src = normalizeAttRefs(cur, src);
    const baseDir = cur.folder && cur.folder !== '' ? cur.folder.split('/') : (cur.path && cur.path.includes('/') ? cur.path.slice(0, cur.path.lastIndexOf('/')).split('/') : []);
    const out = [...baseDir];
    for (let s of String(src).split(/[?#]/)[0].split('/')) {
      try { s = decodeURIComponent(s); } catch {}
      if (s === '..') out.pop();
      else if (s && s !== '.') out.push(s);
    }
    return '/files/' + out.map(encodeURIComponent).join('/');
  }

  function destroyEditor() {
    if (dialogObserver) {
      dialogObserver.disconnect();
      dialogObserver = null;
    }
    if (activeEditor) {
      try { activeEditor.destroy(); } catch {}
      activeEditor = null;
    }
    el.visual.innerHTML = '';
  }

  function mountCurrentTab(focus = true) {
    destroyEditor();
    const tab = activeTab();
    if (!tab) return;
    renderTabs();

    if (tab.loading) {
      // Isi tab lama belum diambil dari server: jangan tampilkan editor kosong yang bisa tersimpan.
      const box = document.createElement('div');
      box.className = 'qc-loading';
      box.textContent = tab.loadError || 'Memuat catatan...';
      el.visual.appendChild(box);
      setStatus(tab.loadError ? 'Catatan belum bisa dimuat' : 'Memuat...', tab.loadError ? 'err' : '');
      if (tab.loadPromise && !tab.loadError) {
        tab.loadPromise.then(() => {
          if (activeId === tab.id && !modalOpen) mountCurrentTab(focus);
        });
      }
      return;
    }

    if (!window.NoteEditorVisual) {
      setStatus('Editor visual gagal dimuat. Muat ulang halaman.', 'err');
      return;
    }

    const vis = window.NoteEditorVisual.create(el.visual, tab.content || '', {
      resolveImage: resolveImageSrc,
      onChange: () => {
        if (activeTab() !== tab || readOnly) return;
        const cleanMd = normalizeAttRefs(tab, vis.value);
        tab.content = cleanMd;
        tab.title = firstLineOf(cleanMd);
        tab.dirty = true;
        tab.localDraft = cleanMd;
        saveStateLocal();
        renderTabs();
        setStatus('Mengetik...');
        scheduleSave(tab.id);
      },
      onSave: () => {
        if (!modalOpen) saveNow();
      },
      onError: () => {
        setStatus('Ada format Markdown yang tidak didukung editor visual', 'err');
      },
    });

    const DIALOG_TEXT = {
      'Upload an image': 'Pengaturan gambar',
      'Add an image from an URL:': 'Alamat gambar',
      'Alt:': 'Deskripsi (alt)',
      'Title:': 'Judul (opsional)',
      Save: 'Simpan',
      Cancel: 'Batal',
    };
    const fixDialog = () => {
      el.visual.querySelectorAll('[role="dialog"]:not([data-ai-note])').forEach((d) => {
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
    dialogObserver = new MutationObserver(fixDialog);
    dialogObserver.observe(el.visual, { childList: true, subtree: true });

    activeEditor = {
      get value() { return normalizeAttRefs(tab, vis.value); },
      focus: () => vis.focus(),
      destroy: () => vis.destroy(),
    };

    if (tab.lastSavedAt) setStatus(`✓ Tersimpan ${formatTime(tab.lastSavedAt)}`, 'ok');
    else if (tab.localDraft !== undefined) setStatus('Belum tersimpan ke server');
    else setStatus(isEmptyMd(tab.content) ? 'Siap menulis' : 'Tersimpan');

    if (focus) {
      setTimeout(() => {
        try {
          const ce = el.visual.querySelector('[contenteditable="true"]');
          if (ce) ce.focus();
          else activeEditor && activeEditor.focus();
        } catch {}
      }, 30);
    }
  }

  function switchTab(id) {
    if (id === activeId) return;
    const prev = activeTab();
    if (prev && activeEditor) {
      prev.content = activeEditor.value;
      if (prev.dirty) prev.localDraft = prev.content;
    }
    activeId = id;
    saveStateLocal();
    mountCurrentTab(true);
  }

  // ---------- Server Save / Autosave Engine ----------
  function scheduleSave(tabId) {
    clearTimeout(saveTimers.get(tabId));
    saveTimers.set(tabId, setTimeout(() => {
      saveTimers.delete(tabId);
      flushTabSave(tabId, { autosave: true });
    }, 900));
  }

  async function apiJson(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        'X-Requested-With': 'ai-note',
        ...(opts.body && typeof opts.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  function handleSaveFailure(tab, res, data, err) {
    tab.localDraft = tab.content;
    saveStateLocal();
    renderTabs();
    if (!res) {
      setStatus('Server tidak terjangkau (tersimpan di browser)', 'err');
      showBanner('AI Note belum berjalan. Jalankan restart.bat — tulisan diamankan sementara di browser.', [
        { label: 'Coba lagi', primary: true, onClick: () => flushTabSave(tab.id, { autosave: false }) },
      ]);
      return;
    }
    if (res.status === 401) {
      setStatus('Sesi login habis (tulisan aman di browser)', 'err');
      showBanner('Sesi login kedaluwarsa. Login ulang untuk menyimpan ke server (tulisan aman di browser).', [
        { label: 'Login ulang', primary: true, onClick: goLogin },
      ]);
      return;
    }
    if (res.status === 409) {
      setStatus('Konflik: file diubah di tempat lain', 'err');
      showBanner('Catatan ini sudah diubah dari tempat lain. Pilih versi yang dipakai:', [
        {
          label: 'Muat versi terbaru',
          onClick: async () => {
            const r = await apiJson('/api/note?path=' + encodeURIComponent(tab.path));
            if (r.res.ok) {
              tab.content = r.data.markdown || '';
              tab.version = r.data.version;
              tab.meta = {
                ringkasan: r.data.ringkasan || '',
                tag: (r.data.tag || []).join(', '),
                lingkungan: r.data.lingkungan || '',
              };
              tab.dirty = false;
              tab.localDraft = undefined;
              saveStateLocal();
              hideBanner();
              if (activeId === tab.id) mountCurrentTab(true);
            }
          },
        },
        {
          label: 'Timpa dengan tulisan ini',
          primary: true,
          onClick: () => flushTabSave(tab.id, { autosave: false, force: true }),
        },
      ], 'warn');
      return;
    }
    setStatus('Gagal menyimpan: ' + ((data && data.error) || (err && err.message) || 'HTTP ' + res.status), 'err');
  }

  async function flushTabSave(tabId, opts = {}) {
    if (readOnly) return false;
    clearTimeout(saveTimers.get(tabId));
    saveTimers.delete(tabId);

    const pending = savingInFlight.get(tabId);
    if (pending) {
      await pending;
      const tAgain = tabs.find((x) => x.id === tabId);
      if (!tAgain || !tAgain.dirty) return true;
    }

    const tab = tabs.find((x) => x.id === tabId);
    if (!tab || tab.discarding || tab.loading) return true;
    if (tab.id === activeId && activeEditor) {
      tab.content = activeEditor.value;
    }

    const work = (async () => {
      const content = tab.content || '';
      const empty = isEmptyMd(content);

      if (empty && !opts.allowEmpty && (!tab.path || canAutoRemove(tab))) {
        if (tab.path && !opts.finalize) {
          // Isi dikosongkan saat mengetik (misalnya blok semua lalu ketik ulang): file dibiarkan apa adanya.
          // Penghapusan baru dilakukan saat tab ditutup, jadi file dan riwayatnya tidak hilang di tengah jalan.
          tab.dirty = false;
          tab.localDraft = '';
          saveStateLocal();
          if (tab.id === activeId) setStatus('Kosong (dihapus jika tab ditutup)');
          renderTabs();
          return true;
        }
        if (tab.path) {
          try {
            const { res, data } = await apiJson('/api/quick/remove-empty', {
              method: 'POST',
              body: JSON.stringify({ path: tab.path, version: tab.version }),
            });
            if (!res.ok && res.status !== 404) {
              if (tab.id === activeId) setStatus('Gagal menghapus catatan kosong: ' + (data.error || 'HTTP ' + res.status), 'err');
              return false;
            }
            tab.path = null;
            tab.version = null;
            tab.createdStamp = null;
            tab.autoSlug = null;
            tab.customNamed = false;
            tab.attMap = {};
          } catch (err) {
            if (tab.id === activeId) setStatus('Server tidak terjangkau, catatan kosong belum dihapus', 'err');
            return false;
          }
        }
        tab.dirty = false;
        tab.localDraft = undefined;
        tab.lastSavedAt = null;
        saveStateLocal();
        hideBanner();
        if (tab.id === activeId) setStatus('Kosong (tidak disimpan)');
        renderTabs();
        return true;
      }

      const line = firstLineOf(content);
      const slug = slugifyFirstLine(line);

      if (!tab.path) {
        if (!tab.createdStamp) tab.createdStamp = nowStamp();
        const baseName = `${tab.createdStamp}-${slug}`;
        try {
          const { res, data } = await apiJson('/api/quick/create', {
            method: 'POST',
            body: JSON.stringify({
              folder: tab.folder || QUICK_FOLDER,
              baseName,
              content,
              meta: tab.meta,
              clientId: tab.id,
            }),
          });
          if (!res.ok) {
            handleSaveFailure(tab, res, data);
            return false;
          }
          tab.path = data.path;
          tab.version = data.version;
          tab.autoSlug = slug;
          tab.dirty = false;
          tab.localDraft = undefined;
          tab.lastSavedAt = Date.now();
          saveStateLocal();
          hideBanner();
          if (tab.id === activeId) setStatus(`✓ Tersimpan ${formatTime(tab.lastSavedAt)}`, 'ok');
          renderTabs();
          return true;
        } catch (err) {
          handleSaveFailure(tab, null, null, err);
          return false;
        }
      }

      // Auto-rename according to latest first line until user picks a custom name
      if (!tab.customNamed && !empty && tab.autoSlug !== slug) {
        if (!tab.createdStamp) tab.createdStamp = nowStamp();
        const desiredBase = `${tab.createdStamp}-${slug}`;
        try {
          const { res, data } = await apiJson('/api/quick/relocate', {
            method: 'POST',
            body: JSON.stringify({ path: tab.path, name: desiredBase, unique: true }),
          });
          if (res.ok && data.path) {
            if (data.renamed && data.oldBase && data.newBase) {
              tab.attMap[data.oldBase] = data.newBase;
              tab.content = normalizeAttRefs(tab, tab.content);
            }
            tab.path = data.path;
            tab.version = data.version;
            tab.autoSlug = slug;
          }
        } catch {}
      }

      try {
        const { res, data } = await apiJson('/api/note?path=' + encodeURIComponent(tab.path), {
          method: 'PUT',
          body: JSON.stringify({
            content: tab.content,
            version: tab.version,
            force: !!opts.force,
            meta: tab.meta,
            autosave: opts.autosave !== false,
          }),
        });
        if (!res.ok) {
          handleSaveFailure(tab, res, data);
          return false;
        }
        tab.version = data.version;
        tab.dirty = false;
        tab.localDraft = undefined;
        tab.lastSavedAt = Date.now();
        saveStateLocal();
        hideBanner();
        if (tab.id === activeId) setStatus(`✓ Tersimpan ${formatTime(tab.lastSavedAt)}`, 'ok');
        renderTabs();
        return true;
      } catch (err) {
        handleSaveFailure(tab, null, null, err);
        return false;
      }
    })();

    savingInFlight.set(tabId, work);
    try {
      return await work;
    } finally {
      savingInFlight.delete(tabId);
    }
  }

  // ---------- Attachments (Paste, Drop, Button) ----------
  const currentRange = () => {
    const sel = window.getSelection();
    return sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  };

  async function ensureNotePathForAttachment(tab) {
    if (tab.path) return true;
    const ok = await flushTabSave(tab.id, { allowEmpty: true, autosave: true });
    return ok && !!tab.path;
  }

  async function insertIntoEditor(md, html, range) {
    const target = el.visual.querySelector('[contenteditable="true"]');
    if (!target) return;
    const tick = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    target.focus({ preventScroll: true });
    if (range && target.contains(range.startContainer)) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      await tick();
    }
    const paste = (dt) => target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    const dt = new DataTransfer();
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

  async function uploadAndInsert(files, range) {
    const tab = activeTab();
    if (!tab || readOnly || !files.length) return;
    if (!(await ensureNotePathForAttachment(tab))) return;

    const imgs = files.filter(isPasteImage);
    const others = files.filter((f) => !isPasteImage(f));

    for (const file of imgs) {
      if (activeTab() !== tab) return;
      const kb = Math.max(1, Math.round(file.size / 1024));
      const desc = await AppDialog.prompt({
        title: 'Deskripsi gambar',
        message: `${file.name || 'Gambar dari clipboard'} · ${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}`,
        label: 'Deskripsi (boleh dikosongkan)',
        placeholder: 'mis. error timeout',
        required: false,
        confirmLabel: 'Sisipkan',
      });
      if (desc === null || activeTab() !== tab) return;
      setStatus('Mengunggah gambar...');
      try {
        const res = await fetch(`/api/attachment?note=${encodeURIComponent(tab.path)}&desc=${encodeURIComponent(desc)}`, {
          method: 'POST',
          headers: { 'Content-Type': file.type, 'X-Requested-With': 'ai-note' },
          body: file,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        const alt = (desc.trim() || 'gambar').replace(/[\[\]\r\n]/g, ' ');
        const src = data.path.split('/').map(encodeURIComponent).join('/');
        await insertIntoEditor(`![${alt}](${src})`, `<img src="${escAttr(location.origin + REL_MARK + src)}" alt="${escAttr(alt)}">`, range);
        range = null;
        setStatus('Gambar disisipkan: ' + data.name);
      } catch (err) {
        setStatus('Gagal mengunggah gambar', 'err');
        await AppDialog.alert({ type: 'error', title: 'Gagal mengunggah gambar', message: err.message });
        return;
      }
    }

    for (const file of others) {
      if (activeTab() !== tab) return;
      const fname = file.name || 'lampiran';
      setStatus('Mengunggah ' + fname + '...');
      try {
        const res = await fetch(`/api/attachment?note=${encodeURIComponent(tab.path)}&name=${encodeURIComponent(fname)}`, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Requested-With': 'ai-note' },
          body: file,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        const label = fname.replace(/[\[\]\r\n]/g, ' ');
        const src = data.path.split('/').map(encodeURIComponent).join('/');
        if (data.kind === 'image') {
          await insertIntoEditor(`![${label}](${src})`, `<img src="${escAttr(location.origin + REL_MARK + src)}" alt="${escAttr(label)}">`, range);
        } else {
          await insertIntoEditor(`- [${label}](${src})`, `<a href="${escAttr(location.origin + REL_MARK + src)}">${esc(label)}</a>`, range);
        }
        range = null;
        setStatus('Lampiran disisipkan: ' + data.name);
      } catch (err) {
        setStatus('Gagal mengunggah lampiran', 'err');
        await AppDialog.alert({ type: 'error', title: 'Gagal mengunggah lampiran', message: err.message });
        return;
      }
    }
  }

  el.editorWrap.addEventListener('paste', (e) => {
    const files = [...((e.clipboardData && e.clipboardData.files) || [])];
    if (!files.length) return;
    if ((e.clipboardData.getData('text/plain') || '').trim()) return;
    e.preventDefault();
    e.stopPropagation();
    uploadAndInsert(files, currentRange());
  }, true);

  el.editorWrap.addEventListener('dragover', (e) => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
  }, true);

  el.editorWrap.addEventListener('drop', (e) => {
    const files = [...((e.dataTransfer && e.dataTransfer.files) || [])];
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    uploadAndInsert(files, range);
  }, true);

  // ---------- Folders Tree Picker (sama seperti dialog Catatan baru di AI Note) ----------
  function countFiles(node) {
    if (!node) return 0;
    if (node.type === 'file') return 1;
    if (node._count === undefined) {
      node._count = (node.children || []).reduce((n, c) => n + countFiles(c), 0);
    }
    return node._count;
  }

  async function loadFolderTree() {
    try {
      const { res, data } = await apiJson('/api/tree');
      if (res.ok && data && data.tree) cachedTree = data.tree;
    } catch {}
    const tree = cachedTree
      ? JSON.parse(JSON.stringify(cachedTree))
      : { type: 'dir', name: 'AI Note', path: '', children: [] };
    if (!Array.isArray(tree.children)) tree.children = [];
    if (!tree.children.some((c) => c.type === 'dir' && c.path === QUICK_FOLDER)) {
      tree.children.push({ type: 'dir', name: QUICK_FOLDER, path: QUICK_FOLDER, children: [] });
      tree.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return String(a.name).localeCompare(String(b.name), 'id');
      });
    }
    return tree;
  }

  function flattenDirs(node, out = []) {
    for (const c of node.children || []) {
      if (c.type !== 'dir') continue;
      out.push(c);
      flattenDirs(c, out);
    }
    return out;
  }

  // Pemilih folder: kotak cari (ketik sebagian, misalnya "vic iss"), daftar folder terakhir dipakai,
  // lalu pohon semua folder. Hanya folder yang sudah ada yang bisa dipilih.
  function mountFolderTreePicker(container, { tree, value, label = 'Folder', startOpen = false, onSelect }) {
    const initial = value || QUICK_FOLDER;
    container.innerHTML = `<div class="field fp" data-fp><span>${esc(label)}</span><input type="hidden" value="${escAttr(initial)}"><button type="button" class="fp-btn" aria-haspopup="tree" aria-expanded="false"><span class="fp-ico">${iconSvg('folder')}</span><span class="fp-label"></span><span class="fp-caret">${iconSvg('chevron')}</span></button><div class="scope-pop fp-pop" hidden><input type="text" class="qc-input fp-search" placeholder="Cari folder, misalnya: vic iss" autocomplete="off" spellcheck="false" aria-label="Cari folder"><div class="fp-list" role="tree"></div></div></div>`;
    const fp = container.querySelector('[data-fp]');
    const input = fp.querySelector('input[type="hidden"]');
    const btn = fp.querySelector('.fp-btn');
    const pop = fp.querySelector('.fp-pop');
    const search = fp.querySelector('.fp-search');
    const list = fp.querySelector('.fp-list');
    const open = new Set();
    const allDirs = flattenDirs(tree);
    const byPath = new Map(allDirs.map((d) => [d.path, d]));
    let hi = -1;

    const openTo = (p) => {
      const segs = p ? p.split('/') : [];
      for (let i = 1; i < segs.length; i++) open.add(segs.slice(0, i).join('/'));
    };
    const setLabel = () => {
      fp.querySelector('.fp-label').textContent = input.value || QUICK_FOLDER;
    };
    const flatRow = (d) =>
      `<div class="scope-row fp-flat${input.value === d.path ? ' selected' : ''}" role="treeitem" data-path="${escAttr(d.path)}" title="${escAttr(d.path)}" style="padding-left:0.375rem">${iconSvg('folder')}<span class="scope-name">${esc(d.path)}</span><span class="scope-count">${countFiles(d)}</span></div>`;
    const rows = (node, depth, out) => {
      (node.children || [])
        .filter((c) => c.type === 'dir')
        .forEach((d) => {
          const subs = (d.children || []).some((c) => c.type === 'dir');
          const isOpen = open.has(d.path);
          out.push(
            `<div class="scope-row${input.value === d.path ? ' selected' : ''}" role="treeitem" data-path="${escAttr(d.path)}" style="padding-left:${0.375 + depth}rem"><span class="scope-chev${subs ? '' : ' none'}${isOpen ? ' open' : ''}" data-toggle="${escAttr(d.path)}">${subs ? iconSvg('chevron') : ''}</span>${iconSvg('folder')}<span class="scope-name">${esc(d.name)}</span><span class="scope-count">${countFiles(d)}</span></div>`,
          );
          if (subs && isOpen) rows(d, depth + 1, out);
        });
    };
    const render = () => {
      const q = search.value.trim().toLowerCase();
      const out = [];
      if (q) {
        const tokens = q.split(/\s+/);
        const hits = allDirs.filter((d) => {
          const p = d.path.toLowerCase();
          return tokens.every((t) => p.includes(t));
        });
        if (hits.length) hits.slice(0, 60).forEach((d) => out.push(flatRow(d)));
        else out.push('<div class="fp-empty">Folder tidak ditemukan</div>');
      } else {
        const recent = [QUICK_FOLDER, ...getRecentFolders()].map((p) => byPath.get(p)).filter(Boolean);
        if (recent.length) {
          out.push('<div class="fp-head">Terakhir dipakai</div>');
          recent.forEach((d) => out.push(flatRow(d)));
          out.push('<div class="fp-head">Semua folder</div>');
        }
        rows(tree, 0, out);
      }
      list.innerHTML = out.join('');
      hi = q ? 0 : -1;
      markHi();
    };
    const rowEls = () => [...list.querySelectorAll('.scope-row')];
    const markHi = () => {
      rowEls().forEach((r, i) => r.classList.toggle('fp-hi', i === hi));
      const cur = rowEls()[hi];
      if (cur) cur.scrollIntoView({ block: 'nearest' });
    };
    const setOpen = (v) => {
      if (v) {
        pop.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        search.value = '';
        openTo(input.value);
        render();
        const sel = list.querySelector('.selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
        setTimeout(() => search.focus(), 0);
      } else {
        pop.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    };
    const choose = (p) => {
      input.value = p;
      setLabel();
      render();
      if (!startOpen) setOpen(false);
      if (onSelect) onSelect(input.value);
    };

    setLabel();
    btn.addEventListener('click', () => setOpen(pop.hidden));
    search.addEventListener('input', render);
    search.addEventListener('keydown', (e) => {
      const n = rowEls().length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (n) { hi = (hi + 1) % n; markHi(); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (n) { hi = hi <= 0 ? n - 1 : hi - 1; markHi(); }
      } else if (e.key === 'Enter') {
        // Jangan sampai Enter di kotak cari ikut mengirim form Simpan.
        e.preventDefault();
        e.stopPropagation();
        const row = rowEls()[hi >= 0 ? hi : 0];
        if (row) choose(row.dataset.path);
      }
    });
    list.addEventListener('click', (e) => {
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
      choose(row.dataset.path);
    });

    if (startOpen) setOpen(true);

    return {
      get value() { return input.value || QUICK_FOLDER; },
      isOpen: () => !pop.hidden,
      close: () => setOpen(false),
    };
  }

  // ---------- Modals ----------
  function showModal(renderFn) {
    if (modalOpen) return;
    modalOpen = true;
    el.modalRoot.innerHTML = '';
    el.modalRoot.hidden = false;
    const backdrop = document.createElement('div');
    backdrop.className = 'qc-modal-backdrop';
    const panel = document.createElement('div');
    panel.className = 'qc-modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    el.modalRoot.appendChild(backdrop);
    el.modalRoot.appendChild(panel);

    const close = () => {
      if (!modalOpen) return;
      modalOpen = false;
      document.removeEventListener('keydown', onEsc, true);
      el.modalRoot.hidden = true;
      el.modalRoot.innerHTML = '';
      if (activeEditor) activeEditor.focus();
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', onEsc, true);
    backdrop.addEventListener('click', close);
    renderFn(panel, close);
  }

  async function moveTabToFolder(tab, targetFolder) {
    const chosen = targetFolder || QUICK_FOLDER;
    if (tab.folder === chosen) return true;
    if (!tab.path) {
      tab.folder = chosen;
      if (chosen !== QUICK_FOLDER) pushRecentFolder(chosen);
      saveStateLocal();
      renderTabs();
      return true;
    }
    await flushTabSave(tab.id, { autosave: true });
    setStatus('Memindah folder...');
    try {
      const { res, data } = await apiJson('/api/quick/relocate', {
        method: 'POST',
        body: JSON.stringify({ path: tab.path, folder: chosen, unique: true }),
      });
      if (!res.ok) {
        toast(data.error || 'Gagal memindah folder');
        setStatus('Gagal memindah folder', 'err');
        return false;
      }
      tab.path = data.path;
      tab.folder = chosen;
      tab.version = data.version;
      if (chosen !== QUICK_FOLDER) pushRecentFolder(chosen);
      saveStateLocal();
      renderTabs();
      setStatus(`Dipindah ke ${chosen}`, 'ok');
      return true;
    } catch {
      toast('Gagal memindah folder (server mati?)');
      return false;
    }
  }

  async function openFolderPicker() {
    const tab = activeTab();
    if (!tab) return;
    const tree = await loadFolderTree();
    showModal((panel, close) => {
      panel.innerHTML = `
        <h2 class="qc-modal-title">Pilih folder</h2>
        <p class="qc-modal-desc">Pilih folder tujuan catatan ini.</p>
        <div id="qc-fp-host"></div>
        <div class="qc-modal-actions">
          <button type="button" class="btn btn-outline btn-sm" id="qc-fp-cancel">Batal</button>
        </div>
      `;
      panel.querySelector('#qc-fp-cancel').addEventListener('click', close);
      mountFolderTreePicker(panel.querySelector('#qc-fp-host'), {
        tree,
        value: tab.folder || QUICK_FOLDER,
        label: 'Folder',
        startOpen: true,
        onSelect: async (chosen) => {
          close();
          await moveTabToFolder(tab, chosen);
        },
      });
    });
  }

  // Simpan langsung tanpa dialog. Nama dan folder diganti lewat klik dua kali judul tab,
  // menu klik kanan tab, atau tombol folder.
  async function saveNow() {
    const tab = activeTab();
    if (!tab || readOnly || tab.loading) return;
    if (activeEditor) tab.content = activeEditor.value;
    if (isEmptyMd(tab.content)) {
      toast('Catatan masih kosong.');
      return;
    }
    const ok = await flushTabSave(tab.id, { autosave: false });
    if (ok && tab.path) toast('Tersimpan: ' + tab.path);
  }

  function defaultBaseOf(tab) {
    return tab.path
      ? baseNameOf(tab.path)
      : `${tab.createdStamp || nowStamp()}-${slugifyFirstLine(firstLineOf(tab.content))}`;
  }

  function startRenameTab(id) {
    if (readOnly) return;
    if (id !== activeId) switchTab(id);
    const tab = tabs.find((t) => t.id === id);
    if (!tab || tab.loading) return;
    if (activeEditor) tab.content = activeEditor.value;
    if (isEmptyMd(tab.content)) {
      toast('Tulis isinya dulu, baru beri nama.');
      return;
    }
    const btn = el.tabs.querySelector(`.qc-tab[data-id="${CSS.escape(id)}"]`);
    if (!btn) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'qc-tab-rename';
    input.value = defaultBaseOf(tab);
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Nama file catatan');
    input.title = 'Enter untuk menyimpan nama, Esc untuk batal';
    btn.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = async (commit) => {
      if (done) return;
      done = true;
      const name = input.value.trim().replace(/\.md$/i, '');
      renderTabs();
      if (commit && name && name !== defaultBaseOf(tab)) await renameTab(tab, name);
      if (activeEditor && activeId === tab.id) activeEditor.focus();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  async function renameTab(tab, name) {
    if (!tab.path) {
      const created = await flushTabSave(tab.id, { autosave: true });
      if (!created || !tab.path) {
        toast('Gagal menyimpan, nama belum diganti');
        return false;
      }
    } else {
      const pending = savingInFlight.get(tab.id);
      if (pending) await pending;
    }
    setStatus('Mengganti nama...');
    try {
      const { res, data } = await apiJson('/api/quick/relocate', {
        method: 'POST',
        body: JSON.stringify({ path: tab.path, name, unique: false }),
      });
      if (!res.ok) {
        toast(data.error || 'Gagal mengganti nama');
        setStatus('Gagal mengganti nama', 'err');
        return false;
      }
      if (data.renamed && data.oldBase && data.newBase) {
        tab.attMap[data.oldBase] = data.newBase;
        tab.content = normalizeAttRefs(tab, tab.content);
      }
      tab.path = data.path;
      tab.version = data.version;
      tab.customNamed = true;
      saveStateLocal();
      renderTabs();
      setStatus(`✓ Tersimpan ${formatTime()}`, 'ok');
      toast('Nama: ' + baseNameOf(tab.path));
      return true;
    } catch {
      toast('Gagal mengganti nama (server mati?)');
      setStatus('Gagal mengganti nama', 'err');
      return false;
    }
  }

  function openDetailModal() {
    const tab = activeTab();
    if (!tab) return;
    showModal((panel, close) => {
      const m = tab.meta || { ringkasan: '', tag: '', lingkungan: '' };
      panel.innerHTML = `
        <h2 class="qc-modal-title">Detail catatan</h2>
        <p class="qc-modal-desc">Opsional. Kosongkan jika akan dirapikan belakangan.</p>
        <form id="qc-detail-form" style="display:flex;flex-direction:column;gap:0.75rem;" novalidate>
          <label class="qc-field">
            <span>Ringkasan</span>
            <input type="text" class="qc-input" id="qc-dt-sum" value="${escAttr(m.ringkasan || '')}" placeholder="Satu dua kalimat ringkas..." autocomplete="off">
          </label>
          <label class="qc-field">
            <span>Tag (pisahkan dengan koma)</span>
            <input type="text" class="qc-input" id="qc-dt-tag" value="${escAttr(m.tag || '')}" placeholder="mis. sre, incident, deploy" autocomplete="off">
          </label>
          <label class="qc-field">
            <span>Lingkungan</span>
            <select class="qc-select" id="qc-dt-env">
              <option value="">(kosong)</option>
              <option value="prod">prod</option>
              <option value="uat">uat</option>
              <option value="local">local</option>
            </select>
          </label>
          <div class="qc-modal-actions">
            <button type="button" class="btn btn-ghost btn-sm" id="qc-dt-cancel">Batal</button>
            <button type="submit" class="btn btn-primary btn-sm">Terapkan</button>
          </div>
        </form>
      `;
      const envEl = panel.querySelector('#qc-dt-env');
      if (m.lingkungan && ![...envEl.options].some((o) => o.value === m.lingkungan)) {
        envEl.add(new Option(m.lingkungan, m.lingkungan));
      }
      envEl.value = m.lingkungan || '';
      panel.querySelector('#qc-dt-cancel').addEventListener('click', close);

      panel.querySelector('#qc-detail-form').addEventListener('submit', (e) => {
        e.preventDefault();
        tab.meta = {
          ringkasan: panel.querySelector('#qc-dt-sum').value.trim(),
          tag: panel.querySelector('#qc-dt-tag').value.trim(),
          lingkungan: envEl.value.trim().toLowerCase(),
        };
        tab.dirty = true;
        saveStateLocal();
        close();
        if (!isEmptyMd(tab.content)) scheduleSave(tab.id);
        toast('Detail diperbarui');
      });

      setTimeout(() => panel.querySelector('#qc-dt-sum').focus(), 10);
    });
  }

  // ---------- Tab Management ----------
  function createAndFocusTab(folder = QUICK_FOLDER) {
    const prev = activeTab();
    if (prev && activeEditor) {
      prev.content = activeEditor.value;
      if (prev.dirty) prev.localDraft = prev.content;
    }
    const t = newEmptyTab(folder);
    tabs.push(t);
    activeId = t.id;
    saveStateLocal();
    mountCurrentTab(true);
    return t;
  }

  function removeTabFromList(id) {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    clearTimeout(saveTimers.get(id));
    saveTimers.delete(id);
    tabs.splice(idx, 1);
    if (!tabs.length) {
      const fresh = newEmptyTab(QUICK_FOLDER);
      tabs.push(fresh);
      activeId = fresh.id;
    } else if (activeId === id) {
      activeId = tabs[Math.max(0, idx - 1)].id;
    }
    saveStateLocal();
    mountCurrentTab(true);
  }

  // Tutup tab: langsung tertutup, isi sudah/tetap tersimpan. Kalau simpan gagal, tab tetap terbuka.
  async function closeTab(id, { silent = false } = {}) {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return false;
    if (tab.id === activeId && activeEditor) tab.content = activeEditor.value;

    if (tab.loading) {
      removeTabFromList(id);
      return true;
    }

    const pending = savingInFlight.get(tab.id);
    if (pending) await pending;

    if (isEmptyMd(tab.content)) {
      if (tab.path && !canAutoRemove(tab)) {
        // Catatan bernama sendiri / di folder lain: simpan isi kosong, file dan riwayat tetap ada.
        const ok = await flushTabSave(tab.id, { autosave: false });
        if (!ok) {
          toast('Gagal menyimpan, tab tetap dibuka');
          return false;
        }
      } else if (tab.path) {
        const ok = await flushTabSave(tab.id, { finalize: true });
        if (!ok) toast('Catatan kosong belum terhapus dari server');
      }
      removeTabFromList(id);
      return true;
    }

    const clean = tab.path && !tab.dirty && tab.localDraft === undefined;
    if (!clean) {
      const ok = await flushTabSave(tab.id, { autosave: false });
      if (!ok) {
        // Simpan gagal (server mati, login habis, atau konflik): tab dibiarkan terbuka
        // supaya tulisan dan draft di browser tidak ikut hilang.
        toast('Gagal menyimpan, tab tetap dibuka');
        return false;
      }
    }
    const snapshot = { ...tab, dirty: false, localDraft: undefined, discarding: false };
    removeTabFromList(id);
    if (!silent) toast('Tab ditutup', { label: 'Buka lagi', onClick: () => reopenTab(snapshot) });
    return true;
  }

  function reopenTab(snapshot) {
    if (!snapshot || tabs.some((t) => t.id === snapshot.id)) return;
    const prev = activeTab();
    if (prev && activeEditor) prev.content = activeEditor.value;
    // Tab kosong pengganti (dibuat saat tab terakhir ditutup) tidak perlu dipertahankan.
    tabs = tabs.filter((t) => t.path || !isEmptyMd(t.content));
    tabs.push(snapshot);
    activeId = snapshot.id;
    saveStateLocal();
    mountCurrentTab(true);
  }

  async function closeOtherTabs(keepId) {
    let closed = 0;
    for (const t of tabs.filter((x) => x.id !== keepId)) {
      const ok = await closeTab(t.id, { silent: true });
      if (!ok) {
        toast(`${closed} tab ditutup, berhenti karena ada yang gagal disimpan`);
        return;
      }
      closed++;
    }
    if (tabs.some((t) => t.id === keepId) && activeId !== keepId) switchTab(keepId);
    toast(closed ? `${closed} tab lain ditutup` : 'Tidak ada tab lain');
  }

  // Buang ke Sampah: hanya lewat menu klik kanan tab, dengan satu konfirmasi.
  function trashTab(id) {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    if (tab.id === activeId && activeEditor) tab.content = activeEditor.value;
    if (!tab.path && isEmptyMd(tab.content)) {
      removeTabFromList(id);
      return;
    }
    showModal((panel, close) => {
      const name = firstLineOf(tab.content) || baseNameOf(tab.path) || 'catatan ini';
      panel.innerHTML = `
        <h2 class="qc-modal-title">Buang ke Sampah?</h2>
        <p class="qc-modal-desc">"${esc(name.slice(0, 60))}" dipindah ke Sampah dan masih bisa dipulihkan dari AI Note.</p>
        <div class="qc-modal-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="qc-tr-cancel">Batal</button>
          <button type="button" class="btn btn-destructive btn-sm" id="qc-tr-ok">Buang ke Sampah</button>
        </div>
      `;
      const okBtn = panel.querySelector('#qc-tr-ok');
      panel.querySelector('#qc-tr-cancel').addEventListener('click', close);
      okBtn.addEventListener('click', async () => {
        okBtn.disabled = true;
        // Tunggu simpan yang sedang berjalan, supaya file yang baru terbentuk ikut dibuang.
        tab.discarding = true;
        clearTimeout(saveTimers.get(tab.id));
        saveTimers.delete(tab.id);
        const pending = savingInFlight.get(tab.id);
        if (pending) {
          try { await pending; } catch {}
        }
        if (tab.path) {
          try {
            const { res, data } = await apiJson('/api/delete', {
              method: 'POST',
              body: JSON.stringify({ path: tab.path }),
            });
            if (!res.ok) {
              toast(data.error || 'Gagal membuang catatan');
              tab.discarding = false;
              okBtn.disabled = false;
              return;
            }
          } catch {
            toast('Server tidak terjangkau');
            tab.discarding = false;
            okBtn.disabled = false;
            return;
          }
        }
        close();
        removeTabFromList(id);
        toast('Catatan dipindah ke Sampah');
      });
      setTimeout(() => okBtn.focus(), 10);
    });
  }

  // Menu klik kanan tab.
  let tabMenuEl = null;
  function closeTabMenu() {
    if (tabMenuEl) {
      tabMenuEl.remove();
      tabMenuEl = null;
    }
  }
  function openTabMenu(id, x, y) {
    closeTabMenu();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    const items = [
      { label: 'Ganti nama', hint: 'klik dua kali', run: () => startRenameTab(id), off: readOnly },
      { label: 'Pindah folder...', hint: 'Ctrl+Shift+S', run: () => { if (id !== activeId) switchTab(id); openFolderPicker(); }, off: readOnly },
      { label: 'Detail...', run: () => { if (id !== activeId) switchTab(id); openDetailModal(); }, off: readOnly },
      { sep: true },
      { label: 'Tutup tab', hint: 'Ctrl+W', run: () => closeTab(id) },
      { label: 'Tutup tab lain', run: () => closeOtherTabs(id), off: tabs.length < 2 },
      { sep: true },
      { label: 'Buang ke Sampah...', danger: true, run: () => trashTab(id), off: readOnly },
    ];
    const menu = document.createElement('div');
    menu.className = 'qc-ctx';
    menu.setAttribute('role', 'menu');
    for (const it of items) {
      if (it.sep) {
        const hr = document.createElement('div');
        hr.className = 'qc-ctx-sep';
        menu.appendChild(hr);
        continue;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'qc-ctx-item' + (it.danger ? ' danger' : '');
      b.setAttribute('role', 'menuitem');
      b.disabled = !!it.off;
      b.innerHTML = `<span>${esc(it.label)}</span>${it.hint ? `<kbd>${esc(it.hint)}</kbd>` : ''}`;
      b.addEventListener('click', () => {
        closeTabMenu();
        it.run();
      });
      menu.appendChild(b);
    }
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(4, Math.min(x, window.innerWidth - r.width - 4)) + 'px';
    menu.style.top = Math.max(4, Math.min(y, window.innerHeight - r.height - 4)) + 'px';
    tabMenuEl = menu;
    const first = menu.querySelector('.qc-ctx-item:not(:disabled)');
    if (first) first.focus();
  }
  document.addEventListener('mousedown', (e) => {
    if (tabMenuEl && !tabMenuEl.contains(e.target)) closeTabMenu();
    if (el.morePop && !el.morePop.hidden && !e.target.closest('.qc-more-wrap')) closeMoreMenu();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (tabMenuEl) { e.preventDefault(); closeTabMenu(); }
      if (el.morePop && !el.morePop.hidden) { e.preventDefault(); closeMoreMenu(); }
    }
  }, true);
  window.addEventListener('blur', closeTabMenu);
  window.addEventListener('resize', closeTabMenu);

  // Menu ⋯ di status bar (instal aplikasi, ganti tema, buka AI Note lengkap).
  function closeMoreMenu() {
    el.morePop.hidden = true;
    el.moreBtn.setAttribute('aria-expanded', 'false');
  }
  el.moreBtn.addEventListener('click', () => {
    const opening = el.morePop.hidden;
    el.morePop.hidden = !opening;
    el.moreBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  });
  el.morePop.addEventListener('click', (e) => {
    if (e.target.closest('.qc-menu-item')) setTimeout(closeMoreMenu, 0);
  });

  // Klik area kosong di bawah teks: taruh kursor di akhir catatan, seperti Notepad.
  el.editorWrap.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const ce = el.visual.querySelector('[contenteditable="true"]');
    if (!ce || ce.contains(e.target)) return;
    // Area kosong bisa berupa wadah editor atau lapisan popup editor (bukan induk contenteditable).
    if (e.target.closest('button, input, select, textarea, a, [role="toolbar"], [role="dialog"], [role="menu"], [role="listbox"]')) return;
    if (e.clientY < ce.getBoundingClientRect().bottom) return;
    e.preventDefault();
    ce.focus();
    const range = document.createRange();
    range.selectNodeContents(ce);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  // ---------- Events ----------
  el.newTab.addEventListener('click', () => createAndFocusTab());
  el.tabsLeft.addEventListener('click', () => el.tabs.scrollBy({ left: -180, behavior: 'smooth' }));
  el.tabsRight.addEventListener('click', () => el.tabs.scrollBy({ left: 180, behavior: 'smooth' }));
  el.tabs.addEventListener('scroll', updateTabOverflow);
  window.addEventListener('resize', updateTabOverflow);
  el.tabs.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.tabs.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  el.tabListBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = el.tabListPop.hidden;
    if (opening) {
      renderTabListPop();
      el.tabListPop.hidden = false;
      el.tabListBtn.setAttribute('aria-expanded', 'true');
    } else {
      closeTabListPop();
    }
  });
  document.addEventListener('click', (e) => {
    if (!el.tabListPop.hidden && !e.target.closest('.qc-tab-list-wrap')) {
      closeTabListPop();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.tabListPop.hidden) {
      e.preventDefault();
      e.stopPropagation();
      closeTabListPop();
    }
  });

  el.folderBtn.addEventListener('click', openFolderPicker);
  el.detailBtn.addEventListener('click', openDetailModal);
  el.saveBtn.addEventListener('click', saveNow);
  el.attachBtn.addEventListener('click', () => el.attachInput.click());
  el.attachInput.addEventListener('change', () => {
    const files = [...(el.attachInput.files || [])];
    el.attachInput.value = '';
    if (files.length) uploadAndInsert(files, currentRange());
  });
  el.themeBtn.addEventListener('click', () => {
    const nextDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nextDark);
    try { localStorage.setItem('theme', nextDark ? 'dark' : 'light'); } catch {}
    syncThemeIcon();
    const cur = activeTab();
    if (cur && activeEditor) cur.content = activeEditor.value;
    mountCurrentTab(true);
  });

  document.addEventListener('keydown', (e) => {
    if (modalOpen) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 't' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        createAndFocusTab();
      } else if (k === 'w' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (activeId) closeTab(activeId);
      } else if (k === 's' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        openFolderPicker();
      } else if (k === 's' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        saveNow();
      }
    }
  }, true);

  // Jendela disembunyikan/diminimalkan: halaman masih hidup, jadi simpan dengan cara biasa
  // (versi tab ikut diperbarui, tidak memicu konflik palsu saat lanjut mengetik).
  function flushOnHide() {
    const tab = activeTab();
    if (tab && activeEditor) {
      tab.content = activeEditor.value;
      if (tab.dirty) tab.localDraft = tab.content;
    }
    saveStateLocal();
    for (const t of tabs) {
      if (t.dirty && !t.discarding) flushTabSave(t.id, { autosave: true });
    }
  }

  // Jendela ditutup: kirim dengan keepalive karena balasannya tidak akan sempat diterima.
  // Tab baru yang belum punya file ikut dibuat (server mengenali id tab, jadi tidak dobel kalau dikirim ulang).
  // Kalau gagal, isi tetap aman di localStorage dan disimpan saat Note Cepat dibuka lagi.
  let exitFlushed = false;
  function flushKeepaliveOnExit() {
    if (exitFlushed) return;
    exitFlushed = true;
    const tab = activeTab();
    if (tab && activeEditor) {
      tab.content = activeEditor.value;
      if (tab.dirty) tab.localDraft = tab.content;
    }
    const send = (url, method, body) => {
      try {
        fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
          body: JSON.stringify(body),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    };
    if (!readOnly) {
      for (const t of tabs) {
        if (t.discarding || t.loading) continue;
        const empty = isEmptyMd(t.content);
        if (t.path && empty && canAutoRemove(t)) {
          send('/api/quick/remove-empty', 'POST', { path: t.path, version: t.version });
        } else if (t.path && t.dirty) {
          send('/api/note?path=' + encodeURIComponent(t.path), 'PUT', {
            content: t.content,
            version: t.version,
            meta: t.meta,
            autosave: true,
          });
        } else if (!t.path && !empty && (t.dirty || t.localDraft !== undefined)) {
          if (!t.createdStamp) t.createdStamp = nowStamp();
          if (t.localDraft === undefined) t.localDraft = t.content;
          send('/api/quick/create', 'POST', {
            folder: t.folder || QUICK_FOLDER,
            baseName: t.createdStamp + '-' + slugifyFirstLine(firstLineOf(t.content)),
            content: t.content,
            meta: t.meta,
            clientId: t.id,
          });
        }
      }
    }
    // Jendela tambahan yang semua tabnya sudah tersimpan tidak perlu meninggalkan daftar tab.
    if (isSecondary && !tabs.some((t) => t.localDraft !== undefined && !isEmptyMd(t.localDraft))) {
      try { localStorage.removeItem(tabsStorageKey); } catch {}
    } else {
      saveStateLocal();
    }
  }

  window.addEventListener('beforeunload', flushKeepaliveOnExit);
  window.addEventListener('pagehide', flushKeepaliveOnExit);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) exitFlushed = false; // halaman kembali dari cache browser
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnHide();
  });

  // ---------- Single-window coordination & Boot ----------
  function setupBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') return Promise.resolve(false);
    const params = new URLSearchParams(location.search);
    const winId = uid();
    if (params.get('newwin') === '1') {
      becomeSecondary(winId);
      return Promise.resolve(false);
    }

    const ch = new BroadcastChannel('ainote-cepat');
    let acked = false;

    return new Promise((resolve) => {
      const onMsg = (ev) => {
        const msg = ev.data || {};
        if (msg.type === 'pong' && msg.target === winId) {
          acked = true;
          try { window.close(); } catch {}
          setTimeout(() => {
            if (!window.closed) {
              // Jendela utama sudah membuka tab baru, tapi jendela ini tidak bisa menutup diri:
              // jalan sebagai jendela tambahan (tidak menjawab ping, daftar tab disimpan terpisah).
              ch.removeEventListener('message', onMsg);
              becomeSecondary(winId);
              resolve(false);
            } else {
              resolve(true);
            }
          }, 160);
        }
      };
      ch.addEventListener('message', onMsg);
      ch.postMessage({ type: 'ping', winId });
      setTimeout(() => {
        if (acked) return;
        ch.removeEventListener('message', onMsg);
        attachChannelListener(ch, winId);
        resolve(false);
      }, 220);
    });
  }

  function becomeSecondary(winId) {
    isSecondary = true;
    tabsStorageKey = EXTRA_TABS_PREFIX + winId;
  }

  // Ambil tab yang belum tersimpan dari jendela tambahan sebelumnya, lalu hapus kuncinya.
  function takeExtraWindowTabs() {
    const out = [];
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(EXTRA_TABS_PREFIX)) keys.push(k);
      }
      for (const k of keys) {
        try {
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(list)) {
            for (const t of list) {
              if (t && typeof t.localDraft === 'string' && !isEmptyMd(t.localDraft)) out.push(t);
            }
          }
        } catch {}
        localStorage.removeItem(k);
      }
    } catch {}
    return out;
  }

  function attachChannelListener(ch, myWinId) {
    ch.addEventListener('message', (ev) => {
      const msg = ev.data || {};
      if (msg.type === 'ping' && msg.winId && msg.winId !== myWinId) {
        ch.postMessage({ type: 'pong', target: msg.winId });
        openFreshTab();
        try { window.focus(); } catch {}
      }
    });
  }

  // Buka (atau pakai) tab kosong yang belum punya file, lalu fokus ke sana.
  function openFreshTab() {
    const empty = tabs.find((t) => !t.path && !t.loading && isEmptyMd(t.content) && t.id !== activeId)
      || (activeTab() && !activeTab().path && isEmptyMd(activeEditor ? activeEditor.value : activeTab().content) ? activeTab() : null);
    if (empty) {
      if (empty.id !== activeId) switchTab(empty.id);
      else if (activeEditor) activeEditor.focus();
      return empty;
    }
    return createAndFocusTab();
  }

  function goLogin() {
    flushKeepaliveOnExit();
    location.href = '/login.html?next=' + encodeURIComponent('/cepat');
  }

  // Cek login di belakang. Sesi habis tidak menghalangi mengetik: tulisan aman di browser.
  async function checkAuth() {
    try {
      const { res, data } = await apiJson('/api/me');
      if (res.status === 401) {
        showBanner('Sesi login habis. Silakan tetap menulis, tulisan aman di browser. Login untuk menyimpan ke server.', [
          { label: 'Login', primary: true, onClick: goLogin },
        ], 'warn');
        return;
      }
      if (res.ok && data.readOnly) {
        readOnly = true;
        showBanner('Akun guest hanya memiliki akses baca (read-only). Catatan tidak dapat disimpan.');
      }
    } catch {
      showBanner('AI Note belum berjalan. Jalankan restart.bat — tulisan diamankan sementara di browser.', [
        { label: 'Coba lagi', primary: true, onClick: () => location.reload() },
      ]);
    }
  }

  // Ambil isi tab lama dari server (berjalan paralel, tidak menahan halaman).
  function loadTabFromServer(t) {
    t.loadPromise = (async () => {
      try {
        const { res, data } = await apiJson('/api/note?path=' + encodeURIComponent(t.path));
        if (res.ok) {
          t.folder = folderOf(t.path);
          if (t.localDraft === undefined) {
            t.content = data.markdown || '';
            t.title = firstLineOf(t.content) || data.title || '';
            t.version = data.version;
            t.meta = {
              ringkasan: data.ringkasan || '',
              tag: Array.isArray(data.tag) ? data.tag.join(', ') : '',
              lingkungan: data.lingkungan || '',
            };
          } else if (!isEmptyMd(t.localDraft) && String(data.markdown || '').trim() === t.localDraft.trim()) {
            // Draft ternyata sudah tersimpan (misalnya lewat keepalive saat jendela ditutup):
            // pakai versi server supaya tidak muncul konflik palsu.
            t.version = data.version;
            t.dirty = false;
            t.localDraft = undefined;
          }
          t.loading = false;
          t.loadError = '';
        } else if (res.status === 404) {
          if (t.localDraft === undefined || isEmptyMd(t.localDraft)) {
            // File sudah tidak ada: tab dibuang dari daftar.
            if (activeId === t.id) removeTabFromList(t.id);
            else {
              tabs = tabs.filter((x) => x.id !== t.id);
              saveStateLocal();
            }
            return;
          }
          // File hilang tapi masih ada draft: simpan ulang sebagai catatan baru.
          t.path = null;
          t.version = null;
          t.customNamed = false;
          t.loading = false;
        } else if (res.status === 401) {
          if (t.loading) t.loadError = 'Login dulu untuk membuka catatan ini.';
        } else if (t.loading) {
          t.loadError = 'Gagal memuat: ' + (data.error || 'HTTP ' + res.status);
        }
      } catch {
        if (t.loading) t.loadError = 'Server tidak terjangkau, catatan belum bisa dimuat.';
      }
      renderTabs();
      if (activeId === t.id && !modalOpen) mountCurrentTab(false);
    })();
    return t.loadPromise;
  }

  async function boot() {
    const handedOff = await setupBroadcastChannel();
    if (handedOff) return;

    // Daftar tab dari localStorage (tanpa menunggu server).
    let savedTabs = [];
    if (!isSecondary) {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_TABS) || '[]');
        if (Array.isArray(raw)) savedTabs = raw;
      } catch {}
      const known = new Set(savedTabs.map((t) => t && t.id));
      for (const t of takeExtraWindowTabs()) if (!known.has(t.id)) savedTabs.push(t);
    }

    const restored = [];
    for (const s of savedTabs) {
      if (!s || typeof s !== 'object') continue;
      const hasDraft = typeof s.localDraft === 'string';
      if (!s.path && (!hasDraft || isEmptyMd(s.localDraft))) continue; // tab kosong lama tidak dipulihkan
      restored.push({
        id: s.id || uid(),
        path: s.path || null,
        folder: s.folder || QUICK_FOLDER,
        customNamed: !!s.customNamed,
        createdStamp: s.createdStamp || null,
        autoSlug: s.autoSlug || null,
        title: s.title || '',
        content: hasDraft ? s.localDraft : '',
        meta: s.meta || { ringkasan: '', tag: '', lingkungan: '' },
        version: s.version || null,
        dirty: hasDraft,
        localDraft: hasDraft ? s.localDraft : undefined,
        attMap: {},
        lastSavedAt: null,
        loading: !!s.path && !hasDraft,
        loadError: '',
      });
    }

    // Membuka Note Cepat selalu langsung ke tab kosong yang siap diketik.
    const fresh = newEmptyTab(QUICK_FOLDER);
    restored.push(fresh);
    tabs = restored;
    activeId = fresh.id;
    saveStateLocal();
    mountCurrentTab(true);

    checkAuth();
    await Promise.all(tabs.filter((t) => t.path).map(loadTabFromServer));
    saveStateLocal();

    // Simpan draft yang tertinggal dari sesi sebelumnya (server mati/login habis/jendela ditutup).
    for (const t of tabs) {
      if (t.localDraft !== undefined && !isEmptyMd(t.localDraft) && !t.loading) {
        flushTabSave(t.id, { autosave: true });
      }
    }
  }

  boot();
})();
