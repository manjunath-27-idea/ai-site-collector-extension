# AI Site Collector - Chrome Extension

A premium-styled Chrome extension that automatically detects and saves AI and useful websites to Google Drive with detailed descriptions and confidence metrics.

## Features

✨ **Automatic Detection & Priority AI Classifier**
- **AI Classification Priority:** Core scanner gives absolute priority to AI platforms (checks known domains, then checks for direct mentions of `"AI"` or `"Artificial Intelligence"`).
- **Fallback Keyword Scan:** Checks secondary AI keywords (such as `gpt`, `llm`, `chatbot`, `generative`, etc.) only if the primary broad signature does not exist.
- **Strict Authentication Exclusions:** Standard login/sign-in pages and dynamically rendered AI auth landing pages (e.g. `https://chatgpt.com/auth/login`) are completely excluded from capturing.
- **Privacy-First Truncation:** Subpages and chat session URLs of AI websites are cleaned to keep *only* their main domain origin (e.g., `https://chatgpt.com/`). Saved titles are cleaned to *only* hold the base platform name (e.g., `ChatGPT`).

📊 **Widescreen Options Dashboard**
- Fullscreen dashboard interface running inside a dedicated tab.
- Responsive multi-column layout showing collected sites with descriptions, metadata, and tags.
- Live real-time search that instantly filters titles, URLs, and descriptions.
- Category filters to show All, AI Sites, or Useful Sites.
- Dynamic individual site card deletion (`×`) to prune your collection.
- Custom keywords tags list manager (CRUD) to customize background scanners.

💾 **Hands-Free Google Drive Sync**
- **Automated Discovery & Reconnection:** Automatically searches your Drive for `AI_Site_Collector_Database` or creates a new one with secure headers if missing.
- **Strict Security Filename Sandbox:** Validates file names at listing, selection, and sync boundaries. Refuses to accept, list, or write to any file other than the exact filename `AI_Site_Collector_Database` to block traversal attacks.
- **Option 2 Markdown Format:** Synced in a clean, emoji-free, readable Markdown document format (.md) with clickable raw URLs and spaced lists.
- **Deduplicated Appends:** All synced data is filtered by URL against current document content, keeping your collection perfectly unique and duplicate-free.
- **One-click authentication** with Google OAuth.

🎨 **Premium UI Design**
- Dark mode interface with gradient accents
- Smooth animations and transitions
- Responsive design
- Professional typography and spacing

## Installation

### Prerequisites
- Google Chrome browser (version 88+)
- Google account for Drive integration

### Setup Steps

1. **Clone or Download**
   ```bash
   git clone <repository-url>
   cd ai-site-collector-ext
   ```

2. **Configure Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Drive API
   - Create OAuth 2.0 credentials (Chrome App type)
   - Copy your Client ID

3. **Update Manifest**
   - Open `manifest.json`
   - Replace `YOUR_CLIENT_ID` with your actual Google OAuth Client ID:
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     ...
   }
   ```

4. **Load Extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `ai-site-collector-ext` directory

5. **Grant Permissions**
   - Click the extension icon in Chrome
   - Click "Sign in with Google"
   - Authorize the extension to access your Google Drive

## Usage

### Automatic Collection
- Simply browse the web normally
- The extension automatically detects AI and useful websites
- Detected sites appear in the popup window

### View & Manage Collected Sites
- **Extension Popup:** Click the extension icon in your toolbar to see a scrollable checklist of recently captured sites, filter categories, select document, clear history, or manually trigger syncs.
- **Widescreen Dashboard:** Click the grid dashboard icon in the popup header to open the fullscreen Options Dashboard. Here you can run live searches, delete individual cards, and fully manage custom keywords.

### Custom Keywords Scanner
1. Open the Options Dashboard or the Settings Modal.
2. Under **Custom Site Finding Keywords**, type in your preferred platform name or technology tags (e.g. `openai`, `react`, `canvas`).
3. Select a category ("AI Related" or "Useful Tool/Resource") and click "Add".
4. The background scanner will immediately detect and capture any webpages matching your custom keyword tags as you browse the web!

### Settings
1. Click the settings icon (⋮)
2. Configure:
   - Auto-sync to Drive
   - Notification preferences
   - Dark mode (if available)
3. Sign out from your Google account

## File Structure

```
ai-site-collector-ext/
├── manifest.json           # Extension configuration
├── README.md              # This file
├── icons/
│   ├── icon-16.png        # 16x16 icon
│   ├── icon-48.png        # 48x48 icon
│   └── icon-128.png       # 128x128 icon
├── js/
│   ├── content.js         # Content script (runs on all pages)
│   └── background.js      # Service worker (handles storage & Drive API)
├── popup/
│   ├── index.html         # Popup UI (scrollable collection & settings modal)
│   ├── styles.css         # Premium slider toggles, keyword tag styling
│   └── popup.js           # Popup interactions & dynamic synchronizer
└── options/
    ├── index.html         # Widescreen Options Dashboard
    ├── styles.css         # Premium grid, responsive layout, sidebar card
    └── options.js         # Dashboard CRUD, search, document selector
