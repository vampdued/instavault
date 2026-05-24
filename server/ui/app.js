document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let currentBaseDir = '';
    
    // Pagination States
    let downloadsPage = 1;
    const downloadsLimit = 15;
    
    let skippedPage = 1;
    const skippedLimit = 15;
    
    let galleryPage = 1;
    const galleryLimit = 12;
    let gallerySearchQuery = '';

    // Navigation setup
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

            // Refresh data on view switch
            if (targetView === 'dashboard') loadStats();
            if (targetView === 'gallery') {
                galleryPage = 1;
                loadGallery();
            }
            if (targetView === 'downloads') {
                downloadsPage = 1;
                loadDownloads();
            }
            if (targetView === 'skipped') {
                skippedPage = 1;
                loadSkipped();
            }
            if (targetView === 'settings') loadSettings();
        });
    });

    // Format bytes helper
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    // Format date helper
    function formatDate(isoString) {
        return new Date(isoString).toLocaleString();
    }

    // Get relative path for media endpoint
    function getMediaUrl(localPath, username, filename) {
        if (!localPath) return '';
        
        let relPath = localPath;
        if (currentBaseDir) {
            // Remove base directory prefix to get relative path inside baseDir
            relPath = localPath.replace(currentBaseDir, '');
        }
        
        // Normalize backslashes (Windows paths) to forward slashes for URLs
        relPath = relPath.replace(/\\/g, '/');
        
        // Remove leading slash if present
        if (relPath.startsWith('/')) {
            relPath = relPath.substring(1);
        }
        
        return `/media/${relPath}`;
    }

    // Check if filename indicates a video file
    function isVideoFile(filename) {
        if (!filename) return false;
        const ext = filename.split('.').pop().toLowerCase();
        return ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext);
    }

    // Load base directory settings on startup
    async function initApp() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.baseDir) {
                currentBaseDir = data.baseDir;
            }
            // Load dashboard stats initially
            loadStats();
        } catch (e) {
            console.error('Initialization failed', e);
        }
    }

    // Load Dashboard Stats
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
                    <td><span class="btn btn-small" style="background: rgba(99, 102, 241, 0.15); color: var(--primary); box-shadow: none; padding: 4px 10px; cursor: default;">${acc.count} files</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error('Failed to load stats', e);
        }
    }

    // Load Interactive Media Gallery
    async function loadGallery() {
        const grid = document.getElementById('gallery-grid');
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;" class="text-muted">Loading your media vault...</div>';

        try {
            let url = `/api/downloads?page=${galleryPage}&limit=${galleryLimit}`;
            if (gallerySearchQuery) {
                url += `&username=${encodeURIComponent(gallerySearchQuery)}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            
            grid.innerHTML = '';
            
            if (data.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px;" class="text-muted">
                    <h3>No media found</h3>
                    <p style="margin-top: 8px; font-size: 0.9rem;">${gallerySearchQuery ? 'Try clearing your search filter.' : 'Your download folder is empty.'}</p>
                </div>`;
                setupPaginationButtons('gallery', 0, galleryPage);
                return;
            }

            data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'media-card';
                
                const mediaUrl = getMediaUrl(item.localPath, item.username, item.filename);
                const isVideo = isVideoFile(item.filename);
                const fileExt = item.filename.split('.').pop().toUpperCase();
                
                card.innerHTML = `
                    <div class="media-preview-container">
                        <span class="media-badge">${isVideo ? 'Video' : fileExt}</span>
                        ${isVideo ? 
                            `<video src="${mediaUrl}" preload="metadata" muted></video>` : 
                            `<img src="${mediaUrl}" alt="${item.filename}" loading="lazy">`
                        }
                    </div>
                    <div class="media-info">
                        <span class="media-user">@${item.username}</span>
                        <span class="media-filename" title="${item.filename}">${item.filename}</span>
                    </div>
                `;
                
                // Open immersive lightbox on card click
                card.addEventListener('click', () => openLightbox(item, mediaUrl, isVideo));
                grid.appendChild(card);
            });

            setupPaginationButtons('gallery', data.length, galleryPage);

        } catch (e) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">Failed to connect to local media. Make sure server is active.</div>';
            console.error('Failed to load gallery', e);
        }
    }

    // Load Downloads Log (Table View)
    async function loadDownloads() {
        try {
            const res = await fetch(`/api/downloads?page=${downloadsPage}&limit=${downloadsLimit}`);
            const data = await res.json();
            
            const tbody = document.querySelector('#downloads-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No downloads found.</td></tr>';
                setupPaginationButtons('downloads', 0, downloadsPage);
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                const mediaUrl = getMediaUrl(item.localPath, item.username, item.filename);
                const isVideo = isVideoFile(item.filename);

                tr.innerHTML = `
                    <td class="text-muted">${formatDate(item.downloadedAt)}</td>
                    <td><strong style="color: var(--accent);">@${item.username}</strong></td>
                    <td style="cursor: pointer; font-weight: 500;" class="preview-trigger">${item.filename} 👁️</td>
                    <td class="text-muted">${formatBytes(item.fileSize)}</td>
                    <td class="text-muted" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.localPath}">${item.localPath}</td>
                `;

                // Add lightbox preview to table filename click
                tr.querySelector('.preview-trigger').addEventListener('click', () => openLightbox(item, mediaUrl, isVideo));
                tbody.appendChild(tr);
            });

            setupPaginationButtons('downloads', data.length, downloadsPage);

        } catch (e) {
            console.error('Failed to load downloads log', e);
        }
    }

    // Load Skipped Duplicates (Table View)
    async function loadSkipped() {
        try {
            const res = await fetch(`/api/skipped?page=${skippedPage}&limit=${skippedLimit}`);
            const data = await res.json();
            
            const tbody = document.querySelector('#skipped-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No skipped items.</td></tr>';
                setupPaginationButtons('skipped', 0, skippedPage);
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-muted">${formatDate(item.skippedAt)}</td>
                    <td><strong>@${item.username}</strong></td>
                    <td>${item.filename}</td>
                    <td class="text-muted"><span style="color: var(--accent); background: rgba(244, 63, 145, 0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Already Exists</span></td>
                    <td>
                        <button class="btn btn-small force-dl-btn" data-id="${item.id}" data-shortcode="${item.shortcode}" data-filename="${item.filename}" data-username="${item.username}">Reset Dupe Filter</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Concurrency-safe reset skip handler
            document.querySelectorAll('.force-dl-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.target;
                    const originalText = button.textContent;
                    button.textContent = 'Clearing...';
                    button.disabled = true;

                    try {
                        const id = button.getAttribute('data-id');
                        const res = await fetch(`/api/skipped/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            button.textContent = 'Ready for Extension';
                            button.style.backgroundColor = 'var(--success)';
                            button.style.boxShadow = 'none';
                            setTimeout(() => loadSkipped(), 1200);
                        } else {
                            throw new Error('Failed to reset skip entry');
                        }
                    } catch (err) {
                        console.error(err);
                        button.textContent = 'Error';
                        button.disabled = false;
                    }
                });
            });

            setupPaginationButtons('skipped', data.length, skippedPage);

        } catch (e) {
            console.error('Failed to load skipped log', e);
        }
    }

    // Pagination Helper Controls
    function setupPaginationButtons(type, count, currentPage) {
        const prevBtn = document.getElementById(`${type}-prev-btn`);
        const nextBtn = document.getElementById(`${type}-next-btn`);
        const pageInfo = document.getElementById(`${type}-page-info`);
        
        let limit = type === 'gallery' ? galleryLimit : (type === 'downloads' ? downloadsLimit : skippedLimit);
        
        pageInfo.textContent = `Page ${currentPage}`;
        
        // Previous page button state
        prevBtn.disabled = currentPage === 1;
        
        // Next page button state (heuristically enabled if returned data equals current fetch limit)
        nextBtn.disabled = count < limit;
    }

    // Handle Pagination Clicks
    document.getElementById('gallery-prev-btn').addEventListener('click', () => {
        if (galleryPage > 1) {
            galleryPage--;
            loadGallery();
        }
    });
    document.getElementById('gallery-next-btn').addEventListener('click', () => {
        galleryPage++;
        loadGallery();
    });

    document.getElementById('downloads-prev-btn').addEventListener('click', () => {
        if (downloadsPage > 1) {
            downloadsPage--;
            loadDownloads();
        }
    });
    document.getElementById('downloads-next-btn').addEventListener('click', () => {
        downloadsPage++;
        loadDownloads();
    });

    document.getElementById('skipped-prev-btn').addEventListener('click', () => {
        if (skippedPage > 1) {
            skippedPage--;
            loadSkipped();
        }
    });
    document.getElementById('skipped-next-btn').addEventListener('click', () => {
        skippedPage++;
        loadSkipped();
    });

    // Gallery Search Handler
    const searchInput = document.getElementById('gallery-search');
    let searchTimeout = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            gallerySearchQuery = e.target.value.trim();
            galleryPage = 1;
            loadGallery();
        }, 400); // Debounce API calls by 400ms
    });

    // Immersive Lightbox Modal Handler
    const lightbox = document.getElementById('lightbox');
    const lightboxMedia = document.getElementById('lightbox-media-container');
    const lightboxCaption = document.getElementById('lightbox-caption');

    function openLightbox(item, mediaUrl, isVideo) {
        lightboxMedia.innerHTML = '';
        
        if (isVideo) {
            const video = document.createElement('video');
            video.src = mediaUrl;
            video.controls = true;
            video.autoplay = true;
            video.style.outline = 'none';
            lightboxMedia.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = mediaUrl;
            img.alt = item.filename;
            lightboxMedia.appendChild(img);
        }

        // Setup captions
        lightboxCaption.querySelector('.main').textContent = item.filename;
        lightboxCaption.querySelector('.sub').textContent = `@${item.username} • Size: ${formatBytes(item.fileSize || 0)} • Logged at: ${formatDate(item.downloadedAt || item.skippedAt)}`;

        lightbox.classList.add('active');
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        // Stop playing video if active
        const video = lightboxMedia.querySelector('video');
        if (video) {
            video.pause();
            video.src = '';
        }
        lightboxMedia.innerHTML = '';
    }

    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    
    // Close lightbox on clicking dark backdrop
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    // Settings Configuration Loader
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.baseDir) {
                document.getElementById('base-dir').value = data.baseDir;
                currentBaseDir = data.baseDir;
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
                currentBaseDir = baseDir;
                btn.textContent = 'Saved Successfully!';
                btn.style.backgroundColor = 'var(--success)';
                btn.style.boxShadow = 'none';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = '';
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

    // Clear History Handlers
    document.getElementById('clear-downloads-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to clear your local downloads database log? Downloaded files on disk will NOT be affected.')) return;
        
        const btn = e.target;
        const originalText = btn.textContent;
        btn.textContent = 'Clearing...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/downloads', { method: 'DELETE' });
            if (res.ok) {
                btn.textContent = 'Cleared!';
                downloadsPage = 1;
                loadDownloads();
                loadStats();
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            } else {
                throw new Error('Failed to clear logs');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing download logs');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById('clear-skipped-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to clear your local duplicates log? Future downloads will no longer ignore these as duplicates.')) return;
        
        const btn = e.target;
        const originalText = btn.textContent;
        btn.textContent = 'Clearing...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/skipped', { method: 'DELETE' });
            if (res.ok) {
                btn.textContent = 'Cleared!';
                skippedPage = 1;
                loadSkipped();
                loadStats();
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            } else {
                throw new Error('Failed to clear duplicates logs');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing duplicates logs');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Initialize application settings & load default states
    initApp();
    
    // Auto-refresh Dashboard Stats every 15 seconds if active
    setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadStats();
        }
    }, 15000);
});
