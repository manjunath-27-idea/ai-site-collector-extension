/**
 * Background Service Worker
 * Handles site detection, storage, and Google Drive API integration
 * Single document mode: All sites appended to one selected document
 */

/**
 * Check if the page is an authentication / payment portal system page
 */
function isAuthOrSystemUrl(urlStr, titleStr) {
  const title = (titleStr || '').toLowerCase();
  const authPathSegments = [
    '/login', '/signin', '/signup', '/register',
    '/oauth', '/authorize', '/logout', '/signout',
    '/reset-password', '/forgot-password', '/mfa', '/2fa',
    '/sign-in', '/sign-up', '/log-in', '/log-out', '/session/new', '/join'
  ];
  const systemPathKeywords = [
    '/checkout', '/payment', '/donate', '/billing', '/invoice', 
    '/receipt', '/subscribe', '/cart', '/pay', '/donation'
  ];

  try {
    const urlObj = new URL(urlStr);
    const pathLower = urlObj.pathname.toLowerCase();
    const queryLower = urlObj.search.toLowerCase();
    const hostname = urlObj.hostname.toLowerCase();

    const paymentHosts = ['razorpay.com', 'stripe.com', 'paypal.com', 'chargify.com', 'paddle.com', '2checkout.com', 'paytm.com', 'authorize.net'];
    if (paymentHosts.some(h => hostname === h || hostname.endsWith('.' + h))) return true;

    if (authPathSegments.some(seg =>
      pathLower === seg ||
      pathLower.startsWith(seg + '/') ||
      pathLower.startsWith(seg + '?')
    )) return true;

    if (systemPathKeywords.some(kw =>
      pathLower === kw ||
      pathLower.startsWith(kw + '/') ||
      pathLower.startsWith(kw + '?') ||
      pathLower.includes(kw)
    )) return true;

    if (queryLower.includes('action=login') ||
        queryLower.includes('mode=signin') ||
        queryLower.includes('redirect_to=/login')) return true;

    if (hostname.startsWith('auth.') ||
        hostname.startsWith('login.') ||
        hostname.startsWith('signin.') ||
        hostname.startsWith('signup.') ||
        hostname.startsWith('sso.') ||
        hostname.startsWith('account.') ||
        hostname.startsWith('accounts.')) return true;
  } catch (e) {
    if (authPathSegments.some(seg => urlStr.toLowerCase().includes(seg))) return true;
    if (systemPathKeywords.some(seg => urlStr.toLowerCase().includes(seg))) return true;
  }

  const authTitlePhrases = [
    'log in to ', 'sign in to ', 'sign up for ', 'create your account',
    'forgot password', 'reset your password', 'two-factor authentication',
    'verification required', 'authentication required', 'enter your password',
    'sso login', 'saml login', 'payment details', 'checkout', 'donation form',
    'razorpay checkout', 'stripe checkout'
  ];
  if (authTitlePhrases.some(p => title.includes(p))) return true;

  return false;
}

/**
 * Check if a description is a default fallback or empty
 */
function isFallbackDesc(desc) {
  const d = (desc || '').trim().toLowerCase();
  return d.includes('detected by domain or keyword') || 
         d === 'no description available.' || 
         d === 'no description available' || 
         d === '';
}

/**
 * Merge two description strings sentence by sentence to append points instead of overriding
 */
function mergeDescriptions(desc1, desc2) {
  const getSentences = (desc) => {
    if (!desc) return [];
    const clean = desc.replace(/[\n\r\t]+/g, ' ').trim();
    // Split on typical sentence boundaries followed by space and capital letter or digit
    const list = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
    return list.map(s => s.trim()).filter(s => s.length > 0);
  };

  const s1 = getSentences(desc1);
  const s2 = getSentences(desc2);

  // Union sentences case-insensitively, keeping the first occurrence
  const merged = [...s1];
  const normalizedS1 = s1.map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''));

  s2.forEach(sentence => {
    const norm = sentence.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalizedS1.includes(norm)) {
      merged.push(sentence);
      normalizedS1.push(norm);
    }
  });

  return merged.join(' ');
}

/**
 * Merge two keyword arrays case-insensitively, preserving original casing
 */
function mergeKeywords(kw1, kw2) {
  const k1 = kw1 || [];
  const k2 = kw2 || [];
  const merged = [...k1];
  const normalizedK1 = k1.map(k => k.toLowerCase().trim());

  k2.forEach(kw => {
    const norm = kw.toLowerCase().trim();
    if (!normalizedK1.includes(norm) && norm.length > 0) {
      merged.push(kw.trim());
      normalizedK1.push(norm);
    }
  });
  return merged;
}

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

