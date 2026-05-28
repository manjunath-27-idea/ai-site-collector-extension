# AI Site Collector - Update Notes

## Version 3.0.1 (Current) - Authentication & Dynamic Synchronization Polishing

### Major Improvements & Bug Fixes

#### 1. **Multi-Window Settings Syncer**
- Connected `popup.js` and `options.js` via the `chrome.storage.onChanged` listener. Toggling **Auto-sync to Drive**, **Show Desktop Notifications**, or **Dark Theme Mode** in one window immediately and reactively updates the UI and themes in all other open views.
- Connected the custom scanner keywords CRUD manager to storage changes. Adding or removing tags instantly syncs on all screens.
- Connected Google Drive document selection changes to refresh document names immediately on all open windows.

#### 2. **Settings Profile Cards**
- Replaced the simple static logout button in the popup settings modal with a premium, dynamic settings profile card matching the Options Dashboard footer.
  - **When Signed Out:** The settings modal hides "Sign Out" entirely and presents an integrated **Sign in with Google** button instead.
  - **When Signed In:** It displays a circular color-gradient letter avatar badge, the active user email address, and a "Sign Out" link.
- Added sign-out confirmation alerts (`confirm()`) to both the popup settings and options dashboard to prevent accidental disconnections.
- Restricted manual Drive sync actions (`driveSyncCard`) in the Options dashboard settings panel so they remain hidden when signed out, displaying a pairing promo card instead.

#### 3. **Options Dashboard Auth Crash Patch**
- Patched a critical `ReferenceError` inside the options dashboard `authenticate()` function where a missing `authBtn` definition caused the script execution to throw a console error and block users from authenticating. The function now dynamically targets the clicked element safely.

#### 4. **Service Worker Auto-Sync Defaults**
- Configured default settings (`autoSyncSetting: true`, `notificationsSetting: true`, `darkModeSetting: false`) upon extension install.
- Fixed `background.js` checking `autoSyncSetting !== false` (meaning true by default) instead of strict `=== true` so that auto-sync works immediately without requiring the user to open and toggle settings.

---

## Version 3.0.0 - Widescreen Options Dashboard, Slider Toggles, Custom Keywords, and MV3 Content Scripts Registration

### New Features

#### 1. **Widescreen Options Dashboard UI**
- A dedicated, responsive, fullscreen **Options Dashboard** page (`options/index.html`) opened in its own browser tab.
- Includes a real-time live search filter to query captured websites by title, URL, or description.
- Interactive category buttons to easily filter grid cards between **All**, **AI Sites**, and **Useful Sites**.
- Individual site card deletion (`×`) to prune specific sites from local storage dynamically.
- Integration launcher button inside the popup header to launch `chrome.runtime.openOptionsPage()`.

#### 2. **Visual Toggle Switches**
- Replaced basic form checkboxes inside settings layouts with premium, tactile glassmorphism slider switches.

#### 3. **Custom Keyword finding Scanner**
- Fully custom scanners integrated: users add and remove custom keyword tags under settings.
- The content script (`content.js`) reads custom keyword lists from storage on page load and merges them dynamically to scan and capture preferred platform technologies.

#### 4. **MV3 Script Injection Fix**
- Added the `"content_scripts"` block to `manifest.json`. Resolves a critical bug where `js/content.js` existed but was never actually registered or injected by Chrome. The script now loads automatically when documents are ready.

---

## Version 2.0 - Single Document Mode with Features

### Major Changes

This update transforms the extension from creating multiple files to using a **single Google Drive document** for all site collections.

### New Features

#### 1. **Single Document Mode**
- Select ONE Google Drive document to store all collected sites
- All new sites are **appended** to the selected document (no data loss)
- Previous data is preserved and never erased
- Easy document switching via the UI

#### 2. **Document Selector**
- New "Select Document" button in the popup
- Browse all your Google Drive files
- Search documents by name
- One-click document selection
- Current document name displayed at all times

#### 3. **Feature Extraction & Display**
- Automatically extracts features/tags from each website
- Features shown in the site list with visual tags
- Features include:
  - Classification reasons (e.g., "Known AI platform")
  - Keywords from page metadata
  - Detected capabilities (free, open source, API, tool, etc.)
  - Limited to top 5 features per site

