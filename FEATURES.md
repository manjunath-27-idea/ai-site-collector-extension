# AI Site Collector — Features Overview

## 🤖 Intelligent 5-Step Detection Pipeline

Every page you visit is passed through a 5-step classifier inside `js/content.js`:

### Step 1 — Static Knowledge Base (AI_KNOWLEDGE_BASE)
A hand-curated list of 500+ verified AI tools, agents, and platforms embedded directly in `content.js`. Each entry has:
- `domains[]` — all aliases for the platform (e.g. `['cursor.sh', 'cursor.com']`)
- `name` — canonical display name
- `category` — `'ai'` or `'useful'`
- `description` — pre-written accurate description (shown in sync doc)
- `tags[]` — feature labels (e.g. `['code', 'editor', 'llm']`)

Path-level entries are also supported for tools hosted on major platforms:
- `github.com/features/copilot` → GitHub Copilot
- `aws.amazon.com/q` → Amazon Q
- `codeium.com/windsurf` → Windsurf
- `emergent.sh` → Emergent AI *(dual brand name supported)*

### Step 2 — Dynamic Remote Domain Rules
On install, update, and browser startup, `background.js` fetches `domain_rules.json` from GitHub and stores:
- `remoteAiDomains` — dynamically whitelisted AI hostnames
- `remoteUsefulDomains` — dynamically whitelisted developer tools
- `remoteAuthGateways` — login/OAuth pages to skip

Input validation prevents XSS/prototype pollution: all entries are regex-screened and length-limited.

### Step 3 — AI-Centric TLD Corroboration
Domains ending in `.ai`, `.bot`, `.chat`, or `.agent` receive a corroboration check against page content. If any of these appear in the text:
`generative`, `llm`, `chatbot`, `machine learning`, `agentic`, `automate`, `pentest`, `cybersecurity`
→ Site is classified as AI with `confidence: 0.80`.

### Step 4 — Weighted Keyword Scoring
Full page text corpus (title + description + OG tags + URL path + meta keywords) is scored against:

**AI Keywords** (weighted):
`ai`, `artificial intelligence`, `gpt`, `llm`, `chatbot`, `generative`, `agentic`, `autonomous`, `machine learning`, `neural`, `transformer`, `copilot`, `agent`, `workflow`, `model`, `deep learning`

**Useful Keywords** (weighted):
`developer tool`, `open source`, `framework`, `library`, `documentation`, `pentest`, `pentesting`, `penetration testing`, `security scanner`, `vulnerability`, `cybersecurity`, `productivity`, `automation`

Scores above threshold → classified with confidence `0.65–0.90`.

### Step 5 — Auth Page Filter
Any URL or page matching login patterns (`/login`, `/auth`, `/signin`, `/oauth`, `/register`) or known auth gateways (`accounts.google.com`, `okta.com`, `auth0.com`, etc.) is **excluded** — never saved.

---

## 💾 Google Drive Sync — Google Docs Format Only

All Drive operations use **only** `application/vnd.google-apps.document` (Google Doc). No `.txt` files are ever created, listed, or accepted.

### Auto-Discovery & Creation
1. Queries Drive: `name='AI_Site_Collector_Database' and mimeType='application/vnd.google-apps.document'`
2. Reuses existing doc if found; creates a new one if not
3. Writes an initial header on creation using the Docs `batchUpdate` API
4. Saves `driveDocId` to `chrome.storage.local` — persisted for all future syncs

### Append-Only Deduplication
- Exports the Google Doc as plain text via Drive API
- Filters sites by checking if their URL already exists in the document
- Only new, unseen sites are appended — zero duplicates

### Document Sync Format (per batch)
```
============================================================
SYNC UPDATE — 29/05/2026, 1:30:00 pm | 3 new site(s)
============================================================

1. ChatGPT
   URL         : https://chatgpt.com/
   Type        : AI Platform
   Description : ChatGPT is an AI-powered conversational assistant by OpenAI.
   Features    : chatbot, llm, generative, free, api
   Saved       : 29/05/2026, 1:28:00 pm

──────────────────────────────────────────────────────────
```

### Auto-Sync on Site Discovery
When `autoSyncSetting === true` (default), the extension calls `syncToDrive()` automatically whenever a new site is saved — no manual sync needed.

### Self-Healing OAuth Pipeline
- Intercepts `401 Unauthorized` from expired tokens (expire after ~1 hour)
- Calls `chrome.identity.removeCachedAuthToken` to purge stale token
- Calls `chrome.identity.getAuthToken({ interactive: false })` for silent refresh
- Retries sync automatically — no user action required

---

## 📊 Widescreen Options Dashboard

Opened via `chrome.runtime.openOptionsPage()` in its own full browser tab:

