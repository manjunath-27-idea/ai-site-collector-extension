/**
 * Content Script - Runs on every webpage
 * Extracts metadata and classifies pages using a static knowledge base + weighted keyword scoring
 */

// ============================================================
//  STATIC AI KNOWLEDGE BASE
//  Each entry: { domains[], name, category, label, description, tags[] }
//  category: 'ai' | 'useful' | 'agency'
//  label   : specific display badge shown in the UI
//  'domains' matched against page hostname (exact or subdomain suffix)
// ============================================================

// Label derivation map  -  first matching tag wins
const TAG_TO_LABEL = [
  { tag: 'chatbot',      label: 'AI Chatbot'    },
  { tag: 'search',       label: 'AI Search'     },
  { tag: 'coding',       label: 'Code AI'       },
  { tag: 'image',        label: 'Image AI'      },
  { tag: 'video',        label: 'Video AI'      },
  { tag: 'music',        label: 'Music AI'      },
  { tag: 'voice',        label: 'Voice AI'      },
  { tag: 'audio',        label: 'Voice AI'      },
  { tag: 'presentation', label: 'Slides AI'     },
  { tag: 'research',     label: 'Research AI'   },
  { tag: 'llm',          label: 'AI Model'      },
  { tag: 'models',       label: 'AI Models'     },
  { tag: 'inference',    label: 'AI Inference'  },
  { tag: 'agency',       label: 'Agency'        },
  { tag: 'design',       label: 'Design Tool'   },
  { tag: 'productivity', label: 'Productivity'  },
  { tag: 'deploy',       label: 'Dev Tool'      },
  { tag: 'documentation',label: 'Docs'          },
  { tag: 'qa',           label: 'Dev Tool'      },
  { tag: 'code',         label: 'Dev Tool'      },
];

function deriveLabelFromTags(category, tags) {
  if (category === 'agency') return 'Agency';
  if (category === 'useful') {
    for (const { tag, label } of TAG_TO_LABEL) {
      if (tags.includes(tag)) return label;
    }
    return 'Useful Tool';
  }
  // category === 'ai'
  for (const { tag, label } of TAG_TO_LABEL) {
    if (tags.includes(tag)) return label;
  }
  return 'AI Tool';
}

