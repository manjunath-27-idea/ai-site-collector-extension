# Installation & Verification Checklist

Use this checklist to verify your extension installation is complete and working correctly.

## Pre-Installation Requirements

- [ ] Google Chrome browser installed (version 88+)
- [ ] Google account created
- [ ] Internet connection available
- [ ] Administrator access to Chrome settings

## Google OAuth Setup

- [ ] Created Google Cloud project
- [ ] Enabled Google Drive API
- [ ] Created OAuth 2.0 credentials (Chrome App type)
- [ ] Copied Client ID
- [ ] Updated manifest.json with Client ID
- [ ] Saved manifest.json

## Extension Installation

- [ ] Downloaded or cloned extension files
- [ ] All files present in extension folder:
  - [ ] manifest.json
  - [ ] js/content.js
  - [ ] js/background.js
  - [ ] popup/index.html
  - [ ] popup/styles.css
  - [ ] popup/popup.js
  - [ ] icons/icon-16.png
  - [ ] icons/icon-48.png
  - [ ] icons/icon-128.png
  - [ ] README.md
  - [ ] QUICKSTART.md
  - [ ] SETUP_OAUTH.md

## Chrome Loading

- [ ] Opened chrome://extensions/
- [ ] Enabled Developer mode (toggle in top right)
- [ ] Clicked "Load unpacked"
- [ ] Selected extension folder
- [ ] Extension appears in extensions list
- [ ] Extension icon visible in toolbar

## First-Time Setup

- [ ] Clicked extension icon in toolbar
- [ ] Saw "Sign in with Google" button
- [ ] Clicked authentication button
- [ ] Google login window appeared
- [ ] Signed in with Google account
- [ ] Granted Drive permissions
- [ ] Saw "Authenticated as [email]" message
- [ ] "Sites" tab now shows instead of auth screen

## Functionality Testing

### Site Detection
- [ ] Visited an AI website (e.g., openai.com, claude.ai)
- [ ] Waited 2-3 seconds for detection
- [ ] Site appeared in extension popup
- [ ] Description was extracted correctly
- [ ] Classification badge shows "AI"
- [ ] Confidence score is displayed

### Site Management
- [ ] Visited multiple AI/useful websites
- [ ] Multiple sites appear in list
- [ ] Can scroll through site list
- [ ] Clicking site opens it in new tab
- [ ] Sites show correct metadata

### Filtering
- [ ] Clicked "All" filter - shows all sites
- [ ] Clicked "AI Sites" filter - shows only AI sites
- [ ] Clicked "Useful Sites" filter - shows only useful sites
- [ ] Filter buttons highlight correctly

### Statistics
- [ ] Clicked "Stats" tab
- [ ] Total count matches number of sites
- [ ] AI count is accurate
- [ ] Useful count is accurate
- [ ] Charts display correctly
- [ ] Distribution chart shows correct ratio
- [ ] Confidence chart shows levels
- [ ] Timeline chart shows collection activity

### Google Drive Sync
- [ ] Clicked "Sync to Drive" button
- [ ] Saw "Syncing..." message
- [ ] Sync completed successfully
- [ ] Saw confirmation message
- [ ] Checked Google Drive for CSV file
- [ ] CSV file contains correct data
- [ ] File named with date

### Settings
- [ ] Clicked settings icon (⋮)
- [ ] Settings modal opened
- [ ] Can toggle auto-sync
- [ ] Can toggle notifications
- [ ] Can toggle dark mode
- [ ] "Sign Out" button works
- [ ] After logout, auth screen reappears

## Advanced Testing

### Duplicate Prevention
- [ ] Visited same website twice
- [ ] Site only appears once in list
- [ ] No duplicate entries created

### Data Persistence
- [ ] Closed extension popup
- [ ] Reopened extension popup
- [ ] All sites still visible
- [ ] Data persisted correctly

### Error Handling
- [ ] Tried signing in without internet (should show error)
- [ ] Cleared all sites - confirmed deletion
- [ ] Tried syncing with no sites - handled gracefully

## Performance Verification

- [ ] Extension loads quickly (< 1 second)
- [ ] Site detection completes in 2-3 seconds
- [ ] Charts render smoothly
- [ ] No lag when scrolling site list
- [ ] Sync completes in reasonable time (< 10 seconds)

## Documentation Review

- [ ] Read README.md
- [ ] Reviewed QUICKSTART.md
- [ ] Checked SETUP_OAUTH.md
- [ ] Understood FEATURES.md
- [ ] Reviewed this checklist

## Troubleshooting

If any items are not checked, refer to:

| Issue | Solution |
|-------|----------|
| Extension not loading | Verify all files present, reload extension |
| Auth button not working | Check Client ID in manifest.json |
| Sites not detecting | Visit AI/useful websites, wait 2-3 seconds |
| Sync not working | Verify Google Drive API enabled, re-authenticate |
| Charts not showing | Check browser console for errors, reload |
| Icons not displaying | Verify icon files present in icons/ folder |

## Success Criteria

Your installation is complete and working correctly when:

✅ Extension loads without errors
✅ Authentication works with Google account
✅ Sites are detected on AI/useful websites
✅ Site list displays with descriptions
✅ Filtering works for all categories
✅ Statistics and charts display correctly
✅ Sync to Google Drive succeeds
✅ Settings can be modified
✅ All documentation is accessible

## Next Steps

1. **Start Collecting**: Browse AI and useful websites normally
2. **Review Collection**: Check popup periodically to see collected sites
3. **Sync Regularly**: Click "Sync to Drive" to backup your collection
4. **Customize**: Edit keywords in js/content.js if needed
5. **Share**: Help others discover this extension

## Support

If you encounter any issues:

1. Check the troubleshooting section in README.md
2. Review SETUP_OAUTH.md for authentication issues
3. Check browser console for error messages
4. Verify all files are present and correct
5. Try reloading the extension

---

**Installation Date**: _____________
**Verification Completed By**: _____________
**Notes**: _____________________________________________

