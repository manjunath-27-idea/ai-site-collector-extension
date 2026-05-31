# AI Site Collector — Chrome Extension

> Automatically detects, classifies, and saves AI & useful websites to a dedicated text database file inside your personal **Google Drive** — hands-free, with real-time notifications and a widescreen dashboard.

---

## Recent Updates (v3.3.0)

Our latest update brings significant performance, visual, and stability enhancements:

*   **Dedicated Google Drive Folder:** Stores your database inside a dedicated folder named `AI Site Collector` to keep your Google Drive root clean and organized.
*   **Markdown Database (.md):** Syncs directly to a plain-text Markdown file named `AI_Site_Collector_Database.md` inside the folder. This ensures the database file is native, lightweight, and instantly openable/editable directly in Drive with styled rendering.
*   **Continuous Site Upgrades:** Automatically marks records as `synced: false` and triggers a Drive update if an existing site is rescanned with richer description metadata or new feature tags.
*   **Dynamic Sync Status indicators:** Options sidebar and Popup sync buttons dynamically change color (vibrant green `#22c55e` when fully synced, orange `#f97316` when unsynced). 
*   **Green Checkmark Badge:** Sync buttons display an orange count badge for pending sites, which dynamically updates to a green checkmark `✓` when fully synced.
*   **MV3 Notification Crash Resolution:** Declared extension icons in `web_accessible_resources` and added safe background workers callbacks to prevent image loading crashes.
*   **Safe Classification Guards:** Guarded all `site.classification` references to support old or custom-entered site records that lack classification properties, preventing extension crashes.

---

## Features at a Glance

| Feature | Status |
|---|---|
| Intelligent multi-step AI classifier | ✅ Active |
| Dedicated Folder storage (`AI Site Collector`) | ✅ Active |
| Plain text Markdown format (`.md`) | ✅ Active |
| Dynamic domain rules from GitHub | ✅ Active |
| Auto-sync on site discovery | ✅ Active |
| Settings persist across extension reloads | ✅ Fixed |
| Dynamic Orange/Green Tick Sync Indicators | ✅ Active |
| Widescreen Options Dashboard | ✅ Active |
| Custom keyword scanner | ✅ Active |
| Self-healing OAuth token refresh & recovery | ✅ Active |
| Dark mode | ✅ Active |
| Dual brand/domain name support | ✅ Active |

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
Domains ending in `.ai`, `.bot`, `.chat`, or `.agent` are checked for corroborating content signals (e.g. generative AI, machine learning, agentic, pentest, cybersecurity mentions). A match earns `isAI = true` with `0.80` confidence.

### STEP 4 — Weighted Keyword Scoring
Full page text (title + description + meta keywords + URL path) is scored against two weighted keyword lists:
- **AI Keywords:** `ai`, `artificial intelligence`, `gpt`, `llm`, `chatbot`, `generative`, `agentic`, `autonomous`, `machine learning`, etc.
- **Useful Keywords:** `developer tool`, `open source`, `framework`, `library`, `pentest`, `cybersecurity`, `penetration testing`, `security scanner`, etc.

Sites scoring above threshold are classified accordingly.

### STEP 5 — Auth Page Filter
Any page matching known auth gateways or login URL patterns (`/login`, `/auth`, `/signin`, `/oauth`) is **excluded** to avoid capturing sign-in screens.

---

## Google Drive Integration (Plain Text File in Folder)

All sync operations utilize a **standard plain-text file** (`text/plain` MIME type) placed inside a dedicated folder named **`AI Site Collector`** in your personal Google Drive. 

### Folder Organization
To keep your Google Drive root directory clean, the extension automatically discovers or creates a parent folder named `AI Site Collector` and restricts all search and file operations inside this specific folder.

### Active Sync Database File
The primary database file is named `AI_Site_Collector_Database.md`. Storing as a `.md` file guarantees that the database is native, light, and instantly openable and editable directly within Google Drive or any text editor.

### Auto-Discovery
On first sync, the extension:
1. Resolves or creates the parent folder named `AI Site Collector`.
2. Searches inside this folder for a plain-text file named `AI_Site_Collector_Database.md`.
3. Reuses the existing file if found.
4. Creates a new plain-text file inside the folder if not found, initializes it with a header, and caches the folder and file IDs.

