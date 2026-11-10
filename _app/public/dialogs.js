// Dialog modern pengganti alert / confirm / prompt bawaan browser.
//   AppDialog.confirm({ title, message, confirmLabel, cancelLabel, destructive, type }) -> Promise<boolean>
//   AppDialog.alert({ title, message, type, confirmLabel })                             -> Promise<void>
//   AppDialog.prompt({ title, message, label, value, placeholder, confirmLabel })       -> Promise<string|null>
//   AppDialog.form({ title, message, fields:[{name,label,value,placeholder,required}] }) -> Promise<object|null>
// Animasi muncul bergaya sheet macOS (membesar dengan sedikit pantulan). Esc = batal, Enter = konfirmasi.
(() => {
  'use strict';

  const SVG = (p) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICONS = {
    warning: SVG('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
    error: SVG('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
    info: SVG('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
    question: SVG('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
    form: SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stack = [];

  function open(o) {
    return new Promise((resolve) => {
      const type = o.type || (o.destructive ? 'warning' : o.fields ? 'form' : o.showCancel === false ? 'info' : 'question');
      const fields = o.fields || [];
      const showCancel = o.showCancel !== false;
      const root = document.createElement('div');
      root.className = 'ad-root';
      const fieldHtml = fields
        .map((f, i) => `<label class="ad-field"><span>${esc(f.label || '')}</span><input name="${esc(f.name)}" type="text" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}" autocomplete="off" spellcheck="false" data-i="${i}"></label>`)
        .join('');
      root.innerHTML =
        `<div class="ad-overlay"></div>` +
        `<form class="ad-panel" role="alertdialog" aria-modal="true" aria-label="${esc(o.title || '')}" novalidate>` +
        `<div class="ad-icon ad-icon-${type}">${ICONS[type] || ICONS.info}</div>` +
        `<h2 class="ad-title">${esc(o.title || '')}</h2>` +
        (o.message ? `<p class="ad-msg">${esc(o.message)}</p>` : '') +
        (fields.length ? `<div class="ad-fields">${fieldHtml}</div>` : '') +
        `<div class="ad-actions">` +
        (showCancel ? `<button type="button" class="ad-btn ad-btn-cancel" data-act="cancel">${esc(o.cancelLabel || 'Batal')}</button>` : '') +
        `<button type="submit" class="ad-btn ${o.destructive ? 'ad-btn-danger' : 'ad-btn-ok'}" data-act="ok">${esc(o.confirmLabel || 'OK')}</button>` +
        `</div></form>`;

      const prevFocus = document.activeElement;
      document.body.appendChild(root);
      const panel = root.querySelector('.ad-panel');
      const inputs = [...root.querySelectorAll('input')];
      const okBtn = root.querySelector('[data-act="ok"]');
      const cancelBtn = root.querySelector('[data-act="cancel"]');

      let closed = false;
      const entry = {};
      const close = (value) => {
        if (closed) return;
        closed = true;
        const i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
        root.classList.add('ad-closing');
        const done = () => root.remove();
        panel.addEventListener('animationend', done, { once: true });
        setTimeout(done, 260);
        try { if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true }); } catch {}
        resolve(value);
      };
      const cancelValue = fields.length ? null : false;
      entry.cancel = () => close(showCancel ? cancelValue : undefined);
      stack.push(entry);

      const retrigger = (cls) => {
        root.classList.remove('ad-bump', 'ad-shake');
        void root.offsetWidth;
        root.classList.add(cls);
        setTimeout(() => root.classList.remove(cls), 400);
      };
      root.querySelector('.ad-overlay').addEventListener('mousedown', () => retrigger('ad-bump'));
      if (cancelBtn) cancelBtn.addEventListener('click', () => entry.cancel());
      panel.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!fields.length) return close(showCancel ? true : undefined);
        const out = {};
        for (const [i, f] of fields.entries()) {
          const v = inputs[i].value;
          if (f.required && !v.trim()) {
            retrigger('ad-shake');
            inputs[i].focus();
            return;
          }
          out[f.name] = v;
        }
        close(out);
      });
      // Tab berputar di dalam dialog
      panel.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const f = [...panel.querySelectorAll('input, button')];
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });

      // Fokus awal: kolom pertama; kalau tindakan merusak, fokus ke tombol aman (Batal).
      if (inputs.length) { inputs[0].focus(); inputs[0].select(); }
      else if (o.destructive && cancelBtn) cancelBtn.focus();
      else okBtn.focus();
    });
  }

  document.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      top.cancel();
    }
  }, true);

  const norm = (o) => (typeof o === 'string' ? { title: o } : o || {});

  window.AppDialog = {
    confirm: (o) => open({ ...norm(o), showCancel: true }),
    alert: (o) => open({ type: 'info', confirmLabel: 'OK', ...norm(o), showCancel: false }),
    form: (o) => open({ ...norm(o), fields: norm(o).fields || [] }),
    prompt: (o) => {
      const p = norm(o);
      return open({
        title: p.title, message: p.message, confirmLabel: p.confirmLabel, cancelLabel: p.cancelLabel,
        fields: [{ name: 'value', label: p.label || '', value: p.value, placeholder: p.placeholder, required: p.required !== false }],
      }).then((r) => (r ? r.value : null));
    },
  };
})();
