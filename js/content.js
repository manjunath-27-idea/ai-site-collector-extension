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
 * Classify if website is AI or useful
 */
function classifyWebsite(metadata) {
  const text = (metadata.title + ' ' + metadata.description + ' ' + metadata.url).toLowerCase();
  const domain = new URL(metadata.url).hostname.toLowerCase();

  let classification = {
    isAI: false,
    isUseful: false,
    confidence: 0,
    reasons: []
  };

  // Check for AI domain
  if (AI_DOMAINS.some(d => domain.includes(d))) {
    classification.isAI = true;
    classification.confidence = 0.95;
    classification.reasons.push('Known AI platform');
  }

  // Check for AI keywords
  const aiMatches = AI_KEYWORDS.filter(keyword => text.includes(keyword)).length;
  if (aiMatches >= 2) {
    classification.isAI = true;
    classification.confidence = Math.min(0.9, 0.5 + (aiMatches * 0.1));
    classification.reasons.push(`${aiMatches} AI-related keywords found`);
  }

  // Check for useful keywords
  const usefulMatches = USEFUL_KEYWORDS.filter(keyword => text.includes(keyword)).length;
  if (usefulMatches >= 2) {
    classification.isUseful = true;
    classification.confidence = Math.min(0.9, 0.5 + (usefulMatches * 0.1));
    classification.reasons.push(`${usefulMatches} useful-related keywords found`);
  }

  return classification;
}

/**
 * Send page data to background script
 */
function sendPageData() {
  const metadata = extractPageMetadata();
  const classification = classifyWebsite(metadata);

  if (classification.isAI || classification.isUseful) {
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
}

// Send data when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendPageData);
} else {
  sendPageData();
}

// Also send data after a short delay to ensure all content is loaded
setTimeout(sendPageData, 2000);
