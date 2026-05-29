/**
 * Options Dashboard Script - Full Page website UI
 * Manages site grid, custom keyword list scanner CRUD, Drive sync, and preferences.
 */

let sites = [];
let currentFilter = 'all';
let allDriveFiles = [];

// DOM Elements
const sidebarSignedOut = document.getElementById('sidebarSignedOut');
const sidebarSignedIn = document.getElementById('sidebarSignedIn');
const sidebarSignInBtn = document.getElementById('sidebarSignInBtn');
const sidebarSignInPromoBtn = document.getElementById('sidebarSignInPromoBtn');
const profileAvatar = document.getElementById('profileAvatar');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
const sidebarSyncBtn = document.getElementById('sidebarSyncBtn');
const syncStatus = document.getElementById('syncStatus');
const panelTitle = document.getElementById('panelTitle');

// Drive Sync Panels
const driveSyncCard = document.getElementById('driveSyncCard');
const driveAuthCard = document.getElementById('driveAuthCard');

// Panels
const panels = {
    sites: document.getElementById('sitesPanel'),
    keywords: document.getElementById('keywordsPanel'),
    settings: document.getElementById('settingsPanel')
};

// Sidebar Nav
const menuButtons = document.querySelectorAll('.menu-btn');

// Sites Tab Elements
const sitesSearch = document.getElementById('sitesSearch');
const filterBtns = document.querySelectorAll('.filter-btn');
const sitesGrid = document.getElementById('sitesGrid');
const emptyState = document.getElementById('emptyState');

// Keywords Tab Elements
const newKeywordInput = document.getElementById('newKeyword');
const keywordTypeSelect = document.getElementById('keywordType');
const addKeywordBtn = document.getElementById('addKeywordBtn');
const aiKeywordsTags = document.getElementById('aiKeywordsTags');
const usefulKeywordsTags = document.getElementById('usefulKeywordsTags');

// Settings Tab Elements
const autoSyncCheckbox = document.getElementById('autoSync');
const notificationsCheckbox = document.getElementById('notifications');
const darkModeCheckbox = document.getElementById('darkMode');
const selectDocBtn = document.getElementById('selectDocBtn');
const docNameDisplay = document.getElementById('docNameDisplay');
const syncBtn = document.getElementById('syncBtn');
const clearBtn = document.getElementById('clearBtn');

// Document Selector Modal Elements
const docSelectorModal = document.getElementById('docSelectorModal');
const closeDocModalBtn = document.getElementById('closeDocModalBtn');
const docSearch = document.getElementById('docSearch');
const docList = document.getElementById('docList');

