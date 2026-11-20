import { $, $$, ic, hydrateIcons, store, toast } from './utils.js';
import { VIEWS, NAMES, state, setNavigator } from './state.js';
import { loadStats, startRealtimeSync } from './api.js';
import { initActivityView, closeLogDrawer } from './views/activity.js';
import { initDownloadsView, loadDownloads, loadSkipped, tabs } from './views/downloads.js';
import { initGalleryView, applyGalleryLayout, applySortSetting, closeSortMenu, loadGallery, closeLB, toggleZen, stepLB } from './views/gallery.js';
import { initSettingsView, loadSettings } from './views/settings.js';

hydrateIcons();

/* Theme & Clock */
function theme(t) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  $('#theme').innerHTML = ic(t === 'dark' ? 'sun' : 'moon');
  store.set('theme', t);
}
const toggleTheme = () => theme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
theme(store.get('theme') || 'dark');
$('#theme').onclick = toggleTheme;
const tick = () => ($('#clock').textContent = new Date().toLocaleTimeString([], { hour12: false }));
setInterval(tick, 1000);
tick();

/* Rail Collapse */
const rail = m => {
  $('#app').classList.toggle('min', m);
  document.documentElement.classList.toggle('min-rail', m);
  store.set('rail-min', m);
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
rail(store.get('rail-min') === 'true' || (store.get('rail-min') === null && innerWidth < 1024));

const sToggle = $('#sidebar-toggle');
if (sToggle) sToggle.onclick = e => { e.stopPropagation(); toggleRail(); };
const rHead = $('.rail-head');
if (rHead) rHead.onclick = () => { if ($('#app').classList.contains('min') || document.documentElement.classList.contains('min-rail')) toggleRail(); };
const bBrand = $('.brand');
if (bBrand) bBrand.onclick = () => { if (!$('#app').classList.contains('min') && !document.documentElement.classList.contains('min-rail')) go('dashboard'); };

/* Navigation */
function go(v) {
  if (!VIEWS.includes(v)) return;
  closeSortMenu();
  $$('.view').forEach(e => e.classList.toggle('on', e.dataset.viewPanel === v || e.id === 'view-' + v || e.id === v));
  $$('.ri[data-view]').forEach(b => b.dataset.view === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if ($('#view-h1')) $('#view-h1').textContent = NAMES[v] || 'Overview';
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  if (v === 'dashboard' || v === 'activity') loadStats();
  if (v === 'gallery') { applyGalleryLayout(); loadGallery(); }
  if (v === 'downloads') { loadDownloads(); loadSkipped(); }
  if (v === 'settings') loadSettings();
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const ws = $('.workspace');
  if (ws) ws.scrollTop = 0;
  $('#main').scrollTop = 0;
}
setNavigator(go);
document.addEventListener('click', e => { const t = e.target.closest('[data-view]'); if (t) go(t.dataset.view); });
addEventListener('hashchange', () => go(location.hash.slice(1)));

/* Initialize Views */
initActivityView();
initDownloadsView(loadStats);
initGalleryView();
initSettingsView();

/* Daemon Refresh on Topbar Pill & Status Bar Click */
const refreshAll = async () => {
  state.lastAcc = '';
  await Promise.all([loadStats(), loadDownloads(), loadSkipped()]);
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
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  const lb = $('#lb'), lbv = $('#lb-vid');
  if ($('#log-drawer') && !$('#log-drawer').hidden && e.key === 'Escape') { closeLogDrawer(); return; }
  if (lb.classList.contains('on')) {
    if (e.key === 'Escape') closeLB();
    else if (k === 'z') { e.preventDefault(); toggleZen(); }
    else if (k === 'd') { e.preventDefault(); $('#lb-download-quick').click(); }
    else if (e.key === 'ArrowLeft') stepLB(-1);
    else if (e.key === 'ArrowRight') stepLB(1);
    else if (e.key === ' ' && lbv && !lbv.hidden && document.activeElement !== lbv) { e.preventDefault(); lbv.paused ? lbv.play() : lbv.pause(); }
    else if (e.key === 'Tab') {
      const f = $$('#lb button:not([hidden]), #lb a:not([hidden]), #lb video[controls]:not([hidden])');
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    return;
  }
  if (mod && k === 'b') { e.preventDefault(); toggleRail(); return; }
  if (!mod && !e.altKey && /^[1-5]$/.test(e.key) && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) {
    go(VIEWS[+e.key - 1]);
  }
});

/* Boot */
applyGalleryLayout();
applySortSetting();
const initHash = location.hash ? location.hash.slice(1) : '';
const startView = initHash === 'skipped' ? 'downloads' : (VIEWS.includes(initHash) ? initHash : 'dashboard');
go(startView);
if (initHash === 'skipped') tabs(true);
loadSettings();

const wsEl = $('.workspace');
if (wsEl) wsEl.addEventListener('scroll', () => { if (wsEl.scrollTop !== 0) wsEl.scrollTop = 0; });
window.scrollTo(0, 0);
document.documentElement.scrollTop = 0;
document.body.scrollTop = 0;
startRealtimeSync();
