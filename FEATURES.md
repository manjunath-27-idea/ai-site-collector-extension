# AI Site Collector - Features Overview

## Core Features

### 🤖 Intelligent Website Detection

The extension uses a sophisticated multi-factor analysis to identify AI and useful websites:

**AI Website Detection:**
- **Dynamic Path-Level Lookup:** Matches specific tool sub-paths on major hostnames (e.g. `copilot.github.com`, `github.com/features/copilot`, `aws.amazon.com/q`, `codeium.com/windsurf`) fixing the legacy hostname-only matching limitation.
- **AI-Centric TLD Detections:** Automatically scans and corroborates contemporary AI-specific extensions: `.ai`, `.bot`, `.chat`, and `.agent`.
- **Integrated URL Context Parsing:** Domain names and URL path parameters are cleaned and included in the classifier's text corpus.
- **Direct AI Catcher:** Immediately captures pages containing `ai`, `agent`, `artificial intelligence`, or `agentic` in dynamic URL strings or headers.
- **Confidence Scoring:** Fully weighted heuristics evaluate site headers and URLs, generating scores and robust tags.

**Useful Website Detection:**
- **Cybersecurity & Pentesting Fallbacks:** Added weighted cybersecurity keywords (`pentest`, `pentesting`, `penetration testing`, `security scanner`, `vulnerability`) to capture developer-centric testing platforms.
- **Productivity & Resource Profiling:** Identifies frameworks, library docs, developer tools, and software solutions.

**Confidence Scoring:**
- High (80-100%): Strong indicators of AI/useful site (or verified KB entries)
- Medium (50-80%): Some relevant keywords/patterns found in metadata or URL path
- Low (<50%): Possible match but uncertain

### 📊 Widescreen Options Dashboard Website UI

A fullscreen dashboard interface opened via `chrome.runtime.openOptionsPage()` that fits widescreen layouts elegantly:
- **Responsive Multi-column Grid:** Shows your collected websites in interactive cards.
- **Real-time Live Search:** Search bar to instantly filter collected sites by title, URL, or description.
- **Category Filters:** Quick category buttons to filter between All, AI Sites, or Useful Sites.
- **Individual Card Deletion:** Hovering over any card displays a quick Delete button (`×`) to dynamically remove that specific site from the database.

### 💾 Google Drive Integration

**Hands-Free Cloud Sync:**
- One-click manual or background auto-sync to backup your collection.
- **Robust Self-Healing OAuth Token Refresh Pipeline:** Intercepts `401 Unauthorized` responses from expired user tokens (tokens naturally expire every 1 hour), silently clears the stale token cache via `chrome.identity.removeCachedAuthToken`, requests a fresh token, and automatically retries the synchronization transparently without user intervention.
- Auto-discovers and reconnects to the extensionless document **`AI_Site_Collector_Database`** or auto-creates it on first sync.
- Strict security boundary validation that refuses to write or list any file other than `AI_Site_Collector_Database` to block traversal attacks.
- Standard **Option 2 Clean Markdown (.md)** sync format (emoji-free, spaced headings, bulleted lists, and clickable raw URLs).

**Markdown Database Document Schema:**
- **Title Header:** `### [Platform/Website Name]`
- **URL Property:** Raw clickable website URL only (e.g. `* **URL:** https://manus.im/`).
- **Type Category:** Classifications mapped cleanly as `AI Platform` or `Useful Tool`.
- **Description:** Prioritizes live instantly scraped page description over static fallback summaries.
- **Features List:** Dynamic tags deep-scanned from live metadata (e.g., `agent, chatbot, workflows, coding`).
- **Deduplication Filter:** Evaluates file content and skips writing any sites whose URLs are already stored.

### 🎨 Premium UI Design

