/**
 * Background Service Worker
 * Handles site detection, storage, and Google Drive API integration
 * Single document mode: All sites appended to one selected document
 */

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

      // ── Migration: force reset synced: false on all existing records ──
      const currentSites = stored.sites || [];
      if (currentSites.length > 0) {
        updates.sites = currentSites.map(s => ({ ...s, synced: false }));
        console.log('[Migration] Reset synced: false on all existing site records to trigger a full formatting re-sync.');
      }

      chrome.storage.local.set(updates, () => {
        syncDomainRules();
      });
    });
  }
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
      sites.push({
        ...siteData,
        id: generateId(),
        synced: false,
        savedAt: new Date().toISOString()
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

      // 1. Upgrade description if the new one is richer/longer and not a default fallback
      const currentDesc = (existing.description || '').trim();
      const newDesc = (siteData.description || '').trim();
      
      const isFallback = (desc) => 
        desc.includes('detected by domain or keyword') || 
        desc === 'No description available.' || 
        desc === 'No description available';

      if (newDesc && newDesc !== currentDesc) {
        if (isFallback(currentDesc) && !isFallback(newDesc)) {
          // Upgrade from fallback to real description
          updatedFields.description = newDesc;
          needsUpdate = true;
        } else if (!isFallback(newDesc) && newDesc.length > currentDesc.length) {
          // Upgrade to longer, more descriptive text
          updatedFields.description = newDesc;
          needsUpdate = true;
        }
      }

      // 2. Upgrade tags/features if new features/keywords exist and have more items
      const existingKeywords = existing.keywords || [];
      const newKeywords = siteData.keywords || [];
      if (newKeywords.length > existingKeywords.length) {
        updatedFields.keywords = [...new Set([...existingKeywords, ...newKeywords])];
        needsUpdate = true;
      }

      // 3. Upgrade title if the new title is richer or cleaner than the old one
      const currentTitle = (existing.title || '').trim();
      const newTitle = (siteData.title || '').trim();
      if (newTitle && newTitle.length > currentTitle.length && !currentTitle.toLowerCase().includes(newTitle.toLowerCase())) {
        updatedFields.title = newTitle;
        needsUpdate = true;
      }

      // 4. Upgrade classification category from non-AI to AI
      const wasAI = existing.classification && existing.classification.isAI;
      const nowAI = siteData.classification && siteData.classification.isAI;
      if (!wasAI && nowAI) {
        updatedFields.classification = siteData.classification;
        needsUpdate = true;
      }

      if (needsUpdate) {
        sites[existingIndex] = {
          ...existing,
          ...updatedFields,
          synced: false, // Mark as unsynced so it triggers a backup update!
          updatedAt: new Date().toISOString()
        };
        chrome.storage.local.set({ sites }, () => {
          // Auto-sync if enabled so the Google Drive database file is updated instantly
          if (result.autoSyncSetting !== false) {
            syncToDrive(() => {});
          }
        });
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
  if (sites.length === 0) return true;

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
      const cleanDesc = (site.description || '').replace(/\n/g, ' ').trim() || 'No description available.';
      const descPoints = formatDescriptionAsPoints(cleanDesc);
      const savedDate = new Date(site.savedAt || site.timestamp).toLocaleString();

      const titlePrefix = `${i + 1}. `;
      const titleLine = `${titlePrefix}${site.title}\n`;
      
      const urlLine = `   URL         : ${site.url}\n`;
      const typeLine = `   Type        : ${category}\n`;
      const descLine = `   Description :\n${descPoints}\n`;
      let featuresLine = "";
      if (features.length > 0) {
        featuresLine = `   Features    : ${features.join(', ')}\n`;
      }
      const savedLine = `   Saved       : ${savedDate}\n\n`;

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

      // Apply Saved Line Italic style (the entire line including value)
      styleRequests.push({
        updateTextStyle: {
          textStyle: { italic: true },
          fields: 'italic',
          range: {
            startIndex: insertIndex + savedStart,
            endIndex: insertIndex + savedEnd - 2 // exclude trailing double newline
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
    const cleanDesc = (site.description || '').replace(/\n/g, ' ').trim() || 'No description available.';
    const descPoints = formatDescriptionAsPoints(cleanDesc);
    const savedDate = new Date(site.savedAt || site.timestamp).toLocaleString();

    // Line 1: Title line
    const titlePrefix = `${i + 1}. `;
    const titleLine = `${titlePrefix}${site.title}\n`;
    
    const urlLine = `   URL         : ${site.url}\n`;
    const typeLine = `   Type        : ${category}\n`;
    const descLine = `   Description :\n${descPoints}\n`;
    let featuresLine = "";
    if (features.length > 0) {
      featuresLine = `   Features    : ${features.join(', ')}\n`;
    }
    const savedLine = `   Saved       : ${savedDate}\n\n`;

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

    // Apply Saved Line Italic style (the entire line including value)
    requests.push({
      updateTextStyle: {
        textStyle: { italic: true },
        fields: 'italic',
        range: {
          startIndex: insertIndex + savedStart,
          endIndex: insertIndex + savedEnd - 2
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

