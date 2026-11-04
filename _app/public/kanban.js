(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const MUTATION_HEADERS = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'ai-note',
  };
  let activeMode = 'notes'; // 'notes' | 'kanban'
  let currentBoardPath = '';
  let currentBoardData = null;
  let activeViewMode = 'board'; // 'board' | 'table'
  let filterText = '';
  let filterStatus = 'all';
  let currentPage = 1;
  const pageSize = 10;
  let boardsList = [];
  let currentModalTicket = null;

  // Icons
  const K_ICONS = {
    kanban: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
    notes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    board: '<rect width="6" height="14" x="4" y="5" rx="1"/><rect width="6" height="10" x="14" y="5" rx="1"/>',
    table: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>',
  };

  const kIcon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${K_ICONS[name] || ''}</svg>`;

  // Elements
  const elSwitchBtn = $('#mode-switch-btn');
  const elModeIcon = $('#mode-icon');
  const elModeLabel = $('#mode-label');
  const elContent = $('#content');
  const elBreadcrumb = $('#breadcrumb');
  const elTicketModalBackdrop = $('#ticket-modal-backdrop');
  const elTicketModalDialog = $('#ticket-modal-dialog');
  const elTicketModalTopbar = $('#ticket-modal-topbar');
  const elTicketModalLeft = $('#ticket-modal-left');
  const elTicketModalRight = $('#ticket-modal-right');
  const elModalBoardTag = $('#modal-board-tag');
  const elModalIdTag = $('#modal-id-tag');
  const elModalMaxBtn = $('#modal-max-btn');
  const elModalCloseBtn = $('#modal-close-btn');
  const elModalEditBtn = $('#modal-edit-note-btn');

  // Maximize state logic
  let isModalMaximized = localStorage.getItem('ticket_modal_max') === 'true';

  function updateModalMaxState() {
    if (!elTicketModalDialog) return;
    if (isModalMaximized) {
      elTicketModalDialog.classList.add('maximized');
      if (elModalMaxBtn) {
        elModalMaxBtn.innerHTML = kIcon('minimize');
        elModalMaxBtn.setAttribute('title', 'Perkecil tampilan (Restore)');
      }
    } else {
      elTicketModalDialog.classList.remove('maximized');
      if (elModalMaxBtn) {
        elModalMaxBtn.innerHTML = kIcon('maximize');
        elModalMaxBtn.setAttribute('title', 'Perbesar tampilan (Maximize)');
      }
    }
  }

  if (elModalMaxBtn) {
    updateModalMaxState();
    elModalMaxBtn.addEventListener('click', () => {
      isModalMaximized = !isModalMaximized;
      localStorage.setItem('ticket_modal_max', isModalMaximized ? 'true' : 'false');
      updateModalMaxState();
    });
  }

  if (elTicketModalTopbar) {
    elTicketModalTopbar.addEventListener('dblclick', () => {
      isModalMaximized = !isModalMaximized;
      localStorage.setItem('ticket_modal_max', isModalMaximized ? 'true' : 'false');
      updateModalMaxState();
    });
  }

  if (elModalEditBtn) {
    elModalEditBtn.innerHTML = kIcon('notes');
  }

  // Inisialisasi Tombol Mode
  if (elModeIcon) elModeIcon.innerHTML = kIcon('kanban');

  if (elSwitchBtn) {
    elSwitchBtn.addEventListener('click', () => {
      toggleMode();
    });
  }

  // Jika navigasi catatan lewat sidebar terjadi saat mode kanban aktif
  window.addEventListener('hashchange', () => {
    if (activeMode === 'kanban' && !window.location.hash.startsWith('#/kanban')) {
      document.body.classList.remove('kanban-mode');
      activeMode = 'notes';
      if (elModeIcon) elModeIcon.innerHTML = kIcon('kanban');
      if (elModeLabel) elModeLabel.textContent = 'Kanban View';
      elSwitchBtn.classList.remove('active');
      elSwitchBtn.title = 'Pindah ke mode Kanban';

      const elTreeTitle = $('.tree-toolbar .muted');
      if (elTreeTitle) elTreeTitle.textContent = 'Daftar catatan';
      $('#expand-all')?.removeAttribute('hidden');
      $('#collapse-all')?.removeAttribute('hidden');

      if (typeof window.renderNoteTree === 'function') {
        window.renderNoteTree();
      }
    }
  });

  function toggleMode(targetMode) {
    const nextMode = targetMode || (activeMode === 'notes' ? 'kanban' : 'notes');
    activeMode = nextMode;

    if (activeMode === 'kanban') {
      document.body.classList.add('kanban-mode');
      if (elModeIcon) elModeIcon.innerHTML = kIcon('notes');
      if (elModeLabel) elModeLabel.textContent = 'Catatan View';
      elSwitchBtn.classList.add('active');
      elSwitchBtn.title = 'Kembali ke mode Catatan';
      startKanbanView();
    } else {
      document.body.classList.remove('kanban-mode');
      if (elModeIcon) elModeIcon.innerHTML = kIcon('kanban');
      if (elModeLabel) elModeLabel.textContent = 'Kanban View';
      elSwitchBtn.classList.remove('active');
      elSwitchBtn.title = 'Pindah ke mode Kanban';

      // Restore toolbar title & tools di sidebar
      const elTreeTitle = $('.tree-toolbar .muted');
      if (elTreeTitle) elTreeTitle.textContent = 'Daftar catatan';
      $('#expand-all')?.removeAttribute('hidden');
      $('#collapse-all')?.removeAttribute('hidden');

      // Kembalikan tree catatan biasa
      if (typeof window.renderNoteTree === 'function') {
        window.renderNoteTree();
      }

      // Kembalikan catatan biasa
      window.location.hash = window.location.hash.startsWith('#/kanban') ? '#/' : window.location.hash;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }

  // ---------- KANBAN SIDEBAR ----------
  function renderKanbanSidebar() {
    const elTree = $('#tree');
    const elTreeTitle = $('.tree-toolbar .muted');
    if (elTreeTitle) elTreeTitle.textContent = 'Daftar Board';

    $('#expand-all')?.setAttribute('hidden', '');
    $('#collapse-all')?.setAttribute('hidden', '');

    if (!elTree) return;
    const boardsHtml = boardsList
      .map((b) => {
        const isActive = b.path === currentBoardPath;
        return `
          <div class="tree-row">
            <button type="button" class="tree-item tree-file${isActive ? ' active' : ''}" data-board-path="${esc(b.path)}" title="${esc(b.name)}">
              ${kIcon('board')}
              <span class="label">${esc(b.name)}</span>
              <span class="count">${b.ticketCount}</span>
            </button>
          </div>
        `;
      })
      .join('');

    elTree.innerHTML = boardsHtml || '<div class="muted" style="padding:1rem;">Belum ada board.</div>';

    elTree.querySelectorAll('[data-board-path]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bPath = btn.getAttribute('data-board-path');
        if (bPath && bPath !== currentBoardPath) {
          loadBoard(bPath);
        }
      });
    });
  }

  // ---------- KANBAN VIEW LOGIC ----------
  async function startKanbanView() {
    document.body.classList.add('kanban-mode');
    try {
      const res = await fetch('/api/kanban/boards');
      const data = await res.json();
      boardsList = data.boards || [];

      if (!currentBoardPath && boardsList.length > 0) {
        currentBoardPath = boardsList[0].path;
      }

      renderKanbanSidebar();
      await loadBoard(currentBoardPath);
    } catch (err) {
      console.error('Gagal memuat papan kanban:', err);
      elContent.innerHTML = `<div class="muted">Gagal memuat Kanban: ${esc(err.message)}</div>`;
    }
  }

  async function loadBoard(path) {
    if (!path && boardsList.length > 0) path = boardsList[0].path;
    currentBoardPath = path;

    // Perbarui active state di sidebar dan select dropdown
    renderKanbanSidebar();
    const sel = $('#kb-select-board');
    if (sel) sel.value = currentBoardPath;

    try {
      const res = await fetch(`/api/kanban/board?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      currentBoardData = await res.json();
      renderKanbanLayout();
    } catch (err) {
      elContent.innerHTML = `
        <div style="padding: 2rem;">
          <h3>Board Belum Tersedia</h3>
          <p class="muted">${esc(err.message)}</p>
          <button class="btn btn-outline" id="kb-btn-new-board-err">Buat Board Baru</button>
        </div>
      `;
      $('#kb-btn-new-board-err')?.addEventListener('click', promptNewBoard);
    }
  }

  function renderKanbanLayout() {
    if (!currentBoardData) return;
    const { board } = currentBoardData;

    // Update breadcrumb
    if (elBreadcrumb) {
      elBreadcrumb.innerHTML = `
        <a href="#/">Catatan</a>
        <span class="sep">/</span>
        <span>Kanban</span>
        <span class="sep">/</span>
        <span class="current">${esc(board.name)}</span>
      `;
    }

    renderKanbanSidebar();

    const shell = $('#kanban-shell', elContent);
    if (!shell) {
      const boardOptions = boardsList
        .map(
          (b) =>
            `<option value="${esc(b.path)}"${b.path === currentBoardPath ? ' selected' : ''}>${esc(b.name)} (${b.ticketCount})</option>`
        )
        .join('');

      elContent.innerHTML = `
        <div class="kanban-container" id="kanban-shell">
          <!-- Header Bar (Tetap utuh, tidak di-recreate saat ngetik) -->
          <div class="kanban-header-bar">
            <div class="kanban-header-left">
              <div class="kanban-board-title-wrap">
                <select class="kanban-board-select" id="kb-select-board">
                  ${boardOptions}
                </select>
              </div>
              <button class="btn btn-ghost btn-sm" id="kb-btn-add-board" title="Buat Papan Baru">
                ${kIcon('plus')} Board Baru
              </button>
            </div>

            <div class="kanban-header-right">
              <input type="text" class="kanban-search-input" id="kb-search-input" placeholder="Cari tiket..." value="${esc(filterText)}">
              
              <div class="view-toggle-group">
                <button class="view-toggle-btn${activeViewMode === 'board' ? ' active' : ''}" id="kb-view-board" type="button">
                  ${kIcon('board')} Board
                </button>
                <button class="view-toggle-btn${activeViewMode === 'table' ? ' active' : ''}" id="kb-view-table" type="button">
                  ${kIcon('table')} Table
                </button>
              </div>

              <button class="btn btn-outline btn-sm" id="kb-btn-add-ticket" style="font-weight:600;">
                ${kIcon('plus')} Tiket Baru
              </button>
            </div>
          </div>

          <!-- Main View Body -->
          <div id="kanban-main-view"></div>
        </div>
      `;

      // Event Listeners for Header
      $('#kb-select-board')?.addEventListener('change', (e) => {
        loadBoard(e.target.value);
      });

      $('#kb-btn-add-board')?.addEventListener('click', promptNewBoard);
      $('#kb-btn-add-ticket')?.addEventListener('click', () => promptNewTicket());

      // Search input tanpa destroy DOM (anti-kedip, kursor tidak loncat)
      const searchInput = $('#kb-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          filterText = e.target.value;
          if (activeViewMode === 'board') {
            applyCardFilter(filterText);
          } else {
            renderMainViewOnly();
          }
        });
      }

      $('#kb-view-board')?.addEventListener('click', () => {
        if (activeViewMode === 'board') return;
        activeViewMode = 'board';
        $('#kb-view-board')?.classList.add('active');
        $('#kb-view-table')?.classList.remove('active');
        renderMainViewOnly();
      });

      $('#kb-view-table')?.addEventListener('click', () => {
        if (activeViewMode === 'table') return;
        activeViewMode = 'table';
        currentPage = 1;
        $('#kb-view-table')?.classList.add('active');
        $('#kb-view-board')?.classList.remove('active');
        renderMainViewOnly();
      });
    } else {
      const sel = $('#kb-select-board');
      if (sel) sel.value = currentBoardPath;
    }

    renderMainViewOnly();
  }

  // Filter kartu secara langsung di DOM (0ms lag, tanpa re-render input)
  function applyCardFilter(query) {
    const q = (query || '').toLowerCase().trim();
    $$('.kanban-col').forEach((col) => {
      let visible = 0;
      col.querySelectorAll('.kanban-card').forEach((card) => {
        const path = card.getAttribute('data-path');
        const t = currentBoardData?.tickets?.find((x) => x.path === path);
        const match =
          !q ||
          (t?.title || '').toLowerCase().includes(q) ||
          (t?.id || '').toLowerCase().includes(q) ||
          (t?.type || '').toLowerCase().includes(q) ||
          (t?.client || '').toLowerCase().includes(q) ||
          (t?.developer || '').toLowerCase().includes(q) ||
          (t?.pic_ba || '').toLowerCase().includes(q) ||
          (t?.status || '').toLowerCase().includes(q) ||
          card.textContent.toLowerCase().includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      const countEl = col.querySelector('.col-badge-count');
      if (countEl) countEl.textContent = visible;
      const emptyBtn = col.querySelector('.kanban-empty-add-btn');
      if (emptyBtn) emptyBtn.style.display = visible === 0 ? '' : 'none';
    });
  }

  // Render hanya bagian kartu / tabel tanpa menyentuh header input
  function renderMainViewOnly() {
    if (!currentBoardData) return;
    const { columns, tickets } = currentBoardData;
    const mainView = $('#kanban-main-view');
    if (!mainView) return;

    if (activeViewMode === 'board') {
      mainView.innerHTML = renderBoardView(columns, tickets || []);
      setupDragAndDrop();
      if (filterText) applyCardFilter(filterText);
    } else {
      const q = filterText.toLowerCase().trim();
      const filtered = (tickets || []).filter((t) => {
        return (
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.type || '').toLowerCase().includes(q) ||
          (t.status || '').toLowerCase().includes(q) ||
          t.client.toLowerCase().includes(q) ||
          t.developer.toLowerCase().includes(q) ||
          (t.pic_ba || '').toLowerCase().includes(q)
        );
      });
      mainView.innerHTML = renderTableView(filtered);
      setupTableClicks();
    }

    // Card click events
    $$('.kanban-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const path = card.getAttribute('data-path');
        if (path) openTicketModal(path);
      });
    });

    // Empty column add button
    $$('.kanban-empty-add-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetStatus = btn.getAttribute('data-status');
        promptNewTicket(targetStatus);
      });
    });
  }

  // ---------- RENDER BOARD VIEW ----------
  function renderBoardView(columns, tickets) {
    const colCols = columns.map((col) => {
      const colTickets = tickets.filter((t) => t.status === col.id);
      const cardsHtml = colTickets
        .map((t) => {
          let typePillClass = 'pill-blue';
          const typeLower = (t.type || '').toLowerCase();
          if (typeLower.includes('major')) typePillClass = 'pill-major-bug';
          else if (typeLower.includes('minor')) typePillClass = 'pill-minor-bug';
          else if (typeLower.includes('change') || typeLower.includes('cr') || typeLower.includes('request')) typePillClass = 'pill-cr';
          else if (typeLower.includes('urgent')) typePillClass = 'pill-urgent';
          else typePillClass = 'pill-task';

          return `
            <div class="kanban-card" draggable="true" data-path="${esc(t.path)}" data-id="${esc(t.id)}">
              <h4 class="kanban-card-title">${esc(t.title)}</h4>
              
              <div class="kanban-card-stack">
                ${t.client ? `<span class="pill pill-client">${esc(t.client)}</span>` : ''}
                ${t.pic_ba ? `<span class="pill pill-ba">${esc(t.pic_ba)}</span>` : ''}
                ${t.developer ? `<span class="pill pill-dev">${esc(t.developer)}</span>` : ''}
                <span class="pill ${typePillClass}">${esc(t.type || 'Task')}</span>
              </div>

              <div class="kanban-card-footer">
                <span class="kanban-card-id">${esc(t.id)}</span>
                ${t.commentsCount > 0 ? `<span class="kanban-card-comment-count" title="${t.commentsCount} Komentar">${kIcon('message')} ${t.commentsCount}</span>` : ''}
              </div>
            </div>
          `;
        })
        .join('');

      const emptyActionHtml = colTickets.length === 0
        ? `<button type="button" class="kanban-empty-add-btn" data-status="${esc(col.id)}">+ New task</button>`
        : '';

      return `
        <div class="kanban-col kanban-col-${esc(col.id)}" data-status="${esc(col.id)}">
          <div class="kanban-col-header">
            <div class="kanban-col-title">
              <span class="col-dot" style="background:${esc(col.dot || '#888')};"></span>
              <span class="col-name">${esc(col.name)}</span>
              <span class="col-badge-count">${colTickets.length}</span>
            </div>
          </div>
          <div class="kanban-col-body" data-status="${esc(col.id)}">
            ${cardsHtml}
            ${emptyActionHtml}
          </div>
        </div>
      `;
    });

    return `<div class="kanban-board">${colCols.join('')}</div>`;
  }

  // ---------- RENDER TABLE / GRID VIEW ----------
  function renderTableView(tickets) {
    const total = tickets.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const paged = tickets.slice(start, start + pageSize);

    const rows = paged
      .map((t) => {
        let statusPill = 'pill-gray';
        if (t.status === 'testing') statusPill = 'pill-purple';
        else if (t.status === 'in-progress') statusPill = 'pill-blue';
        else if (t.status === 'done') statusPill = 'pill-green';

        let typePill = 'pill-gray';
        if ((t.type || '').toLowerCase().includes('major')) typePill = 'pill-blue';
        else if ((t.type || '').toLowerCase().includes('minor')) typePill = 'pill-amber';

        return `
          <tr data-path="${esc(t.path)}">
            <td style="font-family:var(--font-mono); font-weight:700;">${esc(t.id)}</td>
            <td style="font-weight:600;">${esc(t.title)}</td>
            <td><span class="pill ${statusPill}">${esc(t.status)}</span></td>
            <td><span class="pill ${typePill}">${esc(t.type || 'Task')}</span></td>
            <td>${esc(t.client || '-')}</td>
            <td>${esc(t.pic_ba || '-')}</td>
            <td>${esc(t.developer || '-')}</td>
            <td class="muted">${esc(t.modified)}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div class="kanban-table-container">
        <table class="kanban-table">
          <thead>
            <tr>
              <th style="width: 100px;">ID</th>
              <th>Judul Tiket</th>
              <th style="width: 120px;">Status</th>
              <th style="width: 110px;">Type</th>
              <th style="width: 110px;">Client</th>
              <th style="width: 110px;">PIC BA</th>
              <th style="width: 110px;">Developer</th>
              <th style="width: 140px;">Diubah</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" style="text-align:center; padding: 2rem;" class="muted">Tidak ada tiket</td></tr>'}
          </tbody>
        </table>
        
        <div class="kanban-table-pagination">
          <span>Menampilkan ${total === 0 ? 0 : start + 1} - ${Math.min(start + pageSize, total)} dari ${total} tiket</span>
          <div style="display:flex; gap: 0.5rem; align-items:center;">
            <button class="btn btn-outline btn-sm" id="kb-page-prev" ${currentPage <= 1 ? 'disabled' : ''}>Sebelumnya</button>
            <span>Hal ${currentPage} / ${totalPages}</span>
            <button class="btn btn-outline btn-sm" id="kb-page-next" ${currentPage >= totalPages ? 'disabled' : ''}>Berikutnya</button>
          </div>
        </div>
      </div>
    `;
  }

  function setupTableClicks() {
    $$('.kanban-table tbody tr').forEach((row) => {
      row.addEventListener('click', () => {
        const path = row.getAttribute('data-path');
        if (path) openTicketModal(path);
      });
    });

    $('#kb-page-prev')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderKanbanLayout();
      }
    });

    $('#kb-page-next')?.addEventListener('click', () => {
      currentPage++;
      renderKanbanLayout();
    });
  }

  // ---------- DRAG & DROP LOGIC ----------
  function setupDragAndDrop() {
    let draggedCard = null;

    $$('.kanban-card').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        draggedCard = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.getAttribute('data-path') || '');
      });

      card.addEventListener('dragend', () => {
        if (draggedCard) draggedCard.classList.remove('dragging');
        draggedCard = null;
        $$('.kanban-col-body').forEach((b) => b.classList.remove('drag-over'));
      });
    });

    $$('.kanban-col-body').forEach((colBody) => {
      colBody.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        colBody.classList.add('drag-over');
      });

      colBody.addEventListener('dragleave', () => {
        colBody.classList.remove('drag-over');
      });

      colBody.addEventListener('drop', async (e) => {
        e.preventDefault();
        colBody.classList.remove('drag-over');
        if (!draggedCard) return;

        const ticketPath = draggedCard.getAttribute('data-path');
        const targetStatus = colBody.getAttribute('data-status');
        if (!ticketPath || !targetStatus) return;

        // Pindahkan card di DOM
        colBody.appendChild(draggedCard);

        // Update count di header kolom
        updateColumnCounts();

        // Panggil API backend untuk update status di file .md
        try {
          const res = await fetch('/api/kanban/move', {
            method: 'POST',
            headers: MUTATION_HEADERS,
            body: JSON.stringify({ path: ticketPath, status: targetStatus }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Gagal mengubah status');

          // Update local data
          if (currentBoardData && currentBoardData.tickets) {
            const t = currentBoardData.tickets.find((x) => x.path === ticketPath);
            if (t) {
              t.status = targetStatus;
              t.modified = result.modified;
            }
          }
        } catch (err) {
          alert('Gagal memindahkan kartu: ' + err.message);
          loadBoard(currentBoardPath);
        }
      });
    });
  }

  function updateColumnCounts() {
    $$('.kanban-col').forEach((col) => {
      const count = col.querySelectorAll('.kanban-card').length;
      const countEl = col.querySelector('.kanban-col-count');
      if (countEl) countEl.textContent = count;
    });
  }

  // ---------- NOTION-STYLE TICKET MODAL ----------
  function renderCommentsRightColumn(ticket) {
    if (!elTicketModalRight) return;
    const comments = ticket.comments || [];

    const commentsListHtml = comments
      .map((c) => {
        const author = c.author || 'User';
        const initial = author.charAt(0).toUpperCase();
        return `
          <div class="ticket-comment-card">
            <div class="ticket-comment-avatar">${esc(initial)}</div>
            <div class="ticket-comment-content">
              <div class="ticket-comment-meta">
                <span class="ticket-comment-author">${esc(author)}</span>
                <span class="ticket-comment-date">${esc(c.date)}</span>
              </div>
              <div class="ticket-comment-body">${esc(c.text)}</div>
            </div>
          </div>
        `;
      })
      .join('');

    elTicketModalRight.innerHTML = `
      <div class="ticket-comments-header">
        <div class="ticket-comments-title">
          ${kIcon('message')}
          <span>Comments</span>
          <span class="ticket-comments-badge" id="modal-comments-count">${comments.length}</span>
        </div>
      </div>

      <div class="ticket-comments-list" id="modal-comments-list">
        ${commentsListHtml || '<div class="muted" style="font-size:0.8125rem; text-align:center; padding: 2.5rem 1rem;">Belum ada komentar.<br>Tulis komentar pertama di bawah.</div>'}
      </div>

      <form class="ticket-comment-form" id="modal-comment-form">
        <div class="ticket-comment-input-wrap">
          <textarea class="ticket-comment-textarea" id="modal-comment-textarea" placeholder="Tulis komentar... (Ctrl+Enter untuk kirim)" rows="2"></textarea>
          <div class="ticket-comment-footer-actions">
            <span class="ticket-comment-hint">Ctrl+Enter untuk kirim</span>
            <button type="submit" class="btn btn-primary btn-sm" id="modal-comment-send-btn">Kirim</button>
          </div>
        </div>
      </form>
    `;

    // Auto scroll list komentar ke paling bawah
    const listEl = $('#modal-comments-list', elTicketModalRight);
    if (listEl) {
      listEl.scrollTop = listEl.scrollHeight;
    }

    const commentForm = $('#modal-comment-form', elTicketModalRight);
    const textarea = $('#modal-comment-textarea', elTicketModalRight);

    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          commentForm?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      });
    }

    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = (textarea?.value || '').trim();
        if (!val) return;

        const sendBtn = $('#modal-comment-send-btn', commentForm);
        if (sendBtn) sendBtn.disabled = true;

        try {
          const author = ticket.developer || 'Rasimin';
          const res = await fetch('/api/kanban/comment', {
            method: 'POST',
            headers: MUTATION_HEADERS,
            body: JSON.stringify({ path: ticket.path, author, text: val }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal mengirim komentar');

          // Tambahkan komentar ke data tiket lokal
          ticket.comments = ticket.comments || [];
          ticket.comments.push(data.comment || { author, date: new Date().toISOString().slice(0, 10), text: val });
          ticket.commentsCount = ticket.comments.length;

          // Update data tiket di board
          if (currentBoardData && currentBoardData.tickets) {
            const bt = currentBoardData.tickets.find((x) => x.path === ticket.path);
            if (bt) {
              bt.commentsCount = ticket.comments.length;
              const card = $(`.kanban-card[data-path="${ticket.path}"]`);
              if (card) {
                let badge = card.querySelector('.kanban-card-comment-count');
                if (!badge) {
                  const footer = card.querySelector('.kanban-card-footer');
                  if (footer) {
                    badge = document.createElement('span');
                    badge.className = 'kanban-card-comment-count';
                    footer.appendChild(badge);
                  }
                }
                if (badge) {
                  badge.innerHTML = `${kIcon('message')} ${ticket.comments.length}`;
                  badge.title = `${ticket.comments.length} Komentar`;
                }
              }
            }
          }

          renderCommentsRightColumn(ticket);
        } catch (err) {
          alert('Gagal menambah komentar: ' + err.message);
          if (sendBtn) sendBtn.disabled = false;
        }
      });
    }
  }

  async function openTicketModal(ticketPath) {
    if (!elTicketModalBackdrop || !elTicketModalLeft || !elTicketModalRight) return;

    elTicketModalBackdrop.hidden = false;
    updateModalMaxState();

    elTicketModalLeft.innerHTML = `<div class="muted" style="padding: 2rem;">Memuat detail tiket...</div>`;
    elTicketModalRight.innerHTML = `<div class="muted" style="padding: 2rem;">Memuat komentar...</div>`;

    try {
      const res = await fetch(`/api/kanban/ticket?path=${encodeURIComponent(ticketPath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ticket = await res.json();
      currentModalTicket = ticket;

      // Meta tags di topbar modal
      if (elModalBoardTag) elModalBoardTag.textContent = currentBoardData?.board?.name || 'Board';
      if (elModalIdTag) elModalIdTag.textContent = ticket.id;

      // Format callouts dan markdown content
      let renderedBody = ticket.html || '';

      // 1. Hapus duplicate judul h1 jika ada di dalam body
      renderedBody = renderedBody.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');

      // 2. Hapus section Comments dari renderedBody (karena komentar sudah ada di sisi kanan)
      renderedBody = renderedBody.replace(
        /<h[1-6][^>]*>\s*Comments\s*<\/h[1-6]>[\s\S]*?(?=<h[1-6]|$)/gi,
        ''
      );

      // 3. Ubah heading 💡 menjadi callout box Notion style
      renderedBody = renderedBody.replace(
        /<h[1-6][^>]*>💡\s*(.*?)<\/h[1-6]>/gi,
        '<div class="callout-box">💡 $1</div>'
      );

      // Pill warna status
      let statusPillClass = 'pill-gray';
      if (ticket.status === 'testing') statusPillClass = 'pill-purple';
      else if (ticket.status === 'fixing') statusPillClass = 'pill-blue';
      else if (ticket.status === 'code-review') statusPillClass = 'pill-amber';
      else if (ticket.status === 'uat') statusPillClass = 'pill-crimson';
      else if (ticket.status === 'production') statusPillClass = 'pill-green';

      // Pill warna tipe
      let typePillClass = 'pill-gray';
      const typeLower = (ticket.type || '').toLowerCase();
      if (typeLower.includes('major')) typePillClass = 'pill-blue';
      else if (typeLower.includes('minor')) typePillClass = 'pill-amber';
      else if (typeLower.includes('urgent')) typePillClass = 'pill-crimson';

      // Render Sisi Kiri (Detail & Dokumen)
      elTicketModalLeft.innerHTML = `
        <!-- Title -->
        <h1 class="ticket-modal-title" id="modal-ticket-title">${esc(ticket.title)}</h1>

        <!-- Quick Badges Row -->
        <div class="ticket-quick-row">
          <div class="ticket-quick-item">
            <span class="ticket-quick-label">Status</span>
            <span class="pill ${statusPillClass}">${esc(ticket.status)}</span>
          </div>
          <div class="ticket-quick-item">
            <span class="ticket-quick-label">Type</span>
            <span class="pill ${typePillClass}">${esc(ticket.type || 'Task')}</span>
          </div>
          <div class="ticket-quick-item">
            <span class="ticket-quick-label">Client</span>
            <span class="pill pill-client">${esc(ticket.client || 'Empty')}</span>
          </div>
          <div class="ticket-quick-item">
            <span class="ticket-quick-label">Alamat / Lokasi App</span>
            <span class="muted" style="font-size: 0.8125rem;">${esc(ticket.lokasi_app || 'Empty')}</span>
          </div>
        </div>

        <!-- Properties Grid -->
        <div class="ticket-props-grid">
          <div class="prop-key">${kIcon('user')} PIC BA</div>
          <div class="prop-val"><span class="pill pill-ba">${esc(ticket.pic_ba || 'Empty')}</span></div>

          <div class="prop-key">${kIcon('user')} Developper</div>
          <div class="prop-val"><span class="pill pill-dev">${esc(ticket.developer || 'Empty')}</span></div>

          <div class="prop-key">${kIcon('calendar')} Created</div>
          <div class="prop-val">${esc(ticket.created || '-')}</div>

          <div class="prop-key">${kIcon('calendar')} Last edited time</div>
          <div class="prop-val">${esc(ticket.modified || '-')}</div>

          <div class="prop-key">${kIcon('link')} Link Google Drive</div>
          <div class="prop-val">
            ${ticket.gdrive ? `<a href="${esc(ticket.gdrive)}" target="_blank" rel="noopener">${esc(ticket.gdrive)}</a>` : '<span class="muted">Empty</span>'}
          </div>

          <div class="prop-key">🔑 IDNumber</div>
          <div class="prop-val" style="font-family:var(--font-mono); font-weight:600;">${esc(ticket.id)}</div>

          <div class="prop-key">📄 Mini Description</div>
          <div class="prop-val">${esc(ticket.mini_description || 'Empty')}</div>

          <div class="prop-key">📅 ISSUE Date</div>
          <div class="prop-val">${esc(ticket.issue_date || 'Empty')}</div>
        </div>

        <!-- Ticket Body Markdown / Callouts -->
        <div class="ticket-body-content">
          ${renderedBody}
        </div>
      `;

      // Render Sisi Kanan (Comments)
      renderCommentsRightColumn(ticket);

    } catch (err) {
      elTicketModalLeft.innerHTML = `<div class="muted" style="padding: 2rem;">Gagal memuat tiket: ${esc(err.message)}</div>`;
      elTicketModalRight.innerHTML = '';
    }
  }

  function closeTicketModal() {
    if (elTicketModalBackdrop) elTicketModalBackdrop.hidden = true;
    currentModalTicket = null;
  }

  if (elModalCloseBtn) {
    elModalCloseBtn.addEventListener('click', closeTicketModal);
  }

  if (elTicketModalBackdrop) {
    elTicketModalBackdrop.addEventListener('click', (e) => {
      if (e.target === elTicketModalBackdrop) closeTicketModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elTicketModalBackdrop && !elTicketModalBackdrop.hidden) {
      closeTicketModal();
    }
  });

  if (elModalEditBtn) {
    elModalEditBtn.addEventListener('click', () => {
      if (!currentModalTicket) return;
      const targetPath = currentModalTicket.path;
      closeTicketModal();
      toggleMode('notes');
      window.location.hash = '#/' + targetPath;
    });
  }

  // ---------- PROMPT MODALS ----------
  async function promptNewBoard() {
    const name = window.prompt('Masukkan nama papan Kanban baru (misal: "Proyek SBN" atau "SMBCI"):');
    if (!name || !name.trim()) return;

    try {
      const res = await fetch('/api/kanban/create-board', {
        method: 'POST',
        headers: MUTATION_HEADERS,
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat board');

      await startKanbanView();
      loadBoard(data.path);
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  async function promptNewTicket(initialStatus) {
    if (!currentBoardPath) {
      alert('Pilih board terlebih dahulu!');
      return;
    }

    const title = window.prompt('Judul tiket kendala/tugas:');
    if (!title || !title.trim()) return;

    const id = window.prompt('Kode / ID tiket (contoh: CRD-408, TASK-05):', 'CRD-' + Math.floor(100 + Math.random() * 900));
    if (!id || !id.trim()) return;

    const client = window.prompt('Nama Client (misal: BRI Life, Bank Victoria, SMBCI):', currentBoardData?.board?.name || '');

    try {
      const res = await fetch('/api/kanban/create-ticket', {
        method: 'POST',
        headers: MUTATION_HEADERS,
        body: JSON.stringify({
          boardPath: currentBoardPath,
          id: id.trim(),
          title: title.trim(),
          client: (client || '').trim(),
          status: initialStatus || 'new-task',
          type: 'Major bug',
          pic_ba: 'Isnani',
          developper: 'Rasimin',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat tiket');

      await loadBoard(currentBoardPath);
      openTicketModal(data.path);
    } catch (err) {
      alert('Gagal membuat tiket: ' + err.message);
    }
  }
})();
