import { $, $$, getJSON, toast, busy } from '../utils.js';

const TREE_PREVIEWS = {
  profile: `[Download Directory]/\n└── username/\n    ├── 322047271_1.jpg\n    └── 322047271_2.mp4`,
  flat: `[Download Directory]/\n├── username_322047271_1.jpg\n└── username_322047271_2.mp4`,
  profile_type: `[Download Directory]/\n└── username/\n    ├── photos/\n    │   └── 322047271_1.jpg\n    └── videos/\n        └── 322047271_2.mp4`
};

function updateTreePreview() {
  const selected = document.querySelector('input[name=fs]:checked')?.value || 'profile';
  const pre = $('#tree-pre');
  if (pre) pre.textContent = TREE_PREVIEWS[selected] || TREE_PREVIEWS.profile;
}

export async function loadSettings() {
  try {
    const d = await getJSON('/api/settings');
    if (d.baseDir) $('#base-dir').value = d.baseDir;
    if (d.folderStructure) {
      const r = document.querySelector(`input[name=fs][value="${d.folderStructure}"]`);
      if (r) r.checked = true;
    }
    updateTreePreview();
  } catch (e) { console.error(e); }
}

export function initSettingsView() {
  $$('input[name=fs]').forEach(r => r.addEventListener('change', updateTreePreview));

  $('#verify-dir-btn').onclick = async e => {
    const path = $('#base-dir').value.trim();
    const statusEl = $('#dir-status');
    const textEl = $('#dir-status-text');
    if (!path) {
      statusEl.hidden = false;
      statusEl.className = 'dir-status invalid';
      textEl.textContent = 'Please enter a directory path';
      return;
    }
    await busy(e.currentTarget, 'Checking…', async () => {
      try {
        const r = await fetch('/api/settings/verify-dir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        const d = await r.json();
        statusEl.hidden = false;
        statusEl.className = d.valid ? 'dir-status' : 'dir-status invalid';
        textEl.textContent = d.message || (d.valid ? 'Folder verified' : 'Invalid folder path');
        toast(textEl.textContent, d.valid ? 'success' : 'error');
      } catch {
        statusEl.hidden = false;
        statusEl.className = 'dir-status invalid';
        textEl.textContent = 'Could not reach server to verify path';
        toast('Could not verify path', 'error');
      }
    });
  };

  $('#sform').onsubmit = async e => {
    e.preventDefault();
    await busy($('#save'), 'Saving…', async () => {
      try {
        const r = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseDir: $('#base-dir').value.trim(),
            folderStructure: document.querySelector('input[name=fs]:checked').value,
          }),
        });
        if (!r.ok) throw 0;
        toast('Settings saved successfully', 'success');
      } catch { toast('Could not save settings', 'error'); }
    });
  };
}