### Overwrite-Sync & Continuous Upgrades
The extension synchronizes local records to Google Drive by sorting all collected sites (newest first) and writing the fully compiled up-to-date database structure. If a scanned site already exists in storage but is saved with enriched descriptions or new features, the extension marks it as `synced: false` and automatically updates the database in Drive.

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
│   ├── index.html              # Popup UI: site list, settings, auth, sync badges
│   ├── styles.css              # Glassmorphism toggles, sync cycle coloring
│   └── popup.js                # Popup logic: filter, sync, settings, keywords
├── options/
│   ├── index.html              # Widescreen dashboard
│   ├── styles.css              # Grid layout, responsive cards, sync cycle badges
│   └── options.js              # Dashboard: search, delete, export, settings
├── icons/
│   ├── icon-16.png             # Declared web-accessible assets
│   ├── icon-48.png             # Declared web-accessible assets
│   └── icon-128.png            # Declared web-accessible assets
├── README.md
├── FEATURES.md
├── UPDATE_NOTES.md
├── QUICKSTART.md
├── SETUP_OAUTH.md
└── INSTALLATION_CHECKLIST.md
```

---

## Installation & Setup Guide

### Prerequisites
- Google Chrome 88+ (or Chromium-based browsers: Edge, Brave, Opera)
- A Google account to sync collections with your Google Drive

### Detailed Setup Steps

1.  **Download the Extension:**
    *   Download and extract the zip archive of the repository, or clone the repository directly using Git:
        ```bash
        git clone https://github.com/manjunath-27-idea/ai-site-collector-extension.git
        ```

2.  **Configure Google OAuth Credentials:**
    *   Follow the comprehensive guide in `SETUP_OAUTH.md` to register your own OAuth client.
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a project and enable the **Google Drive API**.
    *   Configure the OAuth Consent Screen and create an **OAuth Client ID** (select **Chrome Extension** or **Web Application** type).
    *   Copy the generated Client ID.

3.  **Update `manifest.json`:**
    *   Open `manifest.json` in the root of the extension folder.
    *   Locate the `"oauth2"` block and replace the `"client_id"` value with your copied Client ID:
        ```json
        "oauth2": {
          "client_id": "YOUR_COPIED_CLIENT_ID.apps.googleusercontent.com",
          "scopes": [ ... ]
        }
        ```

4.  **Load the Extension in Developer Mode:**
    *   Open a new tab in Google Chrome and navigate to `chrome://extensions/`.
    *   In the top-right corner, toggle the **Developer mode** switch to **ON**.
    *   In the top-left corner, click the **Load unpacked** button.
    *   Select the extracted `ai-site-collector-ext` folder. The extension is now successfully installed.

5.  **Authenticate & Establish Google Drive Link:**
    *   Click on the **Extensions Puzzle Piece** icon in your Chrome toolbar and pin **AI Site Collector**.
    *   Click the extension icon to open the popup interface.
    *   Click **Sign in with Google**.
    *   Complete the OAuth consent screen using your Google account to grant file access.
    *   Once authenticated, the extension will automatically connect or initialize your `AI_Site_Collector_Database.md` inside the `AI Site Collector` folder in your Drive.

---

## How to Use the Extension

### 1. Hands-Free Website Scanning
Just browse the web normally. Whenever you load a page:
*   The extension analyzes the metadata, headers, structures, and keywords in the background.
*   If classified as an AI Platform or a Useful Tool, it adds the record locally and shows a desktop notification.
*   If **Auto-sync to Google Drive** is ON, the database in your Google Drive folder is updated instantly.

### 2. Dashboard Management
Right-click the extension icon and select **Options** (or click **Settings & Dashboard** in the popup) to open the widescreen interface:
*   **Search Bar:** Live search through titles, descriptions, and feature tags.
*   **Navigation Tabs:** Toggle between **Collected Sites**, **Custom Keywords**, and **Settings & Drive**.
*   **Custom Keywords CRUD:** Add custom keywords to classify specific pages (e.g. adding `langchain` as an AI Site, or `n8n` as a Useful Site).
*   **Individual Deletion:** Click the `×` button on any site card to instantly remove it from your local storage and cloud database file.

### 3. Manual Sync & Status indicators
*   If you toggle **Auto-sync** OFF, the sync badges on the Dashboard sidebar and in the Popup will display an orange circle with the count of pending sites (e.g. `3`).
*   Click either sync cycle button to trigger a manual sync.
*   Once synced, the button and the cycle SVG icon turn green, and the orange badge resolves into a green checkmark `✓` badge representing that everything is fully up to date.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension not detecting sites | Refresh the page and wait 2 seconds. The script runs on `document_idle` to avoid slowing down your page. |
| Sync is failing | Make sure you have active internet. Try to log out (Sign Out) and Sign In again to refresh expired tokens. |
| Count badges don't decrease or turn green | Check if you have older sites in storage that crash the formatter. Upgrading to `v3.3.0` resolves this via safe classification check guards. |
| Active Database shows "No document selected" | Authenticate first via the popup. The extension will auto-discover or create the file for you. |
| Google Drive folder/file not showing | Verify you logged in with the correct Google account. Open Google Drive, locate the `AI Site Collector` folder, and open `AI_Site_Collector_Database.md`. |
| Notifications not firing | Make sure Chrome is allowed to send notifications in your Operating System settings and that the "Show notifications" toggle is ON. |

---

## Technical Stack & Permissions

*   **Architecture:** Manifest V3 Service Worker (`background.js`) + Content Script (`content.js`).
*   **Tech:** Pure Vanilla HTML5, CSS3 (harmony color palette and dark mode), and JavaScript.
*   **Chrome Permissions:**
    *   `tabs`, `activeTab` — for page scanning
    *   `storage` — local persistence and reactive synchronization
    *   `identity` — Chrome Identity API OAuth 2.0 token management
    *   `notifications` — Desktop alerts on site saves
*   **Drive Integration:** Google Drive REST API v3 (REST uploads using `uploadType=media`).

---

## License

This project is provided as-is for personal use.