// Initialize storage — only reset user preferences on fresh install, never on reload/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // ── First-install: write all defaults including user preference toggles ──
    chrome.storage.local.set({
      sites: [],
      driveDocId: null,
      driveDocName: null,
      isAuthenticated: false,
      lastSync: null,
      autoSyncSetting: true,       // user preference — only set on first install
      notificationsSetting: true,  // user preference — only set on first install
      darkModeSetting: false,      // user preference — only set on first install
      remoteAiDomains: ['openai.com', 'chatgpt.com', 'claude.ai', 'anthropic.com', 'huggingface.co', 'midjourney.com', 'replicate.com', 'perplexity.ai', 'gemini.google.com', 'cohere.com', 'stability.ai', 'deepseek.com', 'sora.com'],
      remoteUsefulDomains: ['github.com', 'stackoverflow.com', 'npmjs.com', 'figma.com', 'canva.com', 'notion.so', 'trello.com', 'react.dev', 'mdn.mozilla.org', 'w3schools.com', 'stackblitz.com', 'codepen.io'],
      remoteAuthGateways: ['accounts.google.com', 'login.microsoftonline.com', 'okta.com', 'auth0.com', 'clerk.com', 'cognito', 'keycloak']
    }, () => {
      syncDomainRules();
    });
  } else {
    // ── Extension update / reload ──
    chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html') });
    // 1. One-time migration: strip any stale .txt suffix from driveDocName in storage and force re-sync to apply new formatting
    chrome.storage.local.get(['autoSyncSetting', 'notificationsSetting', 'darkModeSetting', 'driveDocName', 'sites'], (stored) => {
      const updates = {
        remoteAiDomains: ['openai.com', 'chatgpt.com', 'claude.ai', 'anthropic.com', 'huggingface.co', 'midjourney.com', 'replicate.com', 'perplexity.ai', 'gemini.google.com', 'cohere.com', 'stability.ai', 'deepseek.com', 'sora.com'],
        remoteUsefulDomains: ['github.com', 'stackoverflow.com', 'npmjs.com', 'figma.com', 'canva.com', 'notion.so', 'trello.com', 'react.dev', 'mdn.mozilla.org', 'w3schools.com', 'stackblitz.com', 'codepen.io'],
        remoteAuthGateways: ['accounts.google.com', 'login.microsoftonline.com', 'okta.com', 'auth0.com', 'clerk.com', 'cognito', 'keycloak'],
        // Preserve user preferences — never reset on update
        autoSyncSetting:      stored.autoSyncSetting      !== undefined ? stored.autoSyncSetting      : true,
        notificationsSetting: stored.notificationsSetting !== undefined ? stored.notificationsSetting : true,
        darkModeSetting:      stored.darkModeSetting       !== undefined ? stored.darkModeSetting       : false,
      };

      // ── Migration: ensure driveDocName is clean of extensions ──
      if (stored.driveDocName) {
        const clean = stored.driveDocName.replace(/(\.txt|\.md)$/i, '').trim();
        updates.driveDocName = clean;
        console.log('[Migration] Cleaned driveDocName extensions:', stored.driveDocName, '→', updates.driveDocName);
      }

      // ── Migration: clean, deduplicate, classify and propose updates on existing records ──
      const currentSites = stored.sites || [];
      if (currentSites.length > 0) {
        const commonSubdomains = [
          'www', 'app', 'play', 'account', 'agent', 'docs', 'drive', 
          'support', 'product', 'mail', 'dev', 'developer', 'admin', 
          'login', 'signin', 'signup', 'portal', 'view'
        ];
        const genericTitles = ['home', 'index', 'app', 'play', 'login', 'signin', 'docs', 'drive', 'welcome', 'untitled', 'web app', 'product', 'support', 'account', 'agent'];
        const genericSubdomains = ['app', 'play', 'account', 'agent', 'docs', 'drive', 'support', 'product', 'login', 'signin', 'portal'];

        const cleanToMainDomainLocal = (urlStr) => {
          try { return new URL(urlStr).origin + '/'; }
          catch { return urlStr; }
        };

        // Step 1: Detect deletes, normalize active URLs, and update classifications for KB entries
        const processedSites = currentSites.map(s => {
          let updatedSite = { ...s };

          // 1. Detect if this is an authentication/SSO/payment system page that should be proposed for deletion
          if (isAuthOrSystemUrl(s.url, s.title)) {
            updatedSite.pendingUpdate = {
              ...(s.pendingUpdate || {}),
              delete: true,
              reason: 'SSO/System Page conflict'
            };
            return updatedSite;
          }

          // 2. Normalize URL to main domain if not code repository
          const isCodeRepo = s.url.toLowerCase().includes('github.com') || s.url.toLowerCase().includes('gitlab.com');
          if (!isCodeRepo) {
            let cleanedUrl = cleanToMainDomainLocal(s.url);
            try {
              const urlObj = new URL(cleanedUrl);
              const host = urlObj.hostname.toLowerCase();
              if (host === 'astrasec.ai' || host.endsWith('.astrasec.ai') || host === 'getastra.com' || host.endsWith('.getastra.com')) {
                cleanedUrl = 'https://www.getastra.com/';
              }
            } catch (e) {}
            updatedSite.url = cleanedUrl;
          }

          // 3. Category Override: If it's Astra Security, correct category to Useful Tool (KB override)
          try {
            const urlObj = new URL(updatedSite.url);
            const host = urlObj.hostname.toLowerCase();
            if (host === 'getastra.com' || host.endsWith('.getastra.com')) {
              updatedSite.classification = {
                isAI: false,
                isUseful: true,
                isAgency: false,
                label: 'Useful Tool',
                confidence: 1.0,
                name: 'Astra Security',
                description: 'Cybersecurity platform providing continuous pentesting, vulnerability assessments, and security audits.',
                tags: ['security', 'pentest', 'vulnerability', 'useful'],
                reasons: ['Verified knowledge base entry']
              };
              updatedSite.title = 'Astra Security';
            }
          } catch (e) {}
          syncFieldLocksAndTexts(updatedSite);
          return updatedSite;
        });

        // Step 2: Separate deletions and active sites to merge duplicates among active sites
        const deletions = processedSites.filter(s => s.pendingUpdate && s.pendingUpdate.delete === true);
        const activeSites = processedSites.filter(s => !s.pendingUpdate || s.pendingUpdate.delete !== true);

        // Group active sites by their normalized URL
        const groups = {};
        activeSites.forEach(s => {
          const key = s.url.toLowerCase();
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(s);
        });

        const mergedActiveSites = [];

        for (const urlKey in groups) {
          const group = groups[urlKey];
          if (group.length === 1) {
            // No duplicate, just process title refinement if needed
            let s = group[0];
            let updatedTitle = s.title;
            const currentTitleClean = (s.title || '').trim();

            // Restore previously migrated generic titles to trigger pending updates review
            try {
              const urlObj = new URL(s.url);
              const parts = urlObj.hostname.toLowerCase().replace(/^www\./, '').split('.');
              if (parts.length >= 3 && genericSubdomains.includes(parts[0])) {
                const genericTitle = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                let brand = parts[1];
                if (parts.length >= 4 && commonSubdomains.includes(parts[1])) {
                  brand = parts[2];
                }
                const brandTitle = brand.charAt(0).toUpperCase() + brand.slice(1);
                
                if (s.title === brandTitle) {
                  s.title = genericTitle;
                  s.pendingUpdate = {
                    ...(s.pendingUpdate || {}),
                    title: brandTitle
                  };
                  mergedActiveSites.push(s);
                  continue;
                }
              }
            } catch (e) {}

            if (!currentTitleClean || genericTitles.includes(currentTitleClean.toLowerCase())) {
              try {
                const urlObj = new URL(s.url);
                const parts = urlObj.hostname.toLowerCase().replace(/^www\./, '').split('.');
                if (parts.length > 0) {
                  let brand = parts[0];
                  if (parts.length >= 3 && commonSubdomains.includes(parts[0])) {
                    brand = parts[1];
                  } else if (parts.length >= 2 && !commonSubdomains.includes(parts[0])) {
                    brand = parts[parts.length - 2];
                  }
                  updatedTitle = brand.charAt(0).toUpperCase() + brand.slice(1);
                }
              } catch (e) { /* keep original */ }
            }

            if (updatedTitle !== s.title) {
              s.pendingUpdate = {
                ...(s.pendingUpdate || {}),
                title: updatedTitle
              };
            }
            mergedActiveSites.push(s);
          } else {
            // Group has duplicates! Sort to find the best canonical one
            group.sort((a, b) => {
              const fallbackA = isFallbackDesc(a.description);
              const fallbackB = isFallbackDesc(b.description);
              if (fallbackA !== fallbackB) {
                return fallbackA ? 1 : -1;
              }
              return (b.description || '').length - (a.description || '').length;
            });

            // canonical site is group[0]
            const canonical = { ...group[0] };

            // Merge keywords and tags
            const allKeywords = new Set();
            const allTags = new Set(canonical.classification ? canonical.classification.tags || [] : []);

            group.forEach(s => {
              if (s.keywords) s.keywords.forEach(k => allKeywords.add(k));
              if (s.classification && s.classification.tags) {
                s.classification.tags.forEach(t => allTags.add(t));
              }
            });

            canonical.keywords = [...allKeywords];
            if (canonical.classification) {
              canonical.classification.tags = [...allTags];
            }

            // Merge descriptions sentence by sentence
            let mergedDesc = canonical.description || '';
            group.forEach(s => {
              if (s !== group[0]) {
                mergedDesc = mergeDescriptions(mergedDesc, s.description);
              }
            });
            canonical.description = mergedDesc;

            // Combine lockedFields and overriddenFields maps
            const mergedLockedFields = { ...(canonical.lockedFields || {}) };
            const mergedOverriddenFields = { ...(canonical.overriddenFields || {}) };
            group.forEach(s => {
              if (s.lockedFields) {
                for (const k in s.lockedFields) {
                  if (s.lockedFields[k]) {
                    mergedLockedFields[k] = true;
                  }
                }
              }
              if (s.overriddenFields) {
                for (const k in s.overriddenFields) {
                  if (s.overriddenFields[k]) {
                    mergedOverriddenFields[k] = true;
                  }
                }
              }
            });
            canonical.lockedFields = mergedLockedFields;
            canonical.overriddenFields = mergedOverriddenFields;
            syncFieldLocksAndTexts(canonical);

            // Push the merged canonical site to active
            mergedActiveSites.push(canonical);

            // The remaining sites in the group are duplicates! 
            // We mark them for deletion but KEEP their original URLs so the user sees exactly what is being removed.
            for (let i = 1; i < group.length; i++) {
              const duplicate = { ...group[i] };
              
              // Restore its original URL from currentSites to make deletion warning clear
              const orig = currentSites.find(cs => cs.id === duplicate.id);
              if (orig) {
                duplicate.url = orig.url;
              }
              
              duplicate.pendingUpdate = {
                ...(duplicate.pendingUpdate || {}),
                delete: true,
                reason: 'Duplicate/Normalization conflict'
              };
              deletions.push(duplicate);
            }
        }
      }

        // Check if any active site has changed properties compared to its original state, and mark as unsynced
        const nowStr = new Date().toISOString();
        mergedActiveSites.forEach(s => {
          const original = currentSites.find(cs => cs.id === s.id);
          if (original) {
            const hasChanged = s.url !== original.url || 
                               s.title !== original.title || 
                               (s.classification && s.classification.isAI) !== (original.classification && original.classification.isAI) ||
                               JSON.stringify(s.keywords || []) !== JSON.stringify(original.keywords || []) ||
                               JSON.stringify(s.classification ? s.classification.tags || [] : []) !== JSON.stringify(original.classification ? original.classification.tags || [] : []);
            if (hasChanged) {
              s.synced = false;
              s.updatedAt = nowStr;
            }
          }
        });

        // Combine active and proposed deletions
        updates.sites = [...mergedActiveSites, ...deletions];
        console.log('[Migration] Normalized domains, merged duplicates, and stored pending updates for manual user review.');

        // Trigger a system notification if any sites have pending updates after migration
        const hasPending = updates.sites.some(site => site.pendingUpdate);
        if (hasPending && stored.notificationsSetting !== false) {
          chrome.notifications.create('updatePendingNotification', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
            title: 'Metadata Updates Available',
            message: 'Some generic titles have been refined. Would you like to accept all changes and sync?',
            buttons: [
              { title: 'Accept All & Sync' },
              { title: 'Review / Options' }
            ],
            requireInteraction: true
          }, () => {
            if (chrome.runtime.lastError) {
              console.log('[Notification] Info: ' + chrome.runtime.lastError.message);
            }
          });
        }
      }

      chrome.storage.local.set(updates, () => {
        syncDomainRules();
      });
    });
  }
});

