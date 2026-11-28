import { $, $$, ic, hydrateIcons, store as prefStore, fmtBytes, toast } from './utils.js';
import { daemonClient } from './api.js';
import { VIEWS, NAMES, TAG, appStore } from './state.js';
import { initActivityView } from './views/activity.js';
import { initDownloadsView } from './views/downloads.js';
import { initGalleryView } from './views/gallery.js';
import { initSettingsView } from './views/settings.js';

hydrateIcons();

/* Theme & Clock */
function theme(t) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  $('#theme').innerHTML = ic(t === 'dark' ? 'sun' : 'moon');
  prefStore.set('theme', t);
}
const toggleTheme = () => theme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
theme(prefStore.get('theme') || 'dark');
$('#theme').onclick = toggleTheme;
const tick = () => ($('#clock').textContent = new Date().toLocaleTimeString([], { hour12: false }));
setInterval(tick, 1000);
tick();

/* Rail Collapse */
const rail = m => {
  $('#app').classList.toggle('min', m);
  document.documentElement.classList.toggle('min-rail', m);
  prefStore.set('rail-min', m);
  const btn = $('#sidebar-toggle');
  if (btn) {
    btn.setAttribute('aria-expanded', !m);
    const tip = m ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)';
    btn.setAttribute('title', tip);
    btn.setAttribute('data-tip', tip);
    btn.classList.toggle('active', !m);
  }
};
const toggleRail = () => rail(!$('#app').classList.contains('min'));
rail(prefStore.get('rail-min') === 'true' || (prefStore.get('rail-min') === null && innerWidth < 1024));

const sToggle = $('#sidebar-toggle');
if (sToggle) sToggle.onclick = e => { e.stopPropagation(); toggleRail(); };
const rHead = $('.rail-head');
if (rHead) rHead.onclick = () => { if ($('#app').classList.contains('min') || document.documentElement.classList.contains('min-rail')) toggleRail(); };
const bBrand = $('.brand');
if (bBrand) bBrand.onclick = () => { if (!$('#app').classList.contains('min') && !document.documentElement.classList.contains('min-rail')) appStore.setView('dashboard'); };

/* Shell Status, Disk Gauge & Sync Banner */
const gaugeEl = $('#gauge');
if (gaugeEl) gaugeEl.innerHTML = '<i></i>'.repeat(40);

