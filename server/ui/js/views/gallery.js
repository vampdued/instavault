import { $, $$, esc, ic, store, fmtBytes, fmtDate, isVid, mediaUrl, getJSON, toast } from '../utils.js';
import { state } from '../state.js';

let raw = [];
let posts = [];
let shown = [];
let typeF = 'all';
let sortBy = store.get('gl-sort') || 'newest';
let profileFilter = '';
let cur = -1;
let slide = 0;
let lastFocus = null;
let galleryDensity = store.get('gl-density') || 'standard';
let galleryMode = store.get('gl-mode') || 'masonry';
let activeHoverVid = null;
let glPage = 1;
const glLimit = 200;

export function applyGalleryLayout() {
  const mas = $('#mas');
  if (mas) mas.className = `mas den-${galleryDensity} mode-${galleryMode}`;
  document.documentElement.setAttribute('data-density', galleryDensity);
  document.documentElement.setAttribute('data-mode', galleryMode);
  $$('#gl-density .seg').forEach(b => b.classList.toggle('on', b.dataset.d === galleryDensity));
  $$('#gl-mode .seg').forEach(b => b.classList.toggle('on', b.dataset.m === galleryMode));
}

export function closeSortMenu() {
  const sortMenu = $('#sort-menu');
  const sortTrigger = $('#sort-trigger');
  if (!sortMenu) return;
  sortMenu.hidden = true;
  sortMenu.classList.remove('open');
  if (sortTrigger) {
    sortTrigger.classList.remove('open');
    sortTrigger.setAttribute('aria-expanded', 'false');
  }
}

function openSortMenu() {
  const sortMenu = $('#sort-menu');
  const sortTrigger = $('#sort-trigger');
  if (!sortMenu) return;
  sortMenu.hidden = false;
  sortMenu.classList.add('open');
  if (sortTrigger) {
    sortTrigger.classList.add('open');
    sortTrigger.setAttribute('aria-expanded', 'true');
  }
  const activeItem = sortMenu.querySelector('.dd-item.on') || sortMenu.querySelector('.dd-item');
  if (activeItem) activeItem.focus();
}

export function applySortSetting() {
  const sortLabel = $('#sort-label');
  const item = $$('#sort-menu .dd-item').find(i => i.dataset.val === sortBy) || $('#sort-menu .dd-item');
  if (item) {
    $$('#sort-menu .dd-item').forEach(i => {
      const isSel = i === item;
      i.classList.toggle('on', isSel);
      i.setAttribute('aria-selected', isSel);
    });
    const labelSpan = item.querySelector('.dd-item-text');
    if (labelSpan && sortLabel) sortLabel.textContent = labelSpan.textContent;
  }
}

const slideNo = (fn, sc) => {
  const m = (sc || '').match(/_([1-9]\d?)$/);
  if (m) return +m[1];
  const n = parseInt(String(fn).replace(/\.[^.]+$/, '').split('_').pop(), 10);
  return !isNaN(n) && n < 100 ? n : 1;
};

const baseKey = it => {
  const sc = (it.shortcode || '').trim();
  if (!sc) return it.filename || 'unknown';
  const m = sc.match(/^(.+)_([1-9]\d?)$/);
  return m ? m[1] : sc;
};

function group(items) {
  const map = {};
  items.forEach(it => {
    const k = baseKey(it);
    const p = map[k] ||= { shortcode: k, username: it.username, downloadedAt: it.downloadedAt, items: [] };
    p.items.push(it);
    if (new Date(it.downloadedAt) > new Date(p.downloadedAt)) p.downloadedAt = it.downloadedAt;
  });
  return Object.values(map).map(p => {
    p.items.sort((a, b) => slideNo(a.filename, a.shortcode) - slideNo(b.filename, b.shortcode) || a.filename.localeCompare(b.filename));
    p.fileSize = p.items.reduce((s, i) => s + i.fileSize, 0);
    return p;
  });
}

const matchType = it => typeF === 'all' || (typeF === 'video') === isVid(it.filename);

function stories() {
  const names = [...new Set(raw.map(i => i.username))];
  const q = profileFilter.toLowerCase();
  const filtered = names.filter(n => !q || n.toLowerCase().includes(q));
  $('#g-profiles').textContent = `${filtered.length}/${names.length}`;
  const one = (u, label, text, n) => `<button class="pl" data-u="${esc(u ?? '')}" aria-pressed="${state.galleryUser === u}"><span class="av">${esc(text)}</span><span>${esc(label)}</span><span class="n">${n}</span></button>`;
  $('#stories').innerHTML = one(null, 'All profiles', 'All', posts.length) + filtered.map(n => one(n, '@' + n, n.slice(0, 2), posts.filter(p => p.username === n).length)).join('');
}

