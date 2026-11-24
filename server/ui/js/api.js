import { $, fmtBytes, getJSON } from './utils.js';
import { state, TAG } from './state.js';
import { upsertLiveLog, renderFeed, trace, renderAccountsList } from './views/activity.js';
import { loadDownloads, loadSkipped } from './views/downloads.js';
import { loadSettings } from './views/settings.js';
import { loadGallery } from './views/gallery.js';

let sse = null;
let sseConnected = false;
let sseStatsTimer = null;

export function setOnline(ok) {
  if (state.online === ok) return;
  state.online = ok;
  const p = $('#pill');
  if (p) p.classList.toggle('off', !ok);
  const sbDot = $('#sb-conn .dot');
  if (sbDot) sbDot.classList.toggle('off', !ok);
  const sbt = $('#sb-conn-t');
  if (sbt) sbt.textContent = ok ? 'Connected' : 'App offline';
  if (!ok) {
    const pt = $('#pill-t');
    if (pt) pt.textContent = 'App offline';
    $('#st-main').textContent = 'Offline';
    $('#st-sub').textContent = 'Cannot reach the InstaVault app. Reconnecting…';
    $('#st-dot').className = 'dot off';
  }
}

function applySyncBanner(a, latest) {
  const live = !!(a && a.isActive);
  const isPrep = live && a.stage === 'preparing';
  const curPort = location.port || '19201';
  const p = $('#pill');
  if (p) {
    p.classList.toggle('live', live);
    const pt = $('#pill-t');
    if (pt) pt.textContent = live ? (isPrep ? `Preparing ${a.username ? '@' + a.username : 'media'}…` : `Syncing @${a.username || 'unknown'}`) : `Online · :${curPort} · idle`;
  }
  const sbDot = $('#sb-conn .dot');
  if (sbDot) sbDot.className = 'dot' + (live ? ' live' : '');
  $('#st-dot').className = 'dot' + (live ? ' live' : '');
  $('#st-main').textContent = live ? (isPrep ? `Preparing ${a.username ? '@' + a.username : 'media'}…` : `Syncing @${a.username || 'unknown'}`) : 'Idle';
  if ($('#nav-sync-dot')) $('#nav-sync-dot').classList.toggle('live', live);
  const riAct = $('[data-view="activity"]');
  if (riAct) riAct.setAttribute('data-tip', live ? `Live activity (2) · Syncing @${a.username}` : `Live activity (2) · Idle`);
  const last = latest || (a && a.liveLogs && a.liveLogs.slice(-1)[0]);
  $('#st-sub').textContent = live
    ? (isPrep
        ? 'Fetching post metadata from Instagram…'
        : (last
            ? `${last.filename || last.shortcode}${last.size ? ` (${fmtBytes(last.size)})` : ''} — ${last.status === 'completed' ? 'saved' : last.status === 'skipped' ? 'duplicate skipped' : last.status === 'failed' ? 'failed to save' : last.status}`
            : 'Receiving media from browser extension…'))
    : 'Waiting for the extension. Open an Instagram profile to start saving.';
  return live;
}

