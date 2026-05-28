# AI Site Collector - Update Notes

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
