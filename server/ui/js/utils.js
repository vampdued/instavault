export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const P = {
  dash: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  act: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  dl: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  set: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  l: '<path d="m15 18-6-6 6-6"/>',
  r: '<path d="m9 18 6-6-6-6"/>',
  play: '<path d="m7 4 13 8-13 8z" fill="currentColor"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  sidebar: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  sort: '<path d="M3 8h12M3 12h8M3 16h4M17 4v16m0 0 3-3m-3 3-3-3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>'
};

export const ic = (n, s = 18) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

export function hydrateIcons() {
  $$('[data-i]').forEach(e => (e.innerHTML = ic(e.dataset.i, e.dataset.s ? +e.dataset.s : 18)));
  $$('.ri').forEach(b => { if (!b.title && b.dataset.tip) b.title = b.dataset.tip; });
}

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};

export const fmtBytes = (b, d = 2) => {
  if (!+b) return '0 Bytes';
  const k = 1024;
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / k ** i).toFixed(d))} ${['Bytes', 'KB', 'MB', 'GB', 'TB'][i]}`;
};

export const fmtDate = s => new Date(s).toLocaleString();
export const isVid = f => ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(String(f).split('.').pop().toLowerCase());
export const mediaUrl = it => `/api/media/${(it.relativePath || '').replace(/\\/g, '/')}`;
export const pl = (n, s, p = s + 's') => `${n} ${n === 1 ? s : p}`;

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const toast = (m, t = 'info') => {
  const d = document.createElement('div');
  d.className = 'toast ' + t;
  d.textContent = m;
  $('#toasts').append(d);
  setTimeout(() => d.remove(), 3200);
};

export const confirmModal = (msg, title = 'Confirm action', okLabel = 'Remove') => new Promise(resolve => {
  const m = $('#confirm-modal');
  const prevFocus = document.activeElement;
  $('#confirm-title').textContent = title;
  $('#confirm-msg').textContent = msg;
  $('#confirm-ok').textContent = okLabel;
  m.classList.add('on');
  $('#confirm-cancel').focus();
  const done = val => {
    m.classList.remove('on');
    document.removeEventListener('keydown', onKey);
    if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    resolve(val);
  };
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); done(false); }
    else if (e.key === 'Tab') {
      const f = [$('#confirm-cancel'), $('#confirm-ok')].filter(Boolean);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  $('#confirm-cancel').onclick = () => done(false);
  $('#confirm-ok').onclick = () => done(true);
  m.onclick = e => { if (e.target === m) done(false); };
});

export const busy = async (btn, label, fn) => {
  const h = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = label;
  try { await fn(); } finally { btn.disabled = false; btn.innerHTML = h; }
};
