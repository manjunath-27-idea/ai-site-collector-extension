# AI Site Collector - Chrome Extension

A premium-styled Chrome extension that automatically detects and saves AI and useful websites to Google Drive with detailed descriptions and confidence metrics.

## Features

✨ **Automatic Detection**
- Intelligently identifies AI platforms and useful websites while you browse
- Analyzes page content, metadata, and domain patterns
- Provides confidence scores for each detection

📊 **Rich Analytics Dashboard**
- View collected sites with descriptions and metadata
- Interactive charts showing distribution and confidence levels
- Timeline visualization of collection activity
- Filter sites by type (AI or Useful)

💾 **Google Drive Integration**
- Seamlessly sync all collected sites to Google Drive as CSV files
- One-click authentication with Google OAuth
- Automatic file management and updates

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

### View Collected Sites
1. Click the extension icon
2. Go to the "Sites" tab
3. Browse all collected websites with descriptions
4. Filter by "AI Sites" or "Useful Sites"
5. Click any site to open it in a new tab

### Sync to Google Drive
1. Click the "Sync to Drive" button
2. A CSV file will be created/updated in your Google Drive
3. View sync status in the footer

### Analytics
1. Click the "Stats" tab
2. View:
   - Total sites collected
   - Distribution of AI vs Useful sites
   - Confidence level breakdown
   - Collection timeline over the last 7 days

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
└── popup/
    ├── index.html         # Popup UI
    ├── styles.css         # Premium styling
    └── popup.js           # Popup interactions
```

## How It Works

### Detection Algorithm
The extension uses a multi-factor analysis:

1. **Domain Matching**: Checks against a database of known AI platforms
2. **Keyword Analysis**: Scans page title, description, and metadata for AI/useful keywords
3. **Confidence Scoring**: Combines multiple signals into a confidence percentage
4. **Duplicate Prevention**: Avoids saving the same site twice

### Data Storage
- **Local Storage**: Sites are cached locally in Chrome storage
- **Google Drive**: Synced data is stored as CSV files for easy access
- **Privacy**: No data is sent to third-party servers

### Google Drive Integration
- Uses OAuth 2.0 for secure authentication
- Creates files in your Drive root directory
- Files are named: `AI Sites Collection - [DATE].csv`
- Automatically updates existing files on sync

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
- **Manifest V3**: Latest Chrome extension standard
- **Chrome Storage API**: Local data persistence
- **Google Drive API**: Cloud synchronization
- **Chart.js**: Data visualization
- **Vanilla JavaScript**: No external dependencies

### Customization
- Edit `js/content.js` to modify detection keywords
- Edit `popup/styles.css` to change the UI theme
- Update `manifest.json` to add new permissions

## Future Enhancements
- [ ] Export to other formats (JSON, Excel)
- [ ] Custom keyword management
- [ ] Site categorization and tagging
- [ ] Search and filtering
- [ ] Bulk operations
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