/**
 * Handle notification button clicks to accept all or open options
 */
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'updatePendingNotification') {
    if (buttonIndex === 0) {
      // Accept All & Sync
      chrome.storage.local.get(['sites', 'notificationsSetting'], (stored) => {
        const list = stored.sites || [];
        let updatedCount = 0;
        const newList = list.map(site => {
          if (site.pendingUpdate) {
            updatedCount++;
            const updatedSite = {
              ...site,
              ...site.pendingUpdate,
              synced: false
            };
            delete updatedSite.pendingUpdate;
            return updatedSite;
          }
          return site;
        });

        if (updatedCount > 0) {
          chrome.storage.local.set({ sites: newList }, () => {
            syncToDrive((syncResponse) => {
              if (stored.notificationsSetting !== false) {
                if (syncResponse && syncResponse.success) {
                  chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
                    title: 'Updates Applied & Synced!',
                    message: `Successfully accepted all updates and synced them to Google Drive.`
                  });
                } else {
                  const errMsg = (syncResponse && syncResponse.error) || 'Unknown error';
                  chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
                    title: 'Updates Applied Locally (Sync Failed)',
                    message: `Updates applied, but Drive sync failed: ${errMsg}`
                  });
                }
              }
            });
          });
        }
      });
    } else if (buttonIndex === 1) {
      // Review / Options
      chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html') });
    }
  }
});

/**
 * Handle notification clicks to open the Options Dashboard page
 */
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html') });
});

/**
 * Listen for messages from content script and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSite') {
    saveSiteData(request.data, sender.tab.id);
    sendResponse({ success: true });
  } else if (request.action === 'getSites') {
    chrome.storage.local.get('sites', (result) => {
      sendResponse({ sites: result.sites || [] });
    });
    return true;
  } else if (request.action === 'authenticate') {
    authenticateWithGoogle(sendResponse);
    return true;
  } else if (request.action === 'syncToDrive') {
    syncToDrive(sendResponse);
    return true;
  } else if (request.action === 'listDriveFiles') {
    chrome.storage.local.get('authToken', (result) => {
      if (result.authToken) {
        listDriveFiles(result.authToken, sendResponse);
      } else {
        sendResponse({ success: false, error: 'Not authenticated' });
      }
    });
    return true;
  } else if (request.action === 'setDriveDocument') {
    setDriveDocument(request.docId, request.docName, sendResponse);
    return true;
  } else if (request.action === 'getDriveDocument') {
    chrome.storage.local.get(['driveDocId', 'driveDocName'], (result) => {
      const docName = (result.driveDocName || 'AI_Site_Collector_Database').replace(/(\.txt|\.md)$/i, '').trim();
      sendResponse({ 
        docId: result.driveDocId,
        docName: docName
      });
    });
    return true;
  }
});

/**
 * Save site data to local storage
 */
function saveSiteData(siteData, tabId) {
  chrome.storage.local.get(['sites', 'notificationsSetting', 'autoSyncSetting'], (result) => {
    const sites = result.sites || [];
    
    // Check if site already exists
    const existingIndex = sites.findIndex(s => s.url === siteData.url);
    
    if (existingIndex === -1) {
      // New site: add to collection
      const nowStr = new Date().toISOString();
      sites.push({
        ...siteData,
        id: generateId(),
        synced: false,
        savedAt: nowStr,
        updatedAt: nowStr
      });
      
      chrome.storage.local.set({ sites }, () => {
        // Auto-sync if enabled
        if (result.autoSyncSetting !== false) {
          syncToDrive((syncResponse) => {
            if (result.notificationsSetting !== false) {
              if (syncResponse && syncResponse.success) {
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
                  title: 'Saved & Backed Up!',
                  message: `"${siteData.title}" is saved and backed up inside the "AI Site Collector" folder.`
                }, () => {
                  if (chrome.runtime.lastError) {
                    console.log('[Notification] Info:', chrome.runtime.lastError.message);
                  }
                });
              } else {
                const errMsg = (syncResponse && syncResponse.error) || 'Unknown error';
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
                  title: 'Saved Locally (Sync Failed)',
                  message: `"${siteData.title}" is saved locally, but Drive backup failed: ${errMsg}`
                }, () => {
                  if (chrome.runtime.lastError) {
                    console.log('[Notification] Info:', chrome.runtime.lastError.message);
                  }
                });
              }
            }
          });
        } else {
          // Regular local-only notification
          if (result.notificationsSetting !== false) {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
              title: 'Site Saved!',
              message: `"${siteData.title}" has been saved locally.`
            }, () => {
              if (chrome.runtime.lastError) {
                console.log('[Notification] Info:', chrome.runtime.lastError.message);
              }
            });
          }
        }
      });
    } else {
      const existing = sites[existingIndex];
      
      // Check if we should upgrade the saved metadata with richer information:
      let needsUpdate = false;
      const updatedFields = {};

      // 1. Upgrade description if description is not locked or overridden
      const currentDesc = (existing.description || '').trim();
      const newDesc = (siteData.description || '').trim();
      
      const isDescLocked = (existing.lockedFields && existing.lockedFields.description) || 
                           (existing.overriddenFields && existing.overriddenFields.description) ||
                           isFieldLockedOrOverridden(existing.description);
      if (!isDescLocked) {
        if (newDesc && newDesc !== currentDesc) {
          if (isFallbackDesc(currentDesc) && !isFallbackDesc(newDesc)) {
            // Upgrade from fallback to real description
            updatedFields.description = newDesc;
            needsUpdate = true;
          } else if (!isFallbackDesc(newDesc)) {
            // Merge descriptions sentence by sentence
            const merged = mergeDescriptions(currentDesc, newDesc);
            if (merged !== currentDesc) {
              updatedFields.description = merged;
              needsUpdate = true;
            }
          }
        }
      }

      // 2. Upgrade tags/features/keywords if keywords is not locked or overridden
      const existingKeywords = existing.keywords || [];
      const newKeywords = siteData.keywords || [];
      const isKeywordsLocked = (existing.lockedFields && existing.lockedFields.keywords) || 
                               (existing.overriddenFields && existing.overriddenFields.keywords) ||
                               isFieldLockedOrOverridden(existing.keywords);
      if (!isKeywordsLocked) {
        const mergedKws = mergeKeywords(existingKeywords, newKeywords);
        if (mergedKws.length > existingKeywords.length) {
          updatedFields.keywords = mergedKws;
          needsUpdate = true;
        }
      }

      // 3. Upgrade title if title is not locked or overridden
      const currentTitle = (existing.title || '').trim();
      const newTitle = (siteData.title || '').trim();
      const isTitleLocked = (existing.lockedFields && existing.lockedFields.title) || 
                            (existing.overriddenFields && existing.overriddenFields.title) ||
                            isFieldLockedOrOverridden(existing.title);
      if (!isTitleLocked) {
        if (newTitle && newTitle.length > currentTitle.length && !currentTitle.toLowerCase().includes(newTitle.toLowerCase())) {
          updatedFields.title = newTitle;
          needsUpdate = true;
        }
      }

      // 4. Upgrade classification category from non-AI to AI if classification is not locked or overridden
      const wasAI = existing.classification && existing.classification.isAI;
      const nowAI = siteData.classification && siteData.classification.isAI;
      const isClassLocked = (existing.lockedFields && existing.lockedFields.classification) || 
                            (existing.overriddenFields && existing.overriddenFields.classification) ||
                            isFieldLockedOrOverridden(existing.classification);
      if (!isClassLocked) {
        if (!wasAI && nowAI) {
          updatedFields.classification = siteData.classification;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        sites[existingIndex] = {
          ...existing,
          pendingUpdate: {
            ...(existing.pendingUpdate || {}),
            ...updatedFields
          }
        };
        chrome.storage.local.set({ sites });
      }
    }
  });
}

/**
 * Generate unique ID
 */
