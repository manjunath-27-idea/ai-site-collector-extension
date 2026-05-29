# AI Site Collector — Chrome Extension

> Automatically detects, classifies, and saves AI & useful websites to a **Google Doc** in your Drive — hands-free, with real-time notifications and a widescreen dashboard.

---

## Features at a Glance

| Feature | Status |
|---|---|
| Intelligent multi-step AI classifier | ✅ Active |
| Static knowledge base (500+ AI sites) | ✅ Active |
| Dynamic domain rules from GitHub | ✅ Active |
| Google Docs sync (`.gdoc` format only) | ✅ Active |
| Auto-sync on site discovery | ✅ Active |
| Desktop notifications | ✅ Active |
| Widescreen Options Dashboard | ✅ Active |
| Custom keyword scanner | ✅ Active |
| Self-healing OAuth token refresh | ✅ Active |
| Dark mode | ✅ Active |
| Dual brand/domain name support | ✅ Active |
| Settings persist across reloads | ✅ Fixed |
| Cybersecurity / pentest site detection | ✅ Active |

---

## How It Works — Detection Pipeline

The classifier runs in **5 ordered steps** the moment any page loads:

### STEP 1 — Static Knowledge Base
Zero-latency lookup against `AI_KNOWLEDGE_BASE` in `js/content.js` — a curated list of 500+ verified AI tools, agents, and platforms. Each entry includes:
- **Domain aliases** (`cursor.sh`, `cursor.com`)
- **Canonical name** (`Cursor`)
- **Category** (`ai` or `useful`)
- **Description** (live scraped from the knowledge base entry)
- **Tags** (e.g. `['code', 'editor', 'llm']`)
- **Path-level matching** for sub-paths on major hostnames (e.g. `github.com/features/copilot`, `aws.amazon.com/q`)

Dual brand names are also recorded where applicable — for example, `Emergent AI (emergent.sh)` so both the brand and the domain are preserved.

### STEP 2 — Dynamic Remote Domain Rules
On install, update, and browser startup, `background.js` fetches `domain_rules.json` from GitHub and stores three lists in `chrome.storage.local`:
- `remoteAiDomains` — known AI platform hostnames
- `remoteUsefulDomains` — known useful developer tools
- `remoteAuthGateways` — login/auth pages to skip

These are merged with the static KB in `content.js` at scan time.

### STEP 3 — AI-Centric TLD Corroboration
Domains ending in `.ai`, `.bot`, `.chat`, or `.agent` are checked for corroborating content signals (e.g. mentions of `generative`, `llm`, `chatbot`, `machine learning`, `agentic`, `pentest`, `cybersecurity`). A match earns `isAI = true` with `0.80` confidence.

### STEP 4 — Weighted Keyword Scoring
Full page text (title + description + meta keywords + URL path) is scored against two weighted keyword lists:
- **AI Keywords:** `ai`, `artificial intelligence`, `gpt`, `llm`, `chatbot`, `generative`, `agentic`, `autonomous`, `machine learning`, `neural`, `transformer`, etc.
- **Useful Keywords:** `developer tool`, `open source`, `framework`, `library`, `pentest`, `cybersecurity`, `penetration testing`, `security scanner`, etc.

Sites scoring above threshold are classified accordingly.

### STEP 5 — Auth Page Filter
Any page matching known auth gateways or login URL patterns (`/login`, `/auth`, `/signin`, `/oauth`) is **excluded** to avoid capturing sign-in screens.

---

## Google Drive Integration (Google Docs Only)

All sync operations exclusively use **Google Docs format** (`application/vnd.google-apps.document`). No `.txt` files are ever created or accepted.

### Auto-Discovery
On first sync, the extension:
1. Queries Drive API for `name='AI_Site_Collector_Database' and mimeType='application/vnd.google-apps.document'`
2. Reuses the existing doc if found
3. Creates a new Google Doc if not found, writes a header, and saves the `docId` to storage

### Append-Only Deduplication
Before writing, the extension exports the Google Doc as plain text and filters out any site whose URL already appears in the document. Only **brand-new sites** are appended.

### Document Format (each sync)
```
============================================================
SYNC UPDATE — 29/05/2026, 1:30:00 pm | 3 new site(s)
============================================================

1. ChatGPT
   URL         : https://chatgpt.com/
   Type        : AI Platform
   Description : ChatGPT is an AI-powered assistant by OpenAI...
   Features    : chatbot, llm, generative, free, api
   Saved       : 29/05/2026, 1:28:00 pm

──────────────────────────────────────────────────────────
```

