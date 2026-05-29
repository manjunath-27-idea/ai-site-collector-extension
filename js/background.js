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
    // 1. One-time migration: strip any stale .txt suffix from driveDocName in storage
    chrome.storage.local.get(['autoSyncSetting', 'notificationsSetting', 'darkModeSetting', 'driveDocName'], (stored) => {
      const updates = {
        remoteAiDomains: ['openai.com', 'chatgpt.com', 'claude.ai', 'anthropic.com', 'huggingface.co', 'midjourney.com', 'replicate.com', 'perplexity.ai', 'gemini.google.com', 'cohere.com', 'stability.ai', 'deepseek.com', 'sora.com'],
        remoteUsefulDomains: ['github.com', 'stackoverflow.com', 'npmjs.com', 'figma.com', 'canva.com', 'notion.so', 'trello.com', 'react.dev', 'mdn.mozilla.org', 'w3schools.com', 'stackblitz.com', 'codepen.io'],
        remoteAuthGateways: ['accounts.google.com', 'login.microsoftonline.com', 'okta.com', 'auth0.com', 'clerk.com', 'cognito', 'keycloak'],
        // Preserve user preferences — never reset on update
        autoSyncSetting:      stored.autoSyncSetting      !== undefined ? stored.autoSyncSetting      : true,
        notificationsSetting: stored.notificationsSetting !== undefined ? stored.notificationsSetting : true,
        darkModeSetting:      stored.darkModeSetting       !== undefined ? stored.darkModeSetting       : false,
      };

      // ── Migration: clean stale .txt from driveDocName ──
      if (stored.driveDocName && /\.txt$/i.test(stored.driveDocName)) {
        updates.driveDocName = stored.driveDocName.replace(/\.txt$/i, '').trim();
        console.log('[Migration] Cleaned stale driveDocName:', stored.driveDocName, '→', updates.driveDocName);
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
      // Always return the clean doc name — no .txt extension ever
      const docName = (result.driveDocName || 'AI_Site_Collector_Database').replace(/\.txt$/i, '').trim();
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
        savedAt: new Date().toISOString()
      });
      
      chrome.storage.local.set({ sites }, () => {
        // Show notification if enabled
        if (result.notificationsSetting !== false) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128.png',
            title: 'Site Saved!',
            message: `"${siteData.title}" has been saved.`
          });
        }
        
        // Auto-sync if enabled
        if (result.autoSyncSetting !== false) {
          syncToDrive(() => {});
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
  const REQUIRED_FILENAME = 'AI_Site_Collector_Database';
  // Query Drive for ONLY Google Docs matching our document name — no .txt files ever
  const q = encodeURIComponent(
    `name='${REQUIRED_FILENAME}' and mimeType='application/vnd.google-apps.document' and trashed=false`
  );
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
  
  // Always store the clean name — no file extension, Google Docs have no extension
  const cleanName = (docName || REQUIRED_FILENAME).replace(/\.txt$/i, '').trim() || REQUIRED_FILENAME;

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

    const sites = result.sites || [];
    if (sites.length === 0) {
      sendResponse({ 
        success: false, 
        error: 'No sites to sync.' 
      });
      return;
    }

    try {
      const REQUIRED_FILENAME = 'AI_Site_Collector_Database';
      let docId = result.driveDocId;
      // docName is always stored without extension — it's a Google Doc, not a file
      const docName = (result.driveDocName || REQUIRED_FILENAME).replace(/\.txt$/i, '').trim() || REQUIRED_FILENAME;
      
      // Persist clean name back to storage (migration safety for old .txt values)
      chrome.storage.local.set({ driveDocName: docName });
      
      // If no document ID is stored, auto-discover or create a Google Doc
      if (!docId) {
        console.log('[Drive Sync] No Google Doc linked. Auto-discovering or creating one...');
        docId = await getOrCreateDefaultDoc(result.authToken);
      }
      
      // Append sites to the document
      const newSitesSyncedCount = await appendToDocument(result.authToken, docId, sites);
      
      chrome.storage.local.set({ 
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
                    chrome.storage.local.set({ lastSync: new Date().toISOString() });
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
 * Automatically find or create the default Google Doc in Drive
 * Only works with Google Docs format (application/vnd.google-apps.document)
 */
async function getOrCreateDefaultDoc(token) {
  const DOC_NAME = 'AI_Site_Collector_Database';
  const GDOC_MIME = 'application/vnd.google-apps.document';
  
  // 1. Search Drive strictly for a Google Doc (not .txt, not any other format)
  const q = encodeURIComponent(`name='${DOC_NAME}' and mimeType='${GDOC_MIME}' and trashed=false`);
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)`,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  
  if (!searchResponse.ok) {
    if (searchResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
    throw new Error(`Failed to search Drive: ${searchResponse.statusText}`);
  }
  
  const searchData = await searchResponse.json();
  const files = (searchData.files || []).filter(f => f.mimeType === GDOC_MIME);
  
  if (files.length > 0) {
    // Found existing Google Doc — reuse it
    const existingDoc = files[0];
    await new Promise((resolve) => {
      chrome.storage.local.set({ driveDocId: existingDoc.id, driveDocName: DOC_NAME }, resolve);
    });
    console.log(`[Drive Sync] Found existing Google Doc: "${DOC_NAME}" (id: ${existingDoc.id})`);
    return existingDoc.id;
  }
  
  // 2. No Google Doc found — create a new one
  console.log(`[Drive Sync] Creating new Google Doc: "${DOC_NAME}"`);
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: DOC_NAME,
      mimeType: GDOC_MIME   // ← Strictly Google Doc format, never .txt
    })
  });
  
  if (!createResponse.ok) {
    if (createResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
    throw new Error(`Failed to create Google Doc: ${createResponse.statusText}`);
  }
  
  const newFile = await createResponse.json();
  const docId = newFile.id;
  
  // 3. Write the initial header into the new Google Doc using the Docs API
  const initialContent = 'AI Site Collector — Sync Database\n\nThis document is auto-managed by the AI Site Collector extension.\n\n';
  const initResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ insertText: { text: initialContent, endOfSegmentLocation: {} } }]
    })
  });
  
  if (!initResponse.ok) {
    if (initResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
    throw new Error(`Failed to write header to Google Doc: ${initResponse.statusText}`);
  }
  
  await new Promise((resolve) => {
    chrome.storage.local.set({ driveDocId: docId, driveDocName: DOC_NAME }, resolve);
  });
  
  console.log(`[Drive Sync] Created new Google Doc: "${DOC_NAME}" (id: ${docId})`);
  return docId;
}

/**
 * Extract features/tags from site
 */
function extractFeatures(site) {
  const features = [];
  
  // Extract from classification reasons
  if (site.classification.reasons && Array.isArray(site.classification.reasons)) {
    features.push(...site.classification.reasons);
  }
  
  // Extract from keywords
  if (site.keywords && Array.isArray(site.keywords) && site.keywords.length > 0) {
    features.push(...site.keywords.slice(0, 3));
  }
  
  // Extract from description
  const descKeywords = [
    'free', 'open source', 'api', 'tool', 'platform', 'service', 'framework', 
    'library', 'automation', 'productivity', 'agent', 'chatbot', 'chat', 'model', 
    'image', 'video', 'voice', 'audio', 'design', 'code', 'developer', 'search',
    'analytics', 'marketing', 'creative', 'llm', 'writing', 'translation', 'database',
    'security', 'privacy', 'cloud', 'hosting', 'deployment', 'collaboration'
  ];
  if (site.description) {
    descKeywords.forEach(keyword => {
      if (site.description.toLowerCase().includes(keyword) && !features.includes(keyword)) {
        features.push(keyword);
      }
    });
  }
  
  // Remove duplicates and limit to 5
  return [...new Set(features)].slice(0, 5);
}

/**
 * Generate formatted document content for appending
 */
function generateDocumentContent(sites) {
  const timestamp = new Date().toLocaleString();
  const line80 = '='.repeat(80);
  let content = `\n\n${line80}\n`;
  content += `SYNC UPDATE — ${timestamp}\n`;
  content += `Sites in this batch: ${sites.length}\n`;
  content += `${line80}\n\n`;

  sites.forEach((site, index) => {
    const category = site.classification.isAI ? 'AI Platform' : 'Useful Tool';
    const confidence = Math.round((site.classification.confidence || 0) * 100);
    const savedDate = new Date(site.savedAt || site.timestamp).toLocaleString();
    // Use the clean description from the knowledge base if available
    const description = (site.description || '').replace(/\n/g, ' ').trim() || 'No description available.';

    content += `${index + 1}. ${site.title}\n`;
    content += `   URL         : ${site.url}\n`;
    content += `   Category    : ${category}\n`;
    content += `   Description : ${description}\n`;
    content += `   Confidence  : ${confidence}%\n`;
    content += `   Saved       : ${savedDate}\n`;
    content += `\n`;
  });

  return content;
}

/**
 * Append new sites to an existing Google Doc (Google Docs format only)
 * Reads existing content via Docs API export, deduplicates by URL, then appends.
 */
async function appendToDocument(token, docId, sites) {
  const GDOC_MIME = 'application/vnd.google-apps.document';
  let isDocValid = false;

  // Verify that the stored docId is a valid, non-trashed Google Doc
  if (docId) {
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
    const newDocId = await getOrCreateDefaultDoc(token);
    docId = newDocId;
  }

  // ── Step 1: Read current Google Doc content to deduplicate ──
  // Use Drive export to get plain-text content for URL deduplication check
  let exportResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain`,
    { headers: { Authorization: 'Bearer ' + token } }
  );

  if (!exportResponse.ok) {
    if (exportResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
    throw new Error(`Failed to read Google Doc: ${exportResponse.statusText}`);
  }

  const currentContent = await exportResponse.text();

  // ── Step 2: Filter to only brand-new sites not already in the document ──
  const newSites = sites.filter(site => !currentContent.includes(site.url));
  if (newSites.length === 0) {
    return 0; // All sites already synced — nothing to add
  }

  // ── Step 3: Build the text block to insert ──
  const timestamp = new Date().toLocaleString();
  let textToInsert = `\n\n${'='.repeat(60)}\nSYNC UPDATE — ${timestamp} | ${newSites.length} new site(s)\n${'='.repeat(60)}\n\n`;

  newSites.forEach((site, i) => {
    const features = extractFeatures(site);
    const category = site.classification.isAI ? 'AI Platform' : 'Useful Tool';
    const cleanDesc = (site.description || '').replace(/\n/g, ' ').trim() || 'No description available.';
    const savedDate = new Date(site.savedAt || site.timestamp).toLocaleString();

    textToInsert += `${i + 1}. ${site.title}\n`;
    textToInsert += `   URL         : ${site.url}\n`;
    textToInsert += `   Type        : ${category}\n`;
    textToInsert += `   Description : ${cleanDesc}\n`;
    if (features.length > 0) {
      textToInsert += `   Features    : ${features.join(', ')}\n`;
    }
    textToInsert += `   Saved       : ${savedDate}\n\n`;
  });

  textToInsert += `${'─'.repeat(60)}\n`;

  // ── Step 4: Append to the Google Doc using the Docs API batchUpdate ──
  const updateResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          insertText: {
            text: textToInsert,
            endOfSegmentLocation: {}   // always appends at the end of the document
          }
        }]
      })
    }
  );

  if (!updateResponse.ok) {
    if (updateResponse.status === 401) throw new Error('UNAUTHORIZED_TOKEN');
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
      site.classification.isAI ? 'AI' : 'Useful',
      `${(site.classification.confidence * 100).toFixed(0)}%`,
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

