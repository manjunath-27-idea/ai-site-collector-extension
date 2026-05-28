/**
 * Content Script - Runs on every webpage
 * Extracts metadata and classifies pages using a static knowledge base + weighted keyword scoring
 */

// ============================================================
//  STATIC AI KNOWLEDGE BASE
//  Each entry: { domains[], name, category, description, tags[] }
//  'domains' are matched against the page hostname (exact or subdomain)
//  category: 'ai' | 'useful'
// ============================================================
const AI_KNOWLEDGE_BASE = [
  // ── Conversational AI / LLMs ──
  { domains: ['chat.openai.com','chatgpt.com'], name: 'ChatGPT', category: 'ai',
    description: "OpenAI's flagship conversational AI. Supports GPT-4o for text, images, and code.",
    tags: ['chatbot','gpt','openai','llm'] },

  { domains: ['claude.ai'], name: 'Claude', category: 'ai',
    description: "Anthropic's constitutional AI assistant — focused on safety and helpfulness.",
    tags: ['chatbot','anthropic','llm','safety'] },

  { domains: ['gemini.google.com','bard.google.com'], name: 'Gemini', category: 'ai',
    description: "Google DeepMind's multimodal AI — integrates with Google Workspace and Search.",
    tags: ['google','multimodal','llm','chatbot'] },

  { domains: ['copilot.microsoft.com','copilot.microsoft.com'], name: 'Microsoft Copilot', category: 'ai',
    description: "Microsoft's AI assistant powered by GPT-4 and integrated across Office 365.",
    tags: ['microsoft','copilot','gpt','llm'] },

  { domains: ['perplexity.ai'], name: 'Perplexity AI', category: 'ai',
    description: "AI-powered search engine that gives cited, conversational answers in real time.",
    tags: ['search','llm','citations','research'] },

  { domains: ['deepseek.com'], name: 'DeepSeek', category: 'ai',
    description: "High-performance open-source LLM by DeepSeek — strong on coding and reasoning.",
    tags: ['llm','open-source','coding','reasoning'] },

  { domains: ['mistral.ai'], name: 'Mistral AI', category: 'ai',
    description: "European open-weight LLM lab offering frontier models like Mistral and Mixtral.",
    tags: ['llm','open-source','european'] },

  { domains: ['groq.com'], name: 'Groq', category: 'ai',
    description: "Ultra-fast LLM inference platform using custom LPU hardware.",
    tags: ['inference','llm','fast','hardware'] },

  { domains: ['together.ai'], name: 'Together AI', category: 'ai',
    description: "Cloud platform for running open-source AI models at scale.",
    tags: ['inference','open-source','cloud','llm'] },

  { domains: ['poe.com'], name: 'Poe', category: 'ai',
    description: "Quora's multi-model AI chat — access GPT-4, Claude, Llama in one place.",
    tags: ['chatbot','multi-model','quora'] },

  { domains: ['you.com'], name: 'You.com', category: 'ai',
    description: "AI search engine with built-in coding assistant and creative tools.",
    tags: ['search','ai','coding','creative'] },

  { domains: ['pi.ai'], name: 'Pi AI', category: 'ai',
    description: "Inflection AI's personal intelligence assistant — designed for emotional support.",
    tags: ['chatbot','personal','inflection'] },

  // ── Image & Creative AI ──
  { domains: ['midjourney.com'], name: 'Midjourney', category: 'ai',
    description: "Leading AI image generator accessed via Discord — produces stunning art.",
    tags: ['image','art','generative','creative'] },

  { domains: ['dall-e.openai.com','labs.openai.com'], name: 'DALL·E', category: 'ai',
    description: "OpenAI's text-to-image model — generates realistic images from text prompts.",
    tags: ['image','text-to-image','openai','generative'] },

  { domains: ['stability.ai','dreamstudio.ai'], name: 'Stable Diffusion', category: 'ai',
    description: "Stability AI's open-source image generation model and DreamStudio platform.",
    tags: ['image','open-source','generative','stable-diffusion'] },

  { domains: ['runway.com'], name: 'Runway ML', category: 'ai',
    description: "AI-powered video generation and editing platform. Known for Gen-2 video model.",
    tags: ['video','image','generative','creative'] },

  { domains: ['sora.com','openai.com/sora'], name: 'Sora', category: 'ai',
    description: "OpenAI's text-to-video model — generates high-quality videos from text.",
    tags: ['video','text-to-video','openai','generative'] },

  { domains: ['adobe.com/sensei'], name: 'Adobe Firefly', category: 'ai',
    description: "Adobe's generative AI — integrated into Photoshop, Illustrator, and Express.",
    tags: ['image','generative','adobe','creative'] },

  { domains: ['ideogram.ai'], name: 'Ideogram', category: 'ai',
    description: "AI image generator with exceptional text rendering within images.",
    tags: ['image','generative','text-in-image'] },

  { domains: ['playground.ai'], name: 'Playground AI', category: 'ai',
    description: "Free AI image creator powered by Stable Diffusion with a clean UI.",
    tags: ['image','generative','free','stable-diffusion'] },

  { domains: ['leonardo.ai'], name: 'Leonardo AI', category: 'ai',
    description: "AI image and asset generator — popular for game art and concept design.",
    tags: ['image','game','generative','design'] },

  { domains: ['canva.com'], name: 'Canva', category: 'useful',
    description: "Graphic design platform with AI-powered tools for templates, images, and video.",
    tags: ['design','templates','ai','creative'] },

  // ── Code AI ──
  { domains: ['github.com/features/copilot','copilot.github.com'], name: 'GitHub Copilot', category: 'ai',
    description: "AI pair programmer by GitHub/OpenAI — autocompletes code in your IDE.",
    tags: ['coding','copilot','github','llm'] },

  { domains: ['cursor.sh','cursor.com'], name: 'Cursor', category: 'ai',
    description: "AI-first code editor built on VSCode — uses GPT-4 for inline code generation.",
    tags: ['coding','editor','gpt','ide'] },

  { domains: ['replit.com'], name: 'Replit', category: 'ai',
    description: "Cloud IDE with AI coding assistant — build, run, and deploy apps in browser.",
    tags: ['coding','cloud-ide','ai','deploy'] },

  { domains: ['codeium.com'], name: 'Codeium', category: 'ai',
    description: "Free AI code completion tool — supports 70+ languages and major IDEs.",
    tags: ['coding','autocomplete','free','ide'] },

  { domains: ['tabnine.com'], name: 'Tabnine', category: 'ai',
    description: "AI code assistant that learns from your codebase — privacy-first approach.",
    tags: ['coding','autocomplete','privacy','ide'] },

  { domains: ['v0.dev'], name: 'v0 by Vercel', category: 'ai',
    description: "Vercel's AI that generates React UI components from text prompts.",
    tags: ['coding','ui','react','vercel'] },

  { domains: ['bolt.new'], name: 'Bolt.new', category: 'ai',
    description: "AI full-stack web app builder — generates and deploys complete apps instantly.",
    tags: ['coding','full-stack','deploy','builder'] },

  // ── AI Research / ML Platforms ──
  { domains: ['huggingface.co'], name: 'HuggingFace', category: 'ai',
    description: "The AI community hub — hosts 300,000+ models, datasets, and Spaces demos.",
    tags: ['models','open-source','research','community'] },

  { domains: ['replicate.com'], name: 'Replicate', category: 'ai',
    description: "Run ML models in the cloud via a simple API — no GPU setup required.",
    tags: ['models','api','cloud','ml'] },

  { domains: ['cohere.com'], name: 'Cohere', category: 'ai',
    description: "Enterprise NLP platform — powerful embedding and generation APIs for business.",
    tags: ['nlp','api','enterprise','embedding'] },

  { domains: ['anthropic.com'], name: 'Anthropic', category: 'ai',
    description: "AI safety company building Claude — focuses on interpretable and safe AI.",
    tags: ['research','safety','llm','anthropic'] },

  { domains: ['openai.com'], name: 'OpenAI', category: 'ai',
    description: "Creator of GPT, DALL·E, and Whisper — leading AI research organization.",
    tags: ['research','gpt','openai','api'] },

  { domains: ['google.com/deepmind','deepmind.google'], name: 'Google DeepMind', category: 'ai',
    description: "Google's AI research lab — created Gemini, AlphaFold, and AlphaCode.",
    tags: ['research','google','deepmind','science'] },

  { domains: ['ai.meta.com'], name: 'Meta AI', category: 'ai',
    description: "Meta's AI division — open-sources Llama models and builds AI into social apps.",
    tags: ['research','llama','open-source','meta'] },

  { domains: ['elevenlabs.io'], name: 'ElevenLabs', category: 'ai',
    description: "Hyper-realistic AI voice generation — clone voices, create audiobooks and dubs.",
    tags: ['voice','audio','tts','generative'] },

  { domains: ['suno.ai'], name: 'Suno', category: 'ai',
    description: "AI music generator — create full songs with vocals from a text prompt.",
    tags: ['music','audio','generative','creative'] },

  { domains: ['udio.com'], name: 'Udio', category: 'ai',
    description: "AI music creation platform for generating professional-quality songs.",
    tags: ['music','audio','generative'] },

  { domains: ['luma.ai'], name: 'Luma AI', category: 'ai',
    description: "AI video and 3D generation — create photorealistic 3D scenes from photos.",
    tags: ['video','3d','generative','creative'] },

  { domains: ['krea.ai'], name: 'Krea AI', category: 'ai',
    description: "Real-time AI image and video generation with live canvas editing.",
    tags: ['image','video','realtime','generative'] },

  { domains: ['kling.ai'], name: 'Kling AI', category: 'ai',
    description: "Kuaishou's video generation AI — creates high-quality videos from text or image.",
    tags: ['video','generative','text-to-video'] },

  { domains: ['synthesia.io'], name: 'Synthesia', category: 'ai',
    description: "AI video platform that creates professional videos with AI avatars.",
    tags: ['video','avatar','business','generative'] },

  { domains: ['descript.com'], name: 'Descript', category: 'ai',
    description: "AI-powered video and podcast editor — edit media like a document.",
    tags: ['video','audio','editing','ai'] },

  { domains: ['gamma.app'], name: 'Gamma', category: 'ai',
    description: "AI presentation and document creator — generates slides from text prompts.",
    tags: ['presentation','documents','generative','productivity'] },

  { domains: ['beautiful.ai'], name: 'Beautiful.ai', category: 'ai',
    description: "AI-powered presentation software that auto-designs slides as you type.",
    tags: ['presentation','design','ai','productivity'] },

  { domains: ['notion.so'], name: 'Notion', category: 'useful',
    description: "All-in-one workspace for notes, wikis, databases, and project management with AI.",
    tags: ['productivity','notes','ai','workspace'] },

  { domains: ['linear.app'], name: 'Linear', category: 'useful',
    description: "Modern project management tool for software teams — fast and opinionated.",
    tags: ['productivity','project-management','development'] },

  // ── Search / Research AI ──
  { domains: ['phind.com'], name: 'Phind', category: 'ai',
    description: "AI search engine optimized for developers — gives detailed code-aware answers.",
    tags: ['search','coding','developer','llm'] },

  { domains: ['kagi.com'], name: 'Kagi', category: 'ai',
    description: "Premium ad-free search engine with built-in AI summarization and assistant.",
    tags: ['search','ai','privacy','premium'] },

  { domains: ['consensus.app'], name: 'Consensus', category: 'ai',
    description: "AI research tool that surfaces evidence from 200M scientific papers.",
    tags: ['research','science','search','academic'] },

  { domains: ['elicit.org'], name: 'Elicit', category: 'ai',
    description: "AI research assistant that automates literature review and data extraction.",
    tags: ['research','academic','literature','ai'] },

  // ── Developer / Useful Tools ──
  { domains: ['github.com'], name: 'GitHub', category: 'useful',
    description: "The world's largest code hosting platform — version control, CI/CD, and collaboration.",
    tags: ['code','git','open-source','collaboration'] },

  { domains: ['stackoverflow.com'], name: 'Stack Overflow', category: 'useful',
    description: "The premier Q&A platform for developers — answers to nearly every coding question.",
    tags: ['qa','community','coding','developer'] },

  { domains: ['vercel.com'], name: 'Vercel', category: 'useful',
    description: "Cloud platform for frontend deployment — instant deploys from Git with Edge Network.",
    tags: ['deploy','hosting','frontend','developer'] },

  { domains: ['netlify.com'], name: 'Netlify', category: 'useful',
    description: "Jamstack hosting platform with CI/CD, serverless functions, and form handling.",
    tags: ['deploy','hosting','jamstack','developer'] },

  { domains: ['figma.com'], name: 'Figma', category: 'useful',
    description: "Collaborative UI/UX design tool — the industry standard for interface design.",
    tags: ['design','ui','ux','collaboration'] },

  { domains: ['npmjs.com'], name: 'npm', category: 'useful',
    description: "The Node.js package registry — home to 2M+ open-source JavaScript packages.",
    tags: ['packages','javascript','node','open-source'] },

  { domains: ['developer.mozilla.org','mdn.mozilla.org'], name: 'MDN Web Docs', category: 'useful',
    description: "The authoritative reference for HTML, CSS, and JavaScript — by Mozilla.",
    tags: ['documentation','web','html','css','javascript'] },

  { domains: ['stackblitz.com'], name: 'StackBlitz', category: 'useful',
    description: "Online IDE that runs Node.js projects in your browser — no install needed.",
    tags: ['ide','online','javascript','developer'] },

  { domains: ['codepen.io'], name: 'CodePen', category: 'useful',
    description: "Frontend code playground — build, share, and discover HTML/CSS/JS demos.",
    tags: ['frontend','playground','demo','developer'] },

  { domains: ['react.dev'], name: 'React Docs', category: 'useful',
    description: "Official React documentation — guides, API reference, and interactive tutorials.",
    tags: ['react','documentation','frontend','javascript'] },

  { domains: ['trello.com'], name: 'Trello', category: 'useful',
    description: "Kanban-style project management boards by Atlassian — simple drag-and-drop workflow.",
    tags: ['productivity','kanban','project-management'] }
];

