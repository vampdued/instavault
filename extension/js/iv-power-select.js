/**
 * InstaVault Power-Select Toolbar
 * Extracted from legacy app.js bundle for clean maintainability.
 */
(() => {
  'use strict';

  function buildPowerSelectBar(applyBulkCheckboxState) {
    const wrap = document.createElement('div');
    wrap.className = 'iv-power-select';
    wrap.innerHTML = `
      <div class="iv-ps-row">
        <button type="button" class="iv-ps-btn" data-act="all" title="Select all loaded posts">Select all</button>
        <button type="button" class="iv-ps-btn" data-act="clear" title="Clear all selections">Clear</button>
      </div>
      <div class="iv-ps-row iv-ps-range">
        <span class="iv-ps-lbl">First</span>
        <input type="number" class="iv-ps-num" min="1" max="500" value="20" aria-label="Number of loaded posts to select">
        <button type="button" class="iv-ps-btn iv-ps-apply" data-act="first">Select</button>
      </div>
      <div class="iv-ps-hint">Tip: Shift+Click selects a span</div>
    `;

    const getVisibleBoxes = () =>
      Array.from(document.querySelectorAll('.mdfi-mark-checkbox-base')).filter((cb) => {
        const container = cb.closest('.mdfi-checkbox-container');
        return container && container.style.display !== 'none';
      });

    const applyFirst = () => {
      const input = wrap.querySelector('.iv-ps-num');
      const n = Math.max(1, parseInt(input && input.value, 10) || 20);
      const boxes = getVisibleBoxes();
      applyBulkCheckboxState(boxes.slice(0, n), true);
      applyBulkCheckboxState(boxes.slice(n), false);
    };

    wrap.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      const boxes = getVisibleBoxes();
      if (act === 'all') applyBulkCheckboxState(boxes, true);
      else if (act === 'clear') applyBulkCheckboxState(boxes, false);
      else if (act === 'first') applyFirst();
    });

    const numInput = wrap.querySelector('.iv-ps-num');
    if (numInput) {
      numInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          applyFirst();
        }
      });
    }

    return wrap;
  }

  window.InstaVaultPowerSelect = {
    buildPowerSelectBar,
  };
})();
