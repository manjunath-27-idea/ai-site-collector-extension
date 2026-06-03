# AI Site Collector — Chrome Extension

> Automatically detects, classifies, and saves AI & useful websites to a dedicated database file inside your personal **Google Drive** — hands-free, with real-time notifications, a widescreen dashboard, and granular field-level locking.

---

## Recent Updates (v3.4.9)

Our latest update brings granular field-level locking, intelligent description merging, and a built-in developer reload panel:

- **🔒 Suffix-Based Field Locking** — Lock any individual field (Title, Description, Features, Classification) against auto-updates by clicking its inline `*` indicator. Locked fields end with ` *` in storage; overridden fields end with ` **`. The background scraper skips updating locked fields entirely.
- **📝 Sentence-Based Description Merging** — When a site is rescanned, new description sentences are merged into the existing description sentence-by-sentence (case-insensitive union), never overwriting user edits.
- **🔄 Developer Git Updates Panel** — A dedicated card in Settings fetches the remote GitHub `manifest.json` and compares the version number to alert you to available updates. A **Reload Extension** button triggers `chrome.runtime.reload()` instantly.
- **🔑 Stable Extension ID** — The `"key"` field in `manifest.json` pins the extension to a permanent Chrome ID so stored data is never lost across reloads.
- **🏷️ Asterisk UI Indicators** — Gold `*` for locked, green `**` for overridden, faint grey `*` for unlocked (brightens on hover) — no star buttons, just clean inline markers.

---

## Features at a Glance

| Feature | Status |
|---|---|
| Intelligent 5-step AI classifier | ✅ Active |
| Static Knowledge Base (500+ AI tools) | ✅ Active |
| Dynamic domain rules from GitHub | ✅ Active |
| Granular suffix-based field locking | ✅ Active (v3.4.9) |
| Sentence-based description merging | ✅ Active (v3.4.9) |
| Developer git update checker & reload | ✅ Active (v3.4.9) |
| Stable extension ID via manifest key | ✅ Active (v3.4.9) |
| Dedicated Google Drive folder (`AI Site Collector`) | ✅ Active |
| Auto-sync on site discovery | ✅ Active |
| Sync status badges (orange count / green ✓) | ✅ Active |
| Settings persist across extension reloads | ✅ Fixed (v3.1) |
| Widescreen Options Dashboard | ✅ Active |
| Custom keyword scanner | ✅ Active |
| Self-healing OAuth token refresh | ✅ Active |
| Dark mode | ✅ Active |
| Cybersecurity / Pentest AI detection | ✅ Active |

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

Dual brand names are recorded where applicable — for example, `Emergent AI (emergent.sh)`.

### STEP 2 — Dynamic Remote Domain Rules
On install, update, and browser startup, `background.js` fetches `domain_rules.json` from GitHub and stores three lists in `chrome.storage.local`:
- `remoteAiDomains` — known AI platform hostnames
- `remoteUsefulDomains` — known useful developer tools
- `remoteAuthGateways` — login/auth pages to skip

These are merged with the static KB in `content.js` at scan time.

### STEP 3 — AI-Centric TLD Corroboration
Domains ending in `.ai`, `.bot`, `.chat`, or `.agent` are checked for corroborating content signals (generative AI, machine learning, agentic, pentest, cybersecurity mentions). A match earns `isAI = true` with `0.80` confidence.

### STEP 4 — Weighted Keyword Scoring
Full page text (title + description + meta keywords + URL path) is scored against two weighted keyword lists:
- **AI Keywords:** `ai`, `artificial intelligence`, `gpt`, `llm`, `chatbot`, `generative`, `agentic`, `autonomous`, `machine learning`, etc.
- **Useful Keywords:** `developer tool`, `open source`, `framework`, `library`, `pentest`, `cybersecurity`, `penetration testing`, `security scanner`, etc.

Sites scoring above threshold are classified accordingly.

### STEP 5 — Auth Page Filter
Any page matching known auth gateways or login URL patterns (`/login`, `/auth`, `/signin`, `/oauth`) is **excluded** to avoid capturing sign-in screens.

---

## 🔒 Field Locking System (v3.4.9)

The extension supports **granular, field-level locking** — you can lock just the title, just a specific description sentence, or just the features list, without locking the whole card.