// ============================================================
//  WEIGHTED AI KEYWORD SCORING
//  Higher weight = stronger signal. Threshold: >= 10 points
//  Only used as a fallback if the site is NOT in the KB
// ============================================================
const WEIGHTED_AI_KEYWORDS = [
  { term: 'gpt-4',            weight: 12 },
  { term: 'gpt-3',            weight: 12 },
  { term: 'gpt4',             weight: 12 },
  { term: 'gpt3',             weight: 12 },
  { term: 'llm',              weight: 10 },
  { term: 'large language model', weight: 10 },
  { term: 'generative ai',    weight: 10 },
  { term: 'text-to-image',    weight: 9  },
  { term: 'text-to-video',    weight: 9  },
  { term: 'text-to-speech',   weight: 9  },
  { term: 'chatbot',          weight: 8  },
  { term: 'ai assistant',     weight: 8  },
  { term: 'language model',   weight: 8  },
  { term: 'image generation', weight: 8  },
  { term: 'generative',       weight: 6  },
  { term: 'machine learning', weight: 6  },
  { term: 'deep learning',    weight: 6  },
  { term: 'natural language', weight: 6  },
  { term: 'nlp',              weight: 6  },
  { term: 'computer vision',  weight: 6  },
  { term: 'openai',           weight: 5  },
  { term: 'anthropic',        weight: 5  },
  { term: 'artificial intelligence', weight: 5 },
  { term: 'diffusion model',  weight: 5  },
  { term: 'transformer',      weight: 4  },
  { term: 'fine-tuning',      weight: 4  },
  { term: 'embedding',        weight: 3  },
  { term: 'inference',        weight: 3  },
  { term: 'prompt',           weight: 2  },
  { term: 'ai',               weight: 1  }  // very common – needs to combine with others
];