export function renderGallery() {
  applyGalleryLayout();
  const by = {
    newest: (a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt),
    oldest: (a, b) => new Date(a.downloadedAt) - new Date(b.downloadedAt),
    largest: (a, b) => b.fileSize - a.fileSize,
    smallest: (a, b) => a.fileSize - b.fileSize,
  };
  shown = posts.filter(p => (state.galleryUser === null || p.username === state.galleryUser) && p.items.some(matchType)).sort(by[sortBy]);
  $('#g-count').textContent = `${shown.length} saved`;
  if (!shown.length) {
    $('#mas').innerHTML = `
      <div class="gl-empty">
        <div class="gl-empty-icon">${ic('img', 22)}</div>
        <h3>No media matches this filter</h3>
        <p>${state.galleryUser ? `No posts found for @${esc(state.galleryUser)} under selected filters.` : 'Try clearing your account filter or switching media type.'}</p>
        <button class="btn" id="gl-reset-btn">Reset all filters</button>
      </div>`;
    $('#gl-reset-btn').onclick = () => {
      state.galleryUser = null;
      typeF = 'all';
      profileFilter = '';
      $('#profile-search').value = '';
      $$('#types .seg').forEach(x => x.setAttribute('aria-pressed', x.dataset.t === 'all'));
      stories();
      renderGallery();
    };
    return;
  }
  $('#mas').innerHTML = shown.map((p, i) => {
    const c = p.items.find(matchType) || p.items[0];
    const v = isVid(c.filename);
    const u = mediaUrl(c);
    const isAboveFold = i < 6;
    const isLcp = i === 0;
    const loadOpt = isAboveFold ? (isLcp ? 'fetchpriority="high"' : '') : 'loading="lazy" decoding="async"';
    const media = v
      ? `<video muted loop playsinline preload="none" src="${esc(u)}" onerror="this.outerHTML='<div class=gone>Video unavailable</div>'"></video>`
      : `<img src="${esc(u)}" alt="Post by @${esc(p.username)}" ${loadOpt} onerror="this.outerHTML='<div class=gone>File moved or missing</div>'">`;
    const badge = p.items.length > 1 ? `<span class="bd">${ic('layers', 12)}${p.items.length}</span>` : v ? `<span class="bd">${ic('play', 12)}</span>` : '';
    return `<button class="card" data-i="${i}" aria-label="Open post by @${esc(p.username)}, ${p.items.length} item${p.items.length > 1 ? 's' : ''}"><div class="im">${media}${badge}</div><div class="cp"><b>@${esc(p.username)}</b><span>${fmtBytes(p.fileSize, 1)}</span></div></button>`;
  }).join('');
}

export async function loadGallery(append = false) {
  try {
    if (!append) glPage = 1;
    const batch = await getJSON(`/api/downloads?page=${glPage}&limit=${glLimit}`);
    raw = append ? raw.concat(batch) : batch;
    const wrap = $('#gl-more-wrap');
    if (wrap) wrap.hidden = batch.length < glLimit;
    posts = group(raw);
    stories();
    renderGallery();
  } catch (e) { console.error(e); }
}

export function toggleZen() {
  const lb = $('#lb');
  const zenMode = !lb.classList.contains('zen');
  lb.classList.toggle('zen', zenMode);
  store.set('lb-zen', zenMode);
  toast(zenMode ? 'Zen full-bleed enabled (Z to restore)' : 'Details panel restored', 'info');
}

export function openLB(i, s = 0) {
  closeSortMenu();
  const lb = $('#lb'), lbi = $('#lb-img'), lbv = $('#lb-vid');
  const p = shown[i];
  if (!p) return;
  if (activeHoverVid) {
    activeHoverVid.pause();
    activeHoverVid.closest('.card')?.classList.remove('playing');
    activeHoverVid = null;
  }
  if (cur === -1) lastFocus = document.activeElement;
  cur = i;
  slide = Math.max(0, Math.min(s, p.items.length - 1));
  const it = p.items[slide], u = mediaUrl(it);
  if (isVid(it.filename)) {
    lbi.hidden = true; lbv.hidden = false; lbv.src = u; lbv.play().catch(() => {});
  } else {
    lbv.pause(); lbv.removeAttribute('src'); lbv.hidden = true; lbi.hidden = false; lbi.src = u; lbi.alt = `Post by @${p.username}`;
  }
  const multi = p.items.length > 1;
  $('#lb-prev').hidden = $('#lb-next').hidden = !multi;
  $('#lb-dots').innerHTML = multi ? p.items.map((_, k) => `<button data-k="${k}" aria-label="Item ${k + 1}" ${k === slide ? 'aria-current="true"' : ''}></button>`).join('') : '';
  $('#lb-counter').textContent = `${slide + 1} / ${p.items.length}`;
  $('#lb-download-quick').href = u;
  $('#lb-download-quick').download = it.filename || 'media';
  $('#lb-download-btn').href = u;
  $('#lb-download-btn').download = it.filename || 'media';
  $('#lb-user').textContent = '@' + p.username;
  $('#lb-av').textContent = p.username.slice(0, 2).toUpperCase();
  $('#lb-code').textContent = p.shortcode + (multi ? ` · ${slide + 1} of ${p.items.length}` : '');
  $('#lb-date').textContent = fmtDate(it.downloadedAt);
  $('#lb-size').textContent = fmtBytes(it.fileSize) + (multi ? ` (post total ${fmtBytes(p.fileSize)})` : '');
  $('#lb-path').textContent = it.localPath;
  $('#lb-open-tab').href = u;
  $('#lb-copy-path').onclick = async () => { try { await navigator.clipboard.writeText(it.localPath); toast('Local path copied', 'success'); } catch { toast('Could not copy path', 'error'); } };
  $('#lb-copy-url').onclick = async () => { try { await navigator.clipboard.writeText(location.origin + u); toast('Media URL copied', 'success'); } catch { toast('Could not copy URL', 'error'); } };
  lb.classList.add('on');
  $('#lb-close').focus();
}

