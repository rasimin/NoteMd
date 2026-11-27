// Pendaftaran Service Worker (PWA) dan tombol pasang aplikasi.
// Dipisah dari index.html karena CSP server (default-src 'self') memblokir script inline.
(() => {
  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker aktif, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker gagal didaftarkan:', err);
        });
    });
  }

  // PWA Install Prompt Button
  let deferredPwaPrompt;
  const elPwaBtn = document.getElementById('pwa-install-btn');
  if (elPwaBtn) {
    elPwaBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>';
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    if (elPwaBtn) {
      elPwaBtn.hidden = false;
      elPwaBtn.addEventListener('click', async () => {
        if (!deferredPwaPrompt) return;
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          elPwaBtn.hidden = true;
        }
        deferredPwaPrompt = null;
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    if (elPwaBtn) elPwaBtn.hidden = true;
    console.log('[PWA] AI Note berhasil diinstal sebagai aplikasi!');
  });
})();