```

## How It Works

### Architectural Flow

The extension operates in four fully integrated phases:

1. **Extraction (`js/content.js`):** Injected on DOM load. Extracts titles, urls, favicons, meta keywords, and prioritizes the **live scraped description** of the page instantly. Securely guards metadata query selectors to avoid page parser crashes.
2. **Classification (`js/content.js`):** 
   - **Knowledge Base (STEP 1):** Zero-latency matching against verified AI tools and agents (e.g. ChatGPT, Claude, Kimi AI, Manus). Direct matches bypass authentication page filters to guarantee invite/login screen saves.
   - **AI/Agent Keyword Catcher (STEP 2):** Immediately classifies any pages containing `ai`, `agent`, `artificial intelligence`, `artificial intelligent`, or `agentic` in title or live description, setting categories as AI with `0.85` confidence.
   - **Fallback Weighted Scoring:** Scores page elements against a keyword list. Discards authentication or system-only interfaces (like password resets) unless pre-verified in the KB. Cleans chat subpages to root origins.
3. **Storage & Multi-Page Syncing:** Upgrades local collection items in `chrome.storage.local` if later visits extract a richer description or new tags. Propagates all state changes instantly across Options Dashboard and Popup UI using `chrome.storage.onChanged` reactions.
4. **Google Drive Syncing (`js/background.js`):** Incrementally appends new sites to the extensionless document **`AI_Site_Collector_Database`**. Cleans and sanitizes legacy `.txt` cached properties from local storage. Syncs in standard **Option 2 Clean Markdown (.md) format** (emoji-free, bulleted lists, clickable raw URLs only, no confidence or timestamp clutter).

## Detected AI Keywords
- AI, Artificial Intelligence, Machine Learning, Deep Learning
- Neural Networks, GPT, LLM, Language Model, Chatbot
- Generative AI, Transformer, NLP, Computer Vision
- Algorithm, Model, OpenAI, Anthropic, Google AI, Meta AI, Mistral

## Detected Useful Keywords
- Tool, Productivity, Automation, Framework, Library
- Development, Design, Analytics, Dashboard, API
- Documentation, Tutorial, Guide, Resource, Platform
- SaaS, Service, Software, Application, Solution

## Privacy & Security

- ✅ All data is stored locally on your device
- ✅ Google Drive sync uses OAuth 2.0 (secure authentication)
- ✅ No tracking or analytics
- ✅ No ads or third-party integrations
- ✅ You control what gets synced

## Troubleshooting

### Extension not detecting sites
- Check that the extension is enabled
- Refresh the webpage
- Ensure the site has proper metadata

### Google Drive sync not working
- Verify you're signed in (check popup)
- Check your Google Drive quota
- Try signing out and back in

### Icons not showing
- Ensure all icon files are present in the `icons/` directory
- Reload the extension (chrome://extensions/)

## Development

### Technologies Used
- **Vanilla JavaScript**: Fully offline execution
- **Chrome Storage API**: Local data persistence
- **Google Drive API**: Cloud synchronization
- **CSS3 Slider Toggles**: Premium glassmorphic interface

### Customization
- Edit `js/content.js` to modify detection keywords
- Edit `popup/styles.css` to change the UI theme
- Update `manifest.json` to add new permissions

## Future Enhancements
- [ ] Export to other formats (JSON, Excel, PDF)
- [x] Custom keyword management UI
- [ ] Site categorization and tagging
- [x] Search and filtering
- [x] Bulk operations (batch delete)
- [ ] Integration with other cloud services

## Support

For issues or feature requests, please:
1. Check the troubleshooting section
2. Review the file structure and setup steps
3. Ensure all permissions are granted

## License

This project is provided as-is for personal use.

## Credits

Built with premium design principles and modern web technologies.