// Minimum score to classify as AI via keyword scoring (fallback only)
const AI_SCORE_THRESHOLD = 10;

// Known useful developer domains (fallback if not in KB)
const USEFUL_DOMAINS = [
  'github.com', 'stackoverflow.com', 'npmjs.com', 'figma.com',
  'vercel.com', 'netlify.com', 'codepen.io', 'stackblitz.com',
  'react.dev', 'developer.mozilla.org', 'mdn.mozilla.org',
  'trello.com', 'linear.app', 'notion.so', 'w3schools.com',
  'css-tricks.com', 'smashingmagazine.com', 'devdocs.io'
];

// Useful keyword scoring
const WEIGHTED_USEFUL_KEYWORDS = [
  { term: 'open source',      weight: 5 },
  { term: 'documentation',    weight: 4 },
  { term: 'developer tool',   weight: 4 },
  { term: 'framework',        weight: 3 },
  { term: 'library',          weight: 3 },
  { term: 'api reference',    weight: 3 },
  { term: 'tutorial',         weight: 3 },
  { term: 'productivity',     weight: 2 },
  { term: 'dashboard',        weight: 2 },
  { term: 'automation',       weight: 2 },
  { term: 'tool',             weight: 1 },
  { term: 'platform',         weight: 1 }
];