// Initialize
function init() {
    setupEventListeners();
    switchPanel('sites');
    loadSites();
    checkAuthStatus();
    loadSelectedDocument();
    loadSettings();
    loadCustomKeywords();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/**
 * Check authentication status and toggle Auth Guard Panel
 */
/**
 * Check authentication status and toggle profile / sync cards
 */
function checkAuthStatus() {
    chrome.storage.local.get(['isAuthenticated', 'userEmail'], (result) => {
        if (result.isAuthenticated) {
            // Show signed in profile status
            sidebarSignedOut.style.display = 'none';
            sidebarSignedIn.style.display = 'flex';
            
            const email = result.userEmail || 'Signed In';
            userEmailDisplay.textContent = email;
            profileAvatar.textContent = email.charAt(0).toUpperCase();

            // Display cloud settings, hide promo setup card
            driveSyncCard.style.display = 'block';
            driveAuthCard.style.display = 'none';
            
            autoSyncCheckbox.closest('.toggle-group').style.opacity = '1';
            autoSyncCheckbox.closest('.toggle-group').style.pointerEvents = 'auto';

            // Show sync status badge in header
            if (syncStatus) syncStatus.style.display = 'inline-block';
        } else {
            // Show signed out profile button
            sidebarSignedOut.style.display = 'flex';
            sidebarSignedIn.style.display = 'none';

            // Hide cloud settings, display promo setup card
            driveSyncCard.style.display = 'none';
            driveAuthCard.style.display = 'block';
            
            autoSyncCheckbox.closest('.toggle-group').style.opacity = '0.5';
            autoSyncCheckbox.closest('.toggle-group').style.pointerEvents = 'none';

            // Hide sync status badge in header
            if (syncStatus) syncStatus.style.display = 'none';
        }
    });
}

/**
 * Switch panels in Workspace
 */
/**
 * Switch panels in Workspace
 */
function switchPanel(panelName) {
    // Update menu buttons active state
    menuButtons.forEach(btn => {
        if (btn.dataset.panel === panelName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Toggle panel divs
    Object.keys(panels).forEach(key => {
        if (key === panelName) {
            panels[key].classList.add('active');
        } else {
            panels[key].classList.remove('active');
        }
    });

    // Set title
    const titles = {
        sites: 'Collected Sites Collection',
        keywords: 'Custom Site Finding Keywords',
        settings: 'Dashboard Settings & Cloud Sync'
    };
    panelTitle.textContent = titles[panelName] || 'Dashboard';
}

/**
 * Setup event listeners
 */
/**
 * Setup event listeners
 */
function setupEventListeners() {
    sidebarSignInBtn.addEventListener('click', authenticate);
    sidebarSignInPromoBtn.addEventListener('click', authenticate);
    sidebarLogoutBtn.addEventListener('click', logout);
    sidebarSyncBtn.addEventListener('click', syncToDrive);
    syncBtn.addEventListener('click', syncToDrive);
    clearBtn.addEventListener('click', clearAllSites);
    // selectDocBtn removed: drive file is auto-managed, no manual selection needed
    if (closeDocModalBtn) closeDocModalBtn.addEventListener('click', () => docSelectorModal && docSelectorModal.classList.remove('active'));
    if (docSearch) docSearch.addEventListener('input', filterDocuments);

    // Sidebar menu clicks
    menuButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const panel = e.currentTarget.dataset.panel;
            switchPanel(panel);
        });
    });

    // Sites Search filter
    sitesSearch.addEventListener('input', renderSites);

    // Sites Category Filter clicks
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderSites();
        });
    });

    // Settings checkbox toggles
    autoSyncCheckbox.addEventListener('change', (e) => {
        chrome.storage.local.set({ autoSyncSetting: e.target.checked });
    });

    notificationsCheckbox.addEventListener('change', (e) => {
        chrome.storage.local.set({ notificationsSetting: e.target.checked });
    });

    darkModeCheckbox.addEventListener('change', (e) => {
        const isDark = e.target.checked;
        chrome.storage.local.set({ darkModeSetting: isDark });
        applyDarkMode(isDark);
    });

    // Custom keywords listeners
    addKeywordBtn.addEventListener('click', addCustomKeyword);
    newKeywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCustomKeyword();
        }
    });

    // Modal background click to close
    if (docSelectorModal) {
        docSelectorModal.addEventListener('click', (e) => {
            if (e.target === docSelectorModal) {
                docSelectorModal.classList.remove('active');
            }
        });
    }
}

/**
 * Authenticate with Google
 */
function authenticate(e) {
    const clickedBtn = (e && e.currentTarget) || sidebarSignInBtn;
    
    sidebarSignInBtn.disabled = true;
    sidebarSignInPromoBtn.disabled = true;
    clickedBtn.textContent = 'Authenticating...';

    chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
        if (response.success) {
            checkAuthStatus();
            updateSyncStatus(`Authenticated successfully as ${response.email}`);
        } else {
            updateSyncStatus(`Authentication failed: ${response.error}`);
        }
        sidebarSignInBtn.disabled = false;
        sidebarSignInPromoBtn.disabled = false;
        
        sidebarSignInBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
            </svg>
            Sign in with Google
        `;
        
        sidebarSignInPromoBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
            </svg>
            Sign in with Google
        `;
    });
}

/**
 * Logout
 */
function logout() {
    if (confirm('Are you sure you want to sign out? Your local site collection will be preserved.')) {
        chrome.storage.local.set({
            isAuthenticated: false,
            authToken: null,
            userEmail: null,
            driveDocId: null,
            driveDocName: null
        }, () => {
            checkAuthStatus();
        });
    }
}

/**
 * Load settings from storage
 */