**Dark Mode Interface:**
- Eye-friendly dark theme (#0f172a background)
- Gradient accents (indigo to purple)
- Professional typography
- Smooth animations and transitions

**Responsive Layout:**
- Optimized for popup window (500px width)
- Touch-friendly buttons and controls
- Clear visual hierarchy
- Accessible color contrasts

**Interactive Elements:**
- Smooth tab switching
- Hover effects on site items
- Loading states and feedback
- Toast notifications

### 🔐 Security & Privacy

**Data Protection:**
- All data stored locally on your device
- No tracking or analytics
- No ads or third-party integrations
- OAuth 2.0 for secure Google authentication

**Permissions:**
- `tabs`: Read current tab information
- `storage`: Store collected sites locally
- `scripting`: Inject content script on pages
- `identity`: Google OAuth authentication
- `<all_urls>`: Access all websites

## Advanced Features

### Site Filtering

**Filter Options:**
- **All**: Show all collected sites
- **AI Sites**: Show only AI-related websites
- **Useful Sites**: Show only useful tools and resources

**Search Capability:**
- Filter by site type
- Sort by collection date
- View confidence scores

### Site Management

**Operations:**
- **View Details**: Click any site to see full information
- **Open in New Tab**: Click site to open in browser
- **Clear All**: Delete all collected sites at once
- **Sync History**: Track last sync timestamp

### Settings & Preferences

**Configuration Options:**
- Auto-sync to Drive (toggle)
- Notification preferences (toggle)
- Dark mode (toggle)
- Sign out from Google account

### Metadata Extraction

**Collected Information:**
- Page title
- Full URL
- Meta description
- Favicon (if available)
- Keywords (if available)
- Page classification
- Confidence score
- Collection timestamp

## Technical Features

### Content Analysis

**Page Scanning:**
- Analyzes page title
- Extracts meta descriptions
- Reads Open Graph tags
- Scans first paragraph for fallback
- Extracts keywords from meta tags

**Intelligent Deduplication:**
- Prevents saving duplicate URLs
- Checks against existing collection
- Avoids redundant Drive syncs

### Background Processing

**Service Worker:**
- Runs continuously in background
- Processes content script messages
- Manages Google Drive API calls
- Handles storage operations
- Sends notifications

### 🔄 Dynamic Window Synchronization

- **Fully Reactive Local Storage:** Multi-page synchronization using `chrome.storage.onChanged` ensures that any toggle change, custom keyword modification, account login/logout, or document selection in one window instantly reflects in all other open extension views (such as the popup and options dashboard).

## Performance Features

### Optimization

**Efficient Processing:**
- Minimal CPU usage
- Low memory footprint
- Fast page scanning (2-second delay)
- Cached site data

**Storage Management:**
- Local storage optimization
- Efficient database text generation
- Incremental Drive updates
- Automatic file management

## Extensibility

### Customization Options

**Easy Modifications:**
- Edit keyword lists in `content.js`
- Customize UI colors in `styles.css`
- Modify detection logic in `background.js`
- Adjust popup layout in `index.html`

### Future Enhancement Possibilities

- [ ] Export to multiple formats (JSON, Excel, PDF)
- [x] Custom keyword management UI
- [ ] Site categorization and tagging system
- [x] Advanced search and filtering
- [x] Bulk operations (batch export, delete)
- [ ] Integration with other cloud services
- [ ] Browser sync across devices
- [ ] Scheduled auto-sync
- [ ] Email notifications
- [ ] Webhook integrations

## Browser Compatibility

**Supported Browsers:**
- Chrome 88+
- Edge 88+ (Chromium-based)
- Brave (Chromium-based)
- Opera (Chromium-based)

**Requirements:**
- Google account for Drive integration
- Internet connection for sync
- Chrome extensions enabled

## Usage Statistics

**Typical Usage:**
- **Detection Time**: 2-3 seconds per page
- **Storage**: ~1KB per site (local)
- **Sync Time**: 2-5 seconds (depends on site count)
- **Drive File Size**: ~5KB per 100 sites (TXT)

## Support & Documentation

**Included Documentation:**
- `README.md`: Complete user guide
- `QUICKSTART.md`: 30-second setup
- `SETUP_OAUTH.md`: Google OAuth configuration
- `FEATURES.md`: This file

**External Resources:**
- Chrome Extension Development Guide
- Google Drive API Documentation
- Google OAuth 2.0 Documentation

## Feedback & Improvements

The extension is designed to be:
- **User-Friendly**: Intuitive interface
- **Reliable**: Robust error handling
- **Secure**: Privacy-first approach
- **Performant**: Minimal resource usage
- **Maintainable**: Clean, documented code

For suggestions or improvements, consider:
- Customizing the keyword lists
- Extending the detection logic
- Adding new export formats
- Integrating with other services
