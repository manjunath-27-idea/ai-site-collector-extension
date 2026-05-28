/**
 * Content Script - Runs on every webpage
 * Extracts metadata and detects if the page is an AI or useful website
 */

// AI and useful website keywords and patterns
const AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'deep learning',
  'neural', 'gpt', 'llm', 'language model', 'chatbot', 'generative',
  'transformer', 'nlp', 'computer vision', 'algorithm', 'model',
  'openai', 'anthropic', 'google ai', 'meta ai', 'mistral'
];

const USEFUL_KEYWORDS = [
  'tool', 'productivity', 'automation', 'framework', 'library',
  'development', 'design', 'analytics', 'dashboard', 'api',
  'documentation', 'tutorial', 'guide', 'resource', 'platform',
  'saas', 'service', 'software', 'application', 'solution'
];

const AI_DOMAINS = [
  'openai.com', 'anthropic.com', 'huggingface.co', 'midjourney.com',
  'replicate.com', 'runway.com', 'perplexity.ai', 'claude.ai',
  'chatgpt.com', 'gemini.google.com', 'cohere.com', 'stability.ai'
];

/**
 * Extract page metadata
 */
function extractPageMetadata() {
  const metadata = {
    title: document.title || '',
    url: window.location.href,
    description: '',
    favicon: '',
    keywords: []
  };

  // Extract description from meta tags
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metadata.description = metaDescription.getAttribute('content');
  }

  // Fallback: Extract from og:description
  if (!metadata.description) {
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      metadata.description = ogDescription.getAttribute('content');
    }
  }

  // Fallback: Extract first paragraph
  if (!metadata.description) {
    const firstParagraph = document.querySelector('p');
    if (firstParagraph) {
      metadata.description = firstParagraph.textContent.substring(0, 160);
    }
  }

  // Extract favicon
  const favicon = document.querySelector('link[rel="icon"]') || 
                  document.querySelector('link[rel="shortcut icon"]');
  if (favicon) {
    metadata.favicon = favicon.getAttribute('href');
  }

  // Extract keywords
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  if (keywordsMeta) {
    metadata.keywords = keywordsMeta.getAttribute('content').split(',').map(k => k.trim());
  }

  return metadata;
}

/**
 * Safely parse URL domains and check if a page matches the authentication gateway blacklist
 * SECURITY AUDIT: Wraps parsing in try-catch blocks to prevent script execution exceptions on malformed metadata.
 */
function isAuthenticationOrSystemPage(metadata, remoteAuthList) {
  const url = metadata.url.toLowerCase();
  const title = metadata.title.toLowerCase();
  const description = (metadata.description || '').toLowerCase();
  
  // 1. Static and Remote Authentication Path/Query Exclusions
  const authPathKeywords = [
    '/login', '/signin', '/signup', '/register', '/auth', 
    '/oauth', '/authorize', '/logout', '/signout', '/password',
    '/reset', '/mfa', '/2fa', 'signin', 'signup', 'login'
  ];

  try {
    const urlObj = new URL(metadata.url);
    const pathAndQuery = urlObj.pathname + urlObj.search;
    
    // Check path for login keywords
    if (authPathKeywords.some(kw => pathAndQuery.includes(kw))) {
      return true;
    }
    
    // Check subdomain (e.g. auth.domain.com, accounts.domain.com)
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('auth.') || hostname.startsWith('login.') || hostname.startsWith('accounts.')) {
      return true;
    }
    
    // Check against synced remote gateways
    if (remoteAuthList && Array.isArray(remoteAuthList)) {
      if (remoteAuthList.some(gate => hostname.includes(gate.toLowerCase()) || pathAndQuery.includes(gate.toLowerCase()))) {
        return true;
      }
    }
  } catch (e) {
    // Fallback if URL object parsing fails
    if (authPathKeywords.some(kw => url.includes(kw))) return true;
  }

  // 2. Title and Description checks
  const authTitleKeywords = [
    'log in', 'sign in', 'sign up', 'create account', 'register account',
    'forgot password', 'reset password', 'two-factor', '2fa', 'verification',
    'authentication required', 'sign into'
  ];
  if (authTitleKeywords.some(kw => title.includes(kw) || description.includes(kw))) {
    return true;
  }

  // 3. Dynamic DOM inspection for credentials fields
  if (document.querySelector('input[type="password"]') || document.querySelector('input[autocomplete*="password"]')) {
    return true;
  }

  return false;
}

/**
 * Truncate deep conversation paths or sub-pages to the root home site domain for AI platforms (Privacy Measure)
 */
function cleanToMainDomain(urlStr) {
  try {
    const urlObj = new URL(urlStr);
    return urlObj.origin + '/';
  } catch (e) {
    return urlStr;
  }
}

