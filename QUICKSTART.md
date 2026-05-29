# AI Site Collector — Quick Start Guide

## Setup in 4 Steps

### 1. Get Google OAuth Credentials
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project → Enable **Google Drive API** and **Google Docs API**
- Create OAuth 2.0 credentials → Application type: **Chrome App**
- Copy your **Client ID** (format: `xxxx.apps.googleusercontent.com`)

### 2. Update `manifest.json`
```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/documents"
  ]
}
```

### 3. Load in Chrome
- Go to `chrome://extensions/`
- Enable **Developer mode** (top right)
- Click **Load unpacked** → select the extension folder

### 4. Sign In
- Click the extension icon in the toolbar
- Click **Sign in with Google**
- Grant Drive and Docs permissions

---

## You're Ready! 🎉

The extension now:
- ✅ Automatically detects AI and useful websites as you browse
- ✅ Shows them in the popup with descriptions, type badges, and confidence scores
- ✅ Auto-syncs new sites to your **Google Doc** (`AI_Site_Collector_Database`)
- ✅ Sends desktop notifications when a site is saved
- ✅ Opens a full **Widescreen Dashboard** for search, filtering, and keyword management

---

## First Steps

1. **Browse AI sites** — Visit `chatgpt.com`, `claude.ai`, `cursor.sh`, etc.
2. **Check the popup** — Click the extension icon to see detected sites
3. **Open the Dashboard** — Click the grid icon in the popup header for full management
4. **Add custom keywords** — Under Settings → add keywords like `langchain`, `n8n`, `zapier`
5. **Check Google Drive** — Open Drive and find `AI_Site_Collector_Database` (Google Doc)

---

## Need Help?

- `README.md` — Full documentation and feature overview
- `FEATURES.md` — Detailed feature and pipeline explanation
- `SETUP_OAUTH.md` — Step-by-step Google OAuth configuration
- `UPDATE_NOTES.md` — Version history and bug fixes
- `INSTALLATION_CHECKLIST.md` — Verification checklist

---

Enjoy collecting! 🚀