function generateId() {
  return 'site_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Authenticate with Google OAuth
 */
function authenticateWithGoogle(sendResponse) {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      sendResponse({ 
        success: false, 
        error: chrome.runtime.lastError.message 
      });
      return;
    }

    // Verify token by fetching user info
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + token }
    })
    .then(response => response.json())
    .then(userInfo => {
      chrome.storage.local.set({ 
        isAuthenticated: true,
        authToken: token,
        userEmail: userInfo.email
      }, () => {
        // Auto-initialize the default document in the background so it shows up in UI immediately!
        getOrCreateDefaultDoc(token).catch(err => console.log('[Auth] Failed to initialize default document:', err));
      });
      sendResponse({ 
        success: true, 
        email: userInfo.email 
      });
    })
    .catch(error => {
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    });
  });
}

/**
 * List Google Docs files in Drive (Google Docs format only)
 */
function listDriveFiles(token, sendResponse) {
  const GDOC_MIME = 'application/vnd.google-apps.document';
  const q = encodeURIComponent(`mimeType='${GDOC_MIME}' and trashed=false`);
  fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime%20desc`, {
    headers: { Authorization: 'Bearer ' + token }
  })
  .then(response => {
    if (!response.ok) throw new Error(`Drive API error: ${response.statusText}`);
    return response.json();
  })
  .then(data => {
    sendResponse({ 
      success: true, 
      files: data.files || []
    });
  })
  .catch(error => {
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  });
}

/**
 * Set the Google Drive document for syncing (Google Docs format only)
 */
function setDriveDocument(docId, docName, sendResponse) {
  const REQUIRED_FILENAME = 'AI_Site_Collector_Database';
  const cleanName = (docName || REQUIRED_FILENAME).replace(/(\.txt|\.md)$/i, '').trim() || REQUIRED_FILENAME;

  chrome.storage.local.set({ 
    driveDocId: docId,
    driveDocName: cleanName
  });
  sendResponse({ 
    success: true, 
    message: `Google Doc "${cleanName}" selected successfully` 
  });
}

/**
 * Sync collected sites to Google Drive (append to single document)
 */
function syncToDrive(sendResponse) {
  chrome.storage.local.get(['sites', 'authToken', 'driveDocId', 'driveDocName'], async (result) => {
    if (!result.authToken) {
      sendResponse({ 
        success: false, 
        error: 'Not authenticated. Please authenticate first.' 
      });
      return;
    }

    try {
      const REQUIRED_FILENAME = 'AI_Site_Collector_Database';
      let docId = result.driveDocId;
      const docName = (result.driveDocName || REQUIRED_FILENAME).replace(/(\.txt|\.md)$/i, '').trim() || REQUIRED_FILENAME;
      
      chrome.storage.local.set({ driveDocName: docName });
      
      if (!docId) {
        console.log('[Drive Sync] No Google Doc linked. Auto-discovering or creating one...');
        docId = await getOrCreateDefaultDoc(result.authToken);
      }
      
      const sites = result.sites || [];
      if (sites.length === 0) {
        sendResponse({ 
          success: true, 
          message: 'Database connected. Save websites to sync them here automatically.' 
        });
        return;
      }
      
      // Append sites to the document
      const newSitesSyncedCount = await appendToDocument(result.authToken, docId, sites);
      
      // Update all local sites to synced: true in storage
      const updatedSites = sites.map(s => ({ ...s, synced: true }));
      
      chrome.storage.local.set({ 
        sites: updatedSites,
        lastSync: new Date().toISOString()
      });
      
      sendResponse({ 
        success: true, 
        message: newSitesSyncedCount > 0 
          ? `${newSitesSyncedCount} new sites successfully synced to "${docName}"`
          : `Sync completed: Database is already up to date.`
      });
    } catch (error) {
      if (error.message === 'UNAUTHORIZED_TOKEN' || error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.log('[Drive Sync] Auth token expired or invalid. Attempting silent refresh...');
        chrome.identity.removeCachedAuthToken({ token: result.authToken }, () => {
          chrome.identity.getAuthToken({ interactive: false }, (newToken) => {
            if (chrome.runtime.lastError || !newToken) {
              console.log('[Drive Sync] Silent refresh failed. Interactive re-auth required.');
              sendResponse({
                success: false,
                error: 'Authentication session expired. Please open the extension popup and sign in again.'
              });
            } else {
              console.log('[Drive Sync] Silent refresh successful. Retrying sync...');
              chrome.storage.local.set({ authToken: newToken }, () => {
                chrome.storage.local.get(['sites', 'driveDocId', 'driveDocName'], async (retryResult) => {
                  try {
                    const docId = retryResult.driveDocId || await getOrCreateDefaultDoc(newToken);
                    const newSitesSyncedCount = await appendToDocument(newToken, docId, retryResult.sites || []);
                    
                    // Update all local sites to synced: true in storage
                    const retrySites = (retryResult.sites || []).map(s => ({ ...s, synced: true }));
                    
                    chrome.storage.local.set({ 
                      sites: retrySites,
                      lastSync: new Date().toISOString() 
                    });
                    sendResponse({
                      success: true,
                      message: newSitesSyncedCount > 0 
                        ? `${newSitesSyncedCount} new sites successfully synced to "${REQUIRED_FILENAME}" (session refreshed)`
                        : `Sync completed: Database is already up to date.`
                    });
                  } catch (retryError) {
                    sendResponse({ success: false, error: retryError.message });
                  }
                });
              });
            }
          });
        });
      } else {
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      }
    }
  });
}

/**
 * Automatically find or create the default Drive folder named "AI Site Collector"
 */
let activeFolderPromise = null;

async function getOrCreateFolder(token) {
  if (activeFolderPromise) {
    console.log('[Drive Sync] Reusing active folder creation promise to prevent duplicates.');
    return activeFolderPromise;
  }

  const promise = (async () => {
    const FOLDER_NAME = 'AI Site Collector';
    const FOLDER_MIME = 'application/vnd.google-apps.folder';
    
    // 1. Check local storage first for cached folder ID
    const cached = await new Promise(resolve => chrome.storage.local.get('driveFolderId', resolve));
    if (cached.driveFolderId) {
      try {
        const checkResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${cached.driveFolderId}?fields=trashed,mimeType`,
          { headers: { Authorization: 'Bearer ' + token } }
        );
        if (checkResponse.ok) {
          const meta = await checkResponse.json();
          if (!meta.trashed && meta.mimeType === FOLDER_MIME) {
            console.log(`[Drive Sync] Using cached folder ID: ${cached.driveFolderId}`);
            return cached.driveFolderId;
          }
        }
      } catch (err) {
        console.log('[Drive Sync] Failed to verify cached folder ID, searching/recreating...');
      }
    }
    
    // 2. Search Drive for our folder
    const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    
    if (!response.ok) {
      if (response.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
      let errMsg = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      throw new Error(`Failed to search Drive folder: ${errMsg}`);
    }
    
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      const folderId = data.files[0].id;
      await new Promise(resolve => chrome.storage.local.set({ driveFolderId: folderId }, resolve));
      console.log(`[Drive Sync] Found existing folder: "${FOLDER_NAME}" (id: ${folderId})`);
      return folderId;
    }
    
    // 3. Not found: create new folder
    console.log(`[Drive Sync] Creating new folder: "${FOLDER_NAME}"`);
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: FOLDER_MIME
      })
    });
    
    if (!createResponse.ok) {
      if (createResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
      let errMsg = createResponse.statusText;
      try {
        const errJson = await createResponse.json();
        if (errJson && errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      throw new Error(`Failed to create Drive folder: ${errMsg}`);
    }
    
    const folder = await createResponse.json();
    await new Promise(resolve => chrome.storage.local.set({ driveFolderId: folder.id }, resolve));
    console.log(`[Drive Sync] Created folder: "${FOLDER_NAME}" (id: ${folder.id})`);
    return folder.id;
  })();

  activeFolderPromise = promise;
  promise.finally(() => {
    activeFolderPromise = null;
  });

  return promise;
}

let activeCreatePromise = null;

