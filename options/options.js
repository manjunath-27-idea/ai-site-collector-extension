/**
 * Options Dashboard Script - Full Page website UI
 * Manages site grid, custom keyword list scanner CRUD, Drive sync, and preferences.
 */

/**
 * Suffix-based field locking helper functions
 */
function isFieldLockedOrOverridden(val) {
  if (!val) return false;
  if (Array.isArray(val)) {
    return val.some(item => typeof item === 'string' && (item.trim().endsWith('*') || item.trim().endsWith('**')));
  }
  if (typeof val === 'object') {
    return isFieldLockedOrOverridden(val.label);
  }
  const str = String(val).trim();
  return str.endsWith('*') || str.endsWith('**');
}

function isFieldLocked(val) {
  if (!val) return false;
  if (Array.isArray(val)) {
    return val.some(item => typeof item === 'string' && item.trim().endsWith('*') && !item.trim().endsWith('**'));
  }
  if (typeof val === 'object') {
    return isFieldLocked(val.label);
  }
  const str = String(val).trim();
  return str.endsWith('*') && !str.endsWith('**');
}

function isFieldOverridden(val) {
  if (!val) return false;
  if (Array.isArray(val)) {
    return val.some(item => typeof item === 'string' && item.trim().endsWith('**'));
  }
  if (typeof val === 'object') {
    return isFieldOverridden(val.label);
  }
  const str = String(val).trim();
  return str.endsWith('**');
}

function cleanFieldLockSuffix(val) {
  if (!val) return val;
  if (Array.isArray(val)) {
    return val.map(cleanFieldLockSuffix).filter(item => item !== '*' && item !== '**' && item !== '');
  }
  if (typeof val === 'object') {
    const cleaned = { ...val };
    if (cleaned.label) cleaned.label = cleanFieldLockSuffix(cleaned.label);
    if (cleaned.tags) cleaned.tags = cleaned.tags.map(cleanFieldLockSuffix);
    if (cleaned.reasons) cleaned.reasons = cleaned.reasons.map(cleanFieldLockSuffix);
    return cleaned;
  }
  return String(val).replace(/\s*\*\*?$/, '');
}

function applyFieldLockSuffix(val, suffix) {
  if (!val) return val;
  if (Array.isArray(val)) {
    const cleaned = cleanFieldLockSuffix(val);
    if (suffix && cleaned.length > 0) {
      cleaned[cleaned.length - 1] = cleaned[cleaned.length - 1] + suffix;
    }
    return cleaned;
  }
  if (typeof val === 'object') {
    const cleaned = { ...val };
    if (cleaned.label) {
      cleaned.label = applyFieldLockSuffix(cleaned.label, suffix);
    }
    return cleaned;
  }
  const cleaned = String(val).replace(/\s*\*\*?$/, '');
  return cleaned + suffix;
}

function syncFieldLocksAndTexts(site) {
  if (!site) return site;
  if (!site.lockedFields) site.lockedFields = {};
  if (!site.overriddenFields) site.overriddenFields = {};

  const fieldsToCheck = ['title', 'description', 'keywords', 'classification'];
  fieldsToCheck.forEach(field => {
    const isLocked = site.lockedFields[field];
    const isOverridden = site.overriddenFields[field];
    
    let suffix = '';
    if (isLocked) suffix = ' *';
    else if (isOverridden) suffix = ' **';
    
    if (field === 'classification') {
      if (site.classification && site.classification.label) {
        site.classification.label = cleanFieldLockSuffix(site.classification.label) + suffix;
      }
    } else if (field === 'keywords') {
      if (site.keywords && Array.isArray(site.keywords) && site.keywords.length > 0) {
        site.keywords = cleanFieldLockSuffix(site.keywords);
        if (suffix) {
          site.keywords[site.keywords.length - 1] = site.keywords[site.keywords.length - 1] + suffix;
        }
      }
    } else if (site[field] !== undefined) {
      site[field] = cleanFieldLockSuffix(site[field]) + suffix;
    }
  });
  return site;
}

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
const optionsVersionBadge = document.getElementById('optionsVersionBadge');
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