function loadSettings() {
    chrome.storage.local.get(['autoSyncSetting', 'notificationsSetting', 'darkModeSetting'], (result) => {
        autoSyncCheckbox.checked = result.autoSyncSetting !== false;
        notificationsCheckbox.checked = result.notificationsSetting !== false;
        darkModeCheckbox.checked = !!result.darkModeSetting;
        applyDarkMode(!!result.darkModeSetting);
    });
}

/**
 * Toggle dark / light theme overrides on body
 */
function applyDarkMode(isDark) {
    if (isDark) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

/**
 * Load sites from storage
 */
function loadSites() {
    chrome.runtime.sendMessage({ action: 'getSites' }, (response) => {
        sites = response.sites || [];
        renderSites();
    });
}

/**
 * Render sites grid with filters and search
 */
/**
 * Render sites grid with multi-token ranked search
 * Tokens: query split by whitespace — ALL tokens must match
 * Ranked: title match > url match > description/tags match
 */
function renderSites() {
    sitesGrid.innerHTML = '';

    const rawQuery = sitesSearch.value.trim().toLowerCase();
    const tokens = rawQuery ? rawQuery.split(/\s+/) : [];

    // 1. Category filter
    let filtered = sites;
    if (currentFilter === 'ai') {
        filtered = sites.filter(s => s.classification && s.classification.isAI);
    } else if (currentFilter === 'useful') {
        filtered = sites.filter(s => s.classification && s.classification.isUseful && !s.classification.isAI);
    }

    // 2. Multi-token search with relevance scoring
    if (tokens.length > 0) {
        const scored = filtered.map(site => {
            const titleLow = (site.title || '').toLowerCase();
            const urlLow = (site.url || '').toLowerCase();
            const descLow = (site.description || '').toLowerCase();
            const tagsLow = [
                ...(site.classification && site.classification.reasons ? site.classification.reasons : []),
                ...(site.keywords || [])
            ].join(' ').toLowerCase();

            // Every token must appear somewhere in the site data
            const allMatch = tokens.every(tok =>
                titleLow.includes(tok) ||
                urlLow.includes(tok) ||
                descLow.includes(tok) ||
                tagsLow.includes(tok)
            );
            if (!allMatch) return null;

            // Relevance score: title hits weighted highest
            let score = 0;
            tokens.forEach(tok => {
                if (titleLow.includes(tok)) score += 10;
                if (urlLow.includes(tok)) score += 4;
                if (descLow.includes(tok)) score += 2;
                if (tagsLow.includes(tok)) score += 1;
            });

            return { site, score };
        }).filter(Boolean);

        // Sort by relevance desc, then by savedAt desc
        scored.sort((a, b) =>
            b.score - a.score ||
            new Date(b.site.savedAt) - new Date(a.site.savedAt)
        );
        filtered = scored.map(s => s.site);
    } else {
        // No query: sort newest first
        filtered = [...filtered].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    }

    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    filtered.forEach(site => {
        const card = createSiteCard(site);
        sitesGrid.appendChild(card);
    });
}


/**
 * Extract tags from classification and keywords
 */
function extractFeatures(site) {
    const features = [];
    if (site.classification.reasons && Array.isArray(site.classification.reasons)) {
        features.push(...site.classification.reasons);
    }
    if (site.keywords && Array.isArray(site.keywords)) {
        features.push(...site.keywords.slice(0, 3));
    }
    return [...new Set(features)].slice(0, 5);
}

/**
 * Create a visual website card element
 */
function createSiteCard(site) {
    const div = document.createElement('div');
    div.className = 'site-card';

    const type = site.classification.isAI ? 'AI' : 'Useful';
    const typeClass = site.classification.isAI ? 'ai' : 'useful';
    const confidence = Math.round(site.classification.confidence * 100);
    const savedDate = new Date(site.savedAt).toLocaleDateString();
    const features = extractFeatures(site);

    div.innerHTML = `
        <div class="site-header">
            <div class="site-title" title="${escapeHtml(site.title)}">${escapeHtml(site.title)}</div>
            <div class="site-badges-box">
                <span class="site-badge ${typeClass}">${site.classification.label || type}</span>
            </div>
        </div>
        <div class="site-description">${escapeHtml(site.description || 'No description available')}</div>
        <div class="site-url" title="Click to open ${escapeHtml(site.url)}">${escapeHtml(site.url)}</div>
        
        ${features.length > 0 ? `<div class="site-features">
            ${features.map(f => `<span class="feature-tag">${escapeHtml(f)}</span>`).join('')}
        </div>` : ''}
        
        <div class="site-footer">
            <span class="site-date">Saved on ${savedDate}</span>
            <div class="site-confidence">
                <span>Confidence: ${confidence}%</span>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
            </div>
        </div>
        <button class="delete-site-btn" title="Delete from collection" data-id="${site.id}">&times;</button>
    `;

    // Click url to open
    div.querySelector('.site-url').addEventListener('click', () => {
        chrome.tabs.create({ url: site.url });
    });

    // Delete single card button listener
    div.querySelector('.delete-site-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.target.dataset.id;
        deleteSingleSite(id);
    });

    return div;
}

