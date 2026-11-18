(() => {
  'use strict';

  const root = document.documentElement;
  const themeBtn = document.getElementById('pub-theme-toggle');
  const SUN = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
  const MOON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

  function syncThemeIcon() {
    if (!themeBtn) return;
    const dark = root.classList.contains('dark');
    themeBtn.innerHTML = dark ? SUN : MOON;
    themeBtn.title = dark ? 'Mode terang' : 'Mode gelap';
  }
  syncThemeIcon();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
      } catch {}
      syncThemeIcon();
    });
  }

  // Tombol salin pada blok kode
  document.querySelectorAll('.prose pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code || code.classList.contains('language-mermaid')) return;
    if (pre.parentElement && pre.parentElement.classList.contains('code-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Salin';
    btn.addEventListener('click', async () => {
      const txt = code.textContent || '';
      let ok = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(txt);
          ok = true;
        } catch {}
      }
      if (!ok) {
        const ta = document.createElement('textarea');
        ta.value = txt;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch {}
        ta.remove();
      }
      btn.textContent = ok ? 'Disalin' : 'Gagal';
      setTimeout(() => { btn.textContent = 'Salin'; }, 1400);
    });
    wrap.appendChild(btn);
  });

  // Diagram Mermaid jika ada
  const mermaidBlocks = [...document.querySelectorAll('.prose pre code.language-mermaid')];
  const token = document.body && document.body.dataset ? document.body.dataset.pubToken : '';
  if (mermaidBlocks.length && token) {
    const s = document.createElement('script');
    s.src = '/p/' + encodeURIComponent(token) + '/mermaid.min.js';
    s.onload = async () => {
      if (!window.mermaid) return;
      mermaidBlocks.forEach((code) => {
        const pre = code.closest('pre');
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = code.textContent || '';
        pre.replaceWith(div);
      });
      try {
        window.mermaid.initialize({ startOnLoad: false, theme: root.classList.contains('dark') ? 'dark' : 'default' });
        await window.mermaid.run({ querySelector: '.mermaid' });
      } catch {}
    };
    document.head.appendChild(s);
  }

  // Lightbox gambar
  document.addEventListener('click', (e) => {
    const img = e.target instanceof Element ? e.target.closest('.prose img') : null;
    if (!img || !img.src) return;
    const box = document.createElement('div');
    box.className = 'lightbox';
    const big = document.createElement('img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || '';
    box.appendChild(big);
    const close = () => box.remove();
    box.addEventListener('click', close);
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') close();
    }, { once: true });
    document.body.appendChild(box);
  });
})();