/**
 * Classify if website is AI or useful with strict priority rules
 */
function classifyWebsite(metadata, aiKeywordsList, usefulKeywordsList, remoteAiList, remoteUsefulList, remoteAuthList) {
  const domain = new URL(metadata.url).hostname.toLowerCase();
  const text = (metadata.title + ' ' + metadata.description + ' ' + metadata.url).toLowerCase();
  
  let classification = {
    isAI: false,
    isUseful: false,
    confidence: 0,
    reasons: []
  };

  // --- PRIORITIZED STRATEGY 1: Check if the site is an AI Platform ---
  const joinedAiDomains = [...AI_DOMAINS, ...(remoteAiList || [])];
  const domainMatch = joinedAiDomains.some(d => domain.includes(d.toLowerCase()));
  
  if (domainMatch) {
    classification.isAI = true;
    classification.confidence = 0.95;
    classification.reasons.push('Known AI platform domain');
  }

  // Check for AI keywords
  const aiMatches = aiKeywordsList.filter(keyword => text.includes(keyword.toLowerCase())).length;
  if (aiMatches >= 2 || (aiMatches >= 1 && classification.isAI)) {
    classification.isAI = true;
    classification.confidence = Math.min(0.95, Math.max(classification.confidence, 0.5 + (aiMatches * 0.1)));
    classification.reasons.push(`${aiMatches} AI keywords matched`);
  }

  // If the site is determined to be AI, stop here and prioritize it!
  if (classification.isAI) {
    return classification;
  }

  // --- OPTIONAL STRATEGY 2: If not AI, check if it's a Useful Site ---
  const joinedUsefulDomains = [...(remoteUsefulList || [])];
  const usefulDomainMatch = joinedUsefulDomains.some(d => domain.includes(d.toLowerCase()));

  if (usefulDomainMatch) {
    classification.isUseful = true;
    classification.confidence = 0.90;
    classification.reasons.push('Known useful developer domain');
  }

  // Check for useful keywords
  const usefulMatches = usefulKeywordsList.filter(keyword => text.includes(keyword.toLowerCase())).length;
  if (usefulMatches >= 2 || (usefulMatches >= 1 && classification.isUseful)) {
    classification.isUseful = true;
    classification.confidence = Math.min(0.90, Math.max(classification.confidence, 0.5 + (usefulMatches * 0.1)));
    classification.reasons.push(`${usefulMatches} useful keywords matched`);
  }

  return classification;
}

/**
 * Send page data to background script
 */
function sendPageData() {
  chrome.storage.local.get([
    'customAiKeywords', 
    'customUsefulKeywords', 
    'remoteAiDomains', 
    'remoteUsefulDomains', 
    'remoteAuthGateways'
  ], (result) => {
    const metadata = extractPageMetadata();
    
    // Strict Verification: Abort scanning entirely if the page is an authentication portal
    if (isAuthenticationOrSystemPage(metadata, result.remoteAuthGateways)) {
      console.log('[AI Site Collector] Aborting scan: Authentication portal or sign-in page detected.');
      return;
    }

    const activeAiKeywords = [...AI_KEYWORDS, ...(result.customAiKeywords || [])];
    const activeUsefulKeywords = [...USEFUL_KEYWORDS, ...(result.customUsefulKeywords || [])];

    const classification = classifyWebsite(
      metadata, 
      activeAiKeywords, 
      activeUsefulKeywords, 
      result.remoteAiDomains, 
      result.remoteUsefulDomains, 
      result.remoteAuthGateways
    );

    if (classification.isAI || classification.isUseful) {
      // SECURITY & PRIVACY MEASURE: If the page is categorized as AI,
      // clean the deep conversation paths to keep only the main homepage/domain origin.
      if (classification.isAI) {
        metadata.url = cleanToMainDomain(metadata.url);
        
        // Clean deep titles (like specific private prompts) to represent the main platform title nicely
        try {
          const urlObj = new URL(metadata.url);
          const domainName = urlObj.hostname.replace('www.', '');
          const cleanName = domainName.charAt(0).toUpperCase() + domainName.slice(1).split('.')[0];
          metadata.title = `${cleanName} - AI Service`;
        } catch(e) {}
      }

      chrome.runtime.sendMessage({
        action: 'saveSite',
        data: {
          ...metadata,
          classification,
          timestamp: new Date().toISOString()
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Extension not ready yet');
        }
      });
    }
  });
}

// Send data when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendPageData);
} else {
  sendPageData();
}

// Also send data after a short delay to ensure all content is loaded
setTimeout(sendPageData, 2000);