- **Real-time search** — filters collected sites by title, URL, or description instantly
- **Category filters** — All / AI Sites / Useful Sites
- **Individual card deletion** — hover to reveal × button, removes site from local storage
- **Custom keyword CRUD** — add/remove custom AI or useful keywords with tag UI
- **Account panel** — shows signed-in avatar + email, sign-out with confirmation dialog
- **Drive sync status** — shows last sync timestamp and manual sync button
- **Reactive sync** — all changes from popup (settings, keywords, auth) reflect instantly via `chrome.storage.onChanged`

---

## 🔔 Notifications

When a new site is detected and saved, Chrome sends a desktop notification:
> **"Site Saved!"**
> "ChatGPT has been saved."

Controlled by the **Show Notifications** toggle in Settings. The toggle value is read from `chrome.storage.local` at the moment of saving — toggling it OFF immediately stops all future notifications.

---

## ⚙️ Settings — Persist Across Reloads

| Setting | Default | Key |
|---|---|---|
| Auto-sync to Drive | ON | `autoSyncSetting` |
| Show notifications | ON | `notificationsSetting` |
| Dark mode | OFF | `darkModeSetting` |

**Fixed in v3.1:** `onInstalled` now checks `details.reason === 'install'`. User preferences are **never reset** on extension update or developer-mode reload. On updates, only domain lists are refreshed; user toggle states are read from storage and preserved.

---

## 🔑 Custom Keyword Scanner

Users can define custom keywords to detect platforms the built-in KB might miss:

- Added under **Settings → Custom Site Finding Keywords**
- Two categories: **AI Site** or **Useful Site**
- Stored in `customAiKeywords[]` and `customUsefulKeywords[]` in `chrome.storage.local`
- `content.js` reads these on every page load and merges them into the keyword scoring pipeline
- Tags are displayed in both the popup and the dashboard

---

## 🔄 Reactive Multi-Window Sync

All UI windows (popup + options dashboard) stay in sync via `chrome.storage.onChanged`:
- Toggle a setting in popup → Options Dashboard updates immediately
- Add a keyword in Dashboard → Popup reflects it instantly
- Sign in/out → All windows update auth state in real time
- New site detected → Both popup and dashboard refresh automatically

---

## 🎨 UI Design

- **Dark theme** by default — background `#0f172a`, gradient accents indigo→purple
- **Glassmorphism slider toggles** for settings
- **Smooth animations** on hover, card reveal, and modal open/close
- **Keyword tag chips** with remove (×) button
- **Confidence score badges** per site card
- **Category type badges** — `AI Platform` or `Useful Tool`
- **Profile avatar** — circular gradient badge showing first letter of signed-in email

---

## 🔐 Security & Privacy

- All data stored locally — `chrome.storage.local`
- OAuth 2.0 — password never stored or seen by extension
- No tracking, no analytics, no third-party connections
- Drive API writes only to `AI_Site_Collector_Database` Google Doc
- Auth pages fully excluded from collection
- Domain rules fetched from GitHub with strict regex validation (prevents prototype pollution)

---

## 📦 API Integrations

| API | Purpose |
|---|---|
| **Google Drive API v3** | Search for existing Google Doc, auto-create if missing |
| **Google Docs API v1** | Write initial header, append sync batches (`batchUpdate`) |
| **Chrome Identity API** | OAuth token fetch, silent refresh, cache removal |
| **Chrome Storage API** | Local site persistence, settings, reactive cross-window sync |
| **Chrome Notifications API** | Desktop notification on site save |
| **Chrome Runtime API** | Message passing between content script → background → popup |
| **GitHub Raw Content** | Fetch `domain_rules.json` for dynamic classification updates |

---

## 📋 Detected Categories

### AI Platforms (examples)
ChatGPT, Claude, Gemini, Perplexity, Midjourney, Cursor, GitHub Copilot, Runway, ElevenLabs, Suno, Udio, Hugging Face, Replicate, Cohere, Mistral, DeepSeek, Manus, Emergent AI, and 500+ more.

### Useful Tools (examples)
GitHub, Stack Overflow, Figma, Notion, Vercel, Supabase, Linear, Postman, VS Code Web, CodePen, StackBlitz, npm, MDN, and more.

### Cybersecurity / Pentest AI
`pentest.ai`, `pentesting.ai`, and any security tool detected via `pentest`, `penetration testing`, `vulnerability scanner`, `cybersecurity` keywords.

---

## 🚀 Performance

| Metric | Value |
|---|---|
| KB lookup | < 1ms (in-memory) |
| Full page scan delay | 2 seconds after DOM load |
| Drive sync time | 2–8 seconds depending on doc size |
| Storage per site | ~1 KB local |
| Drive doc size per 100 sites | ~8 KB (Google Doc) |