export function closeLB() {
  const lb = $('#lb'), lbi = $('#lb-img'), lbv = $('#lb-vid');
  lb.classList.remove('on');
  lbv.pause();
  lbv.removeAttribute('src');
  lbi.removeAttribute('src');
  cur = -1;
  if (lastFocus) lastFocus.focus();
}

export function stepLB(d) {
  if (cur < 0) return;
  const n = shown[cur].items.length;
  openLB(cur, (slide + d + n) % n);
}

export function initGalleryView() {
  if (store.get('lb-zen') === 'true') $('#lb').classList.add('zen');

  $('#gl-density').onclick = e => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    galleryDensity = b.dataset.d;
    store.set('gl-density', galleryDensity);
    applyGalleryLayout();
  };
  $('#gl-mode').onclick = e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    galleryMode = b.dataset.m;
    store.set('gl-mode', galleryMode);
    applyGalleryLayout();
  };

  let profSearchTimer;
  $('#profile-search').oninput = e => {
    clearTimeout(profSearchTimer);
    profSearchTimer = setTimeout(() => { profileFilter = e.target.value.trim(); stories(); }, 100);
  };
  $('#stories').onclick = e => {
    const b = e.target.closest('.pl');
    if (!b) return;
    state.galleryUser = b.dataset.u === '' ? null : b.dataset.u;
    stories();
    renderGallery();
  };
  $('#types').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    typeF = b.dataset.t;
    $$('#types .seg').forEach(x => x.setAttribute('aria-pressed', x === b));
    renderGallery();
  };
  if ($('#gl-more-btn')) $('#gl-more-btn').onclick = () => { glPage++; loadGallery(true); };

  const sortTrigger = $('#sort-trigger');
  const sortMenu = $('#sort-menu');
  if (sortTrigger && sortMenu) {
    sortTrigger.onclick = e => {
      e.stopPropagation();
      if (sortMenu.hidden || !sortMenu.classList.contains('open')) openSortMenu(); else closeSortMenu();
    };
    document.addEventListener('pointerdown', e => { if (!sortMenu.hidden && !e.target.closest('#sort-dd')) closeSortMenu(); }, true);
    window.addEventListener('scroll', () => { if (!sortMenu.hidden) closeSortMenu(); }, true);
    window.addEventListener('blur', closeSortMenu);
    sortTrigger.onkeydown = e => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSortMenu(); }
    };
    sortMenu.onkeydown = e => {
      const items = [...sortMenu.querySelectorAll('.dd-item')];
      const currentIndex = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(currentIndex + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(currentIndex - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeSortMenu(); sortTrigger.focus(); }
      else if (e.key === 'Tab') closeSortMenu();
    };
    sortMenu.onclick = e => {
      const item = e.target.closest('.dd-item');
      if (!item) { closeSortMenu(); return; }
      sortBy = item.dataset.val;
      store.set('gl-sort', sortBy);
      applySortSetting();
      closeSortMenu();
      sortTrigger.focus();
      renderGallery();
    };
  }

  $('#mas').onclick = e => { const c = e.target.closest('.card'); if (c) openLB(+c.dataset.i, 0); };
  $('#mas').addEventListener('mouseover', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const vid = card.querySelector('video');
    if (!vid || vid === activeHoverVid) return;
    if (activeHoverVid && activeHoverVid !== vid) {
      activeHoverVid.pause();
      activeHoverVid.currentTime = 0;
      activeHoverVid.closest('.card')?.classList.remove('playing');
    }
    activeHoverVid = vid;
    card.classList.add('playing');
    const p = vid.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  });
  $('#mas').addEventListener('mouseout', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    if (e.relatedTarget && card.contains(e.relatedTarget)) return;
    const vid = card.querySelector('video');
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
      card.classList.remove('playing');
      if (activeHoverVid === vid) activeHoverVid = null;
    }
  });

  $('#lb-zen-toggle').onclick = toggleZen;
  $('#lb-close-top').onclick = closeLB;
  $('#lb-close').onclick = closeLB;
  $('#lb-prev').onclick = () => stepLB(-1);
  $('#lb-next').onclick = () => stepLB(1);
  $('#lb-dots').onclick = e => { const b = e.target.closest('[data-k]'); if (b) openLB(cur, +b.dataset.k); };
  $('#lb').onclick = e => { if (e.target === $('#lb') || e.target.classList.contains('lbm')) closeLB(); };
}