const USEFUL_SCORE_THRESHOLD = 5;

// ============================================================
//  HELPERS
// ============================================================

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

  const metaDesc = document.querySelector('meta[name="description"]')
    || document.querySelector('meta[property="og:description"]');
  if (metaDesc) metadata.description = metaDesc.getAttribute('content') || '';

  if (!metadata.description) {
    const p = document.querySelector('article p, main p, p');
    if (p) metadata.description = p.textContent.substring(0, 200).trim();
  }

  const favicon = document.querySelector('link[rel="icon"]')
    || document.querySelector('link[rel="shortcut icon"]');
  if (favicon) metadata.favicon = favicon.getAttribute('href') || '';

  const kwMeta = document.querySelector('meta[name="keywords"]');
  if (kwMeta) {
    metadata.keywords = kwMeta.getAttribute('content').split(',').map(k => k.trim()).filter(Boolean);
  }

  return metadata;
}

/**
 * Get canonical hostname from a URL string, stripping www.
 */
function getHostname(urlStr) {
  try {
    return new URL(urlStr).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Look up a hostname in the knowledge base.
 * Returns the KB entry if matched, otherwise null.
 * Tries exact match first, then subdomain suffix match.
 */
function lookupKnowledgeBase(hostname) {
  for (const entry of AI_KNOWLEDGE_BASE) {
    for (const d of entry.domains) {
      const kbDomain = d.replace(/^www\./, '').toLowerCase();
      if (hostname === kbDomain || hostname.endsWith('.' + kbDomain)) {
        return entry;
      }
    }
  }
  return null;
}

/**
 * Check if the page is an authentication / system page that should NOT be stored.
 * Returns true → skip this page.
 */
function isAuthenticationOrSystemPage(metadata, remoteAuthList) {
  const title = metadata.title.toLowerCase();

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

    // Exact path segment match
    if (authPathSegments.some(seg =>
      pathLower === seg ||
      pathLower.startsWith(seg + '/') ||
      pathLower.startsWith(seg + '?')
    )) return true;

    // Auth-flavoured query params
    if (queryLower.includes('action=login') ||
        queryLower.includes('mode=signin') ||
        queryLower.includes('redirect_to=/login')) return true;

    const hostname = urlObj.hostname.toLowerCase();

    // Auth subdomains
    if (hostname.startsWith('auth.') ||
        hostname.startsWith('login.') ||
        hostname.startsWith('accounts.')) return true;

    // Remote gateway list (exact or subdomain)
    if (remoteAuthList && Array.isArray(remoteAuthList)) {
      if (remoteAuthList.some(gate => {
        const g = gate.toLowerCase();
        return hostname === g || hostname.endsWith('.' + g) || pathLower.startsWith('/' + g);
      })) return true;
    }
  } catch {
    if (authPathSegments.some(seg => metadata.url.toLowerCase().includes(seg))) return true;
  }

  // Strict title checks
  const authTitlePhrases = [
    'log in to ', 'sign in to ', 'sign up for ', 'create your account',
    'forgot password', 'reset your password', 'two-factor authentication',
    'verification required', 'authentication required', 'enter your password'
  ];
  if (authTitlePhrases.some(p => title.includes(p))) return true;

  // Visible password field
  const pwField = document.querySelector('input[type="password"]');
  if (pwField &&
      !pwField.closest('[hidden]') &&
      !pwField.closest('[style*="display:none"]') &&
      !pwField.closest('[style*="display: none"]')) return true;

  return false;
}

/**
 * Truncate URL to its origin (scheme + host)
 */
function cleanToMainDomain(urlStr) {
  try { return new URL(urlStr).origin + '/'; }
  catch { return urlStr; }
}

/**
 * Score text against a weighted keyword list. Returns total score.
 */
function scoreText(text, weightedList) {
  let score = 0;
  for (const { term, weight } of weightedList) {
    if (text.includes(term)) score += weight;
  }
  return score;
}

// ============================================================
//  MAIN CLASSIFIER
// ============================================================
/**
 * Classify a page. Returns { isAI, isUseful, confidence, name, description, reasons[] }
 *
 * Pipeline (strict priority):
 *  1. Knowledge Base exact match        → isAI/isUseful=true, confidence=1.0
 *  2. Knowledge Base subdomain match    → confidence=0.97
 *  3. Known useful domain whitelist     → isUseful=true, confidence=0.90
 *  4. .ai TLD + corroboration           → isAI=true, confidence=0.88
 *  5. Weighted AI keyword score >= 10   → isAI=true, confidence scaled
 *  6. Weighted useful keyword score >=5 → isUseful=true, confidence scaled
 */
function classifyWebsite(metadata, customAiKeywords, customUsefulKeywords, remoteAiDomains) {
  const hostname = getHostname(metadata.url);
  // Only scan title + description for keywords, NOT the URL (domain already handled separately)
  const text = (metadata.title + ' ' + (metadata.description || '')).toLowerCase();

  const result = {
    isAI: false,
    isUseful: false,
    confidence: 0,
    name: null,
    description: null,
    reasons: []
  };

  // ── STEP 1: Knowledge Base lookup (highest priority) ──
  const kbEntry = lookupKnowledgeBase(hostname);
  if (kbEntry) {
    if (kbEntry.category === 'ai') result.isAI = true;
    else result.isUseful = true;
    result.confidence = 1.0;
    result.name = kbEntry.name;
    result.description = kbEntry.description;
    result.reasons = ['Verified knowledge base entry'];
    return result; // immediate return — no further checks needed
  }

  // ── STEP 2: Remote AI domain list (synced from GitHub) ──
  const joinedAiDomains = [...(remoteAiDomains || [])];
  const remoteMatch = joinedAiDomains.some(d => {
    const rd = d.replace(/^www\./, '').toLowerCase();
    return hostname === rd || hostname.endsWith('.' + rd);
  });
  if (remoteMatch) {
    result.isAI = true;
    result.confidence = 0.95;
    result.reasons.push('Remote AI domain list match');
  }

  // ── STEP 3: Known useful domain whitelist ──
  const usefulDomainMatch = USEFUL_DOMAINS.some(d => {
    const ud = d.replace(/^www\./, '').toLowerCase();
    return hostname === ud || hostname.endsWith('.' + ud);
  });
  if (usefulDomainMatch && !result.isAI) {
    result.isUseful = true;
    result.confidence = Math.max(result.confidence, 0.90);
    result.reasons.push('Known useful platform domain');
  }

  // ── STEP 4: .ai TLD with corroboration ──
  // A .ai TLD alone is NOT enough — it needs a supporting signal
  const isAiTld = hostname.endsWith('.ai') || hostname.includes('.ai.');
  if (isAiTld && !result.isAI) {
    // Corroboration: the title/description must mention AI-related terms
    const aiCorroboration = /\bai\b/.test(text) ||
      text.includes('artificial intelligence') ||
      text.includes('machine learning') ||
      text.includes('language model') ||
      text.includes('chatbot') ||
      text.includes('generative');

    if (aiCorroboration) {
      result.isAI = true;
      result.confidence = Math.max(result.confidence, 0.88);
      result.reasons.push('.ai domain with AI content corroboration');
    }
    // Without corroboration: .ai TLD is an agency/business, not classified as AI
  }

  // ── STEP 5: Custom AI keywords (user-added) ──
  if (customAiKeywords && customAiKeywords.length > 0) {
    const customHits = customAiKeywords.filter(kw => text.includes(kw.toLowerCase()));
    if (customHits.length >= 1) {
      result.isAI = true;
      result.confidence = Math.max(result.confidence, 0.80);
      result.reasons.push(`Custom AI keyword match: ${customHits.slice(0, 2).join(', ')}`);
    }
  }

  // Early exit if already classified as AI
  if (result.isAI) return result;

  // ── STEP 6: Weighted AI keyword scoring (fallback) ──
  const allWeighted = [
    ...WEIGHTED_AI_KEYWORDS,
    ...(customAiKeywords || []).map(kw => ({ term: kw.toLowerCase(), weight: 6 }))
  ];
  const aiScore = scoreText(text, allWeighted);

  if (aiScore >= AI_SCORE_THRESHOLD) {
    result.isAI = true;
    // Scale confidence: threshold=10 → 0.60, score=20 → 0.80, score=30+ → 0.90
    result.confidence = Math.min(0.90, 0.50 + (aiScore / 60));
    result.reasons.push(`AI keyword score: ${aiScore} points`);
    return result;
  }

  // ── STEP 7: Weighted useful keyword scoring (fallback) ──
  if (!result.isUseful) {
    const allUseful = [
      ...WEIGHTED_USEFUL_KEYWORDS,
      ...(customUsefulKeywords || []).map(kw => ({ term: kw.toLowerCase(), weight: 5 }))
    ];
    const usefulScore = scoreText(text, allUseful);

    if (usefulScore >= USEFUL_SCORE_THRESHOLD) {
      result.isUseful = true;
      result.confidence = Math.min(0.85, 0.50 + (usefulScore / 30));
      result.reasons.push(`Useful keyword score: ${usefulScore} points`);
    }
  }

  return result;
}

// ============================================================
//  SEND PAGE DATA
// ============================================================
function sendPageData() {
  chrome.storage.local.get([
    'customAiKeywords',
    'customUsefulKeywords',
    'remoteAiDomains',
    'remoteUsefulDomains',
    'remoteAuthGateways'
  ], (result) => {
    const metadata = extractPageMetadata();

    if (isAuthenticationOrSystemPage(metadata, result.remoteAuthGateways)) {
      console.log('[AI Site Collector] Skipping: authentication page detected.');
      return;
    }

    const classification = classifyWebsite(
      metadata,
      result.customAiKeywords,
      result.customUsefulKeywords,
      result.remoteAiDomains
    );

    if (!classification.isAI && !classification.isUseful) return;

    // For AI pages: strip to root origin and use KB name / clean description
    if (classification.isAI) {
      metadata.url = cleanToMainDomain(metadata.url);
      if (classification.name) {
        metadata.title = classification.name;
      } else {
        // Fallback: capitalize first domain segment
        try {
          const h = new URL(metadata.url).hostname.replace(/^www\./, '');
          const seg = h.split('.')[0];
          metadata.title = seg.charAt(0).toUpperCase() + seg.slice(1);
        } catch { /* keep original */ }
      }
      if (classification.description) {
        metadata.description = classification.description;
      } else {
        metadata.description = 'AI platform — detected by domain or keyword analysis.';
      }
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
        // Background service worker not ready yet — silently ignore
      }
    });
  });
}

// ── Single-shot guard: fire exactly once per page load ──
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
