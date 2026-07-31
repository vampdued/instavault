const state = {
  connected: false,
  queue: { paused: false, queued: 0, running: 0, jobs: [] },
  activity: { isActive: false, username: "", liveLogs: [] },
  settings: { baseDir: "", folderStructure: "profile" },
  history: [],
  progress: new Map(),
  refreshTimer: null,
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindActions();
  bindRuntimeEvents();
  renderAll();
  refreshSnapshot();
  window.setInterval(() => {
    if (!document.hidden) refreshSnapshot(true);
  }, 15000);
});

function bindElements() {
  const ids = [
    "connection-pill", "connection-label", "active-count", "active-caption",
    "queued-count", "queue-caption", "history-count", "queue-list",
    "history-list", "activity-list", "activity-state", "queue-toggle",
    "refresh-dashboard", "open-folder", "open-settings", "location-settings",
    "download-location", "settings-overlay", "close-settings", "cancel-settings",
    "settings-form", "base-dir", "folder-structure", "browse-folder",
    "save-settings", "toast-region",
  ];
  ids.forEach((id) => { elements[id] = document.getElementById(id); });
}

function bindActions() {
  elements["refresh-dashboard"].addEventListener("click", () => refreshSnapshot());
  elements["queue-toggle"].addEventListener("click", toggleQueue);
  elements["open-folder"].addEventListener("click", openDownloadsFolder);
  elements["open-settings"].addEventListener("click", showSettings);
  elements["location-settings"].addEventListener("click", showSettings);
  elements["close-settings"].addEventListener("click", hideSettings);
  elements["cancel-settings"].addEventListener("click", hideSettings);
  elements["browse-folder"].addEventListener("click", chooseFolder);
  elements["settings-form"].addEventListener("submit", saveSettings);
  elements["settings-overlay"].addEventListener("click", (event) => {
    if (event.target === elements["settings-overlay"]) hideSettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSettings();
  });
}

function bindRuntimeEvents() {
  if (!window.runtime?.EventsOn) return;
  window.runtime.EventsOn("agent:status", (status) => {
    state.connected = Boolean(status?.connected);
    renderConnection();
    setControlsEnabled(state.connected);
    if (state.connected) scheduleRefresh(80);
  });
  window.runtime.EventsOn("agent:event", handleAgentEvent);
}

async function refreshSnapshot(silent = false) {
  if (!window.go?.main?.App?.GetSnapshot) {
    if (!silent) showToast("Native dashboard bridge is not ready.", true);
    return;
  }
  setRefreshBusy(true);
  try {
    const snapshot = await window.go.main.App.GetSnapshot();
    state.connected = Boolean(snapshot.connected);
    state.queue = snapshot.queue || state.queue;
    state.activity = snapshot.activity || state.activity;
    state.settings = snapshot.settings || state.settings;
    state.history = Array.isArray(snapshot.history) ? snapshot.history : [];
    renderAll();
  } catch (error) {
    state.connected = false;
    renderConnection();
    setControlsEnabled(false);
    if (!silent) showToast(readError(error), true);
  } finally {
    setRefreshBusy(false);
  }
}

function handleAgentEvent(event) {
  if (!event?.type) return;
  state.connected = true;
  if (event.type === "download.progress") {
    const jobId = event.payload?.jobId;
    if (jobId) state.progress.set(jobId, event.payload);
    renderQueue();
    return;
  }
  if (event.type === "log.update") {
    state.activity = event.payload || state.activity;
    renderActivity();
    renderSummary();
    return;
  }
  if (["download.completed", "download.failed", "download.skipped", "download.canceled"].includes(event.type)) {
    if (event.payload?.jobId) state.progress.delete(event.payload.jobId);
  }
  scheduleRefresh(120);
}

function scheduleRefresh(delay) {
  window.clearTimeout(state.refreshTimer);
  state.refreshTimer = window.setTimeout(() => refreshSnapshot(true), delay);
}

