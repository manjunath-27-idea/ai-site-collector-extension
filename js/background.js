/**
 * Background Service Worker
 * Handles site detection, storage, and Google Drive API integration
 * Single document mode: All sites appended to one selected document
 */

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    sites: [],
    driveDocId: null,
    driveDocName: null,
    isAuthenticated: false,
    lastSync: null,
    autoSyncSetting: true,
    notificationsSetting: true,
    darkModeSetting: false
  });
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
      sendResponse({ 
        docId: result.driveDocId,
        docName: result.driveDocName
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
 * List files in Google Drive
 */
function listDriveFiles(token, sendResponse) {
  fetch('https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,modifiedTime)&q=trashed=false&orderBy=modifiedTime%20desc', {
    headers: { Authorization: 'Bearer ' + token }
  })
  .then(response => response.json())
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
 * Set the Google Drive document for storage (single document mode)
 */
function setDriveDocument(docId, docName, sendResponse) {
  chrome.storage.local.set({ 
    driveDocId: docId,
    driveDocName: docName
  });
  sendResponse({ 
    success: true, 
    message: `Document "${docName}" selected successfully` 
  });
}

/**
 * Sync collected sites to Google Drive (append to single document)
 */
function syncToDrive(sendResponse) {
  chrome.storage.local.get(['sites', 'authToken', 'driveDocId', 'driveDocName'], (result) => {
    if (!result.authToken) {
      sendResponse({ 
        success: false, 
        error: 'Not authenticated. Please authenticate first.' 
      });
      return;
    }

    if (!result.driveDocId) {
      sendResponse({ 
        success: false, 
        error: 'No document selected. Please select a document first.' 
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
    
    // Append sites to existing document
    appendToDocument(result.authToken, result.driveDocId, sites)
      .then(() => {
        chrome.storage.local.set({ 
          lastSync: new Date().toISOString()
        });
        sendResponse({ 
          success: true, 
          message: `${sites.length} sites appended to "${result.driveDocName}"`
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
  const descKeywords = ['free', 'open source', 'api', 'tool', 'platform', 'service', 'framework', 'library', 'automation', 'productivity'];
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
  let content = `\n\n${'='.repeat(80)}\n`;
  content += `COLLECTION UPDATE: ${timestamp}\n`;
  content += `Total Sites Added: ${sites.length}\n`;
  content += `${'='.repeat(80)}\n\n`;
  
  sites.forEach((site, index) => {
    const features = extractFeatures(site);
    const type = site.classification.isAI ? 'AI' : 'Useful';
    const confidence = Math.round(site.classification.confidence * 100);
    
    content += `${index + 1}. ${site.title}\n`;
    content += `   URL: ${site.url}\n`;
    content += `   Type: ${type}\n`;
    content += `   Confidence: ${confidence}%\n`;
    content += `   Description: ${site.description || 'N/A'}\n`;
    content += `   Features: ${features.join(', ') || 'N/A'}\n`;
    content += `   Saved: ${new Date(site.savedAt).toLocaleString()}\n`;
    content += `\n`;
  });
  
  return content;
}

/**
 * Append sites to existing Google Document
 */
async function appendToDocument(token, docId, sites) {
  try {
    // Get current document content
    const getResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?alt=media`, {
      headers: { Authorization: 'Bearer ' + token }
    });

    if (!getResponse.ok) {
      throw new Error(`Failed to read Drive document: ${getResponse.statusText}`);
    }

    let currentContent = await getResponse.text();
    
    // Generate new content to append
    const newContent = generateDocumentContent(sites);
    
    // Combine content (append new to existing)
    const combinedContent = currentContent + newContent;
    
    // Update document with combined content
    const updateResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${docId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token },
      body: combinedContent
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update Drive document: ${updateResponse.statusText}`);
    }

    return docId;
  } catch (error) {
    throw new Error(`Append failed: ${error.message}`);
  }
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
