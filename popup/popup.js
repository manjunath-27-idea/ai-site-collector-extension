/**
 * Popup Script - Handles UI interactions and data visualization
 * Single document mode: All sites appended to one selected document
 */

let sites = [];
let currentFilter = 'all';
let allDriveFiles = [];

// DOM Elements
const authSection = document.getElementById('authSection');
const sitesSection = document.getElementById('sitesSection');
const sitesList = document.getElementById('sitesList');
const emptyState = document.getElementById('emptyState');
const authBtn = document.getElementById('authBtn');
const syncBtn = document.getElementById('syncBtn');
const clearBtn = document.getElementById('clearBtn');
const settingsBtn = document.getElementById('settingsBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const settingsModal = document.getElementById('settingsModal');
const docSelectorModal = document.getElementById('docSelectorModal');
const selectDocBtn = document.getElementById('selectDocBtn');
const docNameDisplay = document.getElementById('docNameDisplay');
const docList = document.getElementById('docList');
const docSearch = document.getElementById('docSearch');
const closeButtons = document.querySelectorAll('.close-btn');
const popupSignedOut = document.getElementById('popupSignedOut');
const popupSignedIn = document.getElementById('popupSignedIn');
const popupSignInBtn = document.getElementById('popupSignInBtn');
const popupProfileAvatar = document.getElementById('popupProfileAvatar');
const popupUserEmailDisplay = document.getElementById('popupUserEmailDisplay');
const popupVersionBadge = document.getElementById('popupVersionBadge');
const popupLogoutBtn = document.getElementById('popupLogoutBtn');
const popupSyncBtn = document.getElementById('popupSyncBtn');
const popupSyncBadge = document.getElementById('popupSyncBadge');
const syncStatus = document.getElementById('syncStatus');
const filterBtns = document.querySelectorAll('.filter-btn');

// Settings and custom keyword DOM elements
const autoSyncCheckbox = document.getElementById('autoSync');
const notificationsCheckbox = document.getElementById('notifications');
const darkModeCheckbox = document.getElementById('darkMode');
const newKeywordInput = document.getElementById('newKeyword');
const keywordTypeSelect = document.getElementById('keywordType');
const addKeywordBtn = document.getElementById('addKeywordBtn');
const aiKeywordsTags = document.getElementById('aiKeywordsTags');
const usefulKeywordsTags = document.getElementById('usefulKeywordsTags');

// Initialize
function init() {
    selfHealSitesDescription();
    loadSites();
    setupEventListeners();
    checkAuthStatus();
    loadSelectedDocument();
    loadSettings();
    loadCustomKeywords();
    updateSyncBadge();
}

/**
 * Self-healing background migration: Clean broken em-dashes from already collected site descriptions
 */
function selfHealSitesDescription() {
    chrome.storage.local.get('sites', (result) => {
        const list = result.sites || [];
        let modified = false;
        
        const cleanedList = list.map(site => {
            if (site.description && (site.description.includes('â€”') || site.description.includes('—'))) {
                let d = site.description;
                d = d.replace(/â€”/g, ' - ');
                d = d.replace(/—/g, ' - ');
                modified = true;
                return { ...site, description: d };
            }
            return site;
        });

        if (modified) {
            chrome.storage.local.set({ sites: cleanedList }, () => {
                console.log('[Self-Heal] Stored site descriptions cleaned of broken encoding symbols.');
                loadSites();
            });
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    authBtn.addEventListener('click', authenticate);
    syncBtn.addEventListener('click', syncToDrive);
    clearBtn.addEventListener('click', clearAllSites);
    settingsBtn.addEventListener('click', openSettings);
    dashboardBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    // selectDocBtn removed — drive file is auto-managed, no manual selection
    popupLogoutBtn.addEventListener('click', logout);
    popupSyncBtn.addEventListener('click', syncToDrive);
    popupSignInBtn.addEventListener('click', authenticate);
    if (docSearch) docSearch.addEventListener('input', filterDocuments);

    // Settings toggles listeners
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

    // Custom keyword listener
    addKeywordBtn.addEventListener('click', addCustomKeyword);
    newKeywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCustomKeyword();
        }
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderSites();
        });
    });

    // Close modal when clicking outside — only when modal exists in DOM
    [settingsModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }
    });
}