function renderAll() {
  renderConnection();
  renderSummary();
  renderQueue();
  renderActivity();
  renderHistory();
  renderSettingsSummary();
  setControlsEnabled(state.connected);
}

function renderConnection() {
  const pill = elements["connection-pill"];
  pill.classList.toggle("online", state.connected);
  pill.classList.toggle("offline", !state.connected);
  elements["connection-label"].textContent = state.connected ? "Agent online" : "Agent offline";
}

function renderSummary() {
  const running = Number(state.queue?.running || 0);
  const queued = Number(state.queue?.queued || 0);
  elements["active-count"].textContent = String(running);
  elements["queued-count"].textContent = String(queued);
  elements["history-count"].textContent = String(state.history.length);
  elements["active-caption"].textContent = running > 0
    ? `Downloading for @${state.activity?.username || "instagram"}`
    : "Waiting for work";
  elements["queue-caption"].textContent = state.queue?.paused ? "Queue is paused" : "Queue is ready";
  elements["queue-toggle"].textContent = state.queue?.paused ? "Resume queue" : "Pause queue";
}

function renderQueue() {
  const container = elements["queue-list"];
  container.replaceChildren();
  const jobs = Array.isArray(state.queue?.jobs) ? [...state.queue.jobs] : [];
  const visible = jobs
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
    .filter((job, index) => ["queued", "running"].includes(job.state) || index < 8)
    .slice(0, 12);

  if (visible.length === 0) {
    container.append(emptyState("Queue is empty", "New extension downloads will appear here instantly."));
    return;
  }

  visible.forEach((job) => {
    const row = node("div", "queue-row");
    const info = node("div", "queue-info");
    info.append(
      node("div", "queue-title", job.request?.filename || job.request?.shortcode || "Instagram media"),
      node("div", "queue-subtitle", `${formatUsername(job.request?.username)} · ${friendlyState(job.state)}`),
    );

    const progress = node("div", "queue-progress");
    const progressData = state.progress.get(job.id);
    const percentage = job.state === "completed" || job.state === "skipped"
      ? 100
      : Math.max(0, Math.min(100, Number(progressData?.progressPercent || 0)));
    const track = node("div", "progress-track");
    const fill = node("div", "progress-fill");
    fill.style.width = `${percentage}%`;
    track.append(fill);
    progress.append(track, node("span", "progress-label", job.state === "running" ? `${Math.round(percentage)}%` : friendlyState(job.state)));

    const actions = node("div", "queue-meta");
    const badge = node("span", `state-badge state-${job.state}`, friendlyState(job.state));
    actions.append(badge);
    if (["queued", "running"].includes(job.state)) {
      const cancel = node("button", "button danger", "Cancel");
      cancel.type = "button";
      cancel.addEventListener("click", () => cancelJob(job.id, cancel));
      actions.append(cancel);
    }
    row.append(info, progress, actions);
    container.append(row);
  });
}

function renderActivity() {
  const container = elements["activity-list"];
  container.replaceChildren();
  const logs = Array.isArray(state.activity?.liveLogs) ? [...state.activity.liveLogs].reverse() : [];
  elements["activity-state"].textContent = state.activity?.isActive ? "Live" : "Idle";
  elements["activity-state"].className = `mini-badge ${state.activity?.isActive ? "state-running" : ""}`;

  if (logs.length === 0) {
    container.append(emptyState("No activity yet", "Live download updates will stream into this panel."));
    return;
  }

  logs.slice(0, 50).forEach((entry) => {
    const row = node("div", "activity-row");
    row.append(node("span", `activity-indicator ${entry.status || ""}`));
    const content = node("div", "activity-content");
    content.append(
      node("div", "activity-title", entry.filename || entry.shortcode || "Instagram media"),
      node("div", "activity-meta", `${formatUsername(entry.username)} · ${friendlyState(entry.status)} · ${formatTime(entry.timestamp)}`),
    );
    row.append(content);
    container.append(row);
  });
}

