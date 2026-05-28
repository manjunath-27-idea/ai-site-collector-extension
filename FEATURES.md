# AI Site Collector - Features Overview

## Core Features

### 🤖 Intelligent Website Detection

The extension uses a sophisticated multi-factor analysis to identify AI and useful websites:

**AI Website Detection:**
- Recognizes known AI platforms (OpenAI, Anthropic, Hugging Face, Midjourney, etc.)
- Detects AI-related keywords in page content
- Analyzes domain patterns and metadata
- Provides confidence scores (0-100%)

**Useful Website Detection:**
- Identifies productivity tools and frameworks
- Recognizes development resources and documentation
- Detects design tools and analytics platforms
- Finds APIs and software solutions

**Confidence Scoring:**
- High (80-100%): Strong indicators of AI/useful site
- Medium (50-80%): Some relevant keywords/patterns found
- Low (<50%): Possible match but uncertain

### 📊 Widescreen Options Dashboard Website UI

A fullscreen dashboard interface opened via `chrome.runtime.openOptionsPage()` that fits widescreen layouts elegantly:
- **Responsive Multi-column Grid:** Shows your collected websites in interactive cards.
- **Real-time Live Search:** Search bar to instantly filter collected sites by title, URL, or description.
- **Category Filters:** Quick category buttons to filter between All, AI Sites, or Useful Sites.
- **Individual Card Deletion:** Hovering over any card displays a quick Delete button (`×`) to dynamically remove that specific site from the database.

### 💾 Google Drive Integration

**Hands-Free Cloud Sync:**
- One-click sync and fully automated cloud connection.
- Auto-discovers and reconnects to `AI_Site_Collector_Database.txt` or auto-creates it on first sync.
- Strict security boundary validation that refuses to write or list any file other than `AI_Site_Collector_Database.txt`.
- Structured text append format for persistent historical collection (no database loss).

**Database Schema Format:**
- Title: Clean base platform name (for AI sites) or full title.
- URL: Root domain homepage origin (for AI sites) or full subpage link.
- Description: Structured classification or page summary.
- Type: AI or Useful classification.
- Confidence: Metric value.
- Saved At: Timestamp.

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
