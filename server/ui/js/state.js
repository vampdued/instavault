export const VIEWS = ['dashboard', 'activity', 'downloads', 'gallery', 'settings'];
export const NAMES = {
  dashboard: 'Overview',
  activity: 'Live activity',
  downloads: 'Downloads',
  gallery: 'Gallery',
  settings: 'Settings',
};

export const TAG = {
  downloading: ['dl', 'SAVING'],
  completed: ['ok', 'SAVED'],
  skipped: ['sk', 'SKIPPED'],
  failed: ['bad', 'ERROR'],
  error: ['bad', 'ERROR'],
};

export const state = {
  logs: [],
  galleryUser: null,
  rawAccounts: [],
  dashAccQuery: '',
  lastAcc: '',
  lastTotalDownloads: null,
  online: null,
  startedAt: Date.now(),
};

// Navigation callback registered by main.js to avoid circular imports
let navHandler = () => {};
export function setNavigator(fn) { navHandler = fn; }
export function navigateTo(view) { navHandler(view); }