function renderHistory() {
  const container = elements["history-list"];
  container.replaceChildren();
  if (!state.history.length) {
    container.append(emptyState("Archive is empty", "Completed downloads will be listed here."));
    return;
  }
  state.history.slice(0, 8).forEach((entry) => {
    const row = node("div", "history-row");
    const info = node("div", "history-info");
    info.append(
      node("div", "history-name", entry.filename || entry.shortcode || "Instagram media"),
      node("div", "history-meta", `${formatUsername(entry.username)} · ${formatDate(entry.downloadedAt)}`),
    );
    row.append(info, node("span", "history-size", formatBytes(entry.fileSize)));
    container.append(row);
  });
}

function renderSettingsSummary() {
  elements["download-location"].textContent = state.settings?.baseDir || "Not configured";
}

async function toggleQueue() {
  const button = elements["queue-toggle"];
  button.disabled = true;
  try {
    state.queue = state.queue?.paused
      ? await window.go.main.App.ResumeQueue()
      : await window.go.main.App.PauseQueue();
    renderSummary();
    renderQueue();
    showToast(state.queue.paused ? "Queue paused." : "Queue resumed.");
  } catch (error) {
    showToast(readError(error), true);
  } finally {
    button.disabled = !state.connected;
  }
}

async function cancelJob(jobId, button) {
  button.disabled = true;
  try {
    state.queue = await window.go.main.App.CancelJob(jobId);
    state.progress.delete(jobId);
    renderSummary();
    renderQueue();
    showToast("Download canceled.");
  } catch (error) {
    showToast(readError(error), true);
    button.disabled = false;
  }
}

function showSettings() {
  elements["base-dir"].value = state.settings?.baseDir || "";
  elements["folder-structure"].value = state.settings?.folderStructure || "profile";
  elements["settings-overlay"].hidden = false;
  elements["base-dir"].focus();
}

function hideSettings() {
  elements["settings-overlay"].hidden = true;
}

async function chooseFolder() {
  try {
    const selected = await window.go.main.App.ChooseDownloadFolder(elements["base-dir"].value.trim());
    if (selected) elements["base-dir"].value = selected;
  } catch (error) {
    showToast(readError(error), true);
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const button = elements["save-settings"];
  button.disabled = true;
  try {
    state.settings = await window.go.main.App.SaveSettings({
      baseDir: elements["base-dir"].value.trim(),
      folderStructure: elements["folder-structure"].value,
    });
    renderSettingsSummary();
    hideSettings();
    showToast("Settings saved.");
  } catch (error) {
    showToast(readError(error), true);
  } finally {
    button.disabled = false;
  }
}

async function openDownloadsFolder() {
  try {
    await window.go.main.App.OpenDownloadsFolder();
  } catch (error) {
    showToast(readError(error), true);
  }
}

function setControlsEnabled(enabled) {
  elements["queue-toggle"].disabled = !enabled;
  elements["open-folder"].disabled = !enabled;
  elements["open-settings"].disabled = !enabled;
  elements["location-settings"].disabled = !enabled;
}

function setRefreshBusy(busy) {
  elements["refresh-dashboard"].disabled = busy;
  elements["refresh-dashboard"].textContent = busy ? "Refreshing…" : "Refresh";
}

function emptyState(title, message) {
  const wrapper = node("div", "empty-state");
  wrapper.append(node("strong", "", title), node("span", "", message));
  return wrapper;
}

function node(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function friendlyState(value) {
  const normalized = String(value || "unknown").replaceAll("_", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatUsername(value) {
  const username = String(value || "instagram").replace(/^@/, "");
  return `@${username}`;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function readError(error) {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") return error;
  return error.message || String(error);
}

function showToast(message, isError = false) {
  const toast = node("div", `toast${isError ? " error" : ""}`, message);
  elements["toast-region"].append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}