/**
 * Delete a specific site from storage
 */
function deleteSingleSite(siteId) {
    if (confirm('Are you sure you want to delete this website from your collection?')) {
        chrome.storage.local.get('sites', (result) => {
            let list = result.sites || [];
            list = list.filter(s => s.id !== siteId);
            chrome.storage.local.set({ sites: list }, () => {
                loadSites();
                updateSyncStatus('Site deleted from collection');
            });
        });
    }
}

/**
 * Load selected Google Drive document info
 */
function loadSelectedDocument() {
    chrome.runtime.sendMessage({ action: 'getDriveDocument' }, (response) => {
        if (response.docId && response.docName) {
            docNameDisplay.textContent = `📄 ${response.docName}`;
        } else {
            docNameDisplay.textContent = 'No document selected';
        }
    });
}

/**
 * Open document selector modal
 */
function openDocSelector() {
    if (docSelectorModal) docSelectorModal.classList.add('active');
    loadDriveFiles();
}

/**
 * Fetch Google Drive documents
 */
function loadDriveFiles() {
    if (!docList) return;
    docList.innerHTML = '<p class="loading">Loading documents from Google Drive...</p>';
    
    chrome.runtime.sendMessage({ action: 'listDriveFiles' }, (response) => {
        if (response.success) {
            allDriveFiles = response.files || [];
            renderDocumentList(allDriveFiles);
        } else {
            docList.innerHTML = `<p class="error">Error loading Drive files: ${response.error}</p>`;
        }
    });
}

/**
 * Render document items inside selector list
 */
function renderDocumentList(files) {
    if (!docList) return;
    if (files.length === 0) {
        docList.innerHTML = '<p class="empty">No documents found in your Drive</p>';
        return;
    }

    docList.innerHTML = files.map(file => `
        <div class="doc-item">
            <div class="doc-info">
                <div class="doc-name">${escapeHtml(file.name)}</div>
                <div class="doc-type">${file.mimeType}</div>
            </div>
            <button class="select-doc-btn" data-id="${file.id}" data-name="${file.name}">Select</button>
        </div>
    `).join('');

    // Attach click listeners to select buttons
    docList.querySelectorAll('.select-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const name = e.target.dataset.name;
            selectDocument(id, name);
        });
    });
}

/**
 * Filter documents in real time
 */
function filterDocuments() {
    const query = docSearch.value.toLowerCase();
    const filtered = allDriveFiles.filter(file => 
        file.name.toLowerCase().includes(query)
    );
    renderDocumentList(filtered);
}

/**
 * Choose Google Drive document
 */
function selectDocument(docId, docName) {
    chrome.runtime.sendMessage({ 
        action: 'setDriveDocument', 
        docId: docId,
        docName: docName
    }, (response) => {
        if (response.success) {
            docNameDisplay.textContent = `📄 ${docName}`;
            updateSyncStatus(response.message);
            if (docSelectorModal) docSelectorModal.classList.remove('active');
            loadSelectedDocument();
        }
    });
}

/**
 * Sync all sites manually to Google Drive
 */
