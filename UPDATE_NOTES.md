# AI Site Collector — Update Notes

---

## v3.5.0 — Critical Drive Wipe Fix (2026-06-04)

### What Changed

#### 🔴 Drive Document No Longer Wiped on Re-login
Two bugs combined to erase the entire Google Drive database whenever the user signed out and back in:

**Bug 1 — Sign-out cleared Drive doc ID**
- `logout()` was setting `driveDocId: null` and `driveFolderId: null` in `chrome.storage.local`.
- On re-login, the extension had no memory of the existing file, so it created a **brand new blank document** before the Drive search could complete.

**Bug 2 — Format auditor wiped doc during race condition**
- `doesDocMatchFormat()` had logic: *"local sites empty + doc has URLs = user deleted everything → wipe doc"*
- But local storage can be empty for milliseconds right after sign-in (race condition).
- This triggered a full delete-and-rewrite of the Drive doc from an empty array — destroying all saved data.

**What's fixed:**
- Sign-out now only clears `authToken`, `isAuthenticated`, and `userEmail`. The Drive file ID, folder ID, and doc name are **preserved** — re-login connects back to the same existing document instantly.
- `doesDocMatchFormat()` now has a safety guard: if local sites array is empty, it **never triggers a wipe**. An empty local array means "nothing to sync", not "user deleted everything".

---

## v3.4.9 — Granular Suffix Field Locking, Sentence Merging, and Git Reload Panel (2026-06-03)

### What Changed

#### 1. Suffix-Based Field Locking & Asterisks UI
- **String-Level Locks**: Field-level lock preferences are stored directly within the database text strings:
  - Locked fields end with ` *` (e.g. `My Title *`).
  - Overridden fields end with ` **` (e.g. `My Description **`).
- **Update Bypassing**: Auto-extraction background routines automatically skip fields containing lock suffixes to prevent overwrites.
- **Dynamic Clean Rendering**: Standard star buttons were replaced with inline asterisks. Field text is cleaned via `cleanFieldLockSuffix` before layout rendering. Unlocked fields show a faint `*` (opacity `0.15`) that brightens on hover, locked fields show gold `*`, and overridden fields show green `**`.
- **Double Suffix Prevention**: The Google Doc serialization pipeline cleans the database strings first, then formats them with programmatically computed suffixes, avoiding duplicate markers in final document exports.

#### 2. Sentence-Based Description & Feature Merging
- Descriptions are merged sentence-by-sentence. Unique sentences from incoming web pages are appended case-insensitively while preserving original case.
- Keyword and features lists are merged via case-insensitive union.
- Automatically handles database merging of duplicate URLs during startup migration and runtime saves, merging user locks and edits into a single canonical record.

#### 3. Developer Git Updates & Extension Reload settings
- **Options Dashboard & Popup settings**: Added a dedicated card to manage remote project updates.
- **Version Comparator**: Fetches the remote GitHub repository `manifest.json` and compares it to the local version, warning the user when updates are available to pull.
- **Chrome Reload Integration**: Added a "Reload Extension" button utilizing the `chrome.runtime.reload()` API to instantly reload local changes without leaving the Options dashboard.

---

## v3.4.x — Title Cleanup & Description Refinement (2026-06-02)

### What Changed

#### Auto-Clean Generic Titles on Startup Migration
- Background `onStartup` migration now scans all stored records and resets generic/placeholder titles (`"Home"`, `"Welcome"`, `"Dashboard"`, `"Index"`, `"Untitled"`, `""`) to `null`.
- On next visit to the site, the real branded title is re-fetched.

#### Description Limit Raised to 450 Characters
- `content.js` description character limit increased from 300 → **450 characters** for richer context.
- Title candidate ranking now prefers the longest OG/meta title containing a known brand keyword, falling back to `document.title`.

---

## v3.3.x — Google Drive Folder Sync & Sync Status Indicators (2026-05-31)

### What Changed

#### Dedicated Google Drive Folder
- Extension creates (or discovers) a **`AI Site Collector`** folder in Google Drive root.
- All sync operations are scoped to this folder — no clutter in Drive root.
- Folder ID is cached in `chrome.storage.local` for fast future syncs; cleared on sign-out.

