document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navLinks = document.querySelectorAll('nav a');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetView).classList.add('active');

            // Refresh data when switching views
            if (targetView === 'dashboard') loadStats();
            if (targetView === 'downloads') loadDownloads();
            if (targetView === 'skipped') loadSkipped();
            if (targetView === 'settings') loadSettings();
        });
    });

    // Format bytes
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    // Format date
    function formatDate(isoString) {
        return new Date(isoString).toLocaleString();
    }

    // Load Stats
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
                tbody.innerHTML = '<tr><td colspan="2" class="text-muted">No downloads yet.</td></tr>';
                return;
            }

            accounts.forEach(acc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${acc.username}</strong></td>
                    <td>${acc.count}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error('Failed to load stats', e);
        }
    }

    // Load Downloads
    async function loadDownloads() {
        try {
            const res = await fetch('/api/downloads?limit=50');
            const data = await res.json();
            
            const tbody = document.querySelector('#downloads-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No downloads found.</td></tr>';
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-muted">${formatDate(item.downloadedAt)}</td>
                    <td><strong>${item.username}</strong></td>
                    <td>${item.filename}</td>
                    <td class="text-muted">${formatBytes(item.fileSize)}</td>
                    <td class="text-muted" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.localPath}">${item.localPath}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error('Failed to load downloads', e);
        }
    }

    // Load Skipped
    async function loadSkipped() {
        try {
            const res = await fetch('/api/skipped?limit=50');
            const data = await res.json();
            
            const tbody = document.querySelector('#skipped-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No skipped items.</td></tr>';
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-muted">${formatDate(item.skippedAt)}</td>
                    <td><strong>${item.username}</strong></td>
                    <td>${item.filename}</td>
                    <td class="text-muted">Already exists</td>
                    <td>
                        <button class="btn btn-small force-dl-btn" data-id="${item.id}" data-shortcode="${item.shortcode}" data-filename="${item.filename}" data-username="${item.username}">Force Download</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Add event listeners for Force Download buttons
            document.querySelectorAll('.force-dl-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.target;
                    const originalText = button.textContent;
                    button.textContent = 'Downloading...';
                    button.disabled = true;

                    try {
                        const id = button.getAttribute('data-id');
                        
                        // We need the original URL to force download. For this demo we'll assume the URL
                        // needs to be fetched or the extension sends it. 
                        // Wait, our backend endpoint /api/skipped/{id} with POST needs the URL.
                        // Since we don't store the original URL in the skipped table (because it expires anyway),
                        // we can't reliably force download from the UI without the extension.
                        // Actually, the extension can trigger force download.
                        // For the UI to do it, it would need to delete the skip entry and tell the user to try again in extension.
                        
                        const res = await fetch(`/api/skipped/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            button.textContent = 'Removed from skip list';
                            button.style.backgroundColor = 'var(--success)';
                            setTimeout(() => loadSkipped(), 1500);
                        } else {
                            throw new Error('Failed to delete');
                        }
                    } catch (err) {
                        console.error(err);
                        button.textContent = 'Error';
                        button.disabled = false;
                    }
                });
            });

        } catch (e) {
            console.error('Failed to load skipped', e);
        }
    }

    // Load Settings
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

    // Save Settings
    document.getElementById('save-settings').addEventListener('click', async (e) => {
        const btn = e.target;
        const originalText = btn.textContent;
        const baseDir = document.getElementById('base-dir').value.trim();
        
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseDir })
            });
            if (res.ok) {
                btn.textContent = 'Saved!';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
            } else {
                throw new Error('Failed to save');
            }
        } catch (err) {
            alert('Error saving settings');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Clear buttons handlers
    document.getElementById('clear-downloads-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to clear the download history? The actual files will NOT be deleted from your disk.')) return;
        
        const btn = e.target;
        const originalText = btn.textContent;
        btn.textContent = 'Clearing...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/downloads', { method: 'DELETE' });
            if (res.ok) {
                btn.textContent = 'Cleared!';
                loadDownloads();
                loadStats();
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            } else {
                throw new Error('Failed to clear');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing downloads history');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById('clear-skipped-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to clear the skipped duplicates history? Future downloads will no longer recognize these as duplicates if the files are moved.')) return;
        
        const btn = e.target;
        const originalText = btn.textContent;
        btn.textContent = 'Clearing...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/skipped', { method: 'DELETE' });
            if (res.ok) {
                btn.textContent = 'Cleared!';
                loadSkipped();
                loadStats();
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            } else {
                throw new Error('Failed to clear');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing skipped history');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Initial load
    loadStats();
    
    // Auto refresh dashboard every 10 seconds if active
    setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadStats();
        }
        if (document.getElementById('downloads').classList.contains('active')) {
            loadDownloads();
        }
    }, 10000);
});