#### 4. **Enhanced Site Information**
- Website links stored with full URL
- Features displayed as colored tags
- Confidence scores maintained
- Descriptions preserved
- Timestamps for each collection

#### 5. **Improved Sync Process**
- Appends new sites to document instead of replacing
- Formatted sections with timestamps
- Clear organization of each sync batch
- No risk of data loss

### How It Works

#### Setup Process
1. Sign in with Google account
2. Click "Select Document" button
3. Choose a document from your Google Drive
4. Document name appears in the interface
5. Start collecting sites!

#### Collection Process
1. Browse websites normally
2. Extension detects AI/useful sites automatically
3. Sites appear in the popup with features
4. Click "Sync to Drive" to append to your document
5. All previous data is preserved

#### Document Format
Each sync creates a new section in your document:

```
================================================================================
COLLECTION UPDATE: [Date & Time]
Total Sites Added: [Number]
================================================================================

1. [Site Title]
   URL: [Full Website URL]
   Type: AI/Useful
   Confidence: [Percentage]%
   Description: [Extracted description]
   Features: [Feature1, Feature2, Feature3...]
   Saved: [Date & Time]

2. [Next Site]
   ...
```

### Technical Improvements

#### Backend Changes
- `background.js` updated with single document mode
- New `appendToDocument()` function for appending data
- Feature extraction algorithm implemented
- Document listing and selection functionality
- Improved error handling

#### Frontend Changes
- `popup.js` enhanced with document selector
- `index.html` updated with document selection UI
- `styles.css` includes new document selector styles
- Feature tags displayed with each site
- Better UX for document management

#### Data Structure
- Stores `driveDocId` instead of `driveFolder`
- Stores `driveDocName` for display
- Features extracted and stored with each site
- Maintains backward compatibility with existing data

### Key Benefits

✅ **No Data Loss**: All previous collections preserved
✅ **Single Source of Truth**: One document for everything
✅ **Easy Management**: Simple document selection
✅ **Rich Information**: Features and tags for each site
✅ **Better Organization**: Timestamped sync sections
✅ **Flexible**: Switch documents anytime
✅ **Searchable**: All data in one document for easy searching

### Migration from Previous Version

If you're upgrading from the previous version:

1. Your existing local sites are preserved
2. You need to select a document (new or existing)
3. Click "Sync to Drive" to append your collection
4. All sites will be added to the selected document
5. Previous separate files are not affected

### Usage Tips

#### Best Practices
- Create a dedicated document for site collection
- Use a clear naming convention (e.g., "AI Sites Collection")
- Sync regularly to avoid data loss
- Use search in Google Drive to find your document
- Share the document with team members if needed

#### Document Selection
- Can select any document type (Google Docs, text file, etc.)
- Plain text documents work best
- Formatted documents will have content appended
- Document size limit depends on Google Drive

#### Feature Tags
- Automatically generated from multiple sources
- Help identify site capabilities at a glance
- Searchable in your Google Drive document
- Limited to 5 most relevant features

### Troubleshooting

#### Document Not Showing
- Ensure you're authenticated with Google
- Check Google Drive permissions
- Try refreshing the document list

#### Sync Not Working
- Verify document is selected
- Check document permissions
- Ensure internet connection
- Try signing out and back in

#### Features Not Showing
- Features are extracted automatically
- May be empty for some sites
- Check site metadata and description
- More features appear with richer page content

### Future Enhancements

Planned features for future updates:
- Export to multiple formats (CSV, JSON, PDF)
- Custom feature tags management
- Document templates
- Bulk operations
- Sharing and collaboration features
- Advanced search and filtering

### Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the main README.md
3. Verify all permissions are granted
4. Check browser console for errors

### Feedback

This update is based on user feedback requesting:
- Single document mode instead of multiple files
- Better data preservation
- Feature/capability tracking
- Improved organization

We welcome your feedback for future improvements!

---

**Update Date**: May 28, 2026
**Version**: 2.0
**Status**: Ready for Production