/**
 * Check authentication status
 */
function checkAuthStatus() {
    chrome.storage.local.get(['isAuthenticated', 'userEmail'], (result) => {
        if (result.isAuthenticated) {
            showSitesSection();
            if (popupSignedOut && popupSignedIn) {
                popupSignedOut.style.display = 'none';
                popupSignedIn.style.display = 'flex';
                const email = result.userEmail || 'Signed In';
                popupUserEmailDisplay.textContent = email;
                popupProfileAvatar.textContent = email.charAt(0).toUpperCase();
                if (popupVersionBadge) {
                    popupVersionBadge.textContent = 'v' + chrome.runtime.getManifest().version;
                }
            }
            if (syncStatus) syncStatus.style.display = 'block';
            loadSelectedDocument();
        } else {
            showAuthSection();
            if (popupSignedOut && popupSignedIn) {
                popupSignedOut.style.display = 'flex';
                popupSignedIn.style.display = 'none';
            }
            if (syncStatus) syncStatus.style.display = 'none';
        }
    });
}

/**
 * Show auth section
 */
function showAuthSection() {
    authSection.style.display = 'flex';
    sitesSection.style.display = 'none';
}

/**
 * Show sites section
 */
function showSitesSection() {
    authSection.style.display = 'none';
    sitesSection.style.display = 'flex';
    loadSites();
}

/**
 * Authenticate with Google
 */
