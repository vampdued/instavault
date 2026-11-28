import { $, $$, toast, busy, confirmModal, fmtBytes, triggerBlobDownload } from '../utils.js';

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

function updateImportModeUI() {
  const mode = document.querySelector('input[name=import-mode]:checked')?.value || 'replace';
  const wrap = $('#overwrite-basedir-wrap');
  if (wrap) wrap.hidden = mode !== 'replace';
}

function setImportStatus(ok, message) {
  const statusEl = $('#import-status');
  const textEl = $('#import-status-text');
  if (!statusEl || !textEl) return;
  statusEl.hidden = false;
  statusEl.className = ok ? 'dir-status' : 'dir-status invalid';
  const dot = statusEl.querySelector('.dot');
  if (dot) dot.className = ok ? 'dot ok' : 'dot off';
  textEl.textContent = message;
}

export function initSettingsView({ client, store }) {
  async function loadSettings() {
    try {
      const d = await client.getSettings();
      if (d.baseDir) $('#base-dir').value = d.baseDir;
      if (d.folderStructure) {
        const r = document.querySelector(`input[name=fs][value="${d.folderStructure}"]`);
        if (r) r.checked = true;
      }
      updateTreePreview();
    } catch (e) { console.error(e); }
  }

  /* Store Subscriptions */
  store.subscribe('viewChanged', ({ view }) => {
    if (view === 'settings') loadSettings();
  });

  store.subscribe('databaseImported', () => {
    loadSettings();
  });

  /* DOM Event Handlers */
  $$('input[name=fs]').forEach(r => r.addEventListener('change', updateTreePreview));
  $$('input[name=import-mode]').forEach(r => r.addEventListener('change', updateImportModeUI));
  updateImportModeUI();

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
        const d = await client.verifyDir(path);
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
        await client.saveSettings({
          baseDir: $('#base-dir').value.trim(),
          folderStructure: document.querySelector('input[name=fs]:checked').value,
        });
        toast('Settings saved successfully', 'success');
      } catch { toast('Could not save settings', 'error'); }
    });
  };

  const exportBtn = $('#export-db-btn');
  if (exportBtn) {
    exportBtn.onclick = async e => {
      await busy(e.currentTarget, 'Exporting…', async () => {
        try {
          const { blob, filename } = await client.exportDatabase();
          triggerBlobDownload(blob, filename);
          toast(`Exported ${filename}`, 'success');
        } catch (err) {
          toast(err.message || 'Could not export Vault Backup', 'error');
        }
      });
    };
  }

  const fileInput = $('#import-db-file');
  const pickBtn = $('#pick-db-btn');
  const fileLabel = $('#import-file-label');
  const importBtn = $('#import-db-btn');

  if (pickBtn && fileInput) {
    pickBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      const f = fileInput.files?.[0];
      if (f) {
        fileLabel.textContent = `${f.name} (${fmtBytes(f.size)})`;
        if (importBtn) importBtn.disabled = false;
      } else {
        fileLabel.textContent = 'No file selected';
        if (importBtn) importBtn.disabled = true;
      }
    };
  }

  if (importBtn && fileInput) {
    importBtn.onclick = async e => {
      const f = fileInput.files?.[0];
      if (!f) return;

      const mode = document.querySelector('input[name=import-mode]:checked')?.value || 'replace';
      const overwriteBaseDir = mode === 'replace' && !!$('#overwrite-basedir')?.checked;

      const msg = mode === 'replace'
        ? `Replace the current database with "${f.name}" (${fmtBytes(f.size)})? Existing download and skip records will be replaced. An automatic Safety Snapshot will be saved to your backups folder first.`
        : `Merge "${f.name}" (${fmtBytes(f.size)}) into the current database? Missing records will be added without overwriting existing local rows or settings. An automatic Safety Snapshot will be saved first.`;

      const ok = await confirmModal(
        msg,
        mode === 'replace' ? 'Replace database from Vault Backup?' : 'Merge Vault Backup?',
        mode === 'replace' ? 'Replace database' : 'Merge backup',
      );
      if (!ok) return;

      await busy(e.currentTarget, 'Importing…', async () => {
        try {
          const d = await client.importDatabase({ file: f, mode, overwriteBaseDir });

          const verb = d.mode === 'merge' ? 'Merged' : 'Restored';
          const parts = [
            `${verb}: ${d.downloadsAdded} downloads, ${d.skippedAdded} skipped`,
            `Totals: ${d.totalDownloads} downloads, ${d.totalSkipped} skipped`,
          ];
          if (d.pathsRebased > 0) parts.push(`${d.pathsRebased} paths rebased`);
          if (d.safetySnapshot) parts.push(`Safety Snapshot: ${d.safetySnapshot}`);

          const summary = parts.join(' · ');
          setImportStatus(true, summary);
          toast(`Vault Backup ${verb.toLowerCase()} successfully`, 'success');

          fileInput.value = '';
          fileLabel.textContent = 'No file selected';
          importBtn.disabled = true;
          await loadSettings();
        } catch (err) {
          const errMsg = err?.status ? err.message : 'Could not reach server to import backup';
          setImportStatus(false, errMsg);
          toast(err?.status ? err.message : 'Could not import Vault Backup', 'error');
        }
      });
    };
  }

  return {
    loadSettings,
  };
}