// Developer & Git Update Elements
const localVersionDisplay = document.getElementById('localVersionDisplay');
const gitVersionDisplay = document.getElementById('gitVersionDisplay');
const gitUpdateAlert = document.getElementById('gitUpdateAlert');
const checkGitUpdateBtn = document.getElementById('checkGitUpdateBtn');
const reloadExtensionBtn = document.getElementById('reloadExtensionBtn');

// Document Selector Modal Elements
const docSelectorModal = document.getElementById('docSelectorModal');
const closeDocModalBtn = document.getElementById('closeDocModalBtn');
const docSearch = document.getElementById('docSearch');
const docList = document.getElementById('docList');

// Initialize
function init() {
    selfHealSitesDescription();
    setupEventListeners();
    switchPanel('sites');
    loadSites();
    checkAuthStatus();
    loadSelectedDocument();
    loadSettings();
    loadCustomKeywords();
    updateSyncBadge();
    initDeveloperTools();
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
            if (optionsVersionBadge) {
                optionsVersionBadge.textContent = 'v' + chrome.runtime.getManifest().version;
            }

            // Display cloud settings, hide promo setup card
            driveSyncCard.style.display = 'block';
            driveAuthCard.style.display = 'none';
            
            autoSyncCheckbox.closest('.toggle-group').style.opacity = '1';
            autoSyncCheckbox.closest('.toggle-group').style.pointerEvents = 'auto';

            // Show sync status badge in header
            if (syncStatus) syncStatus.style.display = 'inline-block';
            
            // Render the selected sync document filename
            loadSelectedDocument();
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
    const acceptAllBtn = document.getElementById('acceptAllBtn');
    if (acceptAllBtn) acceptAllBtn.addEventListener('click', acceptAllUpdates);
    // selectDocBtn removed: drive file is auto-managed, no manual selection needed
    if (closeDocModalBtn) closeDocModalBtn.addEventListener('click', () => docSelectorModal && docSelectorModal.classList.remove('active'));
    if (docSearch) docSearch.addEventListener('input', filterDocuments);

    // Developer & Update listeners
    if (checkGitUpdateBtn) {
        checkGitUpdateBtn.addEventListener('click', () => checkGitUpdates(true));
    }
    if (reloadExtensionBtn) {
        reloadExtensionBtn.addEventListener('click', () => {
            if (chrome.runtime.reload) {
                chrome.runtime.reload();
            } else {
                alert("Reload API only available in extension runtime.");
            }
        });
    }

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
        chrome.storage.local.get('authToken', (result) => {
            if (result.authToken) {
                chrome.identity.removeCachedAuthToken({ token: result.authToken }, () => {
                    console.log('Cached auth token cleared.');
                });
            }
            // Keep driveDocId, driveDocName and driveFolderId across sign-out so re-login
            // reuses the same Drive file instead of creating a new (blank) one.
            chrome.storage.local.set({
                isAuthenticated: false,
                authToken: null,
                userEmail: null
            }, () => {
                checkAuthStatus();
            });
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

    // Update "Accept All" button visibility
    const acceptAllBtn = document.getElementById('acceptAllBtn');
    if (acceptAllBtn) {
        const hasPending = sites.some(s => s.pendingUpdate);
        acceptAllBtn.style.display = hasPending ? 'inline-flex' : 'none';
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
 * Helper to generate star HTML next to a field (using * / ** asterisks instead of star icons)
 */
function getFieldStarHtml(site, field, tooltip) {
    let checkVal = site[field];
    if (field === 'classification') {
        checkVal = site.classification ? site.classification.label : null;
    }
    const isLocked = (site.lockedFields && site.lockedFields[field]) || isFieldLocked(checkVal);
    const isOverridden = (site.overriddenFields && site.overriddenFields[field]) || isFieldOverridden(checkVal);
    
    let labelChar = '*';
    let labelColor = '#9ca3af'; // default grey
    let btnTitle = `Lock ${tooltip} to ignore updates`;
    let btnClass = 'field-star unlocked';
    
    if (isLocked) {
        labelChar = '*';
        labelColor = '#fbbf24'; // gold/yellow
        btnTitle = `Unlock ${tooltip} to allow updates`;
        btnClass = 'field-star locked';
    } else if (isOverridden) {
        labelChar = '**';
        labelColor = '#10b981'; // green for overridden
        btnTitle = `${tooltip} is overridden. Click to lock.`;
        btnClass = 'field-star overridden';
    }
    
    return `
        <span class="${btnClass}" data-id="${site.id}" data-field="${field}" 
              style="cursor: pointer; font-size: 14px; font-weight: bold; color: ${labelColor}; padding: 0 4px; display: inline-flex; align-items: center; vertical-align: middle;" 
              title="${btnTitle}">
            ${labelChar}
        </span>
    `;
}

/**
 * Create a visual website card element
 */
function createSiteCard(site) {
    const div = document.createElement('div');
    div.className = 'site-card';

    const isAI = site.classification && site.classification.isAI;
    const type = isAI ? 'AI' : 'Useful';
    const typeClass = isAI ? 'ai' : 'useful';
    const confidence = Math.round(((site.classification && site.classification.confidence) || 0) * 100);
    const savedDate = new Date(site.savedAt || site.timestamp || new Date()).toLocaleDateString();
    const features = extractFeatures(site);

    let titleDiffHtml = '';
    if (site.pendingUpdate && site.pendingUpdate.title && site.pendingUpdate.title !== site.title) {
        titleDiffHtml = `
            <div class="diff-item">
                <span class="diff-label">Title:</span>
                <div class="diff-values">
                    <span class="diff-removed">${escapeHtml(cleanFieldLockSuffix(site.title))}</span>
                    <span class="diff-added">${escapeHtml(cleanFieldLockSuffix(site.pendingUpdate.title))}</span>
                </div>
                <div class="field-update-actions">
                    <button class="field-action-btn accept-field-btn" data-id="${site.id}" data-field="title" title="Accept Title Update">✓</button>
                    <button class="field-action-btn reject-field-btn" data-id="${site.id}" data-field="title" title="Keep Original & Lock Title">✗</button>
                </div>
            </div>
        `;
    }

    let descDiffHtml = '';
    if (site.pendingUpdate && site.pendingUpdate.description && site.pendingUpdate.description !== site.description) {
        descDiffHtml = `
            <div class="diff-item">
                <span class="diff-label">Description:</span>
                <div class="diff-values">
                    <span class="diff-removed">${escapeHtml(cleanFieldLockSuffix(site.description || 'None'))}</span>
                    <span class="diff-added">${escapeHtml(cleanFieldLockSuffix(site.pendingUpdate.description))}</span>
                </div>
                <div class="field-update-actions">
                    <button class="field-action-btn accept-field-btn" data-id="${site.id}" data-field="description" title="Accept Description Update">✓</button>
                    <button class="field-action-btn reject-field-btn" data-id="${site.id}" data-field="description" title="Keep Original & Lock Description">✗</button>
                </div>
            </div>
        `;
    }

    let featuresDiffHtml = '';
    if (site.pendingUpdate && site.pendingUpdate.keywords) {
        const currentFeatures = extractFeatures(site).map(cleanFieldLockSuffix);
        const proposedFeatures = extractFeatures({ ...site, ...site.pendingUpdate }).map(cleanFieldLockSuffix);
        if (JSON.stringify(currentFeatures) !== JSON.stringify(proposedFeatures)) {
            featuresDiffHtml = `
                <div class="diff-item">
                    <span class="diff-label">Features:</span>
                    <div class="diff-values">
                        <span class="diff-removed">${escapeHtml(currentFeatures.join(', ') || 'None')}</span>
                        <span class="diff-added">${escapeHtml(proposedFeatures.join(', '))}</span>
                    </div>
                    <div class="field-update-actions">
                        <button class="field-action-btn accept-field-btn" data-id="${site.id}" data-field="keywords" title="Accept Features Update">✓</button>
                        <button class="field-action-btn reject-field-btn" data-id="${site.id}" data-field="keywords" title="Keep Original & Lock Features">✗</button>
                    </div>
                </div>
            `;
        }
    }

    let typeDiffHtml = '';
    if (site.pendingUpdate && site.pendingUpdate.classification) {
        const wasAI = site.classification && site.classification.isAI;
        const nowAI = site.pendingUpdate.classification.isAI;
        const oldLabel = (site.classification && site.classification.label) || (wasAI ? 'AI Tool' : 'Useful Tool');
        const newLabel = site.pendingUpdate.classification.label || (nowAI ? 'AI Tool' : 'Useful Tool');
        const cleanOldLabel = cleanFieldLockSuffix(oldLabel);
        const cleanNewLabel = cleanFieldLockSuffix(newLabel);
        if (wasAI !== nowAI || cleanOldLabel !== cleanNewLabel) {
            typeDiffHtml = `
                <div class="diff-item">
                    <span class="diff-label">Classification:</span>
                    <div class="diff-values">
                        <span class="diff-removed">${escapeHtml(cleanOldLabel)}</span>
                        <span class="diff-added">${escapeHtml(cleanNewLabel)}</span>
                    </div>
                    <div class="field-update-actions">
                        <button class="field-action-btn accept-field-btn" data-id="${site.id}" data-field="classification" title="Accept Classification Update">✓</button>
                        <button class="field-action-btn reject-field-btn" data-id="${site.id}" data-field="classification" title="Keep Original & Lock Classification">✗</button>
                    </div>
                </div>
            `;
        }
    }

    let deleteDiffHtml = '';
    if (site.pendingUpdate && site.pendingUpdate.delete === true) {
        deleteDiffHtml = `
            <div class="diff-item deletion-diff">
                <span class="diff-label">Action:</span>
                <div class="diff-values" style="border-left-color: #ef4444;">
                    <span class="diff-removed">❌ Remove entire site record (${escapeHtml(site.pendingUpdate.reason || 'SSO/System Page conflict')})</span>
                </div>
            </div>
        `;
    }

    let pendingBoxHtml = '';
    if (site.pendingUpdate && (titleDiffHtml || descDiffHtml || featuresDiffHtml || typeDiffHtml || deleteDiffHtml)) {
        const isDeletion = site.pendingUpdate.delete === true;
        const boxClass = isDeletion ? 'pending-update-box deletion-warning' : 'pending-update-box';
        const badgeText = isDeletion ? '⚠️ Review Proposed Deletion' : '⚠️ Review Proposed Update';
        const overwriteTitle = isDeletion ? '✓ Confirm Delete' : '✓ Overwrite';
        const overwriteText = isDeletion ? '✓ Confirm Delete' : '✓ Overwrite';
        pendingBoxHtml = `
            <div class="${boxClass}">
                <div class="pending-update-header">
                    <span class="pending-update-badge" style="${isDeletion ? 'color: #ef4444;' : ''}">${badgeText}</span>
                </div>
                <div class="pending-update-diff">
                    ${titleDiffHtml}
                    ${typeDiffHtml}
                    ${descDiffHtml}
                    ${featuresDiffHtml}
                    ${deleteDiffHtml}
                </div>
                <div class="pending-update-actions">
                    <button class="update-action-btn reject-update-btn" data-id="${site.id}" title="Keep Original">✗ Keep Original</button>
                    <button class="update-action-btn accept-update-btn" data-id="${site.id}" title="${overwriteTitle}">${overwriteText}</button>
                </div>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="site-header">
            <div class="site-title" title="${escapeHtml(cleanFieldLockSuffix(site.title))}" style="display: flex; align-items: center; gap: 8px;">
                ${escapeHtml(cleanFieldLockSuffix(site.title))}
                ${getFieldStarHtml(site, 'title', 'title')}
            </div>
            <div class="site-badges-box" style="display: flex; align-items: center; gap: 4px;">
                <span class="site-badge ${typeClass}">${escapeHtml(cleanFieldLockSuffix((site.classification && site.classification.label) || type))}</span>
                ${getFieldStarHtml(site, 'classification', 'classification')}
            </div>
        </div>
        <div class="site-description-container" style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 8px;">
            <div class="site-description" style="margin-bottom: 0; flex: 1;">${escapeHtml(cleanFieldLockSuffix(site.description || 'No description available'))}</div>
            ${getFieldStarHtml(site, 'description', 'description')}
        </div>
        <div class="site-url" title="Click to open ${escapeHtml(site.url)}">${escapeHtml(site.url)}</div>
        
        <div class="site-features-container" style="display: flex; align-items: center; gap: 4px; margin-bottom: 12px; flex-wrap: wrap;">
            <div class="site-features" style="margin-bottom: 0; display: flex; flex-wrap: wrap; gap: 6px;">
                ${features.length > 0 ? features.map(cleanFieldLockSuffix).map(f => `<span class="feature-tag" style="margin: 0;">${escapeHtml(f)}</span>`).join('') : '<span style="color: #9ca3af; font-size: 12px; font-style: italic;">No features</span>'}
            </div>
            ${getFieldStarHtml(site, 'keywords', 'features')}
        </div>

        ${pendingBoxHtml}
        
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

    // Field-level star toggle listeners
    div.querySelectorAll('.field-star').forEach(starBtn => {
        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const field = starBtn.dataset.field;
            toggleFieldStar(site.id, field);
        });
    });

    // Delete single card button listener
    div.querySelector('.delete-site-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.target.dataset.id;
        deleteSingleSite(id);
    });

    // Field-level accept action listeners
    div.querySelectorAll('.accept-field-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const field = btn.dataset.field;
            acceptFieldUpdate(site.id, field);
        });
    });

    // Field-level reject action listeners
    div.querySelectorAll('.reject-field-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const field = btn.dataset.field;
            rejectFieldUpdate(site.id, field);
        });
    });

    const acceptBtn = div.querySelector('.accept-update-btn');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            acceptPendingUpdate(site.id);
        });
    }

    const rejectBtn = div.querySelector('.reject-update-btn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rejectPendingUpdate(site.id);
        });
    }

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
 * Accept the pending update for a site
 */
function acceptPendingUpdate(siteId) {
    chrome.storage.local.get(['sites', 'autoSyncSetting'], (result) => {
        const list = result.sites || [];
        const index = list.findIndex(s => s.id === siteId);
        if (index !== -1) {
            const site = list[index];
            if (site.pendingUpdate) {
                if (site.pendingUpdate.delete === true) {
                    list.splice(index, 1);
                    chrome.storage.local.set({ sites: list }, () => {
                        loadSites();
                        updateSyncStatus('Site deleted from collection');
                        if (result.autoSyncSetting !== false) {
                            syncToDrive();
                        }
                    });
                } else {
                    const updatedSite = {
                        ...site,
                        ...site.pendingUpdate,
                        updatedAt: new Date().toISOString(),
                        synced: false
                    };
                    if (!updatedSite.overriddenFields) {
                        updatedSite.overriddenFields = {};
                    }
                    if (!updatedSite.lockedFields) {
                        updatedSite.lockedFields = {};
                    }
                    for (const field in site.pendingUpdate) {
                        if (field !== 'delete' && field !== 'reason') {
                            updatedSite.overriddenFields[field] = true;
                            updatedSite.lockedFields[field] = false;
                        }
                    }
                    delete updatedSite.pendingUpdate;
                    syncFieldLocksAndTexts(updatedSite);
                    list[index] = updatedSite;
                    chrome.storage.local.set({ sites: list }, () => {
                        loadSites();
                        updateSyncStatus('Pending update accepted and marked for sync');
                        if (result.autoSyncSetting !== false) {
                            syncToDrive();
                        }
                    });
                }
            }
        }
    });
}

/**
 * Reject the pending update for a site (rejects all remaining pending fields and locks them)
 */
function rejectPendingUpdate(siteId) {
    chrome.storage.local.get(['sites', 'autoSyncSetting'], (result) => {
        const list = result.sites || [];
        const index = list.findIndex(s => s.id === siteId);
        if (index !== -1) {
            const site = list[index];
            if (site.pendingUpdate) {
                const updatedSite = { 
                    ...site,
                    synced: false
                };
                if (!updatedSite.lockedFields) {
                    updatedSite.lockedFields = {};
                }
                if (!updatedSite.overriddenFields) {
                    updatedSite.overriddenFields = {};
                }
                for (const field in site.pendingUpdate) {
                    if (field !== 'delete' && field !== 'reason') {
                        updatedSite.lockedFields[field] = true;
                        updatedSite.overriddenFields[field] = false;
                    }
                }
                delete updatedSite.pendingUpdate;
                syncFieldLocksAndTexts(updatedSite);
                list[index] = updatedSite;
                chrome.storage.local.set({ sites: list }, () => {
                    loadSites();
                    updateSyncStatus('Original kept and fields locked to ignore updates');
                    if (result.autoSyncSetting !== false) {
                        syncToDrive();
                    }
                });
            }
        }
    });
}

/**
 * Toggle the lock status of a specific field on a site
 */
function toggleFieldStar(siteId, field) {
    chrome.storage.local.get(['sites', 'autoSyncSetting'], (result) => {
        const list = result.sites || [];
        const index = list.findIndex(s => s.id === siteId);
        if (index !== -1) {
            const site = list[index];
            if (!site.lockedFields) site.lockedFields = {};
            if (!site.overriddenFields) site.overriddenFields = {};
            
            const isLocked = site.lockedFields[field];
            const isOverridden = site.overriddenFields[field];
            
            if (isLocked) {
                site.lockedFields[field] = false;
                site.overriddenFields[field] = false;
            } else if (isOverridden) {
                site.lockedFields[field] = true;
                site.overriddenFields[field] = false;
            } else {
                site.lockedFields[field] = true;
                site.overriddenFields[field] = false;
            }
            
            syncFieldLocksAndTexts(site);
            site.synced = false; // mark unsynced to update Google Doc star indicator
            chrome.storage.local.set({ sites: list }, () => {
                loadSites();
                const statusStr = site.lockedFields[field] ? `Field '${field}' locked against updates` : `Field '${field}' unlocked`;
                updateSyncStatus(statusStr);
                if (result.autoSyncSetting !== false) {
                    syncToDrive();
                }
            });
        }
    });
}

/**
 * Accept proposed update for a single field
 */
function acceptFieldUpdate(siteId, field) {
    chrome.storage.local.get(['sites', 'autoSyncSetting'], (result) => {
        const list = result.sites || [];
        const index = list.findIndex(s => s.id === siteId);
        if (index !== -1) {
            const site = list[index];
            if (site.pendingUpdate && site.pendingUpdate[field] !== undefined) {
                if (field === 'classification') {
                    site.classification = site.pendingUpdate.classification;
                } else if (field === 'keywords') {
                    site.keywords = site.pendingUpdate.keywords;
                } else {
                    site[field] = site.pendingUpdate[field];
                }
                
                if (!site.overriddenFields) site.overriddenFields = {};
                if (!site.lockedFields) site.lockedFields = {};
                site.overriddenFields[field] = true;
                site.lockedFields[field] = false;
                
                delete site.pendingUpdate[field];
                const remainingFields = Object.keys(site.pendingUpdate).filter(k => k !== 'reason');
                if (remainingFields.length === 0) {
                    delete site.pendingUpdate;
                }
                
                syncFieldLocksAndTexts(site);
                site.synced = false;
                site.updatedAt = new Date().toISOString();
                
                chrome.storage.local.set({ sites: list }, () => {
                    loadSites();
                    updateSyncStatus(`Accepted update for ${field}`);
                    if (result.autoSyncSetting !== false) {
                        syncToDrive();
                    }
                });
            }
        }
    });
}

/**
 * Reject proposed update for a single field and lock it
 */
function rejectFieldUpdate(siteId, field) {
    chrome.storage.local.get(['sites', 'autoSyncSetting'], (result) => {
        const list = result.sites || [];
        const index = list.findIndex(s => s.id === siteId);
        if (index !== -1) {
            const site = list[index];
            if (site.pendingUpdate && site.pendingUpdate[field] !== undefined) {
                if (!site.lockedFields) site.lockedFields = {};
                if (!site.overriddenFields) site.overriddenFields = {};
                site.lockedFields[field] = true;
                site.overriddenFields[field] = false;
                
                delete site.pendingUpdate[field];
                const remainingFields = Object.keys(site.pendingUpdate).filter(k => k !== 'reason');
                if (remainingFields.length === 0) {
                    delete site.pendingUpdate;
                }
                
                syncFieldLocksAndTexts(site);
                site.synced = false;
                site.updatedAt = new Date().toISOString();
                
                chrome.storage.local.set({ sites: list }, () => {
                    loadSites();
                    updateSyncStatus(`Rejected update and locked ${field}`);
                    if (result.autoSyncSetting !== false) {
                        syncToDrive();
                    }
                });
            }
        }
    });
}

/**
 * Accept all pending updates in the entire collection
 */
function acceptAllUpdates() {
    chrome.storage.local.get(['sites', 'autoSyncSetting'], (result) => {
        const list = result.sites || [];
        let updatedCount = 0;
        const newList = [];
        list.forEach(site => {
            if (site.pendingUpdate) {
                updatedCount++;
                if (site.pendingUpdate.delete === true) {
                    return; // skip adding to newList (deletes the site)
                }
                const updatedSite = {
                    ...site,
                    ...site.pendingUpdate,
                    updatedAt: new Date().toISOString(),
                    synced: false
                };
                if (!updatedSite.overriddenFields) {
                    updatedSite.overriddenFields = {};
                }
                if (!updatedSite.lockedFields) {
                    updatedSite.lockedFields = {};
                }
                for (const field in site.pendingUpdate) {
                    if (field !== 'delete' && field !== 'reason') {
                        updatedSite.overriddenFields[field] = true;
                        updatedSite.lockedFields[field] = false;
                    }
                }
                delete updatedSite.pendingUpdate;
                syncFieldLocksAndTexts(updatedSite);
                newList.push(updatedSite);
            } else {
                newList.push(site);
            }
        });
        if (updatedCount > 0) {
            chrome.storage.local.set({ sites: newList }, () => {
                loadSites();
                updateSyncStatus(`Accepted all ${updatedCount} pending updates`);
                if (result.autoSyncSetting !== false) {
                    syncToDrive();
                }
            });
        }
    });
}

/**
 * Load selected Google Drive document info
 */
function loadSelectedDocument() {
    chrome.storage.local.get(['driveDocId', 'driveDocName'], (result) => {
        if (result.driveDocId && result.driveDocName) {
            let docName = result.driveDocName.replace(/(\.txt|\.md)$/i, '').trim();
            chrome.storage.local.set({ driveDocName: docName });
            docNameDisplay.textContent = `📄 ${docName}`;
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
        
        if (response && response.success) {
            updateSyncStatus(response.message);
        } else {
            const errMsg = response ? response.error : 'Connection lost or service worker inactive. Please try again.';
            updateSyncStatus(`Sync failed: ${errMsg}`);
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
 * Update the sidebar sync status badge count & tick icon
 */
function updateSyncBadge() {
    chrome.storage.local.get(['sites', 'isAuthenticated'], (result) => {
        const sidebarSyncBadge = document.getElementById('sidebarSyncBadge');
        const sidebarSyncBtn = document.getElementById('sidebarSyncBtn');
        if (!sidebarSyncBadge) return;

        if (!result.isAuthenticated) {
            sidebarSyncBadge.style.display = 'none';
            if (sidebarSyncBtn) sidebarSyncBtn.className = 'sync-icon-btn';
            return;
        }

        const sites = result.sites || [];
        const unsyncedCount = sites.filter(s => !s.synced).length;

        sidebarSyncBadge.style.display = 'inline-flex';
        if (unsyncedCount > 0) {
            sidebarSyncBadge.textContent = unsyncedCount;
            sidebarSyncBadge.className = 'sync-badge unsynced';
            sidebarSyncBadge.title = `${unsyncedCount} unsynced sites`;
            if (sidebarSyncBtn) {
                sidebarSyncBtn.className = 'sync-icon-btn unsynced';
                sidebarSyncBtn.title = `Sync Collection to Drive (${unsyncedCount} unsynced sites)`;
            }
        } else {
            sidebarSyncBadge.textContent = '✓';
            sidebarSyncBadge.className = 'sync-badge synced';
            sidebarSyncBadge.title = 'All sites fully synced to Drive';
            if (sidebarSyncBtn) {
                sidebarSyncBtn.className = 'sync-icon-btn synced';
                sidebarSyncBtn.title = 'All sites fully synced to Drive';
            }
        }
    });
}

/**
 * Initialize developer / git settings views
 */
function initDeveloperTools() {
    if (!localVersionDisplay) return;
    
    // Set local version display
    const manifest = chrome.runtime.getManifest();
    localVersionDisplay.textContent = 'v' + manifest.version;
    
    const optionsVersionBadge = document.getElementById('optionsVersionBadge');
    if (optionsVersionBadge) {
        optionsVersionBadge.textContent = 'v' + manifest.version;
    }
    
    // Silent check on load
    checkGitUpdates(false);
}

/**
 * Compare semantic versions (e.g. "3.4.9" vs "3.4.10")
 * Returns positive if v2 > v1, negative if v1 > v2, 0 if equal
 */
function compareVersions(v1, v2) {
    const parts1 = v1.replace(/^v/, '').split('.').map(Number);
    const parts2 = v2.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 !== p2) return p2 - p1;
    }
    return 0;
}

/**
 * Fetch and check the GitHub project repository manifest for version updates
 */
function checkGitUpdates(showAlerts = false) {
    if (!gitVersionDisplay) return;
    
    gitVersionDisplay.textContent = 'Checking...';
    gitVersionDisplay.style.color = 'var(--warning)';
    if (gitUpdateAlert) gitUpdateAlert.style.display = 'none';
    
    const rawUrl = 'https://raw.githubusercontent.com/manjunath-27-idea/ai-site-collector-extension/main/manifest.json';
    
    fetch(rawUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.version) {
                throw new Error("Invalid manifest file in git repository");
            }
            
            const localVer = chrome.runtime.getManifest().version;
            const gitVer = data.version;
            
            const updateComparison = compareVersions(localVer, gitVer);
            if (updateComparison > 0) {
                // Git version is newer
                gitVersionDisplay.textContent = 'v' + gitVer + ' (Update Available)';
                gitVersionDisplay.style.color = '#ef4444'; // Red
                if (gitUpdateAlert) gitUpdateAlert.style.display = 'block';
                if (showAlerts) {
                    alert(`Update Available!\n\nLocal version: v${localVer}\nRemote version: v${gitVer}\n\nPlease run 'git pull' in your terminal, then click 'Reload Extension'.`);
                }
            } else {
                // Git version is equal or older
                gitVersionDisplay.textContent = 'v' + gitVer + ' (Up to date)';
                gitVersionDisplay.style.color = '#10b981'; // Green
                if (gitUpdateAlert) gitUpdateAlert.style.display = 'none';
                if (showAlerts) {
                    alert(`Up to Date!\n\nYour extension is running the latest version: v${localVer}`);
                }
            }
        })
        .catch(err => {
            console.error("Failed to check Git project updates:", err);
            gitVersionDisplay.textContent = 'Error checking remote version';
            gitVersionDisplay.style.color = '#ef4444';
            if (showAlerts) {
                alert("Failed to check updates. Please verify your internet connection or repository access.");
            }
        });
}