async function getOrCreateDefaultDoc(token, skipIds = []) {
  if (activeCreatePromise && skipIds.length === 0) {
    console.log('[Drive Sync] Reusing active document creation promise to prevent duplicates.');
    return activeCreatePromise;
  }

  const promise = (async () => {
    const DOC_NAME = 'AI_Site_Collector_Database';
    const GDOC_MIME = 'application/vnd.google-apps.document';
    
    // Resolve or create our dedicated folder first
    const folderId = await getOrCreateFolder(token);
    
    const stored = await new Promise(resolve => chrome.storage.local.get('driveDocName', resolve));
    const docName = (stored.driveDocName || DOC_NAME).replace(/(\.txt|\.md)$/i, '').trim() || DOC_NAME;

    // 1. Search for existing Google Doc inside our folder
    const q = encodeURIComponent(`name='${docName}' and mimeType='${GDOC_MIME}' and '${folderId}' in parents and trashed=false`);
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    
    if (!searchResponse.ok) {
      if (searchResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
      let errMsg = searchResponse.statusText;
      try {
        const errJson = await searchResponse.json();
        if (errJson && errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      throw new Error(`Failed to search Drive: ${errMsg}`);
    }
    
    const searchData = await searchResponse.json();
    const files = (searchData.files || []).filter(f => !skipIds.includes(f.id));
    
    if (files.length > 0) {
      const existingDoc = files[0];
      await new Promise((resolve) => {
        chrome.storage.local.set({ driveDocId: existingDoc.id, driveDocName: docName }, resolve);
      });
      console.log(`[Drive Sync] Found existing Google Doc in folder: "${docName}" (id: ${existingDoc.id})`);
      return existingDoc.id;
    }
    
    // 2. Not found — create a new Google Doc inside our folder
    console.log(`[Drive Sync] Creating new Google Doc in folder: "${docName}"`);
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: docName,
        mimeType: GDOC_MIME,
        parents: [folderId]
      })
    });
    
    if (!createResponse.ok) {
      if (createResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
      let errMsg = createResponse.statusText;
      try {
        const errJson = await createResponse.json();
        if (errJson && errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      throw new Error(`Failed to create Google Doc: ${errMsg}`);
    }
    
    const newFile = await createResponse.json();
    const docId = newFile.id;

    // Cache the ID immediately so concurrent checks/retries during initialization reuse it!
    await new Promise((resolve) => {
      chrome.storage.local.set({ driveDocId: docId, driveDocName: docName }, resolve);
    });
    
    // Initial Doc Header via batchUpdate
    const mainHeader = `AI Site Collector — Sync Database`;
    const subHeader = `This document is auto-managed by the AI Site Collector extension.`;
    const initialText = `${mainHeader}\n\n${subHeader}\n\n`;

    const initResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              text: initialText,
              endOfSegmentLocation: {
                segmentId: ""
              }
            }
          },
          {
            updateTextStyle: {
              textStyle: {
                bold: true,
                fontSize: { magnitude: 16, unit: 'PT' }
              },
              fields: 'bold,fontSize',
              range: {
                startIndex: 1,
                endIndex: 1 + mainHeader.length
              }
            }
          },
          {
            updateTextStyle: {
              textStyle: {
                fontSize: { magnitude: 11, unit: 'PT' },
                underline: true,
                foregroundColor: {
                  color: {
                    rgbColor: { red: 0.8, green: 0.1, blue: 0.1 }
                  }
                }
              },
              fields: 'fontSize,underline,foregroundColor',
              range: {
                startIndex: 1 + mainHeader.length + 2,
                endIndex: 1 + mainHeader.length + 2 + subHeader.length
              }
            }
          },
          {
            updateParagraphStyle: {
              paragraphStyle: {
                lineSpacing: 150
              },
              fields: 'lineSpacing',
              range: {
                startIndex: 1,
                endIndex: 1 + initialText.length
              }
            }
          }
        ]
      })
    });
    
    if (!initResponse.ok) {
      if (initResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
      let errMsg = initResponse.statusText;
      try {
        const errJson = await initResponse.json();
        if (errJson && errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      throw new Error(`Failed to initialize Google Doc: ${errMsg}`);
    }
    
    console.log(`[Drive Sync] Created and initialized Google Doc: "${docName}" (id: ${docId})`);
    return docId;
  })();

  if (skipIds.length === 0) {
    activeCreatePromise = promise;
    promise.finally(() => {
      activeCreatePromise = null;
    });
  }

  return promise;
}

/**
 * Extract features/tags from site
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
 * Generate formatted document content for the entire database (newest first)
 */
function generateFullDatabaseContent(sites) {
  const timestamp = new Date().toLocaleString();
  let content = `# AI Site Collector — Sync Database\n\n`;
  content += `> This document is auto-managed by the AI Site Collector extension.\n\n`;
  content += `---\n`;
  content += `**LATEST COLLECTION DATABASE** | Last Sync: ${timestamp} | Total Sites: ${sites.length}\n`;
  content += `---\n\n`;

  // Sort sites: newest saved first
  const sortedSites = [...sites].sort((a, b) => new Date(b.savedAt || b.timestamp) - new Date(a.savedAt || a.timestamp));

  sortedSites.forEach((site, index) => {
    const features = extractFeatures(site);
    const category = (site.classification && site.classification.isAI) ? 'AI Platform' : 'Useful Tool';
    const cleanDesc = (site.description || '').replace(/\n/g, ' ').trim() || 'No description available.';
    const savedDate = new Date(site.savedAt || site.timestamp).toLocaleString();
    const confidence = Math.round(((site.classification && site.classification.confidence) || 0) * 100);

    content += `### ${index + 1}. [${site.title}](${site.url})\n`;
    content += `- **URL**: [${site.url}](${site.url})\n`;
    content += `- **Category**: ${category}\n`;
    content += `- **Description**: ${cleanDesc}\n`;
    if (features.length > 0) {
      content += `- **Features**: ${features.join(', ')}\n`;
    }
    content += `- **Confidence**: ${confidence}%\n`;
    content += `- **Saved**: ${savedDate}\n\n`;
  });

  return content;
}

/**
 * Sync all sites to Google Drive by overwriting the file with the latest up-to-date formatted database
 */
/**
 * Format page description into clean, bulleted, sentence-based points
 */
function formatDescriptionAsPoints(desc) {
  if (!desc) return '     • No description available.';
  
  const clean = desc.replace(/\n/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
  
  const points = sentences
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => `     • ${s}`);
    
  return points.join('\n');
}

/**
 * Audit existing content format in the Google Doc to detect legacy plain/markdown formats or formatting mismatches
 */
function doesDocMatchFormat(content, sites) {
  if (!content || content.trim().length === 0) return true;
  
  if (sites.length === 0) {
    // SAFETY GUARD: Never trigger a full doc wipe when local sites array is empty.
    // This can happen as a race condition right after sign-in before storage is loaded,
    // or if the user cleared local sites manually. Wiping the Drive doc in this case
    // would destroy all historical data. Return true = no rebuild needed.
    console.log('[Format Audit] Local database is empty — skipping wipe to protect Drive data.');
    return true;
  }

  // Detect old markdown formats
  if (content.includes('### ') || content.includes('**URL**') || content.includes('**Category**') || content.includes('**Description**')) {
    console.log('[Format Audit] Detected legacy Markdown-style syntax in Google Doc.');
    return false;
  }

  // Detect file extensions or legacy icons in text
  if (content.includes('.txt') || content.includes('.md') || content.includes('📄')) {
    console.log('[Format Audit] Detected legacy extensions or emojis in Google Doc text.');
    return false;
  }

  // Check if any URL in the Google Doc does not exist in local active sites (indicating a deletion)
  const docUrls = [...content.matchAll(/   URL\s*:\s*(https?:\/\/\S+)/g)].map(m => m[1].trim());
  const siteUrls = new Set(sites.map(s => s.url));
  const hasDeletedSite = docUrls.some(url => !siteUrls.has(url));
  if (hasDeletedSite) {
    console.log('[Format Audit] Detected deleted sites in Google Doc compared to local database. Triggering sync rebuild...');
    return false;
  }

  // For each local site, if its URL is in the doc, check if it follows the exact structured prefix
  for (const site of sites) {
    if (content.includes(site.url)) {
      const urlPattern = `   URL         : ${site.url}`;
      if (!content.includes(urlPattern)) {
        console.log(`[Format Audit] Site URL exists but does not match expected format pattern: "${urlPattern}".`);
        return false;
      }
    }
  }

  return true;
}

/**
 * Append new sites to an existing Google Doc
 */
