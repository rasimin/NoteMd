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
  el.homeLink.innerHTML = SVG('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', 14);
  function syncThemeIcon() {
    const dark = document.documentElement.classList.contains('dark');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#1a1a1a' : '#ffffff');
    el.themeBtn.innerHTML = dark
      ? SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>', 15)
      : SVG('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', 15);
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

  function toast(msg) {
    clearTimeout(toastTimer);
    el.toast.textContent = msg;
    el.toast.hidden = false;
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2400);
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
      localStorage.setItem(STORAGE_TABS, JSON.stringify(serialized));
      if (activeId) localStorage.setItem(STORAGE_ACTIVE, activeId);
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

      btn.addEventListener('click', () => switchTab(t.id));
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
        if (!modalOpen) openSaveDialog();
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
        { label: 'Login ulang', primary: true, onClick: () => { location.href = '/login.html?next=' + encodeURIComponent('/cepat'); } },
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
    if (!tab) return true;
    if (tab.id === activeId && activeEditor) {
      tab.content = activeEditor.value;
    }

    const work = (async () => {
      const content = tab.content || '';
      const empty = isEmptyMd(content);

      if (empty && !opts.allowEmpty) {
        if (tab.path) {
          try {
            const { res, data } = await apiJson('/api/quick/remove-empty', {
              method: 'POST',
              body: JSON.stringify({ path: tab.path }),
            });
            if (!res.ok) {
              handleSaveFailure(tab, res, data);
              return false;
            }
            tab.path = null;
            tab.version = null;
            tab.createdStamp = null;
            tab.autoSlug = null;
            tab.customNamed = false;
            tab.attMap = {};
          } catch (err) {
            handleSaveFailure(tab, null, null, err);
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

  function mountFolderTreePicker(container, { tree, value, label = 'Folder', startOpen = false, onSelect }) {
    const initial = value || QUICK_FOLDER;
    container.innerHTML = `<div class="field fp" data-fp><span>${esc(label)}</span><input type="hidden" value="${escAttr(initial)}"><button type="button" class="fp-btn" aria-haspopup="tree" aria-expanded="false"><span class="fp-ico">${iconSvg('folder')}</span><span class="fp-label"></span><span class="fp-caret">${iconSvg('chevron')}</span></button><div class="scope-pop fp-pop" role="tree" hidden></div></div>`;
    const fp = container.querySelector('[data-fp]');
    const input = fp.querySelector('input');
    const btn = fp.querySelector('.fp-btn');
    const pop = fp.querySelector('.fp-pop');
    const open = new Set();

    const openTo = (p) => {
      const segs = p ? p.split('/') : [];
      for (let i = 1; i < segs.length; i++) open.add(segs.slice(0, i).join('/'));
    };
    const setLabel = () => {
      fp.querySelector('.fp-label').textContent = input.value || QUICK_FOLDER;
    };
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
      const out = [];
      rows(tree, 0, out);
      pop.innerHTML = out.join('');
    };
    const setOpen = (v) => {
      if (v) {
        pop.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        openTo(input.value);
        render();
        const sel = pop.querySelector('.selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
      } else {
        pop.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    };

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
      render();
      if (!startOpen) setOpen(false);
      if (onSelect) onSelect(input.value);
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

  async function openSaveDialog() {
    const tab = activeTab();
    if (!tab || readOnly) return;
    if (activeEditor) tab.content = activeEditor.value;
    if (isEmptyMd(tab.content)) {
      toast('Catatan masih kosong.');
      return;
    }

    const tree = await loadFolderTree();
    const defaultBase = tab.path
      ? baseNameOf(tab.path)
      : `${tab.createdStamp || nowStamp()}-${slugifyFirstLine(firstLineOf(tab.content))}`;

    showModal((panel, close) => {
      panel.innerHTML = `
        <h2 class="qc-modal-title">Simpan catatan</h2>
        <p class="qc-modal-desc">Pilih folder tujuan dan nama file catatan.</p>
        <form id="qc-save-form" class="qc-save-form" novalidate style="display:flex;flex-direction:column;gap:0.75rem;">
          <div id="qc-sv-fp-host"></div>
          <label class="field">
            <span>Nama catatan</span>
            <input type="text" id="qc-sv-name" value="${escAttr(defaultBase)}" autocomplete="off" spellcheck="false" required>
          </label>
          <p class="qc-modal-error" id="qc-sv-err" hidden></p>
          <div class="qc-modal-actions">
            <button type="button" class="btn btn-outline btn-sm" id="qc-sv-cancel">Batal</button>
            <button type="submit" class="btn btn-primary btn-sm" id="qc-sv-ok">Simpan</button>
          </div>
        </form>
      `;

      const form = panel.querySelector('#qc-save-form');
      const nameIn = panel.querySelector('#qc-sv-name');
      const errEl = panel.querySelector('#qc-sv-err');
      const okBtn = panel.querySelector('#qc-sv-ok');
      panel.querySelector('#qc-sv-cancel').addEventListener('click', close);

      const picker = mountFolderTreePicker(panel.querySelector('#qc-sv-fp-host'), {
        tree,
        value: tab.folder || QUICK_FOLDER,
        label: 'Folder',
        startOpen: false,
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.hidden = true;
        const chosenName = nameIn.value.trim().replace(/\.md$/i, '');
        if (!chosenName) {
          errEl.textContent = 'Nama catatan tidak boleh kosong.';
          errEl.hidden = false;
          nameIn.focus();
          return;
        }
        const chosenFolder = picker.value || QUICK_FOLDER;

        okBtn.disabled = true;
        okBtn.textContent = 'Menyimpan...';

        if (!tab.path) {
          if (!tab.createdStamp) tab.createdStamp = nowStamp();
          try {
            const { res, data } = await apiJson('/api/quick/create', {
              method: 'POST',
              body: JSON.stringify({
                folder: chosenFolder,
                baseName: chosenName,
                content: tab.content,
                meta: tab.meta,
              }),
            });
            if (!res.ok) {
              errEl.textContent = data.error || 'Gagal membuat catatan';
              errEl.hidden = false;
              okBtn.disabled = false;
              okBtn.textContent = 'Simpan';
              return;
            }
            tab.path = data.path;
            tab.folder = chosenFolder;
            tab.version = data.version;
            tab.customNamed = true;
            tab.dirty = false;
            tab.localDraft = undefined;
            tab.lastSavedAt = Date.now();
            if (chosenFolder !== QUICK_FOLDER) pushRecentFolder(chosenFolder);
            saveStateLocal();
            renderTabs();
            setStatus(`✓ Tersimpan ${formatTime(tab.lastSavedAt)}`, 'ok');
            close();
            toast('Tersimpan: ' + tab.path);
            return;
          } catch (err) {
            errEl.textContent = err.message || 'Gagal menghubungi server';
            errEl.hidden = false;
            okBtn.disabled = false;
            okBtn.textContent = 'Simpan';
            return;
          }
        }

        // Flush latest content + record explicit history first
        const savedOk = await flushTabSave(tab.id, { autosave: false });
        if (!savedOk) {
          okBtn.disabled = false;
          okBtn.textContent = 'Simpan';
          close();
          return;
        }

        const currentBase = baseNameOf(tab.path);
        const currentFolder = folderOf(tab.path);
        if (chosenName !== currentBase || chosenFolder !== currentFolder) {
          try {
            const { res, data } = await apiJson('/api/quick/relocate', {
              method: 'POST',
              body: JSON.stringify({
                path: tab.path,
                folder: chosenFolder,
                name: chosenName,
                unique: false,
              }),
            });
            if (!res.ok) {
              errEl.textContent = data.error || 'Gagal mengganti nama/folder';
              errEl.hidden = false;
              okBtn.disabled = false;
              okBtn.textContent = 'Simpan';
              return;
            }
            if (data.renamed && data.oldBase && data.newBase) {
              tab.attMap[data.oldBase] = data.newBase;
              tab.content = normalizeAttRefs(tab, tab.content);
            }
            tab.path = data.path;
            tab.folder = chosenFolder;
            tab.version = data.version;
          } catch (err) {
            errEl.textContent = err.message || 'Gagal menghubungi server';
            errEl.hidden = false;
            okBtn.disabled = false;
            okBtn.textContent = 'Simpan';
            return;
          }
        }

        tab.customNamed = true;
        tab.lastSavedAt = Date.now();
        if (chosenFolder !== QUICK_FOLDER) pushRecentFolder(chosenFolder);
        saveStateLocal();
        renderTabs();
        setStatus(`✓ Tersimpan ${formatTime(tab.lastSavedAt)}`, 'ok');
        close();
        toast('Tersimpan: ' + tab.path);
      });

      setTimeout(() => { nameIn.focus(); nameIn.select(); }, 10);
    });
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

  async function closeTab(id) {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    if (tab.id === activeId && activeEditor) tab.content = activeEditor.value;

    if (isEmptyMd(tab.content)) {
      if (tab.path) {
        try {
          await apiJson('/api/quick/remove-empty', { method: 'POST', body: JSON.stringify({ path: tab.path }) });
        } catch {}
      }
      removeTabFromList(id);
      return;
    }

    showModal((panel, close) => {
      const name = firstLineOf(tab.content) || baseNameOf(tab.path) || 'catatan ini';
      panel.innerHTML = `
        <h2 class="qc-modal-title">Tutup tab ini?</h2>
        <p class="qc-modal-desc">"${esc(name.slice(0, 60))}" tetap tersimpan di folder <strong>${esc(tab.folder || QUICK_FOLDER)}</strong>, atau buang ke Sampah.</p>
        <div class="qc-modal-actions">
          <button type="button" class="btn btn-destructive btn-sm" id="qc-cl-trash">Buang ke Sampah</button>
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost btn-sm" id="qc-cl-cancel">Batal</button>
          <button type="button" class="btn btn-primary btn-sm" id="qc-cl-keep">Tutup (tersimpan)</button>
        </div>
      `;
      const keepBtn = panel.querySelector('#qc-cl-keep');
      const trashBtn = panel.querySelector('#qc-cl-trash');
      panel.querySelector('#qc-cl-cancel').addEventListener('click', close);

      keepBtn.addEventListener('click', async () => {
        keepBtn.disabled = true;
        await flushTabSave(tab.id, { autosave: false });
        close();
        removeTabFromList(id);
      });

      trashBtn.addEventListener('click', async () => {
        trashBtn.disabled = true;
        if (tab.path) {
          try {
            const { res, data } = await apiJson('/api/delete', {
              method: 'POST',
              body: JSON.stringify({ path: tab.path }),
            });
            if (!res.ok) {
              toast(data.error || 'Gagal membuang catatan');
              trashBtn.disabled = false;
              return;
            }
          } catch {
            toast('Server tidak terjangkau');
            trashBtn.disabled = false;
            return;
          }
        }
        close();
        removeTabFromList(id);
        toast('Catatan dipindah ke Sampah');
      });

      setTimeout(() => keepBtn.focus(), 10);
    });
  }

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
  el.saveBtn.addEventListener('click', openSaveDialog);
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
        openSaveDialog();
      }
    }
  }, true);

  function flushKeepaliveOnExit() {
    const tab = activeTab();
    if (tab && activeEditor) {
      tab.content = activeEditor.value;
      if (tab.dirty) tab.localDraft = tab.content;
    }
    saveStateLocal();
    for (const t of tabs) {
      if (readOnly || !t.dirty || !t.path || isEmptyMd(t.content)) continue;
      try {
        fetch('/api/note?path=' + encodeURIComponent(t.path), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ai-note' },
          body: JSON.stringify({
            content: t.content,
            version: t.version,
            meta: t.meta,
            autosave: true,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    }
  }

  window.addEventListener('beforeunload', flushKeepaliveOnExit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushKeepaliveOnExit();
  });

  // ---------- Single-window coordination & Boot ----------
  function setupBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') return Promise.resolve(false);
    const params = new URLSearchParams(location.search);
    if (params.get('newwin') === '1') return Promise.resolve(false);

    const ch = new BroadcastChannel('ainote-cepat');
    const winId = uid();
    let acked = false;

    return new Promise((resolve) => {
      const onMsg = (ev) => {
        const msg = ev.data || {};
        if (msg.type === 'pong' && msg.target === winId) {
          acked = true;
          try { window.close(); } catch {}
          setTimeout(() => {
            if (!window.closed) {
              ch.removeEventListener('message', onMsg);
              attachChannelListener(ch, winId);
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

  function attachChannelListener(ch, myWinId) {
    ch.addEventListener('message', (ev) => {
      const msg = ev.data || {};
      if (msg.type === 'ping' && msg.winId && msg.winId !== myWinId) {
        ch.postMessage({ type: 'pong', target: msg.winId });
        createAndFocusTab();
        try { window.focus(); } catch {}
      }
    });
  }

  async function boot() {
    const handedOff = await setupBroadcastChannel();
    if (handedOff) return;

    // Check auth / readOnly status
    try {
      const { res, data } = await apiJson('/api/me');
      if (res.status === 401) {
        location.replace('/login.html?next=' + encodeURIComponent('/cepat'));
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

    // Restore tabs from localStorage
    let savedTabs = [];
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_TABS) || '[]');
      if (Array.isArray(raw)) savedTabs = raw;
    } catch {}

    const restored = [];
    for (const s of savedTabs) {
      if (!s || typeof s !== 'object') continue;
      const t = {
        id: s.id || uid(),
        path: s.path || null,
        folder: s.folder || QUICK_FOLDER,
        customNamed: !!s.customNamed,
        createdStamp: s.createdStamp || null,
        autoSlug: s.autoSlug || null,
        title: s.title || '',
        content: typeof s.localDraft === 'string' ? s.localDraft : '',
        meta: s.meta || { ringkasan: '', tag: '', lingkungan: '' },
        version: s.version || null,
        dirty: typeof s.localDraft === 'string',
        localDraft: typeof s.localDraft === 'string' ? s.localDraft : undefined,
        attMap: {},
        lastSavedAt: null,
      };
      if (t.path) {
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
            }
          } else if (res.status === 404 && t.localDraft === undefined) {
            continue; // note was deleted externally
          }
        } catch {}
      }
      restored.push(t);
    }

    if (!restored.length) {
      restored.push(newEmptyTab(QUICK_FOLDER));
    }
    tabs = restored;
    const savedActive = (() => { try { return localStorage.getItem(STORAGE_ACTIVE); } catch { return null; } })();
    activeId = tabs.some((t) => t.id === savedActive) ? savedActive : tabs[0].id;
    saveStateLocal();
    mountCurrentTab(true);

    // Flush any recovered localDrafts from previous crashed/offline session
    for (const t of tabs) {
      if (t.localDraft !== undefined && !isEmptyMd(t.localDraft)) {
        flushTabSave(t.id, { autosave: true });
      }
    }
  }

  boot();
})();
