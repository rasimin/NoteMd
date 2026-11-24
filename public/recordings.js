(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);

  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const R_ICONS = {
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    merge: '<path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  };

  const rIcon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${R_ICONS[name] || ''}</svg>`;

  const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const isReadOnly = () => typeof window.isReadOnlyUser === 'function' && window.isReadOnlyUser();
  const notify = (msg) => {
    if (typeof window.aiNoteToast === 'function') window.aiNoteToast(msg);
  };
  const copyText = async (txt) => {
    if (typeof window.aiNoteCopy === 'function') return window.aiNoteCopy(txt);
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(txt);
        return true;
      } catch {}
    }
    return false;
  };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function defaultTitle() {
    const d = new Date();
    return `Meeting ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '-' : dateFmt.format(d);
  }

  function fmtDuration(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return h > 0 ? `${h}:${pad2(m)}:${pad2(r)}` : `${pad2(m)}:${pad2(r)}`;
  }

  function parseTimeInput(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }
    if (/^\d{1,3}(:\d{1,2}){1,2}$/.test(s)) {
      const parts = s.split(':').map((p) => Number(p));
      if (parts.some((p) => !Number.isInteger(p) || p < 0)) return null;
      if (parts.length === 2) {
        const [mm, ss] = parts;
        if (ss >= 60) return null;
        return mm * 60 + ss;
      }
      const [hh, mm, ss] = parts;
      if (mm >= 60 || ss >= 60) return null;
      return hh * 3600 + mm * 60 + ss;
    }
    return null;
  }

  function localDateKey(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  const folderDateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  function formatDateFolder(dateKey) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
    if (!m) return { label: dateKey || 'Lainnya', tag: '' };
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const today = localDateKey(new Date());
    const yest = localDateKey(new Date(Date.now() - 86400000));
    const tag = dateKey === today ? 'Hari ini' : dateKey === yest ? 'Kemarin' : '';
    return {
      label: isNaN(d.getTime()) ? dateKey : folderDateFmt.format(d),
      tag,
    };
  }

  function parseFocusSpec(focusSpec) {
    const raw = String(focusSpec || '');
    const qIdx = raw.indexOf('?');
    const pathPart = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    const queryPart = qIdx >= 0 ? raw.slice(qIdx + 1) : '';
    if (pathPart.startsWith('date/')) {
      return { dateParam: pathPart.slice(5), focusId: '', startSec: null };
    }
    if (pathPart) {
      let startSec = null;
      if (queryPart) {
        const t = new URLSearchParams(queryPart).get('t');
        if (t !== null) startSec = parseTimeInput(t);
      }
      return { dateParam: '', focusId: pathPart, startSec };
    }
    return { dateParam: '', focusId: '', startSec: null };
  }

  function fmtBytes(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'ai-note',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  // ---------- Active Recording Engine ----------
  let recState = null;
  let miniBarEl = null;

  function ensureMiniBar() {
    if (miniBarEl) return miniBarEl;
    miniBarEl = document.createElement('div');
    miniBarEl.className = 'rec-minibar';
    miniBarEl.hidden = true;
    miniBarEl.innerHTML = `
      <span class="rec-minibar-dot"></span>
      <div class="rec-minibar-info">
        <div class="rec-minibar-title" id="rec-mb-title"></div>
        <div class="rec-minibar-meta">
          <span id="rec-mb-timer">00:00</span>
          <span class="badge badge-outline" id="rec-mb-mode">Offline</span>
        </div>
      </div>
      <div class="rec-meter" id="rec-mb-meter" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="rec-minibar-actions">
        <button type="button" class="btn btn-outline btn-sm" id="rec-mb-pause" title="Jeda / Lanjutkan">${rIcon('pause')}</button>
        <button type="button" class="btn btn-destructive btn-sm" id="rec-mb-stop" title="Hentikan & Simpan">${rIcon('stop')} <span>Stop</span></button>
      </div>
    `;
    document.body.appendChild(miniBarEl);

    $('#rec-mb-pause', miniBarEl).addEventListener('click', togglePauseRecording);
    $('#rec-mb-stop', miniBarEl).addEventListener('click', () => stopRecording(false));
    return miniBarEl;
  }

  function updateRecordTopbarBtn() {
    const btn = $('#record-btn');
    if (!btn) return;
    const active = !!recState;
    btn.classList.toggle('is-recording', active);
    btn.title = active ? 'Rekaman sedang berjalan' : 'Rekam meeting';
  }

  function pickAudioMime() {
    if (typeof window.MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (const c of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(c)) return c;
      } catch {}
    }
    return '';
  }

  function elapsedMs() {
    if (!recState) return 0;
    const extra = !recState.paused && recState.segmentStart ? Date.now() - recState.segmentStart : 0;
    return recState.elapsedMs + extra;
  }

  function renderMiniBarTick() {
    if (!recState || !miniBarEl) return;
    const timerEl = $('#rec-mb-timer', miniBarEl);
    if (timerEl) timerEl.textContent = fmtDuration(elapsedMs() / 1000);
  }

  function setupAudioMeter(streams) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      for (const s of streams) {
        if (!s || !s.getAudioTracks().length) continue;
        const src = ctx.createMediaStreamSource(s);
        src.connect(analyser);
      }
      const data = new Uint8Array(analyser.frequencyBinCount);
      const bars = Array.from(ensureMiniBar().querySelectorAll('#rec-mb-meter span'));
      let rafId = 0;

      const tick = () => {
        if (!recState || !recState.meter) return;
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < bars.length; i++) {
          const val = recState.paused ? 0 : data[i + 1] || 0;
          const pct = Math.max(18, Math.min(100, Math.round((val / 255) * 100)));
          bars[i].style.height = `${pct}%`;
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);

      return {
        close() {
          cancelAnimationFrame(rafId);
          ctx.close().catch(() => {});
        },
      };
    } catch {
      return null;
    }
  }

  function onBeforeUnloadRecording(e) {
    if (!recState) return;
    e.preventDefault();
    e.returnValue = '';
  }

  function startTrackRecorder(stream, trackName, mimeType, state) {
    const opts = mimeType ? { mimeType, audioBitsPerSecond: 48000 } : { audioBitsPerSecond: 48000 };
    const recorder = new MediaRecorder(stream, opts);
    state.queues[trackName] = Promise.resolve();

    recorder.addEventListener('dataavailable', (e) => {
      if (!e.data || e.data.size === 0) return;
      const blob = e.data;
      state.queues[trackName] = state.queues[trackName].then(async () => {
        const url = `/api/recordings/chunk?id=${encodeURIComponent(state.id)}&track=${encodeURIComponent(trackName)}`;
        const doSend = async () => {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Requested-With': 'ai-note',
            },
            body: blob,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        };
        try {
          await doSend();
        } catch {
          try {
            await new Promise((r) => setTimeout(r, 800));
            await doSend();
          } catch {
            if (!state.warnedUpload) {
              state.warnedUpload = true;
              notify('Gagal mengirim potongan audio ke server.');
            }
          }
        }
      });
    });

    recorder.start(10000);
    return recorder;
  }

  function togglePauseRecording() {
    if (!recState || recState.stopping) return;
    const btn = $('#rec-mb-pause', miniBarEl);
    if (!recState.paused) {
      recState.elapsedMs += Date.now() - recState.segmentStart;
      recState.segmentStart = 0;
      recState.paused = true;
      for (const r of recState.recorders) {
        try {
          if (r.state === 'recording') r.pause();
        } catch {}
      }
      miniBarEl.classList.add('is-paused');
      if (btn) btn.innerHTML = rIcon('play');
    } else {
      recState.segmentStart = Date.now();
      recState.paused = false;
      for (const r of recState.recorders) {
        try {
          if (r.state === 'paused') r.resume();
        } catch {}
      }
      miniBarEl.classList.remove('is-paused');
      if (btn) btn.innerHTML = rIcon('pause');
    }
    renderMiniBarTick();
  }

  function stopSingleRecorder(rec) {
    return new Promise((resolve) => {
      if (!rec || rec.state === 'inactive') return resolve();
      rec.addEventListener('stop', () => resolve(), { once: true });
      try {
        rec.stop();
      } catch {
        resolve();
      }
    });
  }

  async function stopRecording(fromTrackEnded = false) {
    if (!recState || recState.stopping) return;
    recState.stopping = true;
    const st = recState;

    if (!st.paused && st.segmentStart) {
      st.elapsedMs += Date.now() - st.segmentStart;
      st.segmentStart = 0;
    }
    clearInterval(st.timerId);

    const stopBtn = $('#rec-mb-stop', miniBarEl);
    const pauseBtn = $('#rec-mb-pause', miniBarEl);
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.innerHTML = '<span>Menyimpan…</span>';
    }
    if (pauseBtn) pauseBtn.disabled = true;

    await Promise.all(st.recorders.map(stopSingleRecorder));
    await Promise.all(Object.values(st.queues));

    if (st.meter) st.meter.close();
    for (const s of st.streams) {
      for (const t of s.getTracks()) {
        try {
          t.stop();
        } catch {}
      }
    }

    const durationSec = Math.round(st.elapsedMs / 1000);
    let savedOk = false;
    try {
      await postJson('/api/recordings/finish', {
        id: st.id,
        durationSec,
      });
      savedOk = true;
    } catch (err) {
      notify('Rekaman berhenti, tetapi gagal menutup sesi: ' + err.message);
    }

    window.removeEventListener('beforeunload', onBeforeUnloadRecording);
    recState = null;
    updateRecordTopbarBtn();

    if (miniBarEl) {
      miniBarEl.hidden = true;
      miniBarEl.classList.remove('is-paused');
      if (stopBtn) {
        stopBtn.disabled = false;
        stopBtn.innerHTML = `${rIcon('stop')} <span>Stop</span>`;
      }
      if (pauseBtn) {
        pauseBtn.disabled = false;
        pauseBtn.innerHTML = rIcon('pause');
      }
    }

    if (savedOk) {
      notify(fromTrackEnded ? 'Berbagi audio berhenti — rekaman disimpan.' : 'Rekaman tersimpan.');
      if (location.hash.startsWith('#/_recordings')) {
        window.renderRecordingsPage(st.id);
      }
    }
  }

  // ---------- Start Recording Modal ----------
  function openStartModal() {
    if (isReadOnly()) return;
    if (recState) {
      const bar = ensureMiniBar();
      bar.hidden = false;
      bar.classList.remove('is-bump');
      void bar.offsetWidth;
      bar.classList.add('is-bump');
      notify('Rekaman sedang berjalan.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      window.AppDialog?.alert({
        title: 'Browser tidak mendukung perekaman',
        message: 'Pastikan AI Note dibuka lewat http://localhost (atau HTTPS) di browser modern agar akses mikrofon & perekam audio diizinkan.',
        type: 'warning',
      });
      return;
    }

    const activeNote = typeof window.getCurrentNotePath === 'function' ? window.getCurrentNotePath() : '';
    let selectedMode = 'offline';
    let busy = false;

    const backdrop = document.createElement('div');
    backdrop.className = 'rec-modal-backdrop';
    backdrop.innerHTML = `
      <form class="rec-modal" role="dialog" aria-modal="true" aria-labelledby="rec-start-title">
        <div class="rec-modal-head">
          <h2 id="rec-start-title">Rekam Meeting Baru</h2>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" id="rec-modal-x" aria-label="Tutup">${rIcon('close')}</button>
        </div>
        <div class="rec-field">
          <label for="rec-title-inp">Judul rekaman</label>
          <input id="rec-title-inp" type="text" value="${esc(defaultTitle())}" maxlength="140" autocomplete="off">
        </div>
        <div class="rec-field">
          <label>Mode rekaman</label>
          <div class="rec-mode-grid">
            <button type="button" class="rec-mode-opt active" data-mode="offline">
              <strong>Offline (Mic saja)</strong>
              <small>Untuk meeting tatap muka atau catatan suara langsung. Menghasilkan 1 file mic.webm.</small>
            </button>
            <button type="button" class="rec-mode-opt" data-mode="online">
              <strong>Online (Mic + Layar/Tab)</strong>
              <small>Untuk Zoom / Google Meet / Teams. Menyimpan suara Anda & lawan bicara secara terpisah.</small>
            </button>
          </div>
        </div>
        <div class="rec-tip" id="rec-online-tip" hidden>
          Saat popup browser muncul, pilih tab atau layar meeting lalu pastikan centang <strong>"Share audio" / "Bagikan audio"</strong> agar suara lawan bicara ikut terekam.
        </div>
        ${
          activeNote
            ? `<label class="rec-check"><input type="checkbox" id="rec-link-curr" checked><span>Tautkan ke catatan yang sedang dibuka: <code>${esc(activeNote)}</code></span></label>`
            : ''
        }
        <div class="rec-modal-foot">
          <button type="button" class="btn btn-outline" id="rec-modal-cancel">Batal</button>
          <button type="submit" class="btn btn-primary" id="rec-modal-go">${rIcon('mic')} <span>Mulai Rekam</span></button>
        </div>
      </form>
    `;
    document.body.appendChild(backdrop);

    const form = $('form', backdrop);
    const titleInp = $('#rec-title-inp', backdrop);
    const tipEl = $('#rec-online-tip', backdrop);
    const goBtn = $('#rec-modal-go', backdrop);
    const close = () => {
      if (busy) return;
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    $('#rec-modal-x', backdrop).addEventListener('click', close);
    $('#rec-modal-cancel', backdrop).addEventListener('click', close);

    backdrop.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedMode = btn.dataset.mode === 'online' ? 'online' : 'offline';
        backdrop.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
        if (tipEl) tipEl.hidden = selectedMode !== 'online';
      });
    });

    titleInp.focus();
    titleInp.select();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      if (selectedMode === 'online' && !navigator.mediaDevices.getDisplayMedia) {
        window.AppDialog?.alert({
          title: 'Mode Online tidak didukung',
          message: 'Browser ini tidak mendukung tangkapan audio layar/tab (getDisplayMedia). Gunakan Chrome atau Edge versi terbaru.',
          type: 'warning',
        });
        return;
      }

      busy = true;
      goBtn.disabled = true;
      goBtn.innerHTML = '<span>Meminta izin audio…</span>';

      const acquiredStreams = [];
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        acquiredStreams.push(micStream);

        let displayStream = null;
        let systemAudioStream = null;
        if (selectedMode === 'online') {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
          acquiredStreams.push(displayStream);
          const audioTracks = displayStream.getAudioTracks();
          if (!audioTracks.length) {
            throw new Error('NO_SYSTEM_AUDIO');
          }
          systemAudioStream = new MediaStream(audioTracks);
        }

        const title = titleInp.value.trim() || defaultTitle();
        const linkCurrEl = $('#rec-link-curr', backdrop);
        const linkedNote = linkCurrEl && linkCurrEl.checked ? activeNote : '';
        const mime = pickAudioMime();

        const created = await postJson('/api/recordings/start', {
          title,
          mode: selectedMode,
          linkedNote,
          micMime: mime || 'audio/webm',
          systemMime: mime || 'audio/webm',
        });

        const sessionId = created.item.id;
        recState = {
          id: sessionId,
          title: created.item.title,
          mode: selectedMode,
          paused: false,
          stopping: false,
          elapsedMs: 0,
          segmentStart: Date.now(),
          streams: acquiredStreams,
          recorders: [],
          queues: {},
          meter: null,
          timerId: null,
          warnedUpload: false,
        };

        const micRec = startTrackRecorder(micStream, 'mic', mime, recState);
        recState.recorders.push(micRec);

        if (selectedMode === 'online' && systemAudioStream) {
          const sysRec = startTrackRecorder(systemAudioStream, 'system', mime, recState);
          recState.recorders.push(sysRec);
          const sysTrack = systemAudioStream.getAudioTracks()[0];
          if (sysTrack) {
            sysTrack.addEventListener('ended', () => {
              if (recState && recState.id === sessionId && !recState.stopping) {
                stopRecording(true);
              }
            });
          }
        }

        const micTrack = micStream.getAudioTracks()[0];
        if (micTrack) {
          micTrack.addEventListener('ended', () => {
            if (recState && recState.id === sessionId && !recState.stopping) {
              stopRecording(true);
            }
          });
        }

        const bar = ensureMiniBar();
        $('#rec-mb-title', bar).textContent = created.item.title;
        $('#rec-mb-mode', bar).textContent = selectedMode === 'online' ? 'Online' : 'Offline';
        $('#rec-mb-timer', bar).textContent = '00:00';
        bar.hidden = false;
        bar.classList.remove('is-paused');

        recState.meter = setupAudioMeter(systemAudioStream ? [micStream, systemAudioStream] : [micStream]);
        recState.timerId = setInterval(renderMiniBarTick, 500);
        window.addEventListener('beforeunload', onBeforeUnloadRecording);
        updateRecordTopbarBtn();

        busy = false;
        close();
      } catch (err) {
        for (const s of acquiredStreams) {
          for (const t of s.getTracks()) {
            try {
              t.stop();
            } catch {}
          }
        }
        busy = false;
        goBtn.disabled = false;
        goBtn.innerHTML = `${rIcon('mic')} <span>Mulai Rekam</span>`;

        if (err && err.message === 'NO_SYSTEM_AUDIO') {
          window.AppDialog?.alert({
            title: 'Audio layar/tab tidak aktif',
            message: 'Anda belum mencentang "Share audio" / "Bagikan audio" di popup browser. Silakan coba lagi dan centang opsi audio.',
            type: 'warning',
          });
          return;
        }
        if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
          notify('Izin perekaman dibatalkan.');
          return;
        }
        window.AppDialog?.alert({
          title: 'Gagal memulai rekaman',
          message: err && err.message ? err.message : String(err),
          type: 'error',
        });
      }
    });
  }

  // ---------- Browser Audio Merging (Gabung Audio -> 16 kHz Mono WAV) ----------
  function encodeWav16BitMono(floatSamples, sampleRate) {
    const len = floatSamples.length;
    const buffer = new ArrayBuffer(44 + len * 2);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + len * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, len * 2, true);

    let offset = 44;
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, floatSamples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Uint8Array(buffer);
  }

  async function combineOnlineTracks(item) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const OfflineAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AC || !OfflineAC) {
      throw new Error('Browser tidak mendukung Web Audio API untuk menggabung audio.');
    }

    const [micRes, sysRes] = await Promise.all([
      fetch(`/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=mic`, { cache: 'no-store' }),
      fetch(`/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=system`, { cache: 'no-store' }),
    ]);
    if (!micRes.ok || !sysRes.ok) throw new Error('Track mic atau lawan bicara tidak ditemukan.');

    const [micBufRaw, sysBufRaw] = await Promise.all([micRes.arrayBuffer(), sysRes.arrayBuffer()]);
    if (!micBufRaw.byteLength && !sysBufRaw.byteLength) {
      throw new Error('Kedua file audio masih kosong.');
    }

    const decodeCtx = new AC();
    let micAudioBuf = null;
    let sysAudioBuf = null;
    try {
      if (micBufRaw.byteLength) micAudioBuf = await decodeCtx.decodeAudioData(micBufRaw);
      if (sysBufRaw.byteLength) sysAudioBuf = await decodeCtx.decodeAudioData(sysBufRaw);
    } finally {
      decodeCtx.close().catch(() => {});
    }

    const targetRate = 16000;
    const maxSec = Math.max(micAudioBuf ? micAudioBuf.duration : 0, sysAudioBuf ? sysAudioBuf.duration : 0);
    const totalFrames = Math.max(1, Math.ceil(maxSec * targetRate));
    const offline = new OfflineAC(1, totalFrames, targetRate);

    if (micAudioBuf) {
      const src = offline.createBufferSource();
      src.buffer = micAudioBuf;
      const gain = offline.createGain();
      gain.gain.value = sysAudioBuf ? 0.85 : 1.0;
      src.connect(gain).connect(offline.destination);
      src.start(0);
    }
    if (sysAudioBuf) {
      const src = offline.createBufferSource();
      src.buffer = sysAudioBuf;
      const gain = offline.createGain();
      gain.gain.value = micAudioBuf ? 0.85 : 1.0;
      src.connect(gain).connect(offline.destination);
      src.start(0);
    }

    const rendered = await offline.startRendering();
    const wavBytes = encodeWav16BitMono(rendered.getChannelData(0), targetRate);

    const upRes = await fetch(`/api/recordings/combine?id=${encodeURIComponent(item.id)}&ext=wav`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Requested-With': 'ai-note',
      },
      body: wavBytes,
    });
    const upData = await upRes.json().catch(() => ({}));
    if (!upRes.ok) throw new Error(upData.error || `HTTP ${upRes.status}`);
    return upData.item;
  }

  // ---------- Note Link Picker Modal ----------
  function openLinkNoteModal(item, onLinked) {
    const notes = typeof window.getAllNotePaths === 'function' ? window.getAllNotePaths() : [];
    const backdrop = document.createElement('div');
    backdrop.className = 'rec-modal-backdrop';
    backdrop.innerHTML = `
      <div class="rec-modal" role="dialog" aria-modal="true" aria-labelledby="rec-link-title">
        <div class="rec-modal-head">
          <h2 id="rec-link-title">Tautkan ke Catatan</h2>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" id="rec-link-x" aria-label="Tutup">${rIcon('close')}</button>
        </div>
        <div class="rec-field">
          <input id="rec-link-filter" type="text" placeholder="Cari nama atau folder catatan…" autocomplete="off">
        </div>
        <div class="rec-note-list" id="rec-link-list"></div>
        <div class="rec-modal-foot">
          ${item.linkedNote ? '<button type="button" class="btn btn-outline" id="rec-link-clear">Lepas Tautan</button>' : ''}
          <button type="button" class="btn btn-outline" id="rec-link-cancel">Tutup</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const listEl = $('#rec-link-list', backdrop);
    const filterEl = $('#rec-link-filter', backdrop);

    const close = () => {
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    $('#rec-link-x', backdrop).addEventListener('click', close);
    $('#rec-link-cancel', backdrop).addEventListener('click', close);

    async function selectNote(notePath) {
      try {
        const r = await postJson('/api/recordings/update', { id: item.id, linkedNote: notePath });
        close();
        notify(notePath ? `Ditautkan ke ${notePath}` : 'Tautan catatan dilepas');
        onLinked(r.item);
      } catch (err) {
        notify('Gagal menautkan: ' + err.message);
      }
    }

    const clearBtn = $('#rec-link-clear', backdrop);
    if (clearBtn) clearBtn.addEventListener('click', () => selectNote(''));

    function renderNotes(q) {
      const term = (q || '').trim().toLowerCase();
      const filtered = term
        ? notes.filter((n) => n.path.toLowerCase().includes(term) || n.title.toLowerCase().includes(term))
        : notes;
      const sliced = filtered.slice(0, 80);
      if (!sliced.length) {
        listEl.innerHTML = '<div class="muted" style="padding:0.75rem;text-align:center;">Tidak ada catatan yang cocok.</div>';
        return;
      }
      listEl.innerHTML = sliced
        .map(
          (n) => `
          <button type="button" class="rec-note-opt${n.path === item.linkedNote ? ' active' : ''}" data-note="${esc(n.path)}">
            <strong>${esc(n.title)}</strong>
            <small>${esc(n.path)}</small>
          </button>
        `,
        )
        .join('');
      listEl.querySelectorAll('[data-note]').forEach((btn) => {
        btn.addEventListener('click', () => selectNote(btn.dataset.note));
      });
    }

    renderNotes('');
    filterEl.addEventListener('input', () => renderNotes(filterEl.value));
    filterEl.focus();
  }

  // ---------- Add Text Modal & Text File Viewer/Editor Modal ----------
  function openAddTextModal(item, onSaved) {
    if (isReadOnly()) return;
    let busy = false;
    const backdrop = document.createElement('div');
    backdrop.className = 'rec-modal-backdrop';
    backdrop.innerHTML = `
      <form class="rec-modal rec-modal-lg" role="dialog" aria-modal="true" aria-labelledby="rec-addtxt-title">
        <div class="rec-modal-head">
          <h2 id="rec-addtxt-title">Tambah Teks / Raw AI</h2>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" id="rec-addtxt-x" aria-label="Tutup">${rIcon('close')}</button>
        </div>
        <div class="rec-field">
          <label for="rec-addtxt-name">Nama file (bebas, otomatis .md jika tanpa ekstensi)</label>
          <div class="rec-preset-row">
            <button type="button" class="rec-preset-btn" data-preset="transcript.md">transcript.md</button>
            <button type="button" class="rec-preset-btn" data-preset="summary.md">summary.md</button>
            <button type="button" class="rec-preset-btn" data-preset="raw-ai.md">raw-ai.md</button>
          </div>
          <input id="rec-addtxt-name" type="text" value="transcript.md" maxlength="140" autocomplete="off" spellcheck="false">
        </div>
        <div class="rec-field">
          <label for="rec-addtxt-body">Isi teks</label>
          <textarea id="rec-addtxt-body" class="rec-text-area" rows="12" placeholder="Tempel (paste) transkrip, resume, action items, atau teks mentah dari AI di sini…"></textarea>
        </div>
        <div class="rec-modal-foot">
          <button type="button" class="btn btn-outline" id="rec-addtxt-cancel">Batal</button>
          <button type="submit" class="btn btn-primary" id="rec-addtxt-save">Simpan File</button>
        </div>
      </form>
    `;
    document.body.appendChild(backdrop);

    const form = $('form', backdrop);
    const nameInp = $('#rec-addtxt-name', backdrop);
    const bodyInp = $('#rec-addtxt-body', backdrop);
    const saveBtn = $('#rec-addtxt-save', backdrop);

    const close = () => {
      if (busy) return;
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    $('#rec-addtxt-x', backdrop).addEventListener('click', close);
    $('#rec-addtxt-cancel', backdrop).addEventListener('click', close);

    backdrop.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        nameInp.value = btn.dataset.preset;
        bodyInp.focus();
      });
    });

    bodyInp.focus();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      const name = nameInp.value.trim();
      if (!name) {
        notify('Masukkan nama file terlebih dahulu.');
        nameInp.focus();
        return;
      }

      const sendSave = async (overwrite) => {
        const res = await fetch('/api/recordings/files/text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'ai-note',
          },
          body: JSON.stringify({ id: item.id, name, content: bodyInp.value, overwrite }),
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, ok: res.ok, data };
      };

      busy = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan…';
      try {
        let r = await sendSave(false);
        if (r.status === 409 && r.data && r.data.conflict) {
          const confirmOverwrite = await window.AppDialog?.confirm({
            title: 'Timpa file yang sudah ada?',
            message: `File "${r.data.name}" sudah ada di sesi ini. Timpa isinya?`,
            confirmLabel: 'Timpa',
            cancelLabel: 'Batal',
            destructive: true,
          });
          if (!confirmOverwrite) {
            busy = false;
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan File';
            return;
          }
          r = await sendSave(true);
        }
        if (!r.ok) throw new Error((r.data && r.data.error) || `HTTP ${r.status}`);
        busy = false;
        close();
        notify(`Tersimpan: ${r.data.file?.name || name}`);
        if (onSaved) onSaved();
      } catch (err) {
        busy = false;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan File';
        window.AppDialog?.alert({
          title: 'Gagal menyimpan file teks',
          message: err && err.message ? err.message : String(err),
          type: 'error',
        });
      }
    });
  }

  async function openTextFileModal(item, fileInfo, onSaved) {
    let data;
    try {
      const res = await fetch(
        `/api/recordings/files/text?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(fileInfo.name)}`,
        { cache: 'no-store' },
      );
      data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    } catch (err) {
      window.AppDialog?.alert({
        title: 'Gagal membuka file',
        message: err && err.message ? err.message : String(err),
        type: 'error',
      });
      return;
    }

    const file = data.file;
    const ro = isReadOnly();
    let busy = false;
    const backdrop = document.createElement('div');
    backdrop.className = 'rec-modal-backdrop';
    backdrop.innerHTML = `
      <div class="rec-modal rec-modal-lg" role="dialog" aria-modal="true" aria-labelledby="rec-viewtxt-title">
        <div class="rec-modal-head">
          <div class="rec-modal-title-group">
            <h2 id="rec-viewtxt-title" title="${esc(file.fullPath || '')}">${esc(file.name)}</h2>
            <span class="muted rec-modal-sub">${fmtBytes(file.size)}</span>
            ${
              file.fullPath
                ? `<button type="button" class="btn btn-ghost btn-icon btn-sm" id="rec-viewtxt-cpath" title="Salin path: ${esc(file.fullPath)}">${rIcon('folder')}</button>`
                : ''
            }
          </div>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" id="rec-viewtxt-x" aria-label="Tutup">${rIcon('close')}</button>
        </div>
        <div class="rec-field">
          <textarea id="rec-viewtxt-body" class="rec-text-area" rows="16"${ro ? ' readonly' : ''}></textarea>
        </div>
        <div class="rec-modal-foot">
          <button type="button" class="btn btn-outline" id="rec-viewtxt-copy">${rIcon('copy')}<span>Salin Isi</span></button>
          <a class="btn btn-outline" href="/api/recordings/files/download?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(file.name)}" download>${rIcon('download')}<span>Unduh</span></a>
          <span class="rec-spacer"></span>
          <button type="button" class="btn btn-outline" id="rec-viewtxt-close">Tutup</button>
          ${ro ? '' : '<button type="button" class="btn btn-primary" id="rec-viewtxt-save">Simpan</button>'}
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const bodyInp = $('#rec-viewtxt-body', backdrop);
    bodyInp.value = file.content || '';
    const saveBtn = $('#rec-viewtxt-save', backdrop);

    const close = () => {
      if (busy) return;
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    $('#rec-viewtxt-x', backdrop).addEventListener('click', close);
    $('#rec-viewtxt-close', backdrop).addEventListener('click', close);

    $('#rec-viewtxt-cpath', backdrop)?.addEventListener('click', async () => {
      if (await copyText(file.fullPath)) notify('Path disalin: ' + file.fullPath);
    });
    $('#rec-viewtxt-copy', backdrop).addEventListener('click', async () => {
      if (await copyText(bodyInp.value)) notify('Isi file disalin ke clipboard.');
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Menyimpan…';
        try {
          await postJson('/api/recordings/files/text', {
            id: item.id,
            name: file.name,
            content: bodyInp.value,
            overwrite: true,
          });
          busy = false;
          close();
          notify(`Perubahan "${file.name}" disimpan.`);
          if (onSaved) onSaved();
        } catch (err) {
          busy = false;
          saveBtn.disabled = false;
          saveBtn.textContent = 'Simpan';
          notify('Gagal menyimpan: ' + err.message);
        }
      });
    }

    bodyInp.focus();
  }

  // ---------- Lazy Audio Player Controller ----------
  const activePagePlayers = new Set();
  const rowPlayerCtrls = new Map();
  let activeDropdownCleanup = null;

  function closeRowDropdown() {
    if (activeDropdownCleanup) {
      activeDropdownCleanup();
      activeDropdownCleanup = null;
    }
  }

  function stopAllPagePlayers(exceptCtrl = null) {
    for (const ctrl of Array.from(activePagePlayers)) {
      if (ctrl !== exceptCtrl) ctrl.pause();
    }
  }

  function destroyAllPagePlayers() {
    closeRowDropdown();
    for (const ctrl of Array.from(activePagePlayers)) {
      ctrl.destroy();
    }
    activePagePlayers.clear();
    rowPlayerCtrls.clear();
  }

  function attachJumpBar(container, getCurTime, getMaxDur, seekToFn, item, initialSec) {
    const form = document.createElement('form');
    form.className = 'rec-jump-bar';
    form.innerHTML = `
      <span class="rec-jump-lbl" title="Ketik menit:detik lalu tekan Enter atau Loncat">${rIcon('clock')}<span>Mulai di:</span></span>
      <input type="text" class="rec-jump-inp" data-p="jump-inp" value="${initialSec !== null && initialSec >= 0 ? esc(fmtDuration(initialSec)) : ''}" placeholder="00:00" title="Format MM:SS atau HH:MM:SS (contoh 12:30)" autocomplete="off">
      <button type="submit" class="btn btn-outline btn-sm">Loncat</button>
      <span class="rec-spacer"></span>
      <button type="button" class="btn btn-ghost btn-sm rec-copy-ts-btn" data-p="copy-at" title="Salin link Markdown langsung ke menit/detik saat ini">${rIcon('link')}<span>Salin @waktu</span></button>
    `;
    container.appendChild(form);

    const inp = $('[data-p="jump-inp"]', form);
    const copyAtBtn = $('[data-p="copy-at"]', form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const parsed = parseTimeInput(inp.value);
      if (parsed === null) {
        notify('Format waktu tidak valid. Gunakan MM:SS (contoh 12:30) atau HH:MM:SS.');
        inp.focus();
        inp.select();
        return;
      }
      const max = getMaxDur();
      const target = max > 0 ? Math.min(parsed, max) : parsed;
      inp.value = fmtDuration(target);
      seekToFn(target, true);
    });

    copyAtBtn.addEventListener('click', async () => {
      const cur = Math.max(0, Math.floor(getCurTime() || 0));
      const ts = fmtDuration(cur);
      const md = `[🎙️ ${item.title} @ ${ts}](#/_recordings/${item.id}?t=${ts})`;
      if (await copyText(md)) notify(`Link timestamp @${ts} disalin.`);
    });

    return { setJumpInput: (sec) => { if (inp && document.activeElement !== inp) inp.placeholder = fmtDuration(sec); } };
  }

  function mountPlayer(container, item, playBtn, startSec = null) {
    container.innerHTML = '';
    container.hidden = false;
    if (window.gsap) {
      gsap.fromTo(container, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out', clearProps: 'opacity,transform' });
    }
    if (playBtn) {
      playBtn.classList.add('is-open');
      playBtn.innerHTML = rIcon('close');
      playBtn.title = 'Tutup pemutar';
      playBtn.setAttribute('aria-label', 'Tutup pemutar');
    }

    const resetBtn = () => {
      if (playBtn) {
        playBtn.classList.remove('is-open');
        playBtn.innerHTML = rIcon('play');
        playBtn.title = 'Putar audio';
        playBtn.setAttribute('aria-label', 'Putar audio');
      }
    };

    if (item.mode !== 'online' || !item.tracks?.system || !item.tracks.system.size) {
      const track = item.tracks?.mic?.size ? 'mic' : item.combined ? 'combined' : 'mic';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'auto';
      audio.src = `/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=${encodeURIComponent(track)}`;
      container.appendChild(audio);

      const getMaxDur = () => (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : item.durationSec || 0);
      const seekAndPlay = (sec, shouldPlay) => {
        const apply = () => {
          const max = getMaxDur();
          const target = max > 0 ? Math.min(Math.max(0, sec), max) : Math.max(0, sec);
          try {
            audio.currentTime = target;
          } catch {}
          if (shouldPlay) audio.play().catch(() => {});
        };
        if (audio.readyState >= 1) apply();
        else audio.addEventListener('loadedmetadata', apply, { once: true });
      };

      attachJumpBar(container, () => audio.currentTime, getMaxDur, seekAndPlay, item, startSec);

      const ctrl = {
        pause: () => audio.pause(),
        seekTo: (sec) => seekAndPlay(sec, true),
        destroy: () => {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          container.hidden = true;
          container.innerHTML = '';
          resetBtn();
          activePagePlayers.delete(ctrl);
          rowPlayerCtrls.delete(item.id);
        },
      };
      audio.addEventListener('play', () => stopAllPagePlayers(ctrl));
      activePagePlayers.add(ctrl);
      rowPlayerCtrls.set(item.id, ctrl);

      if (startSec !== null && startSec > 0) {
        seekAndPlay(startSec, true);
      } else {
        audio.play().catch(() => {});
      }
      return ctrl;
    }

    // Online mode: synced dual-track player (mic + system)
    container.innerHTML = `
      <div class="rec-dual-controls">
        <button type="button" class="btn btn-outline btn-sm" data-p="toggle">${rIcon('play')} <span>Play</span></button>
        <input type="range" class="rec-dual-seek" data-p="seek" min="0" max="${Math.max(1, item.durationSec || 1)}" value="0" step="0.1">
        <span class="rec-dual-time" data-p="time">00:00 / ${fmtDuration(item.durationSec)}</span>
        <div class="rec-track-seg" role="group" aria-label="Pilih sumber audio">
          <button type="button" class="active" data-src="all">Semua</button>
          <button type="button" data-src="mic">Anda</button>
          <button type="button" data-src="system">Lawan Bicara</button>
        </div>
      </div>
    `;

    const micAudio = new Audio(`/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=mic`);
    const sysAudio = new Audio(`/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=system`);
    micAudio.preload = 'auto';
    sysAudio.preload = 'auto';

    const toggleBtn = $('[data-p="toggle"]', container);
    const seekEl = $('[data-p="seek"]', container);
    const timeEl = $('[data-p="time"]', container);
    let playing = false;
    let seeking = false;
    let sourceMode = 'all';
    let lastSyncAt = 0;
    let destroyed = false;

    const getDuration = () => {
      const d1 = Number.isFinite(micAudio.duration) ? micAudio.duration : 0;
      const d2 = Number.isFinite(sysAudio.duration) ? sysAudio.duration : 0;
      return Math.max(d1, d2, item.durationSec || 0, 0);
    };

    const getCur = () => Math.max(micAudio.currentTime || 0, sysAudio.currentTime || 0);

    const updateTimeUi = () => {
      const dur = getDuration();
      const cur = getCur();
      if (dur > 0) seekEl.max = String(dur);
      if (!seeking) seekEl.value = String(Math.min(cur, Number(seekEl.max) || cur));
      timeEl.textContent = `${fmtDuration(cur)} / ${fmtDuration(dur)}`;
    };

    const applyMute = () => {
      micAudio.muted = sourceMode === 'system';
      sysAudio.muted = sourceMode === 'mic';
    };

    const playBoth = async () => {
      if (destroyed) return;
      stopAllPagePlayers(ctrl);
      applyMute();
      playing = true;
      toggleBtn.innerHTML = `${rIcon('pause')} <span>Pause</span>`;
      try {
        await Promise.all([micAudio.play().catch(() => {}), sysAudio.play().catch(() => {})]);
      } catch {}
    };

    const seekAudioEl = (el, target) => {
      const apply = () => {
        if (destroyed) return;
        const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : getDuration();
        const clamped = d > 0 ? Math.min(Math.max(0, target), d) : Math.max(0, target);
        try {
          el.currentTime = clamped;
        } catch {}
        updateTimeUi();
      };
      if (el.readyState >= 1) apply();
      else el.addEventListener('loadedmetadata', apply, { once: true });
    };

    const seekBoth = (target, shouldPlay) => {
      seekAudioEl(micAudio, target);
      seekAudioEl(sysAudio, target);
      seekEl.value = String(target);
      timeEl.textContent = `${fmtDuration(target)} / ${fmtDuration(getDuration())}`;
      if (shouldPlay) playBoth();
    };

    const ctrl = {
      pause: () => {
        playing = false;
        micAudio.pause();
        sysAudio.pause();
        toggleBtn.innerHTML = `${rIcon('play')} <span>Play</span>`;
      },
      seekTo: (sec) => seekBoth(sec, true),
      destroy: () => {
        destroyed = true;
        ctrl.pause();
        micAudio.removeAttribute('src');
        sysAudio.removeAttribute('src');
        micAudio.load();
        sysAudio.load();
        container.hidden = true;
        container.innerHTML = '';
        resetBtn();
        activePagePlayers.delete(ctrl);
        rowPlayerCtrls.delete(item.id);
      },
    };
    activePagePlayers.add(ctrl);
    rowPlayerCtrls.set(item.id, ctrl);

    attachJumpBar(container, getCur, getDuration, seekBoth, item, startSec);

    toggleBtn.addEventListener('click', () => {
      if (playing) ctrl.pause();
      else playBoth();
    });

    container.querySelectorAll('[data-src]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sourceMode = btn.dataset.src;
        container.querySelectorAll('[data-src]').forEach((b) => b.classList.toggle('active', b === btn));
        applyMute();
      });
    });

    seekEl.addEventListener('input', () => {
      seeking = true;
      const t = Number(seekEl.value) || 0;
      timeEl.textContent = `${fmtDuration(t)} / ${fmtDuration(getDuration())}`;
    });

    seekEl.addEventListener('change', () => {
      const t = Number(seekEl.value) || 0;
      seekBoth(t, false);
      seeking = false;
    });

    const onTime = () => {
      updateTimeUi();
      const now = Date.now();
      if (playing && now - lastSyncAt > 1500 && micAudio.readyState >= 2 && sysAudio.readyState >= 2) {
        const diff = Math.abs(micAudio.currentTime - sysAudio.currentTime);
        if (diff > 0.35) {
          lastSyncAt = now;
          try {
            sysAudio.currentTime = micAudio.currentTime;
          } catch {}
        }
      }
    };

    const onEnded = () => {
      if (micAudio.ended && sysAudio.ended) ctrl.pause();
    };

    micAudio.addEventListener('loadedmetadata', updateTimeUi);
    sysAudio.addEventListener('loadedmetadata', updateTimeUi);
    micAudio.addEventListener('timeupdate', onTime);
    sysAudio.addEventListener('timeupdate', updateTimeUi);
    micAudio.addEventListener('ended', onEnded);
    sysAudio.addEventListener('ended', onEnded);

    if (startSec !== null && startSec > 0) {
      seekBoth(startSec, true);
    } else {
      playBoth();
    }
    return ctrl;
  }

  // ---------- Recordings List Page ----------
  window.renderRecordingsPage = async function renderRecordingsPage(focusSpec = '') {
    const contentEl = $('#content');
    if (!contentEl) return;

    destroyAllPagePlayers();
    if (typeof window.setActiveViewCleanup === 'function') {
      window.setActiveViewCleanup(destroyAllPagePlayers);
    }

    document.title = 'Rekaman Meeting · AI Note';
    contentEl.innerHTML = '<div class="rec-page"><div class="muted">Memuat daftar rekaman…</div></div>';

    let data;
    try {
      const res = await fetch('/api/recordings', { cache: 'no-store' });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    } catch (err) {
      contentEl.innerHTML = `<div class="empty"><p><strong>Gagal memuat daftar rekaman</strong></p><p>${esc(err.message)}</p></div>`;
      return;
    }

    const recordingsDir = data.recordingsDir || '';
    let items = Array.isArray(data.items) ? data.items : [];
    const { dateParam, focusId, startSec } = parseFocusSpec(focusSpec);
    let selectedDate = '';
    if (focusId) {
      const targetItem = items.find((x) => x.id === focusId);
      if (targetItem) selectedDate = targetItem.dateKey || '';
    } else if (dateParam) {
      selectedDate = dateParam;
    }

    let query = '';
    const expandedIds = new Set();
    const ro = isReadOnly();

    contentEl.innerHTML = `
      <div class="rec-page">
        <div class="rec-header">
          <div class="rec-header-title-row">
            <h1>Rekaman Meeting</h1>
            <span class="rec-count-pill" id="rec-count-badge">${items.length}</span>
            ${
              recordingsDir
                ? `<button type="button" class="btn btn-ghost btn-icon btn-sm rec-dir-btn" id="rec-copy-root-dir" title="Lokasi folder: ${esc(recordingsDir)} · Klik untuk salin path" aria-label="Salin lokasi folder rekaman">${rIcon('folder')}</button>`
                : ''
            }
          </div>
          <div class="rec-header-actions">
            ${ro ? '' : `<button type="button" class="btn btn-primary btn-sm" id="rec-new-btn">${rIcon('mic')}<span>Rekam Baru</span></button>`}
          </div>
        </div>
        <div class="rec-toolbar">
          <input type="text" class="rec-search-input" id="rec-search-inp" value="${esc(query)}" placeholder="Cari di semua tanggal (judul atau catatan tertaut)…">
        </div>
        <div id="rec-date-bar" hidden></div>
        <div class="rec-list" id="rec-list"></div>
      </div>
    `;

    const listEl = $('#rec-list', contentEl);
    const dateBarEl = $('#rec-date-bar', contentEl);
    const countBadge = $('#rec-count-badge', contentEl);
    const searchInp = $('#rec-search-inp', contentEl);
    const headerEl = $('.rec-header', contentEl);
    if (window.gsap && headerEl) {
      gsap.fromTo(headerEl, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'opacity,transform' });
    }

    async function loadAndRenderFiles(item, filesBox, rowEl) {
      filesBox.hidden = false;
      if (!filesBox.dataset.loaded) {
        filesBox.innerHTML = '<div class="muted rec-files-loading">Memuat daftar file…</div>';
      }

      let filesResp;
      try {
        const res = await fetch(`/api/recordings/files?id=${encodeURIComponent(item.id)}`, { cache: 'no-store' });
        filesResp = await res.json();
        if (!res.ok) throw new Error(filesResp.error || `HTTP ${res.status}`);
      } catch (err) {
        filesBox.innerHTML = `<div class="muted rec-files-loading">Gagal memuat file: ${esc(err.message)}</div>`;
        return;
      }

      const files = Array.isArray(filesResp.files) ? filesResp.files : [];
      filesBox.dataset.loaded = '1';
      filesBox._files = files;

      const extraCount = files.filter((f) => !f.track).length;
      item.extraFilesCount = extraCount;
      if (rowEl) {
        const clipPill = $('[data-clip-pill]', rowEl);
        if (clipPill) {
          clipPill.hidden = extraCount === 0;
          clipPill.innerHTML = `${rIcon('paperclip')}<span>${extraCount}</span>`;
        }
      }

      const fileRowsHtml = files.length
        ? files
            .map((f) => {
              const iconName = f.kind === 'audio' ? 'mic' : f.isText ? 'file' : 'paperclip';
              const nameHtml = f.isText
                ? `<button type="button" class="rec-file-name is-clickable" data-fact="view" data-fname="${esc(f.name)}" title="Klik untuk lihat/edit · Path: ${esc(f.fullPath)}">${esc(f.name)}</button>`
                : `<span class="rec-file-name" title="Path: ${esc(f.fullPath)}">${esc(f.name)}</span>`;
              return `
                <div class="rec-file-row" data-fname="${esc(f.name)}">
                  <span class="rec-file-ico">${rIcon(iconName)}</span>
                  ${nameHtml}
                  <span class="rec-file-size">${fmtBytes(f.size)}</span>
                  <div class="rec-file-acts">
                    ${
                      f.isText
                        ? `<button type="button" class="btn btn-ghost btn-icon btn-sm" data-fact="view" title="Lihat / Edit isi file" aria-label="Lihat atau edit">${rIcon('eye')}</button>
                           <button type="button" class="btn btn-ghost btn-icon btn-sm" data-fact="copy-content" title="Salin seluruh isi teks" aria-label="Salin isi">${rIcon('copy')}</button>`
                        : ''
                    }
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" data-fact="copy-path" title="Salin path: ${esc(f.fullPath)}" aria-label="Salin path">${rIcon('folder')}</button>
                    <a class="btn btn-ghost btn-icon btn-sm" href="/api/recordings/files/download?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(f.name)}" download title="Unduh ${esc(f.name)}" aria-label="Unduh">${rIcon('download')}</a>
                    ${
                      !f.isCoreAudio && !ro
                        ? `<button type="button" class="btn btn-ghost btn-icon btn-sm rec-file-del" data-fact="delete-file" title="Hapus file" aria-label="Hapus file">${rIcon('trash')}</button>`
                        : ''
                    }
                  </div>
                </div>
              `;
            })
            .join('')
        : '<div class="muted rec-files-loading">Folder sesi masih kosong.</div>';

      filesBox.innerHTML = `
        <div class="rec-files-list">${fileRowsHtml}</div>
        <div class="rec-files-foot">
          ${
            ro
              ? ''
              : `<button type="button" class="btn btn-outline btn-sm" data-fact="add-text">${rIcon('plus')}<span>Tambah Teks</span></button>
                 <button type="button" class="btn btn-outline btn-sm" data-fact="upload">${rIcon('upload')}<span>Upload File</span></button>
                 <input type="file" multiple data-file-input hidden>`
          }
          <span class="rec-spacer"></span>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-fact="refresh" title="Muat ulang daftar file (deteksi file yang ditambah manual)" aria-label="Muat ulang daftar file">${rIcon('refresh')}</button>
        </div>
      `;

      const fileInput = $('[data-file-input]', filesBox);
      if (fileInput) {
        fileInput.addEventListener('change', async () => {
          const picked = Array.from(fileInput.files || []);
          fileInput.value = '';
          if (!picked.length) return;
          const upBtn = $('[data-fact="upload"]', filesBox);
          if (upBtn) {
            upBtn.disabled = true;
            upBtn.innerHTML = '<span>Mengunggah…</span>';
          }
          let okCount = 0;
          for (const file of picked) {
            try {
              const res = await fetch(
                `/api/recordings/files/upload?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(file.name)}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-Requested-With': 'ai-note',
                  },
                  body: file,
                },
              );
              const rdata = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(rdata.error || `HTTP ${res.status}`);
              okCount++;
            } catch (err) {
              notify(`Gagal unggah "${file.name}": ${err.message}`);
            }
          }
          if (okCount > 0) notify(`${okCount} file berhasil ditambahkan.`);
          await loadAndRenderFiles(item, filesBox, rowEl);
        });
      }

      if (!filesBox.dataset.bound) {
        filesBox.dataset.bound = '1';
        filesBox.addEventListener('click', async (e) => {
          const fBtn = e.target.closest('[data-fact]');
          if (!fBtn) return;
          const fact = fBtn.dataset.fact;
          const currentFiles = Array.isArray(filesBox._files) ? filesBox._files : [];
          const fileRow = fBtn.closest('[data-fname]');
          const fname = fBtn.dataset.fname || (fileRow ? fileRow.dataset.fname : '');
          const fInfo = fname ? currentFiles.find((x) => x.name === fname) : null;

          if (fact === 'refresh') {
            await loadAndRenderFiles(item, filesBox, rowEl);
            return;
          }
          if (fact === 'add-text') {
            openAddTextModal(item, () => loadAndRenderFiles(item, filesBox, rowEl));
            return;
          }
          if (fact === 'upload') {
            $('[data-file-input]', filesBox)?.click();
            return;
          }
          if (!fInfo) return;

          if (fact === 'copy-path') {
            if (await copyText(fInfo.fullPath)) notify('Path disalin: ' + fInfo.fullPath);
            return;
          }
          if (fact === 'view') {
            openTextFileModal(item, fInfo, () => loadAndRenderFiles(item, filesBox, rowEl));
            return;
          }
          if (fact === 'copy-content') {
            try {
              const res = await fetch(
                `/api/recordings/files/text?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(fInfo.name)}`,
                { cache: 'no-store' },
              );
              const tdata = await res.json();
              if (!res.ok) throw new Error(tdata.error || `HTTP ${res.status}`);
              if (await copyText(tdata.file?.content || '')) notify(`Isi "${fInfo.name}" disalin.`);
            } catch (err) {
              notify('Gagal menyalin isi: ' + err.message);
            }
            return;
          }
          if (fact === 'delete-file') {
            const ok = await window.AppDialog?.confirm({
              title: 'Hapus file ini?',
              message: `File "${fInfo.name}" akan dihapus permanen dari folder sesi.`,
              confirmLabel: 'Hapus',
              cancelLabel: 'Batal',
              destructive: true,
            });
            if (!ok) return;
            try {
              await postJson('/api/recordings/files/delete', { id: item.id, name: fInfo.name });
              if (item.combined && item.combined.file === fInfo.name) {
                item.combined = null;
                if (item.filePaths) delete item.filePaths.combined;
              }
              notify(`File "${fInfo.name}" dihapus.`);
              await loadAndRenderFiles(item, filesBox, rowEl);
            } catch (err) {
              notify('Gagal menghapus file: ' + err.message);
            }
          }
        });
      }
    }

    async function handleAction(act, item, rowEl) {
      if (act === 'copy-md') {
        const md = `[🎙️ ${item.title} (${fmtDuration(item.durationSec)})](#/_recordings/${item.id})`;
        if (await copyText(md)) notify('Link referensi Markdown disalin.');
        return;
      }

      if (act === 'rename') {
        const nextTitle = await window.AppDialog?.prompt({
          title: 'Ubah judul rekaman',
          label: 'Judul baru',
          value: item.title,
          confirmLabel: 'Simpan',
        });
        if (!nextTitle || !nextTitle.trim() || nextTitle.trim() === item.title) return;
        try {
          const r = await postJson('/api/recordings/update', { id: item.id, title: nextTitle.trim() });
          items = items.map((x) => (x.id === item.id ? r.item : x));
          renderList(false);
          notify('Judul diperbarui.');
        } catch (err) {
          notify('Gagal mengubah judul: ' + err.message);
        }
        return;
      }

      if (act === 'link-note') {
        openLinkNoteModal(item, (updated) => {
          items = items.map((x) => (x.id === item.id ? updated : x));
          renderList(false);
        });
        return;
      }

      if (act === 'combine') {
        const busyPill = rowEl ? $('[data-busy-pill]', rowEl) : null;
        if (busyPill) busyPill.hidden = false;
        try {
          const updated = await combineOnlineTracks(item);
          items = items.map((x) => (x.id === item.id ? updated : x));
          renderList(false);
          notify('Audio digabung menjadi ' + (updated.combined?.file || 'combined.wav'));
        } catch (err) {
          if (busyPill) busyPill.hidden = true;
          window.AppDialog?.alert({
            title: 'Gagal menggabung audio',
            message: err && err.message ? err.message : String(err),
            type: 'error',
          });
        }
        return;
      }

      if (act === 'add-text') {
        expandedIds.add(item.id);
        const filesBox = rowEl ? $('[data-files-box]', rowEl) : null;
        if (rowEl && filesBox) {
          rowEl.classList.add('is-expanded');
          const chev = $('[data-chev]', rowEl);
          if (chev) chev.innerHTML = rIcon('chevronDown');
          loadAndRenderFiles(item, filesBox, rowEl);
        }
        openAddTextModal(item, () => {
          if (rowEl && filesBox) loadAndRenderFiles(item, filesBox, rowEl);
        });
        return;
      }

      if (act === 'delete') {
        const ok = await window.AppDialog?.confirm({
          title: 'Hapus rekaman ini?',
          message: `Rekaman "${item.title}" beserta file audionya akan dihapus permanen dari disk.`,
          confirmLabel: 'Hapus',
          cancelLabel: 'Batal',
          destructive: true,
        });
        if (!ok) return;
        try {
          await postJson('/api/recordings/delete', { id: item.id });
          items = items.filter((x) => x.id !== item.id);
          renderList(false);
          notify('Rekaman dihapus.');
        } catch (err) {
          notify('Gagal menghapus: ' + err.message);
        }
      }
    }

    function openRowDropdown(item, triggerBtn, rowEl) {
      const wasSame = triggerBtn.getAttribute('aria-expanded') === 'true';
      closeRowDropdown();
      if (wasSame) return;

      const isOnline = item.mode === 'online';
      const menu = document.createElement('div');
      menu.className = 'rec-dropdown';
      menu.setAttribute('role', 'menu');

      const parts = [];
      if (!ro) {
        parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mact="add-text">${rIcon('plus')}<span>Tambah teks AI…</span></button>`);
        parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mact="rename">${rIcon('pencil')}<span>Ubah judul</span></button>`);
        parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mact="link-note">${rIcon('link')}<span>${item.linkedNote ? 'Ubah tautan catatan…' : 'Tautkan ke catatan…'}</span></button>`);
      }
      parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mact="copy-md">${rIcon('copy')}<span>Salin link Markdown (.md)</span></button>`);
      parts.push('<div class="rec-menu-sep"></div>');

      if (isOnline && !ro) {
        parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mact="combine">${rIcon('merge')}<span>${item.combined ? 'Gabung ulang audio (.wav)' : 'Gabung audio (1 file .wav)'}</span></button>`);
      }
      if (isOnline) {
        parts.push(`<a class="rec-menu-item" role="menuitem" href="/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=mic&download=1" download>${rIcon('download')}<span>Unduh Mic (.webm)</span></a>`);
        parts.push(`<a class="rec-menu-item" role="menuitem" href="/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=system&download=1" download>${rIcon('download')}<span>Unduh Lawan Bicara (.webm)</span></a>`);
        if (item.combined) {
          parts.push(`<a class="rec-menu-item" role="menuitem" href="/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=combined&download=1" download>${rIcon('download')}<span>Unduh Gabungan (.wav)</span></a>`);
        }
      } else {
        parts.push(`<a class="rec-menu-item" role="menuitem" href="/api/recordings/audio?id=${encodeURIComponent(item.id)}&track=mic&download=1" download>${rIcon('download')}<span>Unduh audio (mic.webm)</span></a>`);
      }

      parts.push('<div class="rec-menu-sep"></div>');
      if (item.filePaths?.mic) {
        parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mpath="${esc(item.filePaths.mic)}" title="${esc(item.filePaths.mic)}">${rIcon('copy')}<span>Salin path mic.webm</span></button>`);
      }
      if (isOnline && item.filePaths?.system) {
        parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mpath="${esc(item.filePaths.system)}" title="${esc(item.filePaths.system)}">${rIcon('copy')}<span>Salin path system.webm</span></button>`);
      }
      if (item.filePaths?.combined) {
        parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mpath="${esc(item.filePaths.combined)}" title="${esc(item.filePaths.combined)}">${rIcon('copy')}<span>Salin path ${esc(item.combined?.file || 'combined.wav')}</span></button>`);
      }
      if (item.dirPath) {
        parts.push(`<button type="button" class="rec-menu-item" role="menuitem" data-mpath="${esc(item.dirPath)}" title="${esc(item.dirPath)}">${rIcon('folder')}<span>Salin path folder</span></button>`);
      }

      if (!ro) {
        parts.push('<div class="rec-menu-sep"></div>');
        parts.push(`<button type="button" class="rec-menu-item is-danger" role="menuitem" data-mact="delete">${rIcon('trash')}<span>Hapus rekaman</span></button>`);
      }

      menu.innerHTML = parts.join('');
      document.body.appendChild(menu);
      triggerBtn.setAttribute('aria-expanded', 'true');

      const r = triggerBtn.getBoundingClientRect();
      const mw = menu.offsetWidth || 220;
      const mh = menu.offsetHeight || 260;
      const left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
      let top = r.bottom + 4;
      if (top + mh > window.innerHeight - 8 && r.top - mh - 4 >= 8) {
        top = r.top - mh - 4;
      } else if (top + mh > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - mh - 8);
      }
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      if (window.gsap) {
        gsap.fromTo(menu, { opacity: 0, y: -4, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.14, ease: 'power2.out', clearProps: 'opacity,transform' });
      }

      const cleanup = () => {
        document.removeEventListener('click', onDocClick, true);
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', closeRowDropdown);
        triggerBtn.setAttribute('aria-expanded', 'false');
        menu.remove();
      };
      const onDocClick = (e) => {
        if (!menu.contains(e.target) && !triggerBtn.contains(e.target)) closeRowDropdown();
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeRowDropdown();
        }
      };
      const onScroll = (e) => {
        if (!menu.contains(e.target)) closeRowDropdown();
      };

      activeDropdownCleanup = cleanup;
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', closeRowDropdown);

      menu.addEventListener('click', async (e) => {
        const pathBtn = e.target.closest('[data-mpath]');
        if (pathBtn) {
          const val = pathBtn.getAttribute('data-mpath') || '';
          closeRowDropdown();
          if (await copyText(val)) notify('Path disalin: ' + val);
          return;
        }
        const actItem = e.target.closest('[data-mact]');
        if (actItem) {
          const act = actItem.getAttribute('data-mact');
          closeRowDropdown();
          await handleAction(act, item, rowEl);
          return;
        }
        if (e.target.closest('a')) {
          closeRowDropdown();
        }
      });
    }

    function renderDateBar(visibleItems, isSearching) {
      if (!dateBarEl) return;
      if (isSearching) {
        dateBarEl.hidden = false;
        dateBarEl.className = 'rec-date-bar is-search';
        dateBarEl.innerHTML = `
          <span class="muted">Menampilkan <strong>${visibleItems.length}</strong> hasil di semua tanggal</span>
          <button type="button" class="btn btn-ghost btn-sm" id="rec-clear-search">Hapus pencarian</button>
        `;
        $('#rec-clear-search', dateBarEl)?.addEventListener('click', () => {
          query = '';
          if (searchInp) searchInp.value = '';
          renderList();
        });
        return;
      }
      if (!selectedDate) {
        dateBarEl.hidden = true;
        dateBarEl.innerHTML = '';
        return;
      }

      const info = formatDateFolder(selectedDate);
      const dayBytes = visibleItems.reduce((sum, x) => sum + (Number(x.totalSize) || 0), 0);
      const dayFolderPath = recordingsDir ? `${recordingsDir.replace(/[\\/]+$/, '')}\\${selectedDate}` : selectedDate;
      dateBarEl.hidden = false;
      dateBarEl.className = 'rec-date-bar';
      dateBarEl.innerHTML = `
        <button type="button" class="btn btn-outline btn-sm" id="rec-back-dates">${rIcon('arrowLeft')}<span>Semua tanggal</span></button>
        <div class="rec-date-bar-info">
          <strong>${esc(info.label)}</strong>
          ${info.tag ? `<span class="rec-pill">${esc(info.tag)}</span>` : ''}
          <span class="muted">· ${visibleItems.length} rekaman · ${fmtBytes(dayBytes)}</span>
        </div>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" id="rec-copy-day-dir" title="Salin path folder tanggal: ${esc(dayFolderPath)}" aria-label="Salin path folder tanggal">${rIcon('copy')}</button>
      `;
      $('#rec-back-dates', dateBarEl)?.addEventListener('click', () => {
        selectedDate = '';
        if (location.hash !== '#/_recordings') location.hash = '#/_recordings';
        else renderList();
      });
      $('#rec-copy-day-dir', dateBarEl)?.addEventListener('click', async () => {
        if (await copyText(dayFolderPath)) notify('Path folder disalin: ' + dayFolderPath);
      });
    }

    function renderList(animate = true) {
      destroyAllPagePlayers();
      if (countBadge) countBadge.textContent = String(items.length);
      const q = query.trim().toLowerCase();

      if (selectedDate && !q && !items.some((it) => (it.dateKey || '') === selectedDate)) {
        selectedDate = '';
        if (location.hash !== '#/_recordings') history.replaceState(null, '', '#/_recordings');
      }

      // 1. Tampilan Awal: Grid Folder Tanggal (saat belum pilih tanggal dan tidak sedang mencari)
      if (!selectedDate && !q) {
        renderDateBar(items, false);
        if (!items.length) {
          listEl.className = 'rec-list-empty-wrap';
          listEl.innerHTML = `<div class="rec-empty">
               ${rIcon('mic')}
               <p>Belum ada rekaman meeting tersimpan.</p>
               ${!ro ? '<button type="button" class="btn btn-primary btn-sm" id="rec-empty-start">Mulai Rekam Meeting</button>' : ''}
             </div>`;
          $('#rec-empty-start', listEl)?.addEventListener('click', openStartModal);
          return;
        }

        const groups = new Map();
        for (const it of items) {
          const dk = it.dateKey || 'Lainnya';
          if (!groups.has(dk)) groups.set(dk, { dateKey: dk, count: 0, totalSize: 0, extraCount: 0 });
          const g = groups.get(dk);
          g.count++;
          g.totalSize += Number(it.totalSize) || 0;
          g.extraCount += Number(it.extraFilesCount) || 0;
        }
        const sortedDays = Array.from(groups.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));

        listEl.className = 'rec-folder-grid';
        listEl.innerHTML = sortedDays
          .map((g) => {
            const info = formatDateFolder(g.dateKey);
            const dayFolderPath = recordingsDir ? `${recordingsDir.replace(/[\\/]+$/, '')}\\${g.dateKey}` : g.dateKey;
            return `
              <button type="button" class="rec-folder-card" data-date-folder="${esc(g.dateKey)}" title="Folder: ${esc(dayFolderPath)}">
                <div class="rec-folder-top">
                  <span class="rec-folder-ico">${rIcon('folder')}</span>
                  ${info.tag ? `<span class="rec-pill is-online">${esc(info.tag)}</span>` : ''}
                </div>
                <div class="rec-folder-name">${esc(info.label)}</div>
                <div class="rec-folder-meta">
                  <span>${g.count} rekaman</span>
                  <span>·</span>
                  <span>${fmtBytes(g.totalSize)}</span>
                  ${g.extraCount ? `<span>·</span><span>${g.extraCount} lampiran</span>` : ''}
                </div>
              </button>
            `;
          })
          .join('');
        if (animate && window.gsap) {
          const cards = listEl.querySelectorAll('.rec-folder-card');
          if (cards.length) {
            gsap.fromTo(cards, { opacity: 0, y: 12, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, stagger: 0.025, ease: 'power2.out', clearProps: 'opacity,transform' });
          }
        }
        return;
      }

      // 2. Tampilan List Rekaman (di dalam folder tanggal atau hasil pencarian lintas tanggal)
      const visible = q
        ? items.filter(
            (it) =>
              it.title.toLowerCase().includes(q) ||
              (it.linkedNote && it.linkedNote.toLowerCase().includes(q)) ||
              it.id.toLowerCase().includes(q) ||
              (it.dateKey && it.dateKey.includes(q)),
          )
        : items.filter((it) => (it.dateKey || '') === selectedDate);

      renderDateBar(visible, !!q);

      if (!visible.length) {
        listEl.className = 'rec-list-empty-wrap';
        listEl.innerHTML = `<div class="rec-empty">
             ${rIcon('mic')}
             <p>${q ? 'Tidak ada rekaman yang cocok dengan pencarian.' : 'Belum ada rekaman di tanggal ini.'}</p>
             ${!q && !ro ? '<button type="button" class="btn btn-primary btn-sm" id="rec-empty-start">Mulai Rekam Meeting</button>' : ''}
           </div>`;
        $('#rec-empty-start', listEl)?.addEventListener('click', openStartModal);
        return;
      }

      listEl.className = 'rec-list';
      listEl.innerHTML = visible
        .map((it) => {
          const isOnline = it.mode === 'online';
          const isFocused = focusId && it.id === focusId;
          const isExpanded = expandedIds.has(it.id);
          const noteHref = it.linkedNote && typeof window.aiNoteHashFor === 'function' ? window.aiNoteHashFor(it.linkedNote) : '#/';
          const primaryPath = it.filePaths?.combined || it.filePaths?.mic || it.dirPath || '';
          const extraCount = Number(it.extraFilesCount) || 0;

          return `
            <article class="rec-row${isFocused ? ' is-focused' : ''}${isExpanded ? ' is-expanded' : ''}" data-rec-id="${esc(it.id)}">
              <div class="rec-row-main">
                <button type="button" class="rec-play-btn" data-act="toggle-play" title="Putar audio" aria-label="Putar audio">${rIcon('play')}</button>
                <div class="rec-row-body" data-act="toggle-files" title="Klik untuk lihat daftar file di sesi ini">
                  <div class="rec-row-title-line">
                    <span class="rec-chevron" data-chev>${rIcon(isExpanded ? 'chevronDown' : 'chevronRight')}</span>
                    <span class="rec-row-title" title="Folder sesi: ${esc(it.dirPath || '')}">${esc(it.title)}</span>
                    <span class="rec-pill ${isOnline ? 'is-online' : ''}">${isOnline ? 'Online' : 'Offline'}</span>
                    ${it.combined ? `<span class="rec-pill is-combined" title="File gabungan: ${esc(it.filePaths?.combined || '')}">Gabungan</span>` : ''}
                    <span class="rec-pill" data-clip-pill${extraCount ? '' : ' hidden'}>${rIcon('paperclip')}<span>${extraCount}</span></span>
                    ${it.status !== 'completed' ? '<span class="rec-pill is-warn">Sebagian</span>' : ''}
                    <span class="rec-pill is-busy" data-busy-pill hidden>Menggabung…</span>
                  </div>
                  <div class="rec-row-meta">
                    <span>${esc(fmtDate(it.createdAt))}</span>
                    <span>·</span>
                    <span>${esc(fmtDuration(it.durationSec))}</span>
                    <span>·</span>
                    <span>${fmtBytes(it.totalSize)}</span>
                    ${
                      it.linkedNote
                        ? `<span>·</span><a class="rec-note-inline" href="${esc(noteHref)}" title="Buka catatan ${esc(it.linkedNote)}">${rIcon('file')}<span>${esc(it.linkedNote)}</span></a>`
                        : ''
                    }
                  </div>
                </div>
                <div class="rec-row-right">
                  ${
                    primaryPath
                      ? `<button type="button" class="btn btn-ghost btn-icon btn-sm" data-copy-path="${esc(primaryPath)}" title="Path: ${esc(primaryPath)} · Klik untuk salin" aria-label="Salin path file">${rIcon('copy')}</button>`
                      : ''
                  }
                  <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="more" title="Menu aksi lainnya" aria-label="Menu aksi lainnya" aria-haspopup="menu" aria-expanded="false">${rIcon('more')}</button>
                </div>
              </div>
              <div class="rec-player-box" data-player-box hidden></div>
              <div class="rec-files-box" data-files-box${isExpanded ? '' : ' hidden'}></div>
            </article>
          `;
        })
        .join('');

      if (animate && window.gsap) {
        if (dateBarEl && !dateBarEl.hidden) {
          gsap.fromTo(dateBarEl, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', clearProps: 'opacity,transform' });
        }
        const rows = listEl.querySelectorAll('.rec-row');
        if (rows.length) {
          gsap.fromTo(rows, { opacity: 0, y: 10, scale: 0.99 }, { opacity: 1, y: 0, scale: 1, duration: 0.24, stagger: 0.025, ease: 'power2.out', clearProps: 'opacity,transform' });
        }
      }

      visible.forEach((it) => {
        if (!expandedIds.has(it.id)) return;
        const rowEl = listEl.querySelector(`.rec-row[data-rec-id="${CSS.escape(it.id)}"]`);
        const filesBox = rowEl ? $('[data-files-box]', rowEl) : null;
        if (rowEl && filesBox) loadAndRenderFiles(it, filesBox, rowEl);
      });
    }

    if (searchInp) {
      searchInp.addEventListener('input', () => {
        query = searchInp.value;
        renderList(false);
      });
    }

    $('#rec-new-btn', contentEl)?.addEventListener('click', openStartModal);
    $('#rec-copy-root-dir', contentEl)?.addEventListener('click', async () => {
      if (await copyText(recordingsDir)) notify('Path folder rekaman disalin.');
    });

    listEl.addEventListener('click', async (e) => {
      if (e.target.closest('a')) return;
      if (e.target.closest('[data-files-box]')) return;

      const folderBtn = e.target.closest('[data-date-folder]');
      if (folderBtn) {
        const dk = folderBtn.getAttribute('data-date-folder') || '';
        if (dk) {
          location.hash = `#/_recordings/date/${encodeURIComponent(dk)}`;
        }
        return;
      }

      const copyPathBtn = e.target.closest('[data-copy-path]');
      if (copyPathBtn) {
        const pathVal = copyPathBtn.getAttribute('data-copy-path') || '';
        if (await copyText(pathVal)) notify('Path disalin: ' + pathVal);
        return;
      }

      const actBtn = e.target.closest('[data-act]');
      if (!actBtn) return;
      const rowEl = actBtn.closest('[data-rec-id]');
      if (!rowEl) return;
      const id = rowEl.getAttribute('data-rec-id');
      const item = items.find((x) => x.id === id);
      if (!item) return;
      const act = actBtn.dataset.act;

      if (act === 'toggle-play') {
        const existing = rowPlayerCtrls.get(item.id);
        if (existing) {
          existing.destroy();
          return;
        }
        const box = $('[data-player-box]', rowEl);
        if (!box) return;
        mountPlayer(box, item, actBtn);
        return;
      }

      if (act === 'toggle-files') {
        const filesBox = $('[data-files-box]', rowEl);
        if (!filesBox) return;
        const chev = $('[data-chev]', rowEl);
        if (expandedIds.has(item.id)) {
          expandedIds.delete(item.id);
          filesBox.hidden = true;
          rowEl.classList.remove('is-expanded');
          if (chev) chev.innerHTML = rIcon('chevronRight');
        } else {
          expandedIds.add(item.id);
          rowEl.classList.add('is-expanded');
          if (chev) chev.innerHTML = rIcon('chevronDown');
          loadAndRenderFiles(item, filesBox, rowEl);
          if (window.gsap) {
            gsap.fromTo(filesBox, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out', clearProps: 'opacity,transform' });
          }
        }
        return;
      }

      if (act === 'more') {
        openRowDropdown(item, actBtn, rowEl);
      }
    });

    renderList();

    if (focusId) {
      const targetRow = listEl.querySelector(`.rec-row[data-rec-id="${CSS.escape(focusId)}"]`);
      const targetItem = items.find((x) => x.id === focusId);
      if (targetRow && targetItem) {
        setTimeout(() => targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
        if (startSec !== null) {
          const box = $('[data-player-box]', targetRow);
          const playBtn = $('[data-act="toggle-play"]', targetRow);
          if (box) mountPlayer(box, targetItem, playBtn, startSec);
        }
      }
    }
  };

  // Wire topbar button
  const topBtn = $('#record-btn');
  if (topBtn) {
    topBtn.addEventListener('click', openStartModal);
  }
})();
