document.addEventListener('DOMContentLoaded', () => {
    // ─── Theme Management ────────────────────────────────────────────────────
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeLabel = themeToggleBtn.querySelector('.sidebar-label');
    
    function applyTheme(theme) {
        if (theme === 'dark') {
            htmlEl.classList.add('dark');
            if (themeLabel) themeLabel.textContent = 'Dark Theme';
            localStorage.setItem('theme', 'dark');
        } else {
            htmlEl.classList.remove('dark');
            if (themeLabel) themeLabel.textContent = 'Light Theme';
            localStorage.setItem('theme', 'light');
        }
        lucide.createIcons();
    }
    
    // Read from localStorage (default: dark theme)
    const activeTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(activeTheme);
    
    themeToggleBtn.addEventListener('click', () => {
        const isCurrentlyDark = htmlEl.classList.contains('dark');
        applyTheme(isCurrentlyDark ? 'light' : 'dark');
    });

    // ─── Collapsible Sidebar Management ──────────────────────────────────────
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
    
    function applySidebarState(collapsed) {
        if (collapsed) {
            sidebar.classList.add('collapsed');
            sidebarToggleIcon.setAttribute('data-lucide', 'chevron-right');
        } else {
            sidebar.classList.remove('collapsed');
            sidebarToggleIcon.setAttribute('data-lucide', 'chevron-left');
        }
        lucide.createIcons();
    }
    
    // Read from localStorage (default: expanded)
    const isSidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    applySidebarState(isSidebarCollapsed);
    
    sidebarToggle.addEventListener('click', () => {
        const collapsedState = sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar-collapsed', collapsedState);
        sidebarToggleIcon.setAttribute('data-lucide', collapsedState ? 'chevron-right' : 'chevron-left');
        lucide.createIcons();
    });

    // Mobile Responsive Sidebar Toggler
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    // Dismiss sidebar when tapping viewport outside on mobile screens
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && !sidebar.contains(e.target) && !mobileSidebarToggle.contains(e.target)) {
            sidebar.classList.add('-translate-x-full');
        }
    });

    // ─── Ticking Session Local Clock ──────────────────────────────────────────
    const clockEl = document.getElementById('session-time');
    function updateClock() {
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ─── Workspace Views & Dynamic Navigation ───────────────────────────────
    const navLinks = document.querySelectorAll('nav a');
    const views = document.querySelectorAll('.view');
    const headerTitle = document.getElementById('active-view-title');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetView).classList.add('active');

            // Sync Header Navigation Text
            if (headerTitle) {
                const labelText = link.querySelector('.sidebar-label').textContent;
                headerTitle.textContent = labelText;
            }

            // Slide out sidebar on mobile click
            if (window.innerWidth < 768) {
                sidebar.classList.add('-translate-x-full');
            }

            // Refresh view data
            if (targetView === 'dashboard') loadStats();
            if (targetView === 'downloads') loadDownloads();
            if (targetView === 'skipped') loadSkipped();
            if (targetView === 'settings') loadSettings();
        });
    });

    // ─── Utility Formatting Functions ─────────────────────────────────────────
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function formatDate(isoString) {
        return new Date(isoString).toLocaleString();
    }

    // ─── Dashboard Loader (Stats & Accounts) ──────────────────────────────────
    async function loadStats() {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('stat-total-dl').textContent = data.totalDownloads || 0;
            document.getElementById('stat-total-skipped').textContent = data.totalSkipped || 0;
            document.getElementById('stat-unique-accounts').textContent = data.uniqueAccounts || 0;

            const accRes = await fetch('/api/accounts');
            const accounts = await accRes.json();
            
            const tbody = document.querySelector('#accounts-table tbody');
            tbody.innerHTML = '';
            
            if (accounts.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="2" class="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                            <div class="flex flex-col items-center justify-center gap-2">
                                <i data-lucide="inbox" class="w-8 h-8 text-slate-350 dark:text-slate-655"></i>
                                <span>No download data captured yet.</span>
                            </div>
                        </td>
                    </tr>`;
                lucide.createIcons();
                return;
            }

            accounts.forEach(acc => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-150";
                tr.innerHTML = `
                    <td class="py-4 px-6 font-semibold text-slate-850 dark:text-slate-200">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-brand-100/50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                ${acc.username.substring(0, 2)}
                            </div>
                            <span class="hover:text-brand-500 transition-colors cursor-pointer">@${acc.username}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6 text-right">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-100/30 dark:border-brand-500/20 shadow-sm">
                            ${acc.count} Items
                        </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();
        } catch (e) {
            console.error('Failed to load stats', e);
        }
    }

    // ─── Recent Downloads Loader ──────────────────────────────────────────────
    async function loadDownloads() {
        try {
            const res = await fetch('/api/downloads?limit=50');
            const data = await res.json();
            
            const tbody = document.querySelector('#downloads-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                            <div class="flex flex-col items-center justify-center gap-2">
                                <i data-lucide="download" class="w-9 h-9 text-slate-350 dark:text-slate-655"></i>
                                <span>No downloads located in history.</span>
                            </div>
                        </td>
                    </tr>`;
                lucide.createIcons();
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-150";
                tr.innerHTML = `
                    <td class="py-4 px-6 text-slate-400 dark:text-slate-500 whitespace-nowrap font-medium text-xs">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                            <span>${formatDate(item.downloadedAt)}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                        <span class="hover:text-brand-500 transition-colors cursor-pointer">@${item.username}</span>
                    </td>
                    <td class="py-4 px-6 text-slate-650 dark:text-slate-300 font-mono text-xs truncate max-w-[200px]" title="${item.filename}">${item.filename}</td>
                    <td class="py-4 px-6 text-slate-500 dark:text-slate-400 whitespace-nowrap font-semibold text-xs">${formatBytes(item.fileSize)}</td>
                    <td class="py-4 px-6 text-slate-400 dark:text-slate-500 font-mono text-xs truncate max-w-[280px]" title="${item.localPath}">
                        <div class="flex items-center gap-2">
                            <i data-lucide="file-text" class="w-3.5 h-3.5 flex-shrink-0 text-slate-400"></i>
                            <span class="truncate">${item.localPath}</span>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();
        } catch (e) {
            console.error('Failed to load downloads', e);
        }
    }

    // ─── Skipped Duplicates Loader ────────────────────────────────────────────
    async function loadSkipped() {
        try {
            const res = await fetch('/api/skipped?limit=50');
            const data = await res.json();
            
            const tbody = document.querySelector('#skipped-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                            <div class="flex flex-col items-center justify-center gap-2">
                                <i data-lucide="check-square" class="w-9 h-9 text-slate-350 dark:text-slate-655"></i>
                                <span>Excellent. No bypassed duplicates recorded.</span>
                            </div>
                        </td>
                    </tr>`;
                lucide.createIcons();
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-150";
                tr.innerHTML = `
                    <td class="py-4 px-6 text-slate-400 dark:text-slate-500 whitespace-nowrap font-medium text-xs">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                            <span>${formatDate(item.skippedAt)}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">@${item.username}</td>
                    <td class="py-4 px-6 text-slate-650 dark:text-slate-300 font-mono text-xs truncate max-w-[200px]" title="${item.filename}">${item.filename}</td>
                    <td class="py-4 px-6 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                            <i data-lucide="copy" class="w-3 h-3"></i> Already Exists
                        </span>
                    </td>
                    <td class="py-4 px-6 text-center whitespace-nowrap">
                        <button class="force-dl-btn px-3 py-1.5 rounded-lg text-xs font-bold text-brand-650 dark:text-brand-400 hover:bg-brand-500/10 active:scale-95 border border-brand-500/20 dark:border-brand-500/30 bg-brand-500/5 transition-all inline-flex items-center gap-1.5" data-id="${item.id}" data-shortcode="${item.shortcode}" data-filename="${item.filename}" data-username="${item.username}">
                            <i data-lucide="trash" class="w-3.5 h-3.5"></i> Clear Bypassed Entry
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Bind Force Download/Delete button handlers
            document.querySelectorAll('.force-dl-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.currentTarget;
                    const originalHTML = button.innerHTML;
                    button.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Clearing...`;
                    button.disabled = true;
                    lucide.createIcons();

                    try {
                        const id = button.getAttribute('data-id');
                        const res = await fetch(`/api/skipped/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            button.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-white"></i> Cleared!`;
                            button.classList.remove('text-brand-650', 'dark:text-brand-400', 'hover:bg-brand-500/10', 'border-brand-500/20');
                            button.classList.add('bg-emerald-500', 'text-white', 'border-emerald-500');
                            lucide.createIcons();
                            setTimeout(() => loadSkipped(), 1200);
                        } else {
                            throw new Error('Failed to delete skip entry.');
                        }
                    } catch (err) {
                        console.error(err);
                        button.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Error`;
                        button.disabled = false;
                        lucide.createIcons();
                    }
                });
            });

            lucide.createIcons();
        } catch (e) {
            console.error('Failed to load skipped', e);
        }
    }

    // ─── Settings Loader & Save ──────────────────────────────────────────────
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.baseDir) {
                document.getElementById('base-dir').value = data.baseDir;
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    }

    document.getElementById('save-settings').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        const baseDir = document.getElementById('base-dir').value.trim();
        
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving Parameters...`;
        btn.disabled = true;
        lucide.createIcons();

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseDir })
            });
            if (res.ok) {
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Saved Securely!`;
                btn.classList.remove('from-brand-600', 'to-indigo-600');
                btn.classList.add('bg-emerald-650');
                lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('bg-emerald-650');
                    btn.classList.add('from-brand-600', 'to-indigo-600');
                    btn.disabled = false;
                    lucide.createIcons();
                }, 2000);
            } else {
                throw new Error('Failed to save settings.');
            }
        } catch (err) {
            alert('Error updating workspace settings: ' + err.message);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            lucide.createIcons();
        }
    });

    // ─── Global Clean Up Functions ───────────────────────────────────────────
    document.getElementById('clear-downloads-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you absolutely sure you want to clear the entire download logs database? Local files on disk will NOT be modified.')) return;
        
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Clearing database...`;
        btn.disabled = true;
        lucide.createIcons();

        try {
            const res = await fetch('/api/downloads', { method: 'DELETE' });
            if (res.ok) {
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Logs Purged!`;
                lucide.createIcons();
                loadDownloads();
                loadStats();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    lucide.createIcons();
                }, 1500);
            } else {
                throw new Error('Failed to clear download database.');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing download logs: ' + err.message);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            lucide.createIcons();
        }
    });

    document.getElementById('clear-skipped-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you absolutely sure you want to purge the skipped duplicates log? If files are moved, future downloads will trigger duplicates re-downloads.')) return;
        
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Purging bypasses...`;
        btn.disabled = true;
        lucide.createIcons();

        try {
            const res = await fetch('/api/skipped', { method: 'DELETE' });
            if (res.ok) {
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Purge Complete!`;
                lucide.createIcons();
                loadSkipped();
                loadStats();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    lucide.createIcons();
                }, 1500);
            } else {
                throw new Error('Failed to purge bypass database.');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing bypass database: ' + err.message);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            lucide.createIcons();
        }
    });

    // ─── Initialization ──────────────────────────────────────────────────────
    loadStats();
    
    // Auto-refresh dashboard metrics & download history logs in 10s cycles
    setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadStats();
        }
        if (document.getElementById('downloads').classList.contains('active')) {
            loadDownloads();
        }
    }, 10000);
});