const AI_KNOWLEDGE_BASE = [

  // â”€â”€ Conversational AI / LLMs â”€â”€
  { domains: ['chat.openai.com','chatgpt.com'], name: 'ChatGPT', category: 'ai',
    description: "OpenAI's flagship conversational AI. Supports GPT-4o for text, images, and code.",
    tags: ['chatbot','gpt','openai','llm'] },

  { domains: ['claude.ai'], name: 'Claude', category: 'ai',
    description: "Anthropic's constitutional AI assistant  -  focused on safety and helpfulness.",
    tags: ['chatbot','anthropic','llm','safety'] },

  { domains: ['gemini.google.com','bard.google.com'], name: 'Gemini', category: 'ai',
    description: "Google DeepMind's multimodal AI  -  integrates with Google Workspace and Search.",
    tags: ['chatbot','google','multimodal','llm'] },

  { domains: ['copilot.microsoft.com'], name: 'Microsoft Copilot', category: 'ai',
    description: "Microsoft's AI assistant powered by GPT-4 and integrated across Office 365.",
    tags: ['chatbot','microsoft','copilot','llm'] },

  { domains: ['perplexity.ai'], name: 'Perplexity AI', category: 'ai',
    description: "AI-powered search engine that gives cited, conversational answers in real time.",
    tags: ['search','llm','citations','research'] },

  { domains: ['deepseek.com'], name: 'DeepSeek', category: 'ai',
    description: "High-performance open-source LLM by DeepSeek  -  strong on coding and reasoning.",
    tags: ['chatbot','llm','open-source','coding'] },

  { domains: ['kimi.ai', 'kimi.moonshot.cn'], name: 'Kimi AI', category: 'ai',
    description: "Moonshot AI's flagship chatbot, renowned for its massive context window and Chinese language processing.",
    tags: ['chatbot','llm','moonshot','context'] },

  { domains: ['manus.im', 'manus.ai'], name: 'Manus', category: 'ai',
    description: "The first general-purpose AI agent capable of executing multi-step complex workflows in browser sandboxes.",
    tags: ['agent','chatbot','workflows','productivity'] },

  { domains: ['mistral.ai'], name: 'Mistral AI', category: 'ai',
    description: "European open-weight LLM lab offering frontier models like Mistral and Mixtral.",
    tags: ['llm','open-source','chatbot'] },

  { domains: ['groq.com'], name: 'Groq', category: 'ai',
    description: "Ultra-fast LLM inference platform using custom LPU hardware.",
    tags: ['inference','llm','fast','hardware'] },

  { domains: ['together.ai'], name: 'Together AI', category: 'ai',
    description: "Cloud platform for running open-source AI models at scale.",
    tags: ['inference','open-source','cloud','llm'] },

  { domains: ['poe.com'], name: 'Poe', category: 'ai',
    description: "Quora's multi-model AI chat  -  access GPT-4, Claude, Llama in one place.",
    tags: ['chatbot','multi-model','quora'] },

  { domains: ['you.com'], name: 'You.com', category: 'ai',
    description: "AI search engine with built-in coding assistant and creative tools.",
    tags: ['search','coding','chatbot'] },

  { domains: ['pi.ai'], name: 'Pi AI', category: 'ai',
    description: "Inflection AI's personal intelligence assistant  -  designed for emotional support.",
    tags: ['chatbot','personal','inflection'] },

  { domains: ['character.ai'], name: 'Character AI', category: 'ai',
    description: "Create and chat with custom AI characters  -  social AI roleplay platform.",
    tags: ['chatbot','roleplay','social'] },

  { domains: ['meta.ai'], name: 'Meta AI', category: 'ai',
    description: "Meta's conversational AI assistant built into WhatsApp, Instagram, and Messenger.",
    tags: ['chatbot','meta','social'] },

  // â”€â”€ Google AI Products (all variants) â”€â”€
  { domains: ['aistudio.google.com'], name: 'Google AI Studio', category: 'ai',
    description: "Google's developer platform for building with Gemini  -  prompt, test, and deploy AI.",
    tags: ['chatbot','google','developer','llm'] },

  { domains: ['notebooklm.google.com'], name: 'NotebookLM', category: 'ai',
    description: "Google's AI-powered research notebook  -  upload sources and chat with your documents.",
    tags: ['research','google','chatbot','documents'] },

  { domains: ['colab.research.google.com','colab.google'], name: 'Google Colab', category: 'ai',
    description: "Free cloud-hosted Jupyter notebooks by Google  -  with GPU/TPU support for ML.",
    tags: ['coding','google','jupyter','ml'] },

  { domains: ['lens.google.com'], name: 'Google Lens', category: 'ai',
    description: "Google's visual AI  -  search with images, identify objects, translate text in photos.",
    tags: ['image','google','search','vision'] },

  { domains: ['translate.google.com'], name: 'Google Translate', category: 'ai',
    description: "Google's AI-powered translation  -  supports 130+ languages with neural MT.",
    tags: ['translation','google','nlp','language'] },

  { domains: ['deepmind.google','deepmind.com'], name: 'Google DeepMind', category: 'ai',
    description: "Google's AI research lab  -  created Gemini, AlphaFold, AlphaCode, and Lyria.",
    tags: ['research','google','llm','science'] },

  { domains: ['cloud.google.com/vertex-ai'], name: 'Vertex AI', category: 'ai',
    description: "Google Cloud's managed ML platform for building, deploying, and scaling AI models.",
    tags: ['inference','google','cloud','developer'] },

  { domains: ['aitestkitchen.withgoogle.com'], name: 'Google AI Test Kitchen', category: 'ai',
    description: "Google's experimental AI product lab  -  demos new AI capabilities before public launch.",
    tags: ['research','google','chatbot','experimental'] },

  { domains: ['ai.google'], name: 'Google AI', category: 'ai',
    description: "Google's central AI hub  -  research, tools, Gemini, and AI-for-everyone initiatives.",
    tags: ['research','google','llm','models'] },

  { domains: ['magenta.tensorflow.org'], name: 'Google Magenta', category: 'ai',
    description: "Google's AI music and art project using machine learning for creative generation.",
    tags: ['music','google','research','creative'] },

  { domains: ['ai.meta.com'], name: 'Meta AI Research', category: 'ai',
    description: "Meta's AI research division  -  open-sources Llama models and AI tools.",
    tags: ['research','llm','open-source','meta'] },

  // â”€â”€ Image AI â”€â”€
  { domains: ['midjourney.com'], name: 'Midjourney', category: 'ai',
    description: "Leading AI image generator accessed via Discord  -  produces stunning artistic images.",
    tags: ['image','art','generative','creative'] },

  { domains: ['dall-e.openai.com','labs.openai.com'], name: 'DALLÂ·E', category: 'ai',
    description: "OpenAI's text-to-image model  -  generates realistic images from text prompts.",
    tags: ['image','text-to-image','openai','generative'] },

  { domains: ['stability.ai','dreamstudio.ai'], name: 'Stable Diffusion', category: 'ai',
    description: "Stability AI's open-source image generation model and DreamStudio platform.",
    tags: ['image','open-source','generative'] },

  { domains: ['ideogram.ai'], name: 'Ideogram', category: 'ai',
    description: "AI image generator with exceptional text rendering within images.",
    tags: ['image','generative','text-in-image'] },

  { domains: ['playground.ai'], name: 'Playground AI', category: 'ai',
    description: "Free AI image creator powered by Stable Diffusion with a clean UI.",
    tags: ['image','generative','free'] },

  { domains: ['leonardo.ai'], name: 'Leonardo AI', category: 'ai',
    description: "AI image and asset generator  -  popular for game art and concept design.",
    tags: ['image','game','generative','design'] },

  { domains: ['adobe.com'], name: 'Adobe Firefly', category: 'ai',
    description: "Adobe's generative AI  -  integrated into Photoshop, Illustrator, and Express.",
    tags: ['image','generative','adobe','creative'] },

  { domains: ['krea.ai'], name: 'Krea AI', category: 'ai',
    description: "Real-time AI image and video generation with live canvas editing.",
    tags: ['image','video','realtime','generative'] },

  // â”€â”€ Video AI â”€â”€
  { domains: ['runway.com'], name: 'Runway ML', category: 'ai',
    description: "AI-powered video generation and editing platform. Known for Gen-2 video model.",
    tags: ['video','generative','creative'] },

  { domains: ['sora.com'], name: 'Sora', category: 'ai',
    description: "OpenAI's text-to-video model  -  generates high-quality videos from text.",
    tags: ['video','text-to-video','openai','generative'] },

  { domains: ['luma.ai'], name: 'Luma AI', category: 'ai',
    description: "AI video and 3D generation  -  create photorealistic 3D scenes from photos.",
    tags: ['video','3d','generative','creative'] },

  { domains: ['kling.ai'], name: 'Kling AI', category: 'ai',
    description: "Kuaishou's video generation AI  -  creates high-quality videos from text or image.",
    tags: ['video','generative','text-to-video'] },

  { domains: ['synthesia.io'], name: 'Synthesia', category: 'ai',
    description: "AI video platform that creates professional videos with AI avatars.",
    tags: ['video','avatar','business','generative'] },

  { domains: ['descript.com'], name: 'Descript', category: 'ai',
    description: "AI-powered video and podcast editor  -  edit media like a document.",
    tags: ['video','audio','editing'] },

  // â”€â”€ Voice / Music AI â”€â”€
  { domains: ['elevenlabs.io'], name: 'ElevenLabs', category: 'ai',
    description: "Hyper-realistic AI voice generation  -  clone voices, create audiobooks and dubs.",
    tags: ['voice','audio','tts','generative'] },

  { domains: ['suno.ai'], name: 'Suno', category: 'ai',
    description: "AI music generator  -  create full songs with vocals from a text prompt.",
    tags: ['music','audio','generative'] },

  { domains: ['udio.com'], name: 'Udio', category: 'ai',
    description: "AI music creation platform for generating professional-quality songs.",
    tags: ['music','audio','generative'] },

  // ── Security & Pentesting AI ──
  { domains: ['pentest.ai', 'pentesting.ai'], name: 'Pentest.ai', category: 'ai',
    description: "AI-powered penetration testing platform that automates vulnerability discovery, API security testing, and ethical hacking.",
    tags: ['security', 'pentest', 'vulnerability', 'developer'] },

  // ── Code AI ──
  { domains: ['antigravity.ai', 'antigravity.dev', 'antigravity-ide.com'], name: 'Antigravity IDE', category: 'ai',
    description: "A state-of-the-art agentic AI coding environment featuring deep repository context, multi-agent coordination, and autotesting capabilities.",
    tags: ['coding','editor','agent','ide'] },

  { domains: ['emergent.sh'], name: 'Emergent AI (emergent.sh)', category: 'ai',
    description: "An AI-native multi-agent developer platform designed for autonomous full-stack software construction, execution, and deployment.",
    tags: ['coding', 'agent', 'ide', 'deploy'] },

  { domains: ['copilot.github.com', 'github.com/features/copilot'], name: 'GitHub Copilot', category: 'ai',
    description: "GitHub's premier AI pair programmer offering autocomplete, repository-aware chat, and autonomous coding agents.",
    tags: ['coding','copilot','github','agent'] },

  { domains: ['aws.amazon.com/q', 'amazon.com/q', 'aws.amazon.com/codewhisperer'], name: 'Amazon Q Developer', category: 'ai',
    description: "Amazon's generative AI-powered conversational assistant for developer workflows, built-in code generation, refactoring, and AWS optimization.",
    tags: ['coding','aws','assistant','cloud'] },

  { domains: ['trae.ai', 'trae.sh'], name: 'Trae', category: 'ai',
    description: "An adaptive, AI-native development environment designed around agentic loops and deep workspace awareness.",
    tags: ['coding','editor','agent','ide'] },

  { domains: ['codeium.com/windsurf'], name: 'Windsurf', category: 'ai',
    description: "The first agentic AI-native IDE, built by Codeium, powered by the Cascade agent flow to execute multi-step changes.",
    tags: ['coding','editor','agent','ide'] },

  { domains: ['sourcegraph.com/cody', 'cody.sourcegraph.com'], name: 'Sourcegraph Cody', category: 'ai',
    description: "AI code assistant featuring deep multi-repo context awareness, inline code completion, and codebase analysis.",
    tags: ['coding','search','context'] },

  { domains: ['cursor.sh','cursor.com'], name: 'Cursor', category: 'ai',
    description: "AI-first code editor built on VSCode  -  uses GPT-4 for inline code generation.",
    tags: ['coding','editor','llm','ide'] },

  { domains: ['replit.com'], name: 'Replit', category: 'ai',
    description: "Cloud IDE with AI coding assistant  -  build, run, and deploy apps in browser.",
    tags: ['coding','cloud-ide','deploy'] },

  { domains: ['codeium.com'], name: 'Codeium', category: 'ai',
    description: "Free AI code completion tool  -  supports 70+ languages and major IDEs.",
    tags: ['coding','autocomplete','free'] },

  { domains: ['tabnine.com'], name: 'Tabnine', category: 'ai',
    description: "AI code assistant that learns from your codebase  -  privacy-first approach.",
    tags: ['coding','autocomplete','privacy'] },

  { domains: ['v0.dev'], name: 'v0 by Vercel', category: 'ai',
    description: "Vercel's AI that generates React UI components from text prompts.",
    tags: ['coding','ui','react'] },

  { domains: ['bolt.new'], name: 'Bolt.new', category: 'ai',
    description: "AI full-stack web app builder  -  generates and deploys complete apps instantly.",
    tags: ['coding','full-stack','deploy','builder'] },

  // â”€â”€ AI Research / ML Platforms â”€â”€
  { domains: ['huggingface.co'], name: 'HuggingFace', category: 'ai',
    description: "The AI community hub  -  hosts 300,000+ models, datasets, and Spaces demos.",
    tags: ['models','open-source','research','community'] },

  { domains: ['replicate.com'], name: 'Replicate', category: 'ai',
    description: "Run ML models in the cloud via a simple API  -  no GPU setup required.",
    tags: ['models','api','cloud','inference'] },

  { domains: ['cohere.com'], name: 'Cohere', category: 'ai',
    description: "Enterprise NLP platform  -  powerful embedding and generation APIs for business.",
    tags: ['llm','api','inference','enterprise'] },

  { domains: ['anthropic.com'], name: 'Anthropic', category: 'ai',
    description: "AI safety company building Claude  -  focuses on interpretable and safe AI.",
    tags: ['research','safety','llm'] },

  { domains: ['openai.com'], name: 'OpenAI', category: 'ai',
    description: "Creator of GPT, DALLÂ·E, and Whisper  -  leading AI research organization.",
    tags: ['research','llm','models'] },

  // â”€â”€ Presentations / Productivity AI â”€â”€
  { domains: ['gamma.app'], name: 'Gamma', category: 'ai',
    description: "AI presentation and document creator  -  generates slides from text prompts.",
    tags: ['presentation','documents','generative','productivity'] },

  { domains: ['beautiful.ai'], name: 'Beautiful.ai', category: 'ai',
    description: "AI-powered presentation software that auto-designs slides as you type.",
    tags: ['presentation','design','productivity'] },

  { domains: ['canva.com'], name: 'Canva', category: 'useful',
    description: "Graphic design platform with AI-powered tools for templates, images, and video.",
    tags: ['design','templates','creative'] },

  { domains: ['notion.so'], name: 'Notion', category: 'useful',
    description: "All-in-one workspace for notes, wikis, databases, and project management with AI.",
    tags: ['productivity','notes','workspace'] },

  { domains: ['linear.app'], name: 'Linear', category: 'useful',
    description: "Modern project management tool for software teams  -  fast and opinionated.",
    tags: ['productivity','project-management'] },

  // â”€â”€ AI Search / Research â”€â”€
  { domains: ['phind.com'], name: 'Phind', category: 'ai',
    description: "AI search engine optimized for developers  -  gives detailed code-aware answers.",
    tags: ['search','coding','developer'] },

  { domains: ['kagi.com'], name: 'Kagi', category: 'ai',
    description: "Premium ad-free search engine with built-in AI summarization and assistant.",
    tags: ['search','privacy','premium'] },

  { domains: ['consensus.app'], name: 'Consensus', category: 'ai',
    description: "AI research tool that surfaces evidence from 200M scientific papers.",
    tags: ['research','science','search'] },

  { domains: ['elicit.org'], name: 'Elicit', category: 'ai',
    description: "AI research assistant that automates literature review and data extraction.",
    tags: ['research','academic','literature'] },

  // â”€â”€ Developer / Useful Tools â”€â”€
  { domains: ['github.com'], name: 'GitHub', category: 'useful',
    description: "The world's largest code hosting platform  -  version control, CI/CD, and collaboration.",
    tags: ['code','git','open-source','collaboration'] },

  { domains: ['stackoverflow.com'], name: 'Stack Overflow', category: 'useful',
    description: "The premier Q&A platform for developers  -  answers to nearly every coding question.",
    tags: ['qa','community','coding','developer'] },

  { domains: ['vercel.com'], name: 'Vercel', category: 'useful',
    description: "Cloud platform for frontend deployment  -  instant deploys from Git with Edge Network.",
    tags: ['deploy','hosting','frontend','developer'] },

  { domains: ['netlify.com'], name: 'Netlify', category: 'useful',
    description: "Jamstack hosting platform with CI/CD, serverless functions, and form handling.",
    tags: ['deploy','hosting','jamstack'] },

  { domains: ['figma.com'], name: 'Figma', category: 'useful',
    description: "Collaborative UI/UX design tool  -  the industry standard for interface design.",
    tags: ['design','ui','ux','collaboration'] },

  { domains: ['npmjs.com'], name: 'npm', category: 'useful',
    description: "The Node.js package registry  -  home to 2M+ open-source JavaScript packages.",
    tags: ['code','packages','javascript','open-source'] },

  { domains: ['developer.mozilla.org','mdn.mozilla.org'], name: 'MDN Web Docs', category: 'useful',
    description: "The authoritative reference for HTML, CSS, and JavaScript  -  by Mozilla.",
    tags: ['documentation','web','html','javascript'] },

  { domains: ['stackblitz.com'], name: 'StackBlitz', category: 'useful',
    description: "Online IDE that runs Node.js projects in your browser  -  no install needed.",
    tags: ['code','ide','online','javascript'] },

  { domains: ['codepen.io'], name: 'CodePen', category: 'useful',
    description: "Frontend code playground  -  build, share, and discover HTML/CSS/JS demos.",
    tags: ['code','frontend','playground','demo'] },

  { domains: ['react.dev'], name: 'React Docs', category: 'useful',
    description: "Official React documentation  -  guides, API reference, and interactive tutorials.",
    tags: ['documentation','react','frontend','javascript'] },

  { domains: ['trello.com'], name: 'Trello', category: 'useful',
    description: "Kanban-style project management boards by Atlassian  -  drag-and-drop workflow.",
    tags: ['productivity','kanban','project-management'] },

  // â”€â”€ Agency / Business .ai sites â”€â”€
  // These use a .ai domain but are NOT AI tools  -  they are creative/tech agencies.
  // Stored with category='agency' so users know their actual purpose.
  { domains: ['modern.ai'], name: 'Modern.AI', category: 'agency',
    description: "A creative agency offering AI-powered marketing, branding, and digital services.",
    tags: ['agency','marketing','branding','creative'] },

  { domains: ['agency.ai'], name: 'Agency AI', category: 'agency',
    description: "AI-focused digital agency providing strategy and implementation services.",
    tags: ['agency','strategy','digital'] },

  { domains: ['10x.ai'], name: '10x.ai', category: 'agency',
    description: "AI consulting and automation agency helping businesses scale with AI.",
    tags: ['agency','consulting','automation'] },

  { domains: ['axiom.ai'], name: 'Axiom.ai', category: 'useful',
    description: "Browser automation tool  -  build web bots and automate workflows without code.",
    tags: ['automation','productivity','no-code'] }
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
  { term: 'ai agent',         weight: 10 },
  { term: 'autonomous agent', weight: 10 },
  { term: 'agentic',          weight: 10 },
  { term: 'chatgpt',          weight: 10 },
  { term: 'deepseek',         weight: 10 },
  { term: 'text-to-image',    weight: 9  },
  { term: 'text-to-video',    weight: 9  },
  { term: 'text-to-speech',   weight: 9  },
  { term: 'chatbot',          weight: 8  },
  { term: 'ai assistant',     weight: 8  },
  { term: 'language model',   weight: 8  },
  { term: 'image generation', weight: 8  },
  { term: 'autonomous',       weight: 8  },
  { term: 'agent',            weight: 8  },
  { term: 'ai tool',          weight: 6  },
  { term: 'ai platform',      weight: 6  },
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
  { term: 'chat',             weight: 5  },
  { term: 'transformer',      weight: 4  },
  { term: 'fine-tuning',      weight: 4  },
  { term: 'workflow',         weight: 4  },
  { term: 'embedding',        weight: 3  },
  { term: 'inference',        weight: 3  },
  { term: 'sandbox',          weight: 3  },
  { term: 'prompt',           weight: 2  },
  { term: 'ai',               weight: 1  }  // very common â€“ needs to combine with others
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
  { term: 'pentest',          weight: 5 },
  { term: 'pentesting',       weight: 5 },
  { term: 'penetration testing', weight: 5 },
  { term: 'security scanner', weight: 4 },
  { term: 'documentation',    weight: 4 },
  { term: 'developer tool',   weight: 4 },
  { term: 'vulnerability',    weight: 3 },
  { term: 'cybersecurity',    weight: 3 },
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
  if (kwMeta && kwMeta.getAttribute('content')) {
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
function lookupKnowledgeBase(hostname, urlStr) {
  let pathname = '';
  try {
    if (urlStr) {
      pathname = new URL(urlStr).pathname.toLowerCase();
    }
  } catch { /* ignore parsing errors */ }

  const fullPathStr = (hostname + pathname).toLowerCase();

  for (const entry of AI_KNOWLEDGE_BASE) {
    for (const d of entry.domains) {
      const kbDomain = d.replace(/^www\./, '').toLowerCase();
      
      // If the knowledge base entry has a path (contains a slash)
      if (kbDomain.includes('/')) {
        if (fullPathStr === kbDomain || fullPathStr.startsWith(kbDomain + '/') || fullPathStr.startsWith(kbDomain + '?')) {
          return entry;
        }
      } else {
        // Hostname exact match or subdomain suffix match
        if (hostname === kbDomain || hostname.endsWith('.' + kbDomain)) {
          return entry;
        }
      }
    }
  }
  return null;
}

/**
 * Check if the page is an authentication / system page that should NOT be stored.
 * Returns true â†’ skip this page.
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
 * Classify a page. Returns { isAI, isUseful, isAgency, label, confidence, name, description, reasons[] }
 *
 * Pipeline (strict priority):
 *  1. Knowledge Base exact / subdomain match  â†’ immediate return with KB label
 *  2. Remote AI domain list (GitHub sync)     â†’ isAI=true, label='AI Tool'
 *  3. Known useful domain whitelist           â†’ isUseful=true
 *  4. .ai TLD WITH corroboration             â†’ isAI=true, label='AI Tool'
 *  5. .ai TLD WITHOUT corroboration          â†’ isAgency=true, label='Agency'
 *  6. Custom AI keywords                     â†’ isAI=true
 *  7. Weighted AI keyword score >= 10        â†’ isAI=true
 *  8. Weighted useful keyword score >= 5     â†’ isUseful=true
 */
function classifyWebsite(metadata, customAiKeywords, customUsefulKeywords, remoteAiDomains) {
  const hostname = getHostname(metadata.url);
  
  let pathClean = '';
  try {
    const urlObj = new URL(metadata.url);
    pathClean = urlObj.pathname.toLowerCase().replace(/[\/\-\_\.]/g, ' ');
  } catch { /* ignore URL parsing errors */ }
  const hostClean = hostname.replace(/[\.\-\_]/g, ' ');

  const text = (metadata.title + ' ' + (metadata.description || '') + ' ' + hostClean + ' ' + pathClean).toLowerCase();

  const result = {
    isAI: false,
    isUseful: false,
    isAgency: false,
    label: '',
    confidence: 0,
    name: null,
    description: null,
    reasons: []
  };

  // ── STEP 1: Knowledge Base lookup (highest priority) ──
  const kbEntry = lookupKnowledgeBase(hostname, metadata.url);
  if (kbEntry) {
    if (kbEntry.category === 'ai') result.isAI = true;
    else if (kbEntry.category === 'agency') {
      result.isAgency = true;
      result.isUseful = true; // store in useful bucket so it appears in the list
    }
    else result.isUseful = true;
    result.confidence = 1.0;
    result.name = kbEntry.name;
    result.description = kbEntry.description;
    result.reasons = ['Verified knowledge base entry'];
    return result; // immediate return  -  no further checks needed
  }

  // ── DYNAMIC DESCRIPTION/TITLE SHORTCUT TRIGGERS (Kimi/Manus direct catchers) ──
  const descLower = (metadata.description || '').toLowerCase();
  const titleLower = (metadata.title || '').toLowerCase();
  const combineText = (titleLower + ' ' + descLower + ' ' + hostClean + ' ' + pathClean).trim();

  const hasDirectAiKeyword = 
    /\bai\b/i.test(combineText) || 
    /\bagent\b/i.test(combineText) || 
    /artificial intelligence/i.test(combineText) ||
    /artificial intelligent/i.test(combineText) ||
    /\bagentic\b/i.test(combineText);

  if (hasDirectAiKeyword) {
    result.isAI = true;
    result.confidence = Math.max(result.confidence, 0.85);
    result.label = 'AI Tool';
    result.reasons.push('Direct AI/Agent keyword matched in page metadata');
    return result; // immediate return - successfully identified
  }

  // â”€â”€ STEP 2: Remote AI domain list (synced from GitHub) â”€â”€
  const joinedAiDomains = [...(remoteAiDomains || [])];
  const remoteMatch = joinedAiDomains.some(d => {
    const rd = d.replace(/^www\./, '').toLowerCase();
    return hostname === rd || hostname.endsWith('.' + rd);
  });
  if (remoteMatch) {
    result.isAI = true;
    result.confidence = 0.95;
    result.label = 'AI Tool';
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
    result.label = 'Useful Tool';
    result.reasons.push('Known useful platform domain');
  }

  // ── STEP 4: AI-centric TLD with corroboration ──
  const isAiTld = hostname.endsWith('.ai') || hostname.endsWith('.bot') || hostname.endsWith('.chat') || hostname.endsWith('.agent') || hostname.includes('.ai.') || hostname.includes('.bot.') || hostname.includes('.chat.') || hostname.includes('.agent.');
  if (isAiTld && !result.isAI && !result.isAgency) {
    const aiCorroboration = /\bai\b/.test(text) ||
      text.includes('artificial intelligence') ||
      text.includes('machine learning') ||
      text.includes('language model') ||
      text.includes('chatbot') ||
      text.includes('generative') ||
      text.includes('pentest') ||
      text.includes('pentesting') ||
      text.includes('penetration testing') ||
      text.includes('cybersecurity') ||
      text.includes('security scanner') ||
      text.includes('vulnerability scanner');

    if (aiCorroboration) {
      result.isAI = true;
      result.confidence = Math.max(result.confidence, 0.88);
      result.label = 'AI Tool';
      result.reasons.push('AI-centric TLD (.ai/.bot/.chat/.agent) with content corroboration');
    }
  }

  // ── STEP 5: Custom AI keywords (user-added) ──
  if (customAiKeywords && customAiKeywords.length > 0) {
    const customHits = customAiKeywords.filter(kw => text.includes(kw.toLowerCase()));
    if (customHits.length >= 1) {
      result.isAI = true;
      result.confidence = Math.max(result.confidence, 0.80);
      result.label = 'AI Tool';
      result.reasons.push(`Custom AI keyword match: ${customHits.slice(0, 2).join(', ')}`);
    }
  }

  if (result.isAI) return result;

  // ── STEP 6: Weighted AI keyword scoring (fallback) ──
  const allWeighted = [
    ...WEIGHTED_AI_KEYWORDS,
    ...(customAiKeywords || []).map(kw => ({ term: kw.toLowerCase(), weight: 6 }))
  ];
  const aiScore = scoreText(text, allWeighted);

  if (aiScore >= AI_SCORE_THRESHOLD) {
    result.isAI = true;
    result.confidence = Math.min(0.90, 0.50 + (aiScore / 60));
    result.label = 'AI Tool';
    result.reasons.push(`AI keyword score: ${aiScore} points`);
    return result;
  }

  // ── STEP 7: Weighted useful keyword scoring (fallback) ──
  if (!result.isUseful && !result.isAgency) {
    const allUseful = [
      ...WEIGHTED_USEFUL_KEYWORDS,
      ...(customUsefulKeywords || []).map(kw => ({ term: kw.toLowerCase(), weight: 5 }))
    ];
    const usefulScore = scoreText(text, allUseful);

    if (usefulScore >= USEFUL_SCORE_THRESHOLD) {
      result.isUseful = true;
      result.label = 'Useful Tool';
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
    const hostname = getHostname(metadata.url);
    const isKbMatch = lookupKnowledgeBase(hostname, metadata.url) !== null;

    if (!isKbMatch && isAuthenticationOrSystemPage(metadata, result.remoteAuthGateways)) {
      console.log('[AI Site Collector] Skipping: authentication page detected.');
      return;
    }

    const classification = classifyWebsite(
      metadata,
      result.customAiKeywords,
      result.customUsefulKeywords,
      result.remoteAiDomains
    );

    if (!classification.isAI && !classification.isUseful && !classification.isAgency) return;

    // For AI and Agency pages: strip to root origin and use KB name / clean description
    if (classification.isAI || classification.isAgency) {
      metadata.url = cleanToMainDomain(metadata.url);
      if (classification.name) {
        metadata.title = classification.name;
      } else {
        try {
          const h = new URL(metadata.url).hostname.replace(/^www\./, '');
          const seg = h.split('.')[0];
          metadata.title = seg.charAt(0).toUpperCase() + seg.slice(1);
        } catch { /* keep original */ }
      }
      // Prioritize live extracted page description over static database description
      const hasLiveDesc = metadata.description && metadata.description.trim().length > 0;
      if (!hasLiveDesc) {
        if (classification.description) {
          metadata.description = classification.description;
        } else {
          metadata.description = classification.isAgency 
            ? 'Agency platform  -  detected by domain or keyword analysis.' 
            : 'AI platform  -  detected by domain or keyword analysis.';
        }
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
        // Background service worker not ready yet  -  silently ignore
      }
    });
  });
}

// â”€â”€ Single-shot guard: fire exactly once per page load â”€â”€
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