async function appendToDocument(token, docId, sites, skipIds = []) {
  const GDOC_MIME = 'application/vnd.google-apps.document';
  let isDocValid = false;

  // Verify that the stored docId is a valid, non-trashed Google Doc
  if (docId && !skipIds.includes(docId)) {
    try {
      const fileCheckResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${docId}?fields=mimeType,trashed`,
        { headers: { Authorization: 'Bearer ' + token } }
      );
      
      if (fileCheckResponse.ok) {
        const fileMeta = await fileCheckResponse.json();
        if (fileMeta.mimeType === GDOC_MIME && !fileMeta.trashed) {
          isDocValid = true;
        }
      }
    } catch (err) {
      console.log('[Drive Sync] Error verifying document metadata:', err);
    }
  }

  // If the stored document is not valid, trashed, or not a Google Doc, recreate/rediscover one
  if (!isDocValid) {
    console.log('[Drive Sync] Stored document is invalid, trashed, or not a Google Doc. Recreating or auto-discovering...');
    const newDocId = await getOrCreateDefaultDoc(token, skipIds);
    docId = newDocId;
  }

  // ── Step 1: Read current Google Doc content to deduplicate ──
  let exportResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain`,
    { headers: { Authorization: 'Bearer ' + token } }
  );

  if (!exportResponse.ok) {
    if (exportResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
    
    // Self-healing: recreate new document if access denied
    if (exportResponse.status === 403 || exportResponse.status === 404) {
      console.log(`[Drive Sync] Access denied (status ${exportResponse.status}) to document ${docId}. Re-creating a new owned Google Doc...`);
      const newSkipIds = [...skipIds, docId];
      await new Promise(resolve => chrome.storage.local.set({ driveDocId: null }, resolve));
      const newDocId = await getOrCreateDefaultDoc(token, newSkipIds);
      return await appendToDocument(token, newDocId, sites, newSkipIds);
    }
    
    throw new Error(`Failed to read Google Doc: ${exportResponse.statusText}`);
  }

  const currentContent = await exportResponse.text();

  // ── Step 2: Audit existing content format and rich metadata updates ──
  const isFormatCorrect = doesDocMatchFormat(currentContent, sites);
  
  // Check if any site in storage is unsynced (needs sync) but its URL already exists in the document.
  // This indicates the site was updated locally with richer metadata (description, features, etc.).
  const hasMetadataUpdates = sites.some(site => !site.synced && currentContent.includes(site.url));

  if (!isFormatCorrect || hasMetadataUpdates) {
    if (hasMetadataUpdates) {
      console.log('[Drive Sync] Rich metadata update (description/features) detected. Triggering self-healing full rebuild...');
    } else {
      console.log('[Drive Sync] Google Doc formatting mismatch detected. Triggering self-healing full rebuild...');
    }
    
    // Fetch document structure to get accurate endIndex
    const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!docResponse.ok) {
      if (docResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
      throw new Error(`Failed to fetch document structure: ${docResponse.statusText}`);
    }
    const docData = await docResponse.json();
    const bodyContent = docData.body && docData.body.content;
    const lastElement = bodyContent && bodyContent[bodyContent.length - 1];
    const endIndex = lastElement ? lastElement.endIndex : 1;

    const insertIndex = 1;
    const mainHeader = `AI Site Collector — Sync Database`;
    const subHeader = `This document is auto-managed by the AI Site Collector extension.`;
    let currentText = `${mainHeader}\n\n${subHeader}\n\n`;

    const styleRequests = [];
    
    // Bold, 16pt main header
    styleRequests.push({
      updateTextStyle: {
        textStyle: {
          bold: true,
          fontSize: { magnitude: 16, unit: 'PT' }
        },
        fields: 'bold,fontSize',
        range: {
          startIndex: 1,
          endIndex: 1 + mainHeader.length
        }
      }
    });

    // 11pt, red, underlined sub header
    styleRequests.push({
      updateTextStyle: {
        textStyle: {
          fontSize: { magnitude: 11, unit: 'PT' },
          underline: true,
          foregroundColor: {
            color: {
              rgbColor: { red: 0.8, green: 0.1, blue: 0.1 }
            }
          }
        },
        fields: 'fontSize,underline,foregroundColor',
        range: {
          startIndex: 1 + mainHeader.length + 2,
          endIndex: 1 + mainHeader.length + 2 + subHeader.length
        }
      }
    });

    // Rebuild chronologically (oldest first)
    const sortedSites = [...sites].sort((a, b) => new Date(a.savedAt || a.timestamp) - new Date(b.savedAt || b.timestamp));

    sortedSites.forEach((site, i) => {
      const features = extractFeatures(site);
      const category = (site.classification && site.classification.isAI) ? 'AI Platform' : 'Useful Tool';
      const cleanDesc = cleanFieldLockSuffix(site.description || '').replace(/\n/g, ' ').trim() || 'No description available.';
      const descPoints = formatDescriptionAsPoints(cleanDesc);
      const savedDate = new Date(site.savedAt || site.timestamp).toLocaleString();
      const updatedDate = new Date(site.updatedAt || site.savedAt || site.timestamp).toLocaleString();

      const titleLock = (site.lockedFields && site.lockedFields.title) ? ' *' : ((site.overriddenFields && site.overriddenFields.title) ? ' **' : '');
      const titlePrefix = `${i + 1}. `;
      const cleanTitle = cleanFieldLockSuffix(site.title);
      const titleLine = `${titlePrefix}${cleanTitle}${titleLock}\n`;
      
      const urlLine = `   URL         : ${site.url}\n`;
      
      const classLock = (site.lockedFields && site.lockedFields.classification) ? ' *' : ((site.overriddenFields && site.overriddenFields.classification) ? ' **' : '');
      const cleanCategory = cleanFieldLockSuffix(category);
      const typeLine = `   Type        : ${cleanCategory}${classLock}\n`;
      
      const descLock = (site.lockedFields && site.lockedFields.description) ? ' *' : ((site.overriddenFields && site.overriddenFields.description) ? ' **' : '');
      const descLine = `   Description :${descLock}\n${descPoints}\n`;
      
      let featuresLine = "";
      if (features.length > 0) {
        const featuresLock = (site.lockedFields && site.lockedFields.keywords) ? ' *' : ((site.overriddenFields && site.overriddenFields.keywords) ? ' **' : '');
        const cleanFeaturesList = features.map(cleanFieldLockSuffix);
        featuresLine = `   Features    : ${cleanFeaturesList.join(', ')}${featuresLock}\n`;
      }
      const savedLine = `   Saved       : ${savedDate}\n`;
      const updatedLine = `   Updated     : ${updatedDate}\n\n`;

      // Title Start & End
      const titleStart = currentText.length;
      currentText += titleLine;
      const titleEnd = currentText.length;

      // Style Title: bold, 14pt, underline if AI
      const isAI = site.classification && site.classification.isAI;
      styleRequests.push({
        updateTextStyle: {
          textStyle: {
            bold: true,
            fontSize: { magnitude: 14, unit: 'PT' },
            underline: isAI ? true : false
          },
          fields: 'bold,fontSize,underline',
          range: {
            startIndex: insertIndex + titleStart,
            endIndex: insertIndex + titleEnd - 1 // exclude trailing newline from styling
          }
        }
      });

      const detailsStart = currentText.length;

      // 1. URL Line
      const urlStart = currentText.length;
      const urlLabelStart = urlStart + "   ".length;
      const urlLabelEnd = urlLabelStart + "URL".length;
      const urlValueStart = urlStart + "   URL         : ".length;
      const urlValueEnd = urlStart + `   URL         : ${site.url}`.length;
      currentText += urlLine;

      // 2. Type Line
      const typeStart = currentText.length;
      const typeLabelStart = typeStart + "   ".length;
      const typeLabelEnd = typeLabelStart + "Type".length;
      currentText += typeLine;

      // 3. Description Line
      const descStart = currentText.length;
      const descLabelStart = descStart + "   ".length;
      const descLabelEnd = descLabelStart + "Description".length;
      currentText += descLine;

      // 4. Features Line
      let featuresStart = null;
      let featuresLabelStart = null;
      let featuresLabelEnd = null;
      if (featuresLine) {
        featuresStart = currentText.length;
        featuresLabelStart = featuresStart + "   ".length;
        featuresLabelEnd = featuresLabelStart + "Features".length;
        currentText += featuresLine;
      }

      // 5. Saved Line
      const savedStart = currentText.length;
      const savedEnd = savedStart + savedLine.length;
      currentText += savedLine;

      // 6. Updated Line
      const updatedStart = currentText.length;
      const updatedEnd = updatedStart + updatedLine.length;
      currentText += updatedLine;

      const detailsEnd = currentText.length;

      // Apply baseline Details style (font size 12, normal weight, normal style)
      styleRequests.push({
        updateTextStyle: {
          textStyle: {
            bold: false,
            italic: false,
            underline: false,
            fontSize: { magnitude: 12, unit: 'PT' },
            foregroundColor: {
              color: {
                rgbColor: { red: 0.0, green: 0.0, blue: 0.0 }
              }
            }
          },
          fields: 'bold,italic,underline,fontSize,foregroundColor',
          range: {
            startIndex: insertIndex + detailsStart,
            endIndex: insertIndex + detailsEnd
          }
        }
      });

      // Apply URL Label Italic style
      styleRequests.push({
        updateTextStyle: {
          textStyle: { italic: true },
          fields: 'italic',
          range: {
            startIndex: insertIndex + urlLabelStart,
            endIndex: insertIndex + urlLabelEnd
          }
        }
      });

      // Apply URL Value Hyperlink style (bold, underline, blue, clickable)
      styleRequests.push({
        updateTextStyle: {
          textStyle: {
            bold: true,
            underline: true,
            link: { url: site.url },
            foregroundColor: {
              color: {
                rgbColor: {
                  red: 0.0627451,
                  green: 0.3019608,
                  blue: 0.5843137
                }
              }
            }
          },
          fields: 'bold,underline,link,foregroundColor',
          range: {
            startIndex: insertIndex + urlValueStart,
            endIndex: insertIndex + urlValueEnd
          }
        }
      });

      // Apply Type Label Italic style
      styleRequests.push({
        updateTextStyle: {
          textStyle: { italic: true },
          fields: 'italic',
          range: {
            startIndex: insertIndex + typeLabelStart,
            endIndex: insertIndex + typeLabelEnd
          }
        }
      });

      // Apply Description Label Italic style
      styleRequests.push({
        updateTextStyle: {
          textStyle: { italic: true },
          fields: 'italic',
          range: {
            startIndex: insertIndex + descLabelStart,
            endIndex: insertIndex + descLabelEnd
          }
        }
      });

      // Apply Features Label Italic style (if exists)
      if (featuresLine) {
        styleRequests.push({
          updateTextStyle: {
            textStyle: { italic: true },
            fields: 'italic',
            range: {
              startIndex: insertIndex + featuresLabelStart,
              endIndex: insertIndex + featuresLabelEnd
            }
          }
        });
      }

      // Apply Saved Line Italic style
      styleRequests.push({
        updateTextStyle: {
          textStyle: { italic: true },
          fields: 'italic',
          range: {
            startIndex: insertIndex + savedStart,
            endIndex: insertIndex + savedEnd - 1
          }
        }
      });

      // Apply Updated Line Italic style
      styleRequests.push({
        updateTextStyle: {
          textStyle: { italic: true },
          fields: 'italic',
          range: {
            startIndex: insertIndex + updatedStart,
            endIndex: insertIndex + updatedEnd - 2
          }
        }
      });
    });

    const deleteRequest = endIndex > 2 ? [{
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: endIndex - 1
        }
      }
    }] : [];

    const insertRequest = [{
      insertText: {
        text: currentText,
        location: {
          index: insertIndex
        }
      }
    }];

    // Apply line spacing of 1.5 to the entire rebuilt block
    styleRequests.push({
      updateParagraphStyle: {
        paragraphStyle: {
          lineSpacing: 150
        },
        fields: 'lineSpacing',
        range: {
          startIndex: insertIndex,
          endIndex: insertIndex + currentText.length
        }
      }
    });

    const finalRequests = [...deleteRequest, ...insertRequest, ...styleRequests];

    const updateResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: finalRequests })
      }
    );

    if (!updateResponse.ok) {
      if (updateResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
      
      if (updateResponse.status === 403 || updateResponse.status === 404) {
        console.log(`[Drive Sync] Access denied (status ${updateResponse.status}) on update to document ${docId}. Re-creating a new owned Google Doc...`);
        const newSkipIds = [...skipIds, docId];
        await new Promise(resolve => chrome.storage.local.set({ driveDocId: null }, resolve));
        const newDocId = await getOrCreateDefaultDoc(token, newSkipIds);
        return await appendToDocument(token, newDocId, sites, newSkipIds);
      }
      
      throw new Error(`Failed to update Google Doc: ${updateResponse.statusText}`);
    }

    return sites.length;
  }

  // ── Step 3: Filter to only brand-new sites not already in the document ──
  const newSites = sites.filter(site => !currentContent.includes(site.url));
  if (newSites.length === 0) {
    return 0; // All sites already synced
  }

  // ── Step 3: Fetch current document structure to obtain the exact endIndex ──
  const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!docResponse.ok) {
    if (docResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
    throw new Error(`Failed to fetch document structure: ${docResponse.statusText}`);
  }
  const docData = await docResponse.json();
  const bodyContent = docData.body && docData.body.content;
  const lastElement = bodyContent && bodyContent[bodyContent.length - 1];
  const endIndex = lastElement ? lastElement.endIndex : 1;
  const insertIndex = endIndex > 1 ? endIndex - 1 : 1;

  // ── Step 4: Build the text block and calculate styling offsets ──
  const timestamp = new Date().toLocaleString();
  let currentText = `\n\n${'='.repeat(60)}\nSYNC UPDATE — ${timestamp} | ${newSites.length} new site(s)\n${'='.repeat(60)}\n\n`;

  const headerLine = `SYNC UPDATE — ${timestamp} | ${newSites.length} new site(s)`;
  const headerStart = `\n\n${'='.repeat(60)}\n`.length;
  const headerEnd = headerStart + headerLine.length;

  const requests = [];

  // Add bold styling for the SYNC UPDATE header
  requests.push({
    updateTextStyle: {
      textStyle: {
        bold: true
      },
      fields: 'bold',
      range: {
        startIndex: insertIndex + headerStart,
        endIndex: insertIndex + headerEnd
      }
    }
  });

  newSites.forEach((site, i) => {
    const features = extractFeatures(site);
    const category = (site.classification && site.classification.isAI) ? 'AI Platform' : 'Useful Tool';
    const cleanDesc = cleanFieldLockSuffix(site.description || '').replace(/\n/g, ' ').trim() || 'No description available.';
    const descPoints = formatDescriptionAsPoints(cleanDesc);
    const savedDate = new Date(site.savedAt || site.timestamp).toLocaleString();
    const updatedAtDate = new Date(site.updatedAt || site.savedAt || site.timestamp).toLocaleString();

    // Line 1: Title line
    const titleLock = (site.lockedFields && site.lockedFields.title) ? ' *' : ((site.overriddenFields && site.overriddenFields.title) ? ' **' : '');
    const titlePrefix = `${i + 1}. `;
    const cleanTitle = cleanFieldLockSuffix(site.title);
    const titleLine = `${titlePrefix}${cleanTitle}${titleLock}\n`;
    
    const urlLine = `   URL         : ${site.url}\n`;
    
    const classLock = (site.lockedFields && site.lockedFields.classification) ? ' *' : ((site.overriddenFields && site.overriddenFields.classification) ? ' **' : '');
    const cleanCategory = cleanFieldLockSuffix(category);
    const typeLine = `   Type        : ${cleanCategory}${classLock}\n`;
    
    const descLock = (site.lockedFields && site.lockedFields.description) ? ' *' : ((site.overriddenFields && site.overriddenFields.description) ? ' **' : '');
    const descLine = `   Description :${descLock}\n${descPoints}\n`;
    
    let featuresLine = "";
    if (features.length > 0) {
      const featuresLock = (site.lockedFields && site.lockedFields.keywords) ? ' *' : ((site.overriddenFields && site.overriddenFields.keywords) ? ' **' : '');
      const cleanFeaturesList = features.map(cleanFieldLockSuffix);
      featuresLine = `   Features    : ${cleanFeaturesList.join(', ')}${featuresLock}\n`;
    }
    const savedLine = `   Saved       : ${savedDate}\n`;
    const updatedLine = `   Updated     : ${updatedAtDate}\n\n`;

    // Title Start & End
    const titleStart = currentText.length;
    currentText += titleLine;
    const titleEnd = currentText.length;

    // Style Title: bold, 14pt, underline if AI
    const isAI = site.classification && site.classification.isAI;
    requests.push({
      updateTextStyle: {
        textStyle: {
          bold: true,
          fontSize: { magnitude: 14, unit: 'PT' },
          underline: isAI ? true : false
        },
        fields: 'bold,fontSize,underline',
        range: {
          startIndex: insertIndex + titleStart,
          endIndex: insertIndex + titleEnd - 1
        }
      }
    });

    const detailsStart = currentText.length;

    // 1. URL Line
    const urlStart = currentText.length;
    const urlLabelStart = urlStart + "   ".length;
    const urlLabelEnd = urlLabelStart + "URL".length;
    const urlValueStart = urlStart + "   URL         : ".length;
    const urlValueEnd = urlStart + `   URL         : ${site.url}`.length;
    currentText += urlLine;

    // 2. Type Line
    const typeStart = currentText.length;
    const typeLabelStart = typeStart + "   ".length;
    const typeLabelEnd = typeLabelStart + "Type".length;
    currentText += typeLine;

    // 3. Description Line
    const descStart = currentText.length;
    const descLabelStart = descStart + "   ".length;
    const descLabelEnd = descLabelStart + "Description".length;
    currentText += descLine;

    // 4. Features Line
    let featuresStart = null;
    let featuresLabelStart = null;
    let featuresLabelEnd = null;
    if (featuresLine) {
      featuresStart = currentText.length;
      featuresLabelStart = featuresStart + "   ".length;
      featuresLabelEnd = featuresLabelStart + "Features".length;
      currentText += featuresLine;
    }

    // 5. Saved Line
    const savedStart = currentText.length;
    const savedEnd = savedStart + savedLine.length;
    currentText += savedLine;

    // 6. Updated Line
    const updatedStart = currentText.length;
    const updatedEnd = updatedStart + updatedLine.length;
    currentText += updatedLine;

    const detailsEnd = currentText.length;

    // Apply baseline Details style (font size 12, normal weight, normal style)
    requests.push({
      updateTextStyle: {
        textStyle: {
          bold: false,
          italic: false,
          underline: false,
          fontSize: { magnitude: 12, unit: 'PT' },
          foregroundColor: {
            color: {
              rgbColor: { red: 0.0, green: 0.0, blue: 0.0 }
            }
          }
        },
        fields: 'bold,italic,underline,fontSize,foregroundColor',
        range: {
          startIndex: insertIndex + detailsStart,
          endIndex: insertIndex + detailsEnd
        }
      }
    });

    // Apply URL Label Italic style
    requests.push({
      updateTextStyle: {
        textStyle: { italic: true },
        fields: 'italic',
        range: {
          startIndex: insertIndex + urlLabelStart,
          endIndex: insertIndex + urlLabelEnd
        }
      }
    });

    // Apply URL Value Hyperlink style (bold, underline, blue, clickable)
    requests.push({
      updateTextStyle: {
        textStyle: {
          bold: true,
          underline: true,
          link: { url: site.url },
          foregroundColor: {
            color: {
              rgbColor: {
                red: 0.0627451,
                green: 0.3019608,
                blue: 0.5843137
              }
            }
          }
        },
        fields: 'bold,underline,link,foregroundColor',
        range: {
          startIndex: insertIndex + urlValueStart,
          endIndex: insertIndex + urlValueEnd
        }
      }
    });

    // Apply Type Label Italic style
    requests.push({
      updateTextStyle: {
        textStyle: { italic: true },
        fields: 'italic',
        range: {
          startIndex: insertIndex + typeLabelStart,
          endIndex: insertIndex + typeLabelEnd
        }
      }
    });

    // Apply Description Label Italic style
    requests.push({
      updateTextStyle: {
        textStyle: { italic: true },
        fields: 'italic',
        range: {
          startIndex: insertIndex + descLabelStart,
          endIndex: insertIndex + descLabelEnd
        }
      }
    });

    // Apply Features Label Italic style (if exists)
    if (featuresLine) {
      requests.push({
        updateTextStyle: {
          textStyle: { italic: true },
          fields: 'italic',
          range: {
            startIndex: insertIndex + featuresLabelStart,
            endIndex: insertIndex + featuresLabelEnd
          }
        }
      });
    }

    // Apply Saved Line Italic style
    requests.push({
      updateTextStyle: {
        textStyle: { italic: true },
        fields: 'italic',
        range: {
          startIndex: insertIndex + savedStart,
          endIndex: insertIndex + savedEnd - 1
        }
      }
    });

    // Apply Updated Line Italic style
    requests.push({
      updateTextStyle: {
        textStyle: { italic: true },
        fields: 'italic',
        range: {
          startIndex: insertIndex + updatedStart,
          endIndex: insertIndex + updatedEnd - 2
        }
      }
    });
  });

  const footerText = `${'─'.repeat(60)}\n`;
  currentText += footerText;

  // Apply line spacing of 1.5 to the entire appended block
  requests.push({
    updateParagraphStyle: {
      paragraphStyle: {
        lineSpacing: 150
      },
      fields: 'lineSpacing',
      range: {
        startIndex: insertIndex,
        endIndex: insertIndex + currentText.length
      }
    }
  });

  // Prepend the insertText request so it runs first in the batchUpdate
  requests.unshift({
    insertText: {
      text: currentText,
      location: {
        index: insertIndex
      }
    }
  });

  // ── Step 5: Append to the Google Doc using Docs API batchUpdate ──
  const updateResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    }
  );

  if (!updateResponse.ok) {
    if (updateResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
    
    if (updateResponse.status === 403 || updateResponse.status === 404) {
      console.log(`[Drive Sync] Access denied (status ${updateResponse.status}) on update to document ${docId}. Re-creating a new owned Google Doc...`);
      const newSkipIds = [...skipIds, docId];
      await new Promise(resolve => chrome.storage.local.set({ driveDocId: null }, resolve));
      const newDocId = await getOrCreateDefaultDoc(token, newSkipIds);
      return await appendToDocument(token, newDocId, sites, newSkipIds);
    }
    
    throw new Error(`Failed to update Google Doc: ${updateResponse.statusText}`);
  }

  return newSites.length;
}