function authenticate(e) {
    const clickedBtn = (e && e.currentTarget) || authBtn;
    
    authBtn.disabled = true;
    popupSignInBtn.disabled = true;
    clickedBtn.textContent = 'Authenticating...';

    chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
        if (response.success) {
            showSitesSection();
            checkAuthStatus();
            updateSyncStatus(`Authenticated as ${response.email}`);
        } else {
            updateSyncStatus(`Error: ${response.error}`);
        }
        authBtn.disabled = false;
        popupSignInBtn.disabled = false;
        
        authBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
            </svg>
            Sign in with Google
        `;
        
        popupSignInBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;">
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
 * Load sites from storage
 */
function loadSites() {
    chrome.runtime.sendMessage({ action: 'getSites' }, (response) => {
        sites = response.sites || [];
        renderSites();
    });
}

/**
 * Load selected document info
 */
function loadSelectedDocument() {
    chrome.storage.local.get(['driveDocId', 'driveDocName'], (result) => {
        if (result.driveDocId && result.driveDocName) {
            let docName = result.driveDocName.replace(/(\.txt|\.md)$/i, '').trim();
            chrome.storage.local.set({ driveDocName: docName });
            docNameDisplay.textContent = `📄 ${docName}`;
            docNameDisplay.parentElement.style.display = 'block';
        } else {
            docNameDisplay.textContent = 'No document selected';
            docNameDisplay.parentElement.style.display = 'block';
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
 * Load Google Drive files
 */
function loadDriveFiles() {
    if (!docList) return;
    docList.innerHTML = '<p class="loading">Loading documents...</p>';
    
    chrome.runtime.sendMessage({ action: 'listDriveFiles' }, (response) => {
        if (response.success) {
            allDriveFiles = response.files || [];
            renderDocumentList(allDriveFiles);
        } else {
            docList.innerHTML = `<p class="error">Error: ${response.error}</p>`;
        }
    });
}

/**
 * Render document list
 */
function renderDocumentList(files) {
    if (!docList) return;
    if (files.length === 0) {
        docList.innerHTML = '<p class="empty">No documents found in your Drive</p>';
        return;
    }

    docList.innerHTML = files.map(file => `
        <div class="doc-item" data-id="${file.id}" data-name="${file.name}">
            <div class="doc-info">
                <div class="doc-name">${escapeHtml(file.name)}</div>
                <div class="doc-type">${file.mimeType}</div>
            </div>
            <button class="select-doc-btn" data-id="${file.id}" data-name="${escapeHtml(file.name)}">Select</button>
        </div>
    `).join('');

    // Attach programmatic click listeners to prevent MV3 CSP violations
    docList.querySelectorAll('.select-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const name = e.target.dataset.name;
            selectDocument(id, name);
        });
    });
}

/**
 * Filter documents
 */
function filterDocuments() {
    const query = docSearch.value.toLowerCase();
    const filtered = allDriveFiles.filter(file => 
        file.name.toLowerCase().includes(query)
    );
    renderDocumentList(filtered);
}

/**
 * Select document
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
 * Render sites list
 */
/**
 * Render sites list with multi-token ranked search
 */
function renderSites() {
    sitesList.innerHTML = '';

    const rawQuery = '';
    // (Popup has no search bar — category filter only)
    let filteredSites = sites;
    if (currentFilter === 'ai') {
        filteredSites = sites.filter(s => s.classification && s.classification.isAI);
    } else if (currentFilter === 'useful') {
        filteredSites = sites.filter(s => s.classification && s.classification.isUseful && !s.classification.isAI);
    }

    // Sort: newest first
    filteredSites = [...filteredSites].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    if (filteredSites.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    filteredSites.forEach(site => {
        const siteEl = createSiteElement(site);
        sitesList.appendChild(siteEl);
    });
}


/**
 * Extract features from site
 */
function extractFeatures(site) {
    const features = [];
    
    // 1. Prioritize classification tags
    if (site.classification && site.classification.tags && Array.isArray(site.classification.tags)) {
        features.push(...site.classification.tags);
    }
    
    // 2. Filter classification reasons to exclude technical/debug details
    if (site.classification && site.classification.reasons && Array.isArray(site.classification.reasons)) {
        const cleanReasons = site.classification.reasons.filter(r => {
            const rl = r.toLowerCase();
            return !rl.includes('knowledge base') &&
                   !rl.includes('keyword matched') &&
                   !rl.includes('domain list match') &&
                   !rl.includes('keyword score') &&
                   !rl.includes('points') &&
                   !rl.includes('custom ai keyword match') &&
                   !rl.includes('tld') &&
                   !rl.includes('corroboration') &&
                   !rl.includes('useful platform domain');
        });
        features.push(...cleanReasons);
    }
    
    // 3. Fallback to page keywords
    if (site.keywords && Array.isArray(site.keywords)) {
        features.push(...site.keywords.slice(0, 3));
    }
    
    // 4. Extract from description if still short on features
    const descKeywords = [
        'free', 'open source', 'api', 'tool', 'platform', 'service', 'framework', 
        'library', 'automation', 'productivity', 'agent', 'chatbot', 'chat', 'model', 
        'image', 'video', 'voice', 'audio', 'design', 'code', 'developer', 'search',
        'analytics', 'marketing', 'creative', 'llm', 'writing', 'translation', 'database',
        'security', 'privacy', 'cloud', 'hosting', 'deployment', 'collaboration'
    ];
    if (site.description && features.length < 5) {
        descKeywords.forEach(keyword => {
            if (site.description.toLowerCase().includes(keyword)) {
                features.push(keyword);
            }
        });
    }
    
    // 5. Professional Capitalization & Deduplication
    const acronyms = {
        'ai': 'AI', 'llm': 'LLM', 'api': 'API', 'nlp': 'NLP', 'gpt': 'GPT', '2fa': '2FA', 'mfa': 'MFA', 'csv': 'CSV'
    };
    const cleanFeatures = features.map(f => {
        return f.split(' ').map(w => {
            const wl = w.toLowerCase();
            return acronyms[wl] || (w.charAt(0).toUpperCase() + w.slice(1));
        }).join(' ');
    });
    
    return [...new Set(cleanFeatures)].slice(0, 5);
}

/**
 * Create site element
 */
function createSiteElement(site) {
    const div = document.createElement('div');
    div.className = 'site-item';

    // Use the specific label from classification, fallback to AI/Useful
    const label = (site.classification && site.classification.label) ||
                  ((site.classification && site.classification.isAI) ? 'AI Tool' : 'Useful Tool');
    // Derive CSS class from label for color coding
    const badgeClass = getBadgeClass(label);
    const confidence = Math.round(((site.classification && site.classification.confidence) || 0) * 100);
    const savedDate = new Date(site.savedAt || site.timestamp || new Date()).toLocaleDateString();
    const features = extractFeatures(site);

    div.innerHTML = `
        <div class="site-header">
            <div class="site-title">${escapeHtml(site.title)}</div>
            <span class="site-badge ${badgeClass}">${escapeHtml(label)}</span>
        </div>
        <div class="site-url">${escapeHtml(site.url)}</div>
        ${features.length > 0 ? `<div class="site-features">
            <strong>Features:</strong> ${features.map(f => `<span class="feature-tag">${escapeHtml(f)}</span>`).join('')}
        </div>` : ''}
        <div class="site-footer">
            <span>${savedDate}</span>
            <div class="confidence">
                <span>${confidence}%</span>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
            </div>
        </div>
    `;

    div.addEventListener('click', () => {
        chrome.tabs.create({ url: site.url });
    });

    return div;
}

/**
 * Derive a CSS badge class from a label string
 */
function getBadgeClass(label) {
    if (!label) return 'useful';
    const l = label.toLowerCase();
    if (l.includes('chatbot') || l.includes('chatgpt') || l === 'ai chatbot') return 'badge-chatbot';
    if (l.includes('image'))      return 'badge-image';
    if (l.includes('video'))      return 'badge-video';
    if (l.includes('music') || l.includes('voice') || l.includes('audio')) return 'badge-audio';
    if (l.includes('code') || l.includes('coding')) return 'badge-code';
    if (l.includes('search'))     return 'badge-search';
    if (l.includes('research'))   return 'badge-research';
    if (l.includes('slides') || l.includes('presentation')) return 'badge-slides';
    if (l.includes('model') || l.includes('inference')) return 'badge-model';
    if (l.includes('agency'))     return 'badge-agency';
    if (l.includes('ai'))         return 'ai';
    return 'useful';
}




/**
 * Sync to Google Drive
 */
function syncToDrive() {
    syncBtn.disabled = true;
    if (popupSyncBtn) popupSyncBtn.disabled = true;
    const syncIcons = document.querySelectorAll('.sync-cycle-icon');
    syncIcons.forEach(icon => icon.classList.add('rotating'));
    
    updateSyncStatus('Syncing...');

    chrome.runtime.sendMessage({ action: 'syncToDrive' }, (response) => {
        syncIcons.forEach(icon => icon.classList.remove('rotating'));
        syncBtn.disabled = false;
        if (popupSyncBtn) popupSyncBtn.disabled = false;
        
        if (response && response.success) {
            updateSyncStatus(response.message);
        } else {
            const errMsg = response ? response.error : 'Connection lost or service worker inactive. Please try again.';
            updateSyncStatus(`Sync failed: ${errMsg}`);
        }
    });
}

/**
 * Clear all sites
 */
function clearAllSites() {
    if (confirm('Are you sure you want to delete all collected sites?')) {
        chrome.storage.local.set({ sites: [] });
        sites = [];
        renderSites();
        updateSyncStatus('All sites cleared');
    }
}

/**
 * Open settings modal
 */
function openSettings() {
    settingsModal.classList.add('active');
}

/**
 * Logout
 */
function logout() {
    if (confirm('Are you sure you want to sign out? Your local site collection will be preserved.')) {
        chrome.storage.local.get('authToken', (result) => {
            if (result.authToken) {
                chrome.identity.removeCachedAuthToken({ token: result.authToken }, () => {
                    console.log('Cached auth token cleared.');
                });
            }
            chrome.storage.local.set({
                isAuthenticated: false,
                authToken: null,
                userEmail: null,
                driveDocId: null,
                driveDocName: null,
                driveFolderId: null
            }, () => {
                checkAuthStatus();
                if (typeof settingsModal !== 'undefined' && settingsModal) {
                    settingsModal.classList.remove('active');
                }
            });
        });
    }
}

/**
 * Update sync status
 */
function updateSyncStatus(message) {
    syncStatus.textContent = message;
    setTimeout(() => {
        syncStatus.textContent = 'Ready';
    }, 3000);
}

/**
 * Escape HTML
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

// Listen for storage changes from background script or options page
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        if (changes.sites || changes.isAuthenticated) {
            updateSyncBadge();
        }
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
 * Apply dark mode class to body
 */
function applyDarkMode(isDark) {
    if (isDark) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

/**
 * Load and render custom keywords
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
 * Render keyword tags inside container
 */
function renderKeywordTags(keywords, container, type) {
    if (keywords.length === 0) {
        container.innerHTML = '<span class="settings-help" style="margin:0;">None</span>';
        return;
    }

    container.innerHTML = keywords.map(kw => `
        <span class="keyword-tag-item ${type === 'useful' ? 'useful-tag' : ''}">
            ${escapeHtml(kw)}
            <button class="delete-tag-btn" data-kw="${escapeHtml(kw)}" data-type="${type}">&times;</button>
        </span>
    `).join('');

    // Add delete event listeners
    container.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const kw = e.target.dataset.kw;
            const t = e.target.dataset.type;
            deleteCustomKeyword(kw, t);
        });
    });
}

/**
 * Add custom keyword
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
            });
        } else {
            alert('Keyword already exists!');
        }
    });
}

/**
 * Delete custom keyword
 */
function deleteCustomKeyword(kw, type) {
    const storageKey = type === 'ai' ? 'customAiKeywords' : 'customUsefulKeywords';

    chrome.storage.local.get(storageKey, (result) => {
        let keywords = result[storageKey] || [];
        keywords = keywords.filter(k => k !== kw);
        chrome.storage.local.set({ [storageKey]: keywords }, () => {
            loadCustomKeywords();
        });
    });
}

/**
 * Update the popup sync status badge count & tick icon
 */
function updateSyncBadge() {
    chrome.storage.local.get(['sites', 'isAuthenticated'], (result) => {
        const popupSyncBadge = document.getElementById('popupSyncBadge');
        const popupSyncBtn = document.getElementById('popupSyncBtn');
        if (!popupSyncBadge) return;

        if (!result.isAuthenticated) {
            popupSyncBadge.style.display = 'none';
            if (popupSyncBtn) popupSyncBtn.className = 'sync-icon-btn';
            return;
        }

        const sites = result.sites || [];
        const unsyncedCount = sites.filter(s => !s.synced).length;

        popupSyncBadge.style.display = 'inline-flex';
        if (unsyncedCount > 0) {
            popupSyncBadge.textContent = unsyncedCount;
            popupSyncBadge.className = 'sync-badge unsynced';
            popupSyncBadge.title = `${unsyncedCount} unsynced sites`;
            if (popupSyncBtn) {
                popupSyncBtn.className = 'sync-icon-btn unsynced';
                popupSyncBtn.title = `Sync Collection to Drive (${unsyncedCount} unsynced sites)`;
            }
        } else {
            popupSyncBadge.textContent = '✓';
            popupSyncBadge.className = 'sync-badge synced';
            popupSyncBadge.title = 'All sites fully synced to Drive';
            if (popupSyncBtn) {
                popupSyncBtn.className = 'sync-icon-btn synced';
                popupSyncBtn.title = 'All sites fully synced to Drive';
            }
        }
    });
}
