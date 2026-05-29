# Installation & Verification Checklist

Use this checklist to verify your extension is fully installed and working.

---

## Pre-Installation Requirements

- [ ] Google Chrome 88+ installed (or Chromium-based: Edge, Brave, Opera)
- [ ] Google account created
- [ ] Internet connection available

---

## Google Cloud Setup

- [ ] Created Google Cloud project named `AI Site Collector`
- [ ] Enabled **Google Drive API**
- [ ] Enabled **Google Docs API** ← required for writing to Google Doc
- [ ] Configured OAuth Consent Screen (External, with app name)
- [ ] Created OAuth 2.0 credentials (Application type: **Chrome App**)
- [ ] Copied Client ID (`xxxx.apps.googleusercontent.com`)

---

## manifest.json Configuration

- [ ] Opened `manifest.json`
- [ ] Replaced `YOUR_CLIENT_ID` with actual Client ID
- [ ] Confirmed both scopes are present:
  - [ ] `https://www.googleapis.com/auth/drive.file`
  - [ ] `https://www.googleapis.com/auth/documents`
- [ ] Saved `manifest.json`

---

## Extension Files Present

- [ ] `manifest.json`
- [ ] `domain_rules.json`
- [ ] `js/content.js`
- [ ] `js/background.js`
- [ ] `popup/index.html`
- [ ] `popup/styles.css`
- [ ] `popup/popup.js`
- [ ] `options/index.html`
- [ ] `options/styles.css`
- [ ] `options/options.js`
- [ ] `icons/icon-16.png`
- [ ] `icons/icon-48.png`
- [ ] `icons/icon-128.png`
- [ ] `README.md`
- [ ] `QUICKSTART.md`
- [ ] `SETUP_OAUTH.md`
- [ ] `FEATURES.md`
- [ ] `UPDATE_NOTES.md`

---

## Chrome Loading

- [ ] Opened `chrome://extensions/`
- [ ] Enabled **Developer mode** (top right toggle)
- [ ] Clicked **Load unpacked**
- [ ] Selected the extension folder
- [ ] Extension appears in extensions list without errors
- [ ] Extension icon visible in Chrome toolbar

---

## First-Time Authentication

- [ ] Clicked extension icon in toolbar
- [ ] Saw **Sign in with Google** button
- [ ] Clicked sign-in button
- [ ] Google login window appeared
- [ ] Signed in with Google account
- [ ] Granted **Drive** and **Docs** permissions
- [ ] Popup shows signed-in email in the account section
- [ ] Profile avatar (first letter of email) visible

---

## Site Detection Testing

- [ ] Visited an AI website (e.g., `chatgpt.com`, `claude.ai`, `cursor.sh`)
- [ ] Waited 2–3 seconds for the extension to scan the page
- [ ] Site appeared in the extension popup
- [ ] Description extracted and displayed
- [ ] **AI Platform** or **Useful Tool** badge shown
- [ ] Confidence score displayed

---

## Settings Testing

- [ ] Clicked the settings icon (⚙ or ⋮) in the popup
- [ ] Settings modal opened
- [ ] **Auto-sync to Drive** toggle works — state saved after closing modal
- [ ] **Show Notifications** toggle works — notifications appear/disappear
- [ ] **Dark mode** toggle works — theme switches
- [ ] Settings survive after reloading the extension at `chrome://extensions/`

---

## Google Drive Sync Testing

- [ ] Clicked **Sync to Drive** (or let auto-sync trigger)
- [ ] Saw **"Syncing..."** status message
- [ ] Sync completed with success message
- [ ] Opened Google Drive → found `AI_Site_Collector_Database` (**Google Doc**, not .txt)
- [ ] Opened the Google Doc — contains collected site entries with correct format
- [ ] Triggered sync a second time — shows **"already up to date"** (deduplication working)

---

## Widescreen Dashboard Testing

- [ ] Clicked the grid/dashboard icon in the popup header
- [ ] Options Dashboard opened in a full browser tab
- [ ] All collected sites shown as cards
- [ ] Live search bar filters sites by title/URL/description
- [ ] Category filters work: All / AI Sites / Useful Sites
- [ ] Hover over a card → delete (×) button appears
- [ ] Delete removes the site from the list

---

## Custom Keywords Testing

- [ ] Opened Settings (popup or dashboard)
- [ ] Typed a custom keyword (e.g., `langchain`)
- [ ] Selected category: **AI Site**
- [ ] Clicked **Add** — keyword tag appeared
- [ ] Visited a page with that keyword — site was detected
- [ ] Removed keyword — tag disappeared from list

---

## Notifications Testing

- [ ] **Show Notifications** is ON
- [ ] Visited a new AI site
- [ ] Desktop notification appeared: "Site Saved! — [site name] has been saved."
- [ ] Turned OFF notifications toggle
- [ ] Visited another new site — no notification shown ✅

---

## Multi-Window Sync Testing

- [ ] Opened popup AND options dashboard simultaneously
- [ ] Toggled Dark Mode in popup → Dashboard instantly switched theme
- [ ] Added a keyword in dashboard → Popup keyword list updated
- [ ] Signed out in popup → Dashboard auth section updated

---

## Troubleshooting Reference

| Problem | Solution |
|---|---|
| Extension not detecting sites | Refresh the page, wait 2–3 s |
| "Not authenticated" error on sync | Sign in via popup |
| Sync error / failed | Check both Drive API and Docs API are enabled in Cloud Console |
| Settings reset after reload | Ensure you're on v3.1+; reload extension at `chrome://extensions/` |
| Google Doc not found | Extension auto-creates it on next sync |
| Notifications not working | Toggle OFF then ON in settings |
| Extension icon missing | Pin it from Chrome's extension menu (puzzle icon) |

---

## Success Criteria

Your extension is fully working when ALL of these are confirmed:

✅ Extension loads in Chrome without errors  
✅ Signed in with Google account  
✅ AI/useful sites detected automatically while browsing  
✅ Popup shows sites with descriptions and type badges  
✅ Filtering and search work correctly  
✅ Sync creates/updates `AI_Site_Collector_Database` Google Doc (not .txt)  
✅ Google Doc shows correctly formatted site entries  
✅ Deduplication works — second sync shows "already up to date"  
✅ Settings (auto-sync, notifications, dark mode) persist across reloads  
✅ Desktop notifications fire on new site detection (when enabled)  
✅ Widescreen Dashboard opens and functions correctly  
✅ Custom keywords detect new sites  

---

**Installation Date:** _____________  
**Verified By:** _____________  
**Notes:** _____________________________________________