### Self-Healing OAuth Token Refresh
When a `401 Unauthorized` error is returned from Drive/Docs API (tokens expire after ~1 hour):
1. Extension silently removes the stale token via `chrome.identity.removeCachedAuthToken`
2. Requests a fresh token silently via `chrome.identity.getAuthToken({ interactive: false })`
3. Retries the sync automatically — no user action required

---

## Settings (persist across extension reloads)

| Setting | Default | Stored As |
|---|---|---|
| Auto-sync to Drive | ON | `autoSyncSetting` |
| Show notifications | ON | `notificationsSetting` |
| Dark mode | OFF | `darkModeSetting` |

> **Fixed in v3.1:** Settings are only reset on **first install** (`reason === 'install'`). Extension updates and developer-mode reloads no longer overwrite user preferences.

---

## Custom Keyword Scanner

Add your own keywords to detect sites the built-in classifier might miss:

1. Open the **Settings modal** (popup) or **Options Dashboard**
2. Under **Custom Site Finding Keywords**, type a keyword (e.g. `langchain`, `n8n`, `zapier`)
3. Select category: **AI Site** or **Useful Site**
4. Click **Add**

The `content.js` scanner reads `customAiKeywords` and `customUsefulKeywords` from storage on every page load and merges them into the scoring pipeline.

---

## File Structure

```
ai-site-collector-ext/
├── manifest.json               # MV3 extension config, OAuth scopes
├── domain_rules.json           # Remote domain whitelist (synced from GitHub)
├── js/
│   ├── content.js              # Classifier: 5-step detection pipeline + KB
│   └── background.js           # Service worker: storage, Drive API, OAuth
├── popup/
│   ├── index.html              # Popup UI: site list, settings modal, auth
│   ├── styles.css              # Glassmorphism toggles, dark theme
│   └── popup.js                # Popup logic: filter, sync, settings, keywords
├── options/
│   ├── index.html              # Widescreen dashboard
│   ├── styles.css              # Grid layout, responsive cards
│   └── options.js              # Dashboard: search, delete, export, settings
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── README.md
├── FEATURES.md
├── UPDATE_NOTES.md
├── QUICKSTART.md
├── SETUP_OAUTH.md
└── INSTALLATION_CHECKLIST.md
```

---

## Installation

### Prerequisites
- Google Chrome 88+ (or Chromium-based: Edge, Brave, Opera)
- Google account for Drive sync

### Setup Steps

1. **Clone or download the repository**
   ```bash
   git clone https://github.com/manjunath-27-idea/ai-site-collector-extension.git
   ```

2. **Configure Google OAuth** (see `SETUP_OAUTH.md` for full walkthrough)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project → Enable **Google Drive API** + **Google Docs API**
   - Create OAuth 2.0 credentials (Chrome App type)
   - Copy your Client ID

3. **Update `manifest.json`**
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com"
   }
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** → select the extension folder

5. **Sign in**
   - Click the extension icon → **Sign in with Google**
   - Grant Drive and Docs permissions

---

## Usage

### Automatic Detection
Just browse normally. The extension scans every page in the background and saves AI/useful sites automatically.

### Popup
- See recently collected sites with descriptions, type badges, and confidence scores
- Filter: **All / AI / Useful**
- Toggle **Auto-sync**, **Notifications**, **Dark mode**
- Manually **Sync to Drive**
- Open the **Widescreen Dashboard**

### Widescreen Dashboard
- Real-time live search across all collected sites
- Category filtering
- Individual site card deletion (`×`)
- Custom keyword CRUD manager
- Account settings and sync controls

---

## Privacy & Security

- All data stored locally on your device (`chrome.storage.local`)
- Google Drive sync uses OAuth 2.0 — your password is never stored
- No third-party analytics or tracking
- Only writes to one specific Google Doc (`AI_Site_Collector_Database`)
- Login/auth pages are never captured

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension not detecting sites | Refresh the page, wait 2–3 s for scan |
| Sync failed error | Re-authenticate via popup; check Drive API is enabled |
| Settings reset after reload | Update to v3.1+ (fixed — preferences now survive reloads) |
| Sync shows "already up to date" | All detected sites already exist in the Google Doc |
| Google Doc not found | Extension auto-creates one on next sync |
| Notifications not showing | Toggle "Show notifications" OFF then ON again |

---

## Tech Stack

- **Vanilla JavaScript** (no frameworks, fully offline classification)
- **Chrome Extensions MV3** (service worker + content scripts)
- **Chrome Storage API** — local persistence + reactive `onChanged` sync
- **Google Drive API v3** — file search and metadata
- **Google Docs API v1** — document read (export) and write (`batchUpdate`)
- **Chrome Identity API** — OAuth 2.0 token management

---

## License

This project is provided as-is for personal use.
