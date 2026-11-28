import { $, $$, esc, fmtBytes, fmtDate, pl, toast, confirmModal, busy, triggerBlobDownload } from '../utils.js';

export function initDownloadsView({ client, store }) {
  let rawDownloads = [];
  let rawSkipped = [];
  let dlQuery = '';
  let dlSortCol = 'date';
  let dlSortDir = 'desc';
  const dlSelected = new Set();
  let dlPage = 1;
  const dlLimit = 100;

  function sortDownloads(list) {
    return [...list].sort((a, b) => {
      let vA, vB;
      if (dlSortCol === 'date') { vA = new Date(a.downloadedAt || 0); vB = new Date(b.downloadedAt || 0); }
      else if (dlSortCol === 'user') { vA = (a.username || '').toLowerCase(); vB = (b.username || '').toLowerCase(); }
      else if (dlSortCol === 'file') { vA = (a.filename || '').toLowerCase(); vB = (b.filename || '').toLowerCase(); }
      else if (dlSortCol === 'size') { vA = a.fileSize || 0; vB = b.fileSize || 0; }
      if (vA < vB) return dlSortDir === 'asc' ? -1 : 1;
      if (vA > vB) return dlSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function updateSortHeaders() {
    $$('#panel-d th[data-sort]').forEach(th => {
      const col = th.dataset.sort;
      const isCur = col === dlSortCol;
      th.classList.toggle('sorted', isCur);
      const arr = th.querySelector('.s-arr');
      if (arr) arr.textContent = isCur ? (dlSortDir === 'asc' ? '↑' : '↓') : '↕';
    });
  }

  function updateBulkBar() {
    const bar = $('#dl-bulk-bar');
    const countEl = $('#dl-selected-count');
    const allBox = $('#dl-select-all');
    if (bar && countEl) {
      countEl.textContent = dlSelected.size;
      bar.hidden = dlSelected.size === 0;
    }
    if (allBox) {
      const visibleBoxes = $$('.dl-row-cb');
      allBox.checked = visibleBoxes.length > 0 && visibleBoxes.every(cb => dlSelected.has(cb.dataset.id));
      allBox.indeterminate = dlSelected.size > 0 && !allBox.checked;
    }
  }

  function exportCSV(items) {
    if (!items.length) { toast('No records to export', 'error'); return; }
    const header = ['Downloaded_At', 'Username', 'Filename', 'File_Size_Bytes', 'Local_Path'];
    const rows = items.map(i => [
      `"${(i.downloadedAt || '').replace(/"/g, '""')}"`,
      `"${(i.username || '').replace(/"/g, '""')}"`,
      `"${(i.filename || '').replace(/"/g, '""')}"`,
      i.fileSize || 0,
      `"${(i.localPath || '').replace(/"/g, '""')}"`
    ]);
    const csvText = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    triggerBlobDownload(blob, `instavault_downloads_${Date.now()}.csv`);
    toast(`Exported ${pl(items.length, 'record')} to CSV`, 'success');
  }

  function renderDownloads() {
    const q = dlQuery.toLowerCase();
    let list = rawDownloads.filter(i => !q || (i.username || '').toLowerCase().includes(q) || (i.filename || '').toLowerCase().includes(q) || (i.localPath || '').toLowerCase().includes(q));
    list = sortDownloads(list);
    $('#tbody-d').innerHTML = list.length ? list.map(i => {
      const id = String(i.id || i.filename);
      const isSel = dlSelected.has(id);
      return `<tr class="${isSel ? 'selected' : ''}">
        <td style="text-align:center"><input type="checkbox" class="dl-row-cb" data-id="${esc(id)}" ${isSel ? 'checked' : ''} style="accent-color:var(--ac);cursor:pointer"></td>
        <td class="mu">${esc(fmtDate(i.downloadedAt))}</td>
        <td><b>@${esc(i.username)}</b></td>
        <td class="m" title="${esc(i.filename)}">${esc(i.filename)}</td>
        <td class="mu">${fmtBytes(i.fileSize)}</td>
        <td class="m mu" title="${esc(i.localPath)}">${esc(i.localPath)}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" class="empty">${rawDownloads.length ? 'No items match filter' : 'No downloads recorded yet.'}</td></tr>`;
    updateSortHeaders();
    updateBulkBar();
  }

  function renderSkipped() {
    const q = dlQuery.toLowerCase();
    const list = rawSkipped.filter(i => !q || (i.username || '').toLowerCase().includes(q) || (i.filename || '').toLowerCase().includes(q));
    $('#tbody-s').innerHTML = list.length
      ? list.map(i => `<tr><td class="mu">${esc(fmtDate(i.skippedAt))}</td><td><b>@${esc(i.username)}</b></td><td class="m" title="${esc(i.filename)}">${esc(i.filename)}</td><td><span class="tag">Already exists</span></td><td style="text-align:right"><button class="btn dng" data-id="${esc(i.id)}">Remove</button></td></tr>`).join('')
      : `<tr><td colspan="5" class="empty">${rawSkipped.length ? 'No items match filter' : 'No skipped duplicates.'}</td></tr>`;
  }

  async function loadDownloads(append = false) {
    try {
      if (!append) dlPage = 1;
      const batch = await client.listDownloads({ page: dlPage, limit: dlLimit });
      rawDownloads = append ? rawDownloads.concat(batch) : batch;
      const wrap = $('#dl-more-wrap');
      if (wrap) wrap.hidden = batch.length < dlLimit;
      renderDownloads();
    } catch (e) { console.error(e); }
  }

  async function loadSkipped() {
    try {
      rawSkipped = await client.listSkipped({ limit: 100 });
      renderSkipped();
    } catch (e) { console.error(e); }
  }

  function tabs(skipped) {
    $('#tab-d').setAttribute('aria-selected', !skipped);
    $('#tab-s').setAttribute('aria-selected', skipped);
    $('#panel-d').hidden = skipped;
    $('#panel-s').hidden = !skipped;
    $('#clear-d').hidden = skipped;
    $('#clear-s').hidden = !skipped;
    skipped ? loadSkipped() : loadDownloads();
  }

  /* Store Subscriptions */
  store.subscribe('viewChanged', ({ view }) => {
    if (view === 'downloads') {
      loadDownloads();
      loadSkipped();
    }
  });

  store.subscribe('downloadsCountChanged', ({ activeView }) => {
    if (activeView === 'downloads') loadDownloads();
  });

  store.subscribe('databaseImported', () => {
    loadDownloads();
    loadSkipped();
  });

  /* DOM Event Handlers */
  $('#panel-d thead').onclick = e => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const col = th.dataset.sort;
    if (dlSortCol === col) dlSortDir = dlSortDir === 'asc' ? 'desc' : 'asc';
    else { dlSortCol = col; dlSortDir = col === 'date' || col === 'size' ? 'desc' : 'asc'; }
    updateSortHeaders();
    renderDownloads();
  };

  $('#dl-select-all').onchange = e => {
    const ch = e.target.checked;
    $$('.dl-row-cb').forEach(cb => {
      const id = cb.dataset.id;
      if (ch) dlSelected.add(id); else dlSelected.delete(id);
      cb.checked = ch;
      cb.closest('tr')?.classList.toggle('selected', ch);
    });
    updateBulkBar();
  };

  $('#tbody-d').onchange = e => {
    const cb = e.target.closest('.dl-row-cb');
    if (!cb) return;
    const id = cb.dataset.id;
    if (cb.checked) dlSelected.add(id); else dlSelected.delete(id);
    cb.closest('tr')?.classList.toggle('selected', cb.checked);
    updateBulkBar();
  };

  $('#dl-bulk-close').onclick = () => {
    dlSelected.clear();
    $$('.dl-row-cb').forEach(cb => { cb.checked = false; cb.closest('tr')?.classList.remove('selected'); });
    updateBulkBar();
  };

  $('#dl-export-btn').onclick = () => {
    const q = dlQuery.toLowerCase();
    const list = rawDownloads.filter(i => !q || (i.username || '').toLowerCase().includes(q) || (i.filename || '').toLowerCase().includes(q) || (i.localPath || '').toLowerCase().includes(q));
    exportCSV(sortDownloads(list));
  };

  $('#dl-bulk-csv').onclick = () => {
    const items = rawDownloads.filter(i => dlSelected.has(String(i.id || i.filename)));
    exportCSV(items);
  };

  $('#dl-bulk-copy').onclick = async () => {
    const items = rawDownloads.filter(i => dlSelected.has(String(i.id || i.filename)));
    const paths = items.map(i => i.localPath).filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(paths);
      toast(`Copied ${pl(items.length, 'file path')} to clipboard`, 'success');
    } catch { toast('Could not copy paths', 'error'); }
  };

  $('#dl-bulk-del').onclick = async e => {
    const items = rawDownloads.filter(i => dlSelected.has(String(i.id || i.filename)));
    if (!items.length) return;
    if (!(await confirmModal(`Remove ${pl(items.length, 'selected item')} from download records?`, 'Remove records', 'Remove'))) return;
    await busy(e.currentTarget, 'Removing…', async () => {
      let removed = 0, failed = 0;
      try {
        for (const item of items) {
          if (!item.id) { failed++; continue; }
          try {
            await client.deleteDownload(item.id);
            removed++;
            dlSelected.delete(String(item.id));
          } catch {
            failed++;
          }
        }
        if (failed === 0) toast(`Removed ${pl(removed, 'record')}`, 'success');
        else if (removed > 0) toast(`Removed ${removed}, failed to remove ${failed}`, 'error');
        else toast('Could not remove selected records', 'error');
        loadDownloads();
        store.refreshStats();
      } catch { toast('Could not remove records', 'error'); }
    });
  };

  if ($('#dl-more-btn')) $('#dl-more-btn').onclick = () => { dlPage++; loadDownloads(true); };

  let dlSearchTimer;
  $('#dl-search').oninput = e => {
    clearTimeout(dlSearchTimer);
    dlSearchTimer = setTimeout(() => {
      dlQuery = e.target.value.trim();
      renderDownloads();
      renderSkipped();
    }, 100);
  };

  $('#tbody-s').onclick = async e => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    await busy(b, 'Removing…', async () => {
      try {
        await client.deleteSkipped(b.dataset.id);
        loadSkipped();
        store.refreshStats();
      } catch { toast('Could not remove entry', 'error'); }
    });
  };

  $('#tab-d').onclick = () => tabs(false);
  $('#tab-s').onclick = () => tabs(true);

  const clearer = (btn, msg, action, done) => $(btn).onclick = async e => {
    if (!(await confirmModal(msg, 'Clear log', 'Clear'))) return;
    await busy(e.currentTarget, 'Clearing…', async () => {
      try {
        await action();
        toast(done, 'success');
        loadDownloads();
        loadSkipped();
        store.refreshStats();
      } catch { toast('Could not clear log', 'error'); }
    });
  };
  clearer('#clear-d', 'Clear download history records? (Files on disk will remain untouched)', () => client.clearDownloads(), 'Download history cleared');
  clearer('#clear-s', 'Clear skipped duplicates log?', () => client.clearSkipped(), 'Skipped log cleared');

  return {
    renderDownloads,
    renderSkipped,
    loadDownloads,
    loadSkipped,
    tabs,
  };
}