### How Locking Works
Locks are stored as **suffixes on the string values themselves** in `chrome.storage.local`:

```
Locked field:     "My Custom Title *"
Overridden field: "My Description with edits **"
Normal field:     "Auto-generated description"
```

When the background scraper runs, it reads the stored string, checks for the suffix, and skips updating that field entirely if locked. This means user edits always survive re-scans.

### Lock Indicators in the UI
Each field shows a small asterisk next to it:
- **Faint grey `*`** (hover to focus) → Unlocked, will auto-update
- **Gold `*`** → Locked against auto-updates
- **Green `**`** → Overridden / manually edited by you

Click the indicator to toggle between locked and unlocked states.

### Description Merging
When a description is **not locked**, instead of overwriting it, incoming new content is merged **sentence by sentence** using a case-insensitive union. Your existing sentences are preserved; only genuinely new sentences are appended.

---

## Google Drive Integration

All sync operations use a **plain-text Markdown file** (`AI_Site_Collector_Database.md`) placed inside a dedicated folder named **`AI Site Collector`** in your personal Google Drive.

### Folder Organization
The extension automatically discovers or creates the `AI Site Collector` folder and scopes all file operations to it.

### Auto-Discovery
On first sync:
1. Resolves or creates the parent folder `AI Site Collector`.
2. Searches inside for `AI_Site_Collector_Database.md`.
3. Reuses existing file if found; creates a new one if not.
4. Caches folder ID and file ID in `chrome.storage.local` for fast future syncs.

### Continuous Sync
Sites are written to Drive sorted newest-first. If an existing site is rescanned with enriched descriptions or new features, it is marked `synced: false` and the database is updated automatically.

### Sync Format (per site)
```
============================================================
SYNC UPDATE — 03/06/2026, 10:30:00 pm | 3 new site(s)
============================================================

1. ChatGPT
   URL         : https://chatgpt.com/
   Type        : AI Platform
   Description : ChatGPT is an AI-powered conversational assistant by OpenAI.
   Features    : chatbot, llm, generative, free, api
   Saved       : 03/06/2026, 10:28:00 pm

──────────────────────────────────────────────────────────
```

---

## File Structure

```
ai-site-collector-ext/
├── manifest.json               # MV3 config, OAuth scopes, stable key
├── domain_rules.json           # Remote domain whitelist (synced from GitHub)
├── js/
│   ├── content.js              # Classifier: 5-step detection + KB (500+ entries)
│   └── background.js           # Service worker: storage, Drive API, OAuth, locking
├── popup/
│   ├── index.html              # Popup UI: site list, lock indicators, settings
│   ├── styles.css              # Glassmorphism, sync badges, lock asterisk styles
│   └── popup.js                # Popup logic: filter, sync, field locking, reload panel
├── options/
│   ├── index.html              # Widescreen dashboard
│   ├── styles.css              # Grid layout, responsive cards, lock indicators
│   └── options.js              # Dashboard: search, delete, field locking, reload panel
├── icons/
│   ├── icon-16.png             # Neon AI themed icon
│   ├── icon-48.png             # Neon AI themed icon
│   └── icon-128.png            # Neon AI themed icon
├── README.md
├── CHANGELOG.md                # Full version history from git log
├── FEATURES.md                 # Deep-dive feature documentation
├── UPDATE_NOTES.md             # Human-readable update notes per version
├── QUICKSTART.md               # Quick setup guide
├── SETUP_OAUTH.md              # Google OAuth setup instructions
└── INSTALLATION_CHECKLIST.md  # Step-by-step install checklist
```

---

## Installation & Setup Guide