function renderConnection(ok) {
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

function renderSyncBanner(a, latest) {
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
}

function renderLastEvent(logs) {
  const lg = logs[logs.length - 1];
  $('#sb-last').textContent = lg
    ? `Last: @${lg.username} ${lg.filename} — ${(TAG[lg.status] || [0, lg.status])[1].toLowerCase()}`
    : 'No events yet';
}

function renderStatsSummary({ stats, disk, activeSync, logs }) {
  const num = n => (n || 0).toLocaleString();
  $('#stat-total-dl').textContent = num(stats.totalDownloads);
  $('#stat-total-skipped').textContent = num(stats.totalSkipped);
  $('#stat-unique-accounts').textContent = num(stats.uniqueAccounts);
  $('#sb-cnt').textContent = `${num(stats.totalDownloads)} saved · ${num(stats.totalSkipped)} skipped`;

  const curPort = location.port || '19201';
  $('#d-host').textContent = `listening on localhost:${curPort}`;
  if ($('#rf-ver') && stats.version) $('#rf-ver').textContent = 'v' + String(stats.version).replace(/^v/i, '');
  if ($('#rf-port')) $('#rf-port').textContent = ':' + curPort;
  if ($('#settings-meta')) $('#settings-meta').textContent = `SQLite Config · :${curPort}`;

  if (disk) {
    $('#disk-text').textContent = `${fmtBytes(disk.used)} of ${fmtBytes(disk.total)}`;
    $('#disk-pct').textContent = `${disk.pct}% used`;
    $('#disk-free').textContent = `${fmtBytes(disk.free)} free`;
    $('#sb-disk').textContent = `Disk ${disk.pct}%`;
    const gauge = $('#gauge');
    const numF = Math.round(disk.pct / 100 * 40);
    [...gauge.children].forEach((c, i) => {
      const isF = i < numF;
      const tier = i >= 36 ? 'tier-er' : (i >= 30 ? 'tier-wn' : 'tier-ok');
      c.className = isF ? `f ${tier}` : '';
    });
    gauge.setAttribute('aria-label', `Disk ${disk.pct}% used`);
    const warnEl = $('#disk-warn');
    if (warnEl) {
      warnEl.hidden = disk.pct < 75;
      if (disk.pct >= 90) { warnEl.textContent = 'Storage Critical (>90%)'; warnEl.className = 'warn er'; }
      else if (disk.pct >= 75) { warnEl.textContent = 'Storage Warning (>75%)'; warnEl.className = 'warn wn'; }
    }
  }

  renderSyncBanner(activeSync, null);
  if ($('#nav-badge-dl')) $('#nav-badge-dl').textContent = num(stats.totalDownloads);
  if ($('#nav-badge-gl')) $('#nav-badge-gl').textContent = num(stats.uniqueAccounts);
  const riDl = $('[data-view="downloads"]');
  if (riDl) riDl.setAttribute('data-tip', `Downloads (3) · ${num(stats.totalDownloads)} saved`);
  const riGl = $('[data-view="gallery"]');
  if (riGl) riGl.setAttribute('data-tip', `Gallery (4) · ${num(stats.uniqueAccounts)} profiles`);

  renderLastEvent(logs);
  $('#d-up').textContent = `UI open ${Math.floor((Date.now() - appStore.getState().startedAt) / 60000)}m`;
}

appStore.subscribe('connectionChanged', ({ online }) => renderConnection(online));
appStore.subscribe('statsUpdated', payload => renderStatsSummary(payload));
appStore.subscribe('syncEvent', ({ activeSync, latest, logs }) => {
  renderSyncBanner(activeSync, latest);
  renderLastEvent(logs);
});
appStore.subscribe('logsUpdated', ({ logs }) => renderLastEvent(logs));

/* Navigation via App Store */
appStore.subscribe('viewChanged', ({ view }) => {
  $$('.view').forEach(e => e.classList.toggle('on', e.dataset.viewPanel === view || e.id === 'view-' + view || e.id === view));
  $$('.ri[data-view]').forEach(b => b.dataset.view === view ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if ($('#view-h1')) $('#view-h1').textContent = NAMES[view] || 'Overview';
  if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
  if (view === 'dashboard' || view === 'activity') appStore.refreshStats();
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const ws = $('.workspace');
  if (ws) ws.scrollTop = 0;
  $('#main').scrollTop = 0;
});

document.addEventListener('click', e => {
  const t = e.target.closest('[data-view]');
  if (t) appStore.setView(t.dataset.view);
});
addEventListener('hashchange', () => appStore.setView(location.hash.slice(1)));

/* Initialize Views */
const activityView = initActivityView({ store: appStore });
const downloadsView = initDownloadsView({ client: daemonClient, store: appStore });
const galleryView = initGalleryView({ client: daemonClient, store: appStore });
const settingsView = initSettingsView({ client: daemonClient, store: appStore });

/* Daemon Refresh on Topbar Pill & Status Bar Click */
const refreshAll = async () => {
  const [ok] = await Promise.all([
    appStore.refreshStats({ forceAccounts: true }),
    downloadsView.loadDownloads(),
    downloadsView.loadSkipped(),
  ]);
  if (!ok) throw new Error('Daemon offline');
};
const pill = $('#pill');
if (pill) {
  pill.onclick = async () => {
    if (pill.classList.contains('refreshing')) return;
    pill.classList.add('refreshing');
    try { await refreshAll(); toast('Status and library stats refreshed', 'success'); }
    catch { toast('Could not refresh stats', 'error'); }
    finally { setTimeout(() => pill.classList.remove('refreshing'), 600); }
  };
}
const sbConn = $('#sb-conn');
if (sbConn) {
  sbConn.style.cursor = 'pointer';
  sbConn.title = 'Click to check connection and refresh stats';
  sbConn.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sbConn.click(); } };
  sbConn.onclick = async () => {
    try { await refreshAll(); toast('Status and library stats refreshed', 'success'); }
    catch { toast('Could not refresh stats', 'error'); }
  };
}

/* Global Keyboard Navigation */
document.addEventListener('keydown', e => {
  if (activityView.handleKeydown(e)) return;
  if (galleryView.handleKeydown(e)) return;
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && k === 'b') { e.preventDefault(); toggleRail(); return; }
  if (!mod && !e.altKey && /^[1-5]$/.test(e.key) && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) {
    appStore.setView(VIEWS[+e.key - 1]);
  }
});

/* Boot */
galleryView.applyGalleryLayout();
galleryView.applySortSetting();
const initHash = location.hash ? location.hash.slice(1) : '';
const startView = initHash === 'skipped' ? 'downloads' : (VIEWS.includes(initHash) ? initHash : 'dashboard');
appStore.setView(startView, { force: true });
if (initHash === 'skipped') downloadsView.tabs(true);
settingsView.loadSettings();

const wsEl = $('.workspace');
if (wsEl) wsEl.addEventListener('scroll', () => { if (wsEl.scrollTop !== 0) wsEl.scrollTop = 0; });
window.scrollTo(0, 0);
document.documentElement.scrollTop = 0;
document.body.scrollTop = 0;
appStore.startRealtimeSync();