#### Dynamic Sync Status Indicators
- Sync cycle buttons in both the popup and options sidebar dynamically change color:
  - 🟠 **Orange** `#f97316` when there are unsynced pending sites (badge shows count)
  - 🟢 **Green** `#22c55e` when all records are fully synced (badge shows `✓`)
- On successful sync, all records in local storage are correctly marked `synced: true`.

#### Continuous Site Upgrades
- Existing records that receive enriched descriptions or new feature tags on rescan are marked `synced: false` automatically.
- Auto-sync triggers to push the update to Drive without user action.

#### Notification Timing Fix
- Desktop notification for Drive sync now only fires **after** the upload completes, not when it begins.

#### Popup Site Card Polish
- Fixed layout overflow (`flex-shrink: 0` on `.site-item`).
- Removed description text from popup site cards — list is cleaner; full description visible in the Options Dashboard only.
- Increased card corner radius; adjusted popup viewport size for smaller screens.

---

## v3.2.0 — Google Docs Format Enforcement (2026-05-29)

### What Changed
Complete overhaul of all Google Drive sync operations to enforce **Google Docs format only** (`application/vnd.google-apps.document`). No `.txt` files are ever created, listed, or accepted.

#### `js/background.js` — Drive Functions Rewritten

**`listDriveFiles()`**
- Old: Fetched all Drive files, then filtered by name (accepted both `.txt` and no-extension forms)
- New: Queries Drive API directly with `mimeType='application/vnd.google-apps.document'` — only Google Docs are returned, no filtering needed

**`getOrCreateDefaultDoc()`**
- Old: Search query used string concatenation for query params (fragile)
- New: Uses `encodeURIComponent()` for safe query encoding; search strictly filters by `mimeType === GDOC_MIME`; improved console logging for traceability
- Initial document header now reads: `"AI Site Collector — Sync Database"` with an explanatory subtitle

**`setDriveDocument()`**
- Old: Had multi-branch `.txt` stripping + hard security reject if name didn't match exactly
- New: Single-line regex normalize (`.replace(/\.txt$/i, '')`) and store — no rejection errors

**`appendToDocument()`**
- Old: Wrapped in `try/catch` with unnecessary re-throw
- New: Clean async function — reads existing doc via Drive export (plain text) for dedup, appends via Docs API `batchUpdate`; improved sync format with separator lines and `Saved` timestamp per entry

**`getDriveDocument` message handler**
- Old: Hard-coded string check `=== 'AI_Site_Collector_Database.txt'`
- New: Single regex strip `.replace(/\.txt$/i, '')` — handles any legacy stored value

**`syncToDrive()`**
- Old: Multi-branch normalization + `throw` on name mismatch (caused user-facing error)
- New: Single regex normalize, stores clean name back, falls back to default name silently (no error thrown)

---

## v3.1.0 — Settings Persistence Fix & Sync Filename Fix (2026-05-29)

### Bug Fixes

#### Settings Toggles Reset on Extension Reload
**Root cause:** `chrome.runtime.onInstalled` fired on every developer-mode reload (not just first install), unconditionally overwriting `autoSyncSetting`, `notificationsSetting`, and `darkModeSetting` back to their defaults — discarding the user's saved preferences.

**Fix:** Split `onInstalled` handler by `details.reason`:
- `reason === 'install'` → Write all defaults including user preference toggles (first install only)
- `reason === 'update'` / other → Read existing preferences from storage and write them back unchanged; only refresh domain infrastructure lists (`remoteAiDomains`, `remoteUsefulDomains`, `remoteAuthGateways`)

```js
// Before (broken) — always reset everything
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ autoSyncSetting: true, notificationsSetting: true, ... });
});

// After (fixed) — only reset prefs on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ autoSyncSetting: true, notificationsSetting: true, ... });
  } else {
    chrome.storage.local.get(['autoSyncSetting', 'notificationsSetting', 'darkModeSetting'], (prefs) => {
      chrome.storage.local.set({ autoSyncSetting: prefs.autoSyncSetting ?? true, ... });
    });
  }
});
```

