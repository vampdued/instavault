import { $, $$, esc, fmtBytes, pl, toast } from '../utils.js';
import { TAG } from '../state.js';

export function initActivityView({ store }) {
  let filter = 'all';
  let tailFilter = 'all';
  let follow = true;
  let streamPaused = false;
  let logSearchQuery = '';
  let activeLogIndex = -1;
  let traceCounts = new Array(60).fill(0);

  const getLogs = () => store.getState().logs;

  const lgRow = (l, i = -1) => {
    const [c, n] = TAG[l.status] || ['', String(l.status).toUpperCase()];
    const name = String(l.filename || '');
    return `<div class="lg ${activeLogIndex === i ? 'active-log' : ''}" data-idx="${i}" role="button" tabindex="0"><span><span class="t">${new Date(l.timestamp).toLocaleTimeString([], { hour12: false })}</span><span class="u">@${esc(l.username)}</span><span class="f" title="${esc(name)}">${esc(name)}</span></span><span>${l.size ? `<span class="t">${fmtBytes(l.size)}</span> ` : ''}<span class="s ${c}" ${l.error ? `title="${esc(l.error)}"` : ''}>${n}</span></span></div>`;
  };

  function renderFeed(active) {
    const logs = getLogs();
    const indexed = logs.map((l, i) => ({ l, i }));
    const tailRows = indexed.filter(({ l }) =>
      tailFilter === 'all' ||
      (tailFilter === 'completed' && ['completed', 'downloading'].includes(l.status)) ||
      (tailFilter === 'skipped' && l.status === 'skipped')
    );
    $('#tail').innerHTML = tailRows.length
      ? tailRows.slice(-8).map(({ l, i }) => lgRow(l, i)).join('')
      : `<p class="hint">No matching events in recent activity.</p>`;
    $('#evcount').textContent = pl(logs.length, 'event');
    if (streamPaused && active) return;
    const feed = $('#feed');
    const stick = feed.scrollHeight - feed.clientHeight <= feed.scrollTop + 30;
    if (!logs.length) {
      feed.innerHTML = `<p class="hint">Waiting for events from the browser extension…</p>`;
      return;
    }
    const q = logSearchQuery;
    const rows = [];
    logs.forEach((l, i) => {
      const matchStatus =
        filter === 'all' ||
        (filter === 'completed' && ['completed', 'downloading'].includes(l.status)) ||
        (filter === 'skipped' && l.status === 'skipped') ||
        (filter === 'error' && ['failed', 'error'].includes(l.status));
      const matchQuery =
        !q ||
        (l.username || '').toLowerCase().includes(q) ||
        (l.filename || '').toLowerCase().includes(q) ||
        (l.status || '').toLowerCase().includes(q);
      if (matchStatus && matchQuery) rows.push(lgRow(l, i));
    });
    feed.innerHTML = rows.join('') || `<p class="hint">No events match this filter.</p>`;
    if (follow && (stick || active)) feed.scrollTop = feed.scrollHeight;
  }

  function trace() {
    const logs = getLogs();
    const now = Date.now();
    const b = new Array(60).fill(0);
    logs.forEach(l => {
      const a = Math.floor((now - new Date(l.timestamp)) / 1000);
      if (a >= 0 && a < 60) b[59 - a]++;
    });
    traceCounts = b;
    const m = Math.max(2, ...b);
    $('#trace').innerHTML = b.map((v, i) => `<rect data-i="${i}" x="${i}" y="${20 - v / m * 20}" width=".75" height="${v / m * 20 || 0.4}"/>`).join('');
    $('#trace-n').textContent = pl(b.reduce((a, c) => a + c, 0), 'event');
  }

  function openLogDrawer(idx) {
    const l = getLogs()[idx];
    if (!l) return;
    activeLogIndex = idx;
    const dot = $('#ld-dot');
    if (dot) dot.className = 'dot ' + (l.status === 'completed' ? 'ok' : l.status === 'skipped' ? 'wn' : l.status === 'failed' ? 'off' : 'live');
    $('#ld-title').textContent = `@${l.username || 'unknown'} Event`;
    $('#ld-status').textContent = String(l.status).toUpperCase();
    $('#ld-status').className = (TAG[l.status] || [''])[0];
    $('#ld-user').textContent = '@' + (l.username || 'unknown');
    $('#ld-file').textContent = l.filename || '—';
    $('#ld-time').textContent = new Date(l.timestamp).toLocaleString();
    $('#log-drawer-json').textContent = JSON.stringify(l, null, 2);
    $('#log-drawer').hidden = false;
    $$('.lg').forEach(el => el.classList.toggle('active-log', +el.dataset.idx === idx));
  }

  function closeLogDrawer() {
    $('#log-drawer').hidden = true;
    activeLogIndex = -1;
    $$('.lg').forEach(el => el.classList.remove('active-log'));
  }

  function renderAccountsList() {
    const { dashAccQuery, accounts } = store.getState();
    const q = (dashAccQuery || '').toLowerCase();
    const list = accounts.filter(x => !q || (x.username || '').toLowerCase().includes(q));
    const max = Math.max(1, ...accounts.map(x => x.count || 0));
    $('#accounts').innerHTML = list.length
      ? list.map(x => `<div class="prow"><div class="av">${esc((x.username || 'IV').slice(0, 2))}</div><div style="min-width:0"><b>@${esc(x.username)}</b><small>${x.count} saved</small></div><div class="meter"><i style="width:${x.count / max * 100}%"></i></div><button class="btn" data-user="${esc(x.username)}">View media</button></div>`).join('')
      : `<p class="empty">${accounts.length ? 'No accounts match search' : 'Nothing archived yet. Browse an Instagram profile with the extension active.'}</p>`;
  }

  /* Store Subscriptions */
  store.subscribe('statsUpdated', ({ activeSync }) => {
    renderFeed(Boolean(activeSync && activeSync.isActive));
    trace();
  });

  store.subscribe('syncEvent', ({ live }) => {
    renderFeed(live);
    trace();
  });

  store.subscribe('logsUpdated', () => {
    const { activeSync } = store.getState();
    renderFeed(Boolean(activeSync && activeSync.isActive));
    trace();
  });

  store.subscribe('accountsUpdated', () => {
    renderAccountsList();
  });

  /* DOM Event Handlers */
  $('#stream-toggle').onclick = () => {
    streamPaused = !streamPaused;
    const btn = $('#stream-toggle');
    btn.classList.toggle('paused', streamPaused);
    btn.classList.toggle('live', !streamPaused);
    btn.textContent = streamPaused ? '❚❚ Paused' : '● Live';
    toast(streamPaused ? 'Live feed paused (events still buffering)' : 'Live feed resumed', 'info');
    if (!streamPaused) renderFeed(true);
  };

  let logSearchTimer;
  $('#log-search').oninput = e => {
    clearTimeout(logSearchTimer);
    logSearchTimer = setTimeout(() => {
      logSearchQuery = e.target.value.trim().toLowerCase();
      renderFeed(false);
    }, 100);
  };

  $('#log-drawer-close').onclick = closeLogDrawer;
  $('#log-drawer-copy').onclick = async () => {
    const l = getLogs()[activeLogIndex];
    if (!l) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(l, null, 2));
      toast('Event JSON copied to clipboard', 'success');
    } catch {
      toast('Could not copy JSON', 'error');
    }
  };

  $('#feed').onclick = e => {
    const row = e.target.closest('.lg[data-idx]');
    if (row) openLogDrawer(+row.dataset.idx);
  };
  $('#feed').onkeydown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const row = e.target.closest('.lg[data-idx]');
      if (row) { e.preventDefault(); openLogDrawer(+row.dataset.idx); }
    }
  };
  $('#tail').onclick = e => {
    const row = e.target.closest('.lg[data-idx]');
    if (row && +row.dataset.idx >= 0) {
      store.setView('activity');
      openLogDrawer(+row.dataset.idx);
    }
  };
  $('#tail').onkeydown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const row = e.target.closest('.lg[data-idx]');
      if (row && +row.dataset.idx >= 0) {
        e.preventDefault();
        store.setView('activity');
        openLogDrawer(+row.dataset.idx);
      }
    }
  };

  $('#tail-filters').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#tail-filters .seg').forEach(x => x.classList.toggle('on', x === b));
    tailFilter = b.dataset.tf;
    renderFeed(false);
  };

  $('#trace').onmousemove = e => {
    const rect = $('#trace').getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.min(59, Math.max(0, Math.floor((x / rect.width) * 60)));
    const tip = $('#trace-tip');
    tip.style.left = `${(idx / 60) * 100}%`;
    tip.style.opacity = '1';
    tip.textContent = `${59 - idx}s ago: ${traceCounts[idx]} events/sec`;
  };
  $('#trace').onmouseleave = () => ($('#trace-tip').style.opacity = '0');

  $('#filters').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#filters .seg').forEach(x => x.classList.toggle('on', x === b));
    filter = b.dataset.f;
    renderFeed(false);
  };
  $('#autoscroll').onclick = e => {
    follow = !follow;
    e.currentTarget.classList.toggle('on', follow);
    e.currentTarget.textContent = 'Follow: ' + (follow ? 'on' : 'off');
    if (follow) $('#feed').scrollTop = $('#feed').scrollHeight;
  };
  $('#clearlog').onclick = () => {
    store.clearLogs();
  };
  $('#copylog').onclick = async () => {
    const logs = getLogs();
    if (!logs.length) return toast('No events to copy');
    try {
      await navigator.clipboard.writeText(
        logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${String(l.status).toUpperCase()}] @${l.username} ${l.filename} ${l.size ? fmtBytes(l.size) : ''}`).join('\n')
      );
      toast('Event log copied to clipboard', 'success');
    } catch { toast('Could not copy log', 'error'); }
  };

  $('#dash-acc-search').oninput = e => {
    store.setDashAccQuery(e.target.value.trim().toLowerCase());
    renderAccountsList();
  };
  $('#accounts').onclick = e => {
    const b = e.target.closest('[data-user]');
    if (b) {
      store.setGalleryUser(b.dataset.user);
      store.setView('gallery');
    }
  };

  function handleKeydown(e) {
    const drawer = $('#log-drawer');
    if (drawer && !drawer.hidden && e.key === 'Escape') {
      closeLogDrawer();
      return true;
    }
    return false;
  }

  return {
    renderFeed,
    trace,
    openLogDrawer,
    closeLogDrawer,
    renderAccountsList,
    handleKeydown,
  };
}