/**
 * Generate CSV from sites data (for export)
 */
function generateCSV(sites) {
  const headers = ['Title', 'URL', 'Description', 'Type', 'Confidence', 'Features', 'Saved At'];
  const rows = sites.map(site => {
    const features = extractFeatures(site);
    return [
      `"${site.title.replace(/"/g, '""')}"`,
      `"${site.url}"`,
      `"${site.description.replace(/"/g, '""')}"`,
      (site.classification && site.classification.isAI) ? 'AI' : 'Useful',
      `${(((site.classification && site.classification.confidence) || 0) * 100).toFixed(0)}%`,
      `"${features.join(', ')}"`,
      new Date(site.savedAt).toLocaleString()
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Synchronize domain classification rules dynamically from GitHub
 * SECURITY MEASURE: Inputs are strictly sanitized and type-validated to prevent prototype pollution or XSS vectors.
 */
function syncDomainRules() {
  fetch('https://raw.githubusercontent.com/manjunath-27-idea/ai-site-collector-extension/main/domain_rules.json')
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return response.json();
  })
  .then(data => {
    const cleanData = {};
    const safePatternRegex = /^[a-z0-9\-\.\_\/]+$/i;
    
    // Strict schema validation checks to safeguard the extension sandbox
    if (data.known_ai_domains && Array.isArray(data.known_ai_domains)) {
      cleanData.remoteAiDomains = data.known_ai_domains.filter(
        d => typeof d === 'string' && 
             d.length < 100 && 
             safePatternRegex.test(d) && 
             !d.includes('__proto__') && 
             !d.includes('constructor') && 
             !d.includes('prototype')
      );
    }
    if (data.known_useful_domains && Array.isArray(data.known_useful_domains)) {
      cleanData.remoteUsefulDomains = data.known_useful_domains.filter(
        d => typeof d === 'string' && 
             d.length < 100 && 
             safePatternRegex.test(d) && 
             !d.includes('__proto__') && 
             !d.includes('constructor') && 
             !d.includes('prototype')
      );
    }
    if (data.auth_gateways && Array.isArray(data.auth_gateways)) {
      cleanData.remoteAuthGateways = data.auth_gateways.filter(
        d => typeof d === 'string' && 
             d.length < 100 && 
             safePatternRegex.test(d) && 
             !d.includes('__proto__') && 
             !d.includes('constructor') && 
             !d.includes('prototype')
      );
    }

    if (Object.keys(cleanData).length > 0) {
      chrome.storage.local.set(cleanData, () => {
        console.log('[Domain Sync] Classification catalog synced successfully from GitHub.');
      });
    }
  })
  .catch(err => {
    console.log('[Domain Sync] Sync failed (offline fallback active):', err.message);
  });
}

// Synchronize classification catalogs dynamically when the browser starts up
chrome.runtime.onStartup.addListener(syncDomainRules);