### Prerequisites
- Google Chrome 88+ (or Chromium-based browsers: Edge, Brave, Opera)
- A Google account to sync collections with your Google Drive
- [Git](https://git-scm.com/) installed (recommended — enables the built-in update workflow)

### Setup Steps

> **No OAuth setup or `manifest.json` editing required.** The extension ships with a pre-configured OAuth client and a pinned `"key"` field — just clone, load, and sign in.

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/manjunath-27-idea/ai-site-collector-extension.git
   ```

2. **Load the Extension in Developer Mode:**
   - Open a new tab and go to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the cloned `ai-site-collector-extension` folder
   - The extension icon appears in your Chrome toolbar

3. **Authenticate & Link Google Drive:**
   - Click the extension icon → **Sign in with Google**
   - Complete the OAuth consent screen (grants Drive file access only)
   - The extension automatically creates `AI_Site_Collector_Database.md` inside an `AI Site Collector` folder in your Drive

That's it — the extension is live and collecting sites immediately.

---

## Updating the Extension

This extension uses a **`.pem`-derived manifest `"key"`** to lock the Chrome Extension ID permanently. This means:

- The extension always loads with the **same Chrome ID** across clones, reloads, and `git pull` updates.
- Your stored site data, settings, and Google Drive links are **never broken** by an update.
- You **never need to re-authenticate** after pulling updates.

### How to Pull & Apply Updates

**Step 1 — Pull the latest code from GitHub:**
```bash
git pull origin main
```

**Step 2 — Reload the extension inside Chrome:**

You don't need to go to `chrome://extensions/` manually. The extension has a built-in **Developer Updates** panel:

- Open the popup (click the extension icon) → go to **Settings**
- Or open the **Options Dashboard** → go to **Settings & Drive** tab
- Find the **"Developer Updates"** card — it shows:
  - ✅ Your currently installed version
  - 🔄 The latest version available on GitHub (fetched live)
  - An **"Update available — run `git pull`"** alert if the remote is ahead
- Click **Reload Extension** → the extension instantly restarts with the new code, no tab refresh needed

### Version Checking
The version comparator fetches the raw `manifest.json` from the GitHub repository and compares the `"version"` field to the locally installed version. If they differ, a warning banner appears — run `git pull`, then click **Reload Extension**.

---

## How to Use the Extension

### 1. Hands-Free Website Scanning
Just browse normally. The extension analyses every page in the background. If classified as an AI Platform or Useful Tool, the record is saved locally and a desktop notification appears. With **Auto-sync** ON, your Drive database updates instantly.

### 2. Field Locking
On any site card (popup or dashboard), click the inline `*` next to a field to lock it. Locked fields show gold `*`. Click again to unlock. Overridden fields (where you manually edited the text) show green `**`.

### 3. Dashboard Management
Open the Options Dashboard (right-click extension → Options):
- **Live Search** — filter sites by title, URL, description, or tags
- **Category Tabs** — All / AI Sites / Useful Sites
- **Custom Keywords** — add keywords to extend the classifier
- **Settings & Drive** — manage sync, notifications, dark mode, and developer reload

### 4. Manual Sync & Status
- Sync badges display an **orange count** for pending sites
- Click the sync cycle button to trigger a manual sync
- Once synced, the button and badge turn **green `✓`**

### 5. Developer Updates (Git Users)
In Settings, the **Developer Updates** card shows:
- Your current installed version
- Remote GitHub version
- A **Reload Extension** button to apply `git pull` changes instantly

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension not detecting sites | Refresh the page and wait 2 seconds. The script runs on `document_idle`. |
| Sync is failing | Log out and sign in again to refresh expired OAuth tokens. |
| Field lock `*` not appearing | Reload the extension from the Developer Updates card in Settings. |
| Count badges don't turn green | Ensure all sites have `synced: true` — trigger a manual sync. |
| Drive folder/file not showing | Verify you logged in with the correct Google account. Open Drive and locate `AI Site Collector` folder. |
| Notifications not firing | Allow Chrome notifications in your OS settings, and ensure the **Show notifications** toggle is ON. |
| Extension ID changed after reload | Add the `"key"` field to your `manifest.json` (see `SETUP_OAUTH.md`). |

---

## Technical Stack & Permissions

- **Architecture:** Manifest V3 Service Worker (`background.js`) + Content Script (`content.js`)
- **Tech:** Pure Vanilla HTML5, CSS3 (dark mode, glassmorphism), and JavaScript (no frameworks)
- **Chrome Permissions:**
  - `tabs`, `activeTab` — page scanning
  - `storage` — local persistence and reactive cross-window sync
  - `scripting` — content script injection
  - `identity`, `identity.email` — OAuth 2.0 token management
  - `notifications` — desktop alerts on site saves
- **Drive Integration:** Google Drive REST API v3 + Google Docs API v1

---

## License

This project is provided as-is for personal use.

**Repository:** https://github.com/manjunath-27-idea/ai-site-collector-extension
**Current Version:** 3.4.9