export async function loadStats() {
  try {
    const [d, accounts] = await Promise.all([getJSON('/api/stats'), getJSON('/api/accounts')]);
    setOnline(true);
    const num = n => (n || 0).toLocaleString();
    $('#stat-total-dl').textContent = num(d.totalDownloads);
    $('#stat-total-skipped').textContent = num(d.totalSkipped);
    $('#stat-unique-accounts').textContent = num(d.uniqueAccounts);
    $('#sb-cnt').textContent = `${num(d.totalDownloads)} saved · ${num(d.totalSkipped)} skipped`;

    const curPort = location.port || '19201';
    $('#d-host').textContent = `listening on localhost:${curPort}`;
    if ($('#rf-ver') && d.version) $('#rf-ver').textContent = 'v' + String(d.version).replace(/^v/i, '');
    if ($('#rf-port')) $('#rf-port').textContent = ':' + curPort;
    if ($('#settings-meta')) $('#settings-meta').textContent = `SQLite Config · :${curPort}`;

    if (d.diskTotal > 0) {
      const used = d.diskTotal - d.diskFree;
      const pct = Math.round(used / d.diskTotal * 100);
      $('#disk-text').textContent = `${fmtBytes(used)} of ${fmtBytes(d.diskTotal)}`;
      $('#disk-pct').textContent = `${pct}% used`;
      $('#disk-free').textContent = `${fmtBytes(d.diskFree)} free`;
      $('#sb-disk').textContent = `Disk ${pct}%`;
      const gauge = $('#gauge');
      const numF = Math.round(pct / 100 * 40);
      [...gauge.children].forEach((c, i) => {
        const isF = i < numF;
        const tier = i >= 36 ? 'tier-er' : (i >= 30 ? 'tier-wn' : 'tier-ok');
        c.className = isF ? `f ${tier}` : '';
      });
      gauge.setAttribute('aria-label', `Disk ${pct}% used`);
      const warnEl = $('#disk-warn');
      if (warnEl) {
        warnEl.hidden = pct < 75;
        if (pct >= 90) { warnEl.textContent = 'Storage Critical (>90%)'; warnEl.className = 'warn er'; }
        else if (pct >= 75) { warnEl.textContent = 'Storage Warning (>75%)'; warnEl.className = 'warn wn'; }
      }
    }

    const a = d.activeSync;
    const live = applySyncBanner(a, null);
    if ($('#nav-badge-dl')) $('#nav-badge-dl').textContent = num(d.totalDownloads);
    if ($('#nav-badge-gl')) $('#nav-badge-gl').textContent = num(d.uniqueAccounts);
    const riDl = $('[data-view="downloads"]');
    if (riDl) riDl.setAttribute('data-tip', `Downloads (3) · ${num(d.totalDownloads)} saved`);
    const riGl = $('[data-view="gallery"]');
    if (riGl) riGl.setAttribute('data-tip', `Gallery (4) · ${num(d.uniqueAccounts)} profiles`);

    if (a && a.liveLogs) a.liveLogs.forEach(upsertLiveLog);
    renderFeed(live);
    trace();

    const lg = state.logs[state.logs.length - 1];
    $('#sb-last').textContent = lg ? `Last: @${lg.username} ${lg.filename} — ${(TAG[lg.status] || [0, lg.status])[1].toLowerCase()}` : 'No events yet';
    $('#d-up').textContent = `UI open ${Math.floor((Date.now() - state.startedAt) / 60000)}m`;

    const key = JSON.stringify(accounts);
    if (key !== state.lastAcc) {
      state.lastAcc = key;
      state.rawAccounts = accounts;
      renderAccountsList();
    }
    if (state.lastTotalDownloads !== null && d.totalDownloads !== state.lastTotalDownloads) {
      if ($('#view-downloads')?.classList.contains('on')) loadDownloads();
      if ($('#view-gallery')?.classList.contains('on')) loadGallery();
    }
    state.lastTotalDownloads = d.totalDownloads;
  } catch {
    setOnline(false);
  }
}

export function connectSSE() {
  if (typeof EventSource === 'undefined' || sse) return;
  try {
    sse = new EventSource('/api/events');
    sse.onopen = () => { sseConnected = true; setOnline(true); };
    sse.addEventListener('sync', ev => {
      try {
        const data = JSON.parse(ev.data);
        const a = data.activeSync;
        if (a) {
          if (a.liveLogs) a.liveLogs.forEach(upsertLiveLog);
          if (data.latest) upsertLiveLog(data.latest);
          const live = applySyncBanner(a, data.latest);
          renderFeed(live);
          trace();
          const lg = state.logs[state.logs.length - 1];
          $('#sb-last').textContent = lg ? `Last: @${lg.username} ${lg.filename} — ${(TAG[lg.status] || [0, lg.status])[1].toLowerCase()}` : 'No events yet';
        }
        if (data.databaseImported) {
          state.lastAcc = '';
          loadStats();
          loadDownloads();
          loadSkipped();
          loadSettings();
          if ($('#view-gallery')?.classList.contains('on')) loadGallery();
        }
        if (data.latest && ['completed', 'skipped', 'failed'].includes(data.latest.status)) {
          clearTimeout(sseStatsTimer);
          sseStatsTimer = setTimeout(loadStats, 150);
        }
      } catch {}
    });
    sse.onerror = () => {
      sseConnected = false;
      if (sse) { try { sse.close(); } catch {} sse = null; }
    };
  } catch {
    sseConnected = false;
  }
}

export function startRealtimeSync() {
  connectSSE();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadStats();
      if (!sseConnected) connectSSE();
    }
  });
  let pollTick = 0;
  setInterval(() => {
    if (document.hidden) return;
    pollTick++;
    if (!sseConnected) {
      loadStats();
      if (pollTick % 3 === 0) connectSSE();
    } else if (pollTick % 6 === 0) {
      loadStats();
    }
  }, 1500);
}