#### Sync Error: "Security validation failure: Unauthorized file name"
**Root cause:** Storage had `driveDocName` saved as `"AI_Site_Collector_Database.txt"` (old format). The sync validation did an exact string check against `'AI_Site_Collector_Database'` — any `.txt` suffix caused a hard throw.

**Fix:** Replaced hard-reject with regex normalization: `docName.replace(/\.txt$/i, '').trim()`. Name mismatch after normalization logs a warning and falls back to the default name — sync always proceeds.

---

## v3.0.2 — Pentest & Cybersecurity AI Detection (2026-05-29)

### Improvements

#### `js/content.js` — Knowledge Base
- Added **Security & Pentesting AI** category section
- Added entries: `pentest.ai`, `pentesting.ai` with correct descriptions and tags

#### `WEIGHTED_USEFUL_KEYWORDS`
Added high-signal cybersecurity keywords with weights:
- `pentest` (weight: 5)
- `pentesting` (weight: 5)
- `penetration testing` (weight: 5)
- `security scanner` (weight: 4)
- `vulnerability` (weight: 4)
- `cybersecurity` (weight: 3)

#### `.ai` TLD Corroboration
Added security/pentest terms to the corroboration check:
- `pentest`, `pentesting`, `penetration testing`, `cybersecurity`, `security scanner`, `vulnerability scanner`

Now `.ai` domains with these terms in their page content are classified as AI tools.

#### `domain_rules.json`
Added `"pentest.ai"` and `"pentesting.ai"` to `known_ai_domains`.

---

## v3.0.1 — Multi-Window Sync & Auth Polish

### Features Added

#### Multi-Window Reactive Settings Sync
- `popup.js` and `options.js` both use `chrome.storage.onChanged` listener
- Toggling settings in popup instantly updates Options Dashboard and vice versa
- Custom keyword changes, auth state changes, and doc selection all propagate reactively

#### Settings Profile Cards
- Popup settings modal shows a **dynamic profile card** when signed in:
  - Circular gradient avatar badge (first letter of email)
  - Full signed-in email displayed
  - Sign-out button with `confirm()` dialog to prevent accidental logout
- When signed out: auth screen shows sign-in button inline

#### Options Dashboard Auth Fix
- Fixed `ReferenceError` in `options.js` `authenticate()` — `authBtn` was referenced before being defined
- Function now safely targets the clicked element dynamically

#### Service Worker Auto-Sync Defaults
- `autoSyncSetting: true`, `notificationsSetting: true`, `darkModeSetting: false` set on first install
- Sync respects `autoSyncSetting !== false` pattern — works immediately without requiring user to open settings

---

## v3.0.0 — Options Dashboard, Slider Toggles, Custom Keywords, MV3 Fix

### New Features

#### Widescreen Options Dashboard
- Dedicated full browser tab (`options/index.html`) opened via `chrome.runtime.openOptionsPage()`
- Real-time live search filtering all collected sites
- Category filter buttons: All / AI Sites / Useful Sites
- Individual card deletion (× hover button)
- Custom keyword tag manager

#### Premium Slider Toggle Switches
- Settings checkboxes replaced with CSS glassmorphism slider toggles across popup and dashboard

#### Custom Keyword Scanner
- `customAiKeywords[]` and `customUsefulKeywords[]` stored in `chrome.storage.local`
- `content.js` merges these into classification on every page load
- Full CRUD (add/remove) UI in both popup and dashboard

#### MV3 Content Script Registration Fix
- Added `"content_scripts"` block to `manifest.json`
- Previously, `js/content.js` existed but was never injected by Chrome — extension silently did nothing
- Now loads automatically on all pages when document is ready

---

## v2.0 — Single Document Mode

### Major Changes
- Moved from creating multiple Drive files to using **one Google Doc** for all collected sites
- Document is auto-discovered or auto-created (`AI_Site_Collector_Database`)
- All new sites **appended** (no data loss)
- Added `appendToDocument()`, `getOrCreateDefaultDoc()`, `extractFeatures()` functions
- Replaced CSV format with structured numbered format per sync batch
- Added feature/tag extraction from classification reasons, keywords, and description

---

**Repository:** https://github.com/manjunath-27-idea/ai-site-collector-extension
**Last Updated:** 2026-06-03
**Current Version:** 3.4.9
