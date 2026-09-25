/**
 * InstaVault Toolbar Popup Controller
 * Manages live daemon telemetry, connection health checks, theme state, and tab navigation.
 */

(function () {
  'use strict';

  const DAEMON_BASE_URL = 'http://localhost:19201';
  const POLL_INTERVAL_MS = 3000;
  const FETCH_TIMEOUT_MS = 2500;

  // DOM Elements
  const daemonStatus = document.getElementById('daemonStatus');
  const statusText = document.getElementById('statusText');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const onlineView = document.getElementById('onlineView');
  const offlineView = document.getElementById('offlineView');
  const activeSyncCard = document.getElementById('activeSyncCard');
  const activeSyncUser = document.getElementById('activeSyncUser');

  // Telemetry Elements
  const statTotalDownloads = document.getElementById('statTotalDownloads');
  const statUniqueAccounts = document.getElementById('statUniqueAccounts');
  const statTotalSkipped = document.getElementById('statTotalSkipped');
  const storageUsageRatio = document.getElementById('storageUsageRatio');
  const storageProgressBar = document.getElementById('storageProgressBar');
  const storageBarFill = document.getElementById('storageBarFill');
  const storageFreeText = document.getElementById('storageFreeText');
  const footerDir = document.getElementById('footerDir');

  // Action Buttons
  const btnOpenVault = document.getElementById('btnOpenVault');
  const btnLaunchInstagram = document.getElementById('btnLaunchInstagram');
  const btnLaunchInstagramOffline = document.getElementById('btnLaunchInstagramOffline');
  const btnOpenSkipped = document.getElementById('btnOpenSkipped');
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnRetryConnection = document.getElementById('btnRetryConnection');

  let pollTimer = null;
  let isChecking = false;

  // =========================================================================
  // Helper: Open Tab in Chrome
  // =========================================================================
  function openUrl(url) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: url });
    } else {
      window.open(url, '_blank');
    }
  }

  // =========================================================================
  // Theme Manager
  // =========================================================================
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function initTheme() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['theme'], function (result) {
        if (result && result.theme) {
          applyTheme(result.theme);
        } else {
          // Check local storage fallback
          const localTheme = localStorage.getItem('instavault_theme');
          if (localTheme) applyTheme(localTheme);
        }
      });
    } else {
      const localTheme = localStorage.getItem('instavault_theme');
      if (localTheme) applyTheme(localTheme);
    }
  }

  function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const nextTheme = isLight ? 'dark' : 'light';
    applyTheme(nextTheme);

    try {
      localStorage.setItem('instavault_theme', nextTheme);
    } catch (e) {
      // Ignored
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme: nextTheme });
    }
  }

  // =========================================================================
  // Formatters
  // =========================================================================
  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString();
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }

  // =========================================================================
  // Telemetry Fetcher & Renderer
  // =========================================================================
  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = FETCH_TIMEOUT_MS } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  function setStatus(state, message) {
    daemonStatus.classList.remove('status-online', 'status-offline', 'status-checking');
    if (state === 'online') {
      daemonStatus.classList.add('status-online');
      statusText.textContent = message || 'Daemon Online';
    } else if (state === 'offline') {
      daemonStatus.classList.add('status-offline');
      statusText.textContent = message || 'Offline';
    } else {
      daemonStatus.classList.add('status-checking');
      statusText.textContent = message || 'Checking…';
    }
  }

  async function checkDaemon() {
    if (isChecking) return;
    isChecking = true;

    try {
      // Parallel fetch for stats and settings
      const [statsRes, settingsRes] = await Promise.all([
        fetchWithTimeout(`${DAEMON_BASE_URL}/api/stats`),
        fetchWithTimeout(`${DAEMON_BASE_URL}/api/settings`).catch(() => null)
      ]);

      if (!statsRes.ok) {
        throw new Error(`HTTP error ${statsRes.status}`);
      }

      const stats = await statsRes.json();
      let settings = null;
      if (settingsRes && settingsRes.ok) {
        settings = await settingsRes.json();
      }

      renderOnline(stats, settings);
    } catch (err) {
      renderOffline(err);
    } finally {
      isChecking = false;
    }
  }

  function renderOnline(stats, settings) {
    setStatus('online', 'Daemon Online');

    onlineView.classList.remove('hidden');
    offlineView.classList.add('hidden');

    // Telemetry counts
    statTotalDownloads.textContent = formatNumber(stats.totalDownloads);
    statUniqueAccounts.textContent = formatNumber(stats.uniqueAccounts);
    statTotalSkipped.textContent = formatNumber(stats.totalSkipped);

    // Active sync banner
    if (stats.activeSync && stats.activeSync.isActive) {
      activeSyncCard.classList.remove('hidden');
      activeSyncUser.textContent = stats.activeSync.username ? `@${stats.activeSync.username}` : 'In progress…';
    } else {
      activeSyncCard.classList.add('hidden');
    }

    // Disk storage metrics
    if (stats.diskTotal && stats.diskTotal > 0) {
      const total = stats.diskTotal;
      const free = stats.diskFree;
      const used = total - free;
      const usedPercent = Math.min(100, Math.max(0, Math.round((used / total) * 100)));

      storageUsageRatio.textContent = `${usedPercent}% used`;
      storageProgressBar.setAttribute('aria-valuenow', usedPercent);
      storageBarFill.style.width = `${usedPercent}%`;
      storageFreeText.textContent = `${formatBytes(free)} free of ${formatBytes(total)}`;
    } else {
      storageUsageRatio.textContent = 'Ready';
      storageBarFill.style.width = '100%';
      storageFreeText.textContent = 'Storage telemetry unavailable';
    }

    // Settings folder preview
    if (settings && settings.baseDir) {
      footerDir.textContent = settings.baseDir;
      footerDir.title = `Vault Storage: ${settings.baseDir}`;
    } else {
      footerDir.textContent = 'Default Vault Folder';
    }
  }

  function renderOffline(error) {
    setStatus('offline', 'Offline');

    onlineView.classList.add('hidden');
    offlineView.classList.remove('hidden');
    activeSyncCard.classList.add('hidden');

    footerDir.textContent = 'Daemon not connected';
  }

  // =========================================================================
  // Event Bindings
  // =========================================================================
  function bindEvents() {
    themeToggleBtn.addEventListener('click', toggleTheme);

    btnOpenVault.addEventListener('click', () => openUrl(DAEMON_BASE_URL));
    btnLaunchInstagram.addEventListener('click', () => openUrl('https://www.instagram.com'));
    btnLaunchInstagramOffline.addEventListener('click', () => openUrl('https://www.instagram.com'));

    btnOpenSkipped.addEventListener('click', () => openUrl(`${DAEMON_BASE_URL}/#skipped`));
    btnOpenSettings.addEventListener('click', () => openUrl(`${DAEMON_BASE_URL}/#settings`));

    btnRetryConnection.addEventListener('click', () => {
      setStatus('checking', 'Connecting…');
      checkDaemon();
    });
  }

  // =========================================================================
  // Initialization
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    bindEvents();
    checkDaemon();

    // Polling setup
    pollTimer = setInterval(checkDaemon, POLL_INTERVAL_MS);
  });

  window.addEventListener('unload', () => {
    if (pollTimer) clearInterval(pollTimer);
  });
})();