function syncToDrive() {
    syncBtn.disabled = true;
    if (sidebarSyncBtn) sidebarSyncBtn.disabled = true;
    const syncIcons = document.querySelectorAll('.sync-cycle-icon');
    syncIcons.forEach(icon => icon.classList.add('rotating'));
    
    updateSyncStatus('Syncing sites to Google Drive...');

    chrome.runtime.sendMessage({ action: 'syncToDrive' }, (response) => {
        syncIcons.forEach(icon => icon.classList.remove('rotating'));
        syncBtn.disabled = false;
        if (sidebarSyncBtn) sidebarSyncBtn.disabled = false;
        
        if (response.success) {
            updateSyncStatus(response.message);
        } else {
            updateSyncStatus(`Sync failed: ${response.error}`);
        }
    });
}

/**
 * Clear all sites history
 */
function clearAllSites() {
    if (confirm('Are you absolutely sure you want to delete all collected sites? This cannot be undone.')) {
        chrome.storage.local.set({ sites: [] }, () => {
            sites = [];
            renderSites();
            updateSyncStatus('All collected sites cleared');
        });
    }
}

/**
 * Load and render custom keywords tags list
 */
function loadCustomKeywords() {
    chrome.storage.local.get(['customAiKeywords', 'customUsefulKeywords'], (result) => {
        const aiKeywords = result.customAiKeywords || [];
        const usefulKeywords = result.customUsefulKeywords || [];

        renderKeywordTags(aiKeywords, aiKeywordsTags, 'ai');
        renderKeywordTags(usefulKeywords, usefulKeywordsTags, 'useful');
    });
}

/**
 * Render custom tags on tag board
 */
function renderKeywordTags(keywords, container, type) {
    if (keywords.length === 0) {
        container.innerHTML = '<span class="settings-help" style="margin:0;">No custom keywords active</span>';
        return;
    }

    container.innerHTML = keywords.map(kw => `
        <span class="keyword-tag-item ${type === 'useful' ? 'useful-tag' : ''}">
            ${escapeHtml(kw)}
            <button class="delete-tag-btn" data-kw="${escapeHtml(kw)}" data-type="${type}">&times;</button>
        </span>
    `).join('');

    // Attach click listeners to tags delete button
    container.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const kw = e.target.dataset.kw;
            const t = e.target.dataset.type;
            deleteCustomKeyword(kw, t);
        });
    });
}

/**
 * Add custom scanner keyword
 */
function addCustomKeyword() {
    const val = newKeywordInput.value.trim().toLowerCase();
    const type = keywordTypeSelect.value;

    if (!val) return;

    const storageKey = type === 'ai' ? 'customAiKeywords' : 'customUsefulKeywords';

    chrome.storage.local.get(storageKey, (result) => {
        const keywords = result[storageKey] || [];
        if (!keywords.includes(val)) {
            keywords.push(val);
            chrome.storage.local.set({ [storageKey]: keywords }, () => {
                newKeywordInput.value = '';
                loadCustomKeywords();
                updateSyncStatus(`Custom keyword "${val}" added`);
            });
        } else {
            alert('This custom keyword already exists in your lists!');
        }
    });
}

/**
 * Delete custom scanner keyword
 */
function deleteCustomKeyword(kw, type) {
    const storageKey = type === 'ai' ? 'customAiKeywords' : 'customUsefulKeywords';

    chrome.storage.local.get(storageKey, (result) => {
        let keywords = result[storageKey] || [];
        keywords = keywords.filter(k => k !== kw);
        chrome.storage.local.set({ [storageKey]: keywords }, () => {
            loadCustomKeywords();
            updateSyncStatus(`Keyword "${kw}" deleted`);
        });
    });
}

/**
 * Update synchronization status message in Header
 */
function updateSyncStatus(message) {
    syncStatus.textContent = message;
    syncStatus.className = 'status-syncing';
    setTimeout(() => {
        syncStatus.textContent = 'Sync Ready';
        syncStatus.className = 'status-ready';
    }, 4000);
}

/**
 * Escape HTML input helper
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Listen for storage changes from background script or popup
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        if (changes.sites) {
            loadSites();
        }
        if (changes.isAuthenticated || changes.userEmail) {
            checkAuthStatus();
        }
        if (changes.driveDocId || changes.driveDocName) {
            loadSelectedDocument();
        }
        if (changes.autoSyncSetting || changes.notificationsSetting || changes.darkModeSetting) {
            loadSettings();
        }
        if (changes.customAiKeywords || changes.customUsefulKeywords) {
            loadCustomKeywords();
        }
    }
});
