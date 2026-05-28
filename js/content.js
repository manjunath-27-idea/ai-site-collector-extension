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
  'chatgpt.com', 'gemini.google.com', 'cohere.com', 'stability.ai',
  'deepseek.com', 'sora.com', 'copilot.microsoft.com', 'bard.google.com'
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
  // NOTE: Only match full path segments - avoid short fragments that could be part of real URLs
  const authPathSegments = [
    '/login', '/signin', '/signup', '/register',
    '/oauth', '/authorize', '/logout', '/signout',
    '/reset-password', '/forgot-password', '/mfa', '/2fa',
    '/sign-in', '/sign-up', '/log-in', '/log-out', '/session/new', '/join'
  ];

  try {
    const urlObj = new URL(metadata.url);
    const pathLower = urlObj.pathname.toLowerCase();
    const queryLower = urlObj.search.toLowerCase();
    
    // Check path for login segments (match as exact path segments or at start)
    if (authPathSegments.some(seg => pathLower === seg || pathLower.startsWith(seg + '/') || pathLower.startsWith(seg + '?'))) {
      return true;
    }
    
    // Check query string for auth-related keys (only in query, not path)
    if (queryLower.includes('action=login') || queryLower.includes('mode=signin') || queryLower.includes('redirect_to=/login')) {
      return true;
    }
    
    // Check subdomain (e.g. auth.domain.com, accounts.domain.com, login.domain.com)
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('auth.') || hostname.startsWith('login.') || hostname.startsWith('accounts.')) {
      return true;
    }
    
    // Check against synced remote gateways (exact domain/path match)
    if (remoteAuthList && Array.isArray(remoteAuthList)) {
      if (remoteAuthList.some(gate => {
        const g = gate.toLowerCase();
        // Only match if the full gate string appears as a hostname or path segment
        return hostname === g || hostname.endsWith('.' + g) || pathLower.startsWith('/' + g);
      })) {
        return true;
      }
    }
  } catch (e) {
    // Fallback if URL object parsing fails
    if (authPathSegments.some(seg => url.includes(seg))) return true;
  }

  // 2. Title-only checks (strict — require multiple signals to avoid false positives)
  const authTitleKeywords = [
    'log in to', 'sign in to', 'sign up for', 'create your account',
    'forgot password', 'reset your password', 'two-factor authentication',
    'verification required', 'authentication required', 'enter your password'
  ];
  if (authTitleKeywords.some(kw => title.includes(kw))) {
    return true;
  }

  // 3. Dynamic DOM inspection — only block if there is an actual password field visible
  const pwField = document.querySelector('input[type="password"]');
  if (pwField && !pwField.closest('[hidden]') && !pwField.closest('[style*="display:none"]') && !pwField.closest('[style*="display: none"]')) {
    return true;
  }

  // 4. AI domain specific: if the page title explicitly says log in / sign in AND is on a known AI domain
  const domain = new URL(metadata.url).hostname.toLowerCase();
  const isKnownAiDomain = AI_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
  if (isKnownAiDomain && (title === 'log in' || title === 'sign in' || title === 'sign up' || title.startsWith('log in |') || title.startsWith('sign in |'))) {
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
 * Extract the beautiful capitalized main name of the AI platform (e.g. chatgpt.com -> ChatGPT)
 */
function getMainSiteName(urlStr) {
  try {
    const urlObj = new URL(urlStr);
    let hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    
    if (hostname.includes('gemini.google.com') || hostname.includes('gemini')) {
      return 'Gemini';
    }
    if (hostname.includes('chatgpt')) {
      return 'ChatGPT';
    }
    if (hostname.includes('claude')) {
      return 'Claude';
    }
    if (hostname.includes('perplexity')) {
      return 'Perplexity';
    }
    if (hostname.includes('copilot')) {
      return 'Copilot';
    }
    if (hostname.includes('huggingface')) {
      return 'HuggingFace';
    }
    if (hostname.includes('midjourney')) {
      return 'Midjourney';
    }
    
    // Fallback: take the first part of domain and capitalize it
    const base = hostname.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch (e) {
    return 'AI Platform';
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
  const isAiTld = domain.endsWith('.ai') || 
                  domain.includes('.ai.') || 
                  domain.split('.').includes('ai');
  
  if (domainMatch || isAiTld) {
    classification.isAI = true;
    classification.confidence = 0.95;
    classification.reasons.push(domainMatch ? 'Known AI platform domain' : 'AI top-level domain (.ai)');
  }

  // User Heuristic Check: Check "AI" (whole-word) or "Artificial Intelligence" first
  const hasPrimaryAiKeywords = (/\bai\b/i.test(text)) || 
                               text.includes('artificial intelligence') || 
                               text.includes('artificial intellegence');

  if (hasPrimaryAiKeywords) {
    classification.isAI = true;
    classification.confidence = Math.max(classification.confidence, 0.90);
    classification.reasons.push('Direct AI platform signature matched');
  } else {
    // If primary term is not found, fall back to checking other specific AI keywords
    const otherAiKeywords = aiKeywordsList.filter(kw => 
      kw.toLowerCase() !== 'ai' && 
      kw.toLowerCase() !== 'artificial intelligence'
    );
    const aiMatches = otherAiKeywords.filter(keyword => text.includes(keyword.toLowerCase())).length;
    
    if (aiMatches >= 2 || (aiMatches >= 1 && classification.isAI)) {
      classification.isAI = true;
      classification.confidence = Math.min(0.95, Math.max(classification.confidence, 0.5 + (aiMatches * 0.1)));
      classification.reasons.push(`${aiMatches} specific AI keywords matched`);
    }
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
        metadata.title = getMainSiteName(metadata.url);
        metadata.description = `AI Platform homepage or base service portal.`;
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

// Send data when page loads - only once, after DOM is ready
// Use a single-execution guard to prevent duplicate saves on same page load
let _pageDataSent = false;
function sendPageDataOnce() {
  if (_pageDataSent) return;
  _pageDataSent = true;
  sendPageData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendPageDataOnce);
} else {
  sendPageDataOnce();
}
