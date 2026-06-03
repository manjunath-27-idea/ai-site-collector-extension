# CHANGELOG — AI Site Collector

All notable changes to this project are documented here, ordered newest-first.

---

## [v3.5.0] — 2026-06-04

**Commit:** `f319eb5` — *fix: preserve driveDocId on sign-out and guard against Drive wipe when local sites is empty*

### 🐛 Critical Bug Fixes

#### Drive Document Wiped on Re-login
**Root cause (2 bugs combined):**

1. **Sign-out cleared `driveDocId`** — `logout()` in both `popup.js` and `options.js` was setting `driveDocId: null`, `driveDocName: null`, `driveFolderId: null`. On re-login, the extension had no memory of the existing Drive file. During the brief race window before `getOrCreateDefaultDoc()` completed its Drive search, the first auto-sync fired with `docId = null` — which triggered creation of a **brand new blank document**.

2. **Format auditor wiped doc when local sites was empty** — `doesDocMatchFormat()` in `background.js` had logic that said: *"if local sites array is empty but the Drive doc has URLs → trigger full rebuild"*. This sounds like a deletion sync, but it's actually a **catastrophic race condition** — local storage can be empty for a few milliseconds right after sign-in before the sites array is loaded. This caused the Drive doc to be deleted and rewritten from an empty array.

**Fix:**
- `popup.js` and `options.js` `logout()` now only clears auth state (`authToken`, `isAuthenticated`, `userEmail`). Drive file references (`driveDocId`, `driveDocName`, `driveFolderId`) are **preserved across sign-out** — re-login reuses the same file instantly.
- `doesDocMatchFormat()` in `background.js` now **never triggers a wipe when local sites is empty**. An empty local array is treated as "nothing to sync" not "user deleted everything".

### 📁 Files Changed
| File | Change |
|---|---|
| `popup/popup.js` | `logout()` preserves `driveDocId`, `driveDocName`, `driveFolderId` |
| `options/options.js` | Same fix |
| `js/background.js` | `doesDocMatchFormat()` safety guard — returns `true` when `sites.length === 0` |
| `manifest.json` | Version bumped `3.4.9` → `3.5.0` |

---

## [v3.4.9] — 2026-06-03

**Commit:** `eb3dd45` — *Implement Suffix-Based Field Locking, Sentence-Based Description Merging, and Git Reload Panel*

### ✨ New Features

#### 🔒 Suffix-Based Field Locking
- Field-level lock preferences are now stored **directly inside the database string values** rather than in a separate metadata object.
  - Fields locked by user end with ` *` (e.g. `My Custom Title *`)
  - Fields overridden/edited by user end with ` **` (e.g. `My Custom Description **`)
- Background auto-extraction routines check for these suffixes and **skip updating those fields**, preserving user edits.
- UI renders inline asterisk indicators next to every field:
  - Faint grey `*` (opacity `0.15`, hover to focus) → Unlocked
  - Gold `*` → Locked against auto-updates
  - Green `**` → Overridden / manually edited
- `cleanFieldLockSuffix()` helper strips suffixes before display and before Google Doc export to avoid duplicate markers.
- **Double-suffix prevention**: Serialization pipeline strips suffixes first, then re-applies programmatically once.

#### 📝 Sentence-Based Description & Feature Merging
- Description fields are merged **sentence-by-sentence** using a case-insensitive deduplication union that preserves original casing.
- Feature/keyword lists are merged via case-insensitive union rather than overwritten.
- Startup migration deduplicates sites with matching URLs, merging their locked fields, user edits, descriptions, and features into a single canonical record.

#### 🔄 Developer Git Updates & Extension Reload Panel
- Added a dedicated **"Developer Updates"** card to both the Options Dashboard settings tab and the Popup settings panel.
- **Version Comparator**: Fetches the remote GitHub `manifest.json` and compares to the installed version number — shows a green "Up to date" or orange "Update available — run git pull" alert.
- **Reload Extension Button**: Invokes `chrome.runtime.reload()` to instantly reload all extension processes, background workers, and content scripts without leaving the browser.

#### 🔑 Stable Extension ID (manifest `key`)
- Added the `"key"` field to `manifest.json` derived from the Chrome-generated `.pem` private key.
- The extension now has a **permanent, stable Chrome Extension ID** across developer-mode reloads and re-installs — no more ID changes breaking stored data references.

### 🐛 Bug Fixes
- Generic placeholder titles (e.g. "Home", "Welcome", "Dashboard") on existing stored records are automatically cleaned during background startup migration.
- Branded title selection logic refined to prefer the longest, most descriptive title containing a known brand keyword over raw `document.title`.

### 📁 Files Changed
| File | Lines Changed | Change Type |
|---|---|---|
| `js/background.js` | +764 / -117 | Suffix locking, merging logic, migration |
| `js/content.js` | +97 / -20 | Title refinement, system page detection |
| `options/options.js` | +721 / -1 | Field lock UI, asterisk indicators, reload panel |
| `options/styles.css` | +213 | Lock asterisk styles, indicator animations |
| `popup/popup.js` | +722 / -1 | Field lock UI, asterisk indicators, reload panel |
| `popup/styles.css` | +205 | Lock asterisk styles, indicator animations |
| `options/index.html` | +36 / -10 | Reload panel HTML, lock indicator elements |
| `popup/index.html` | +26 / -8 | Reload panel HTML, lock indicator elements |
| `manifest.json` | +3 / -1 | Added `key` field, bumped version to `3.4.9` |
| `FEATURES.md` | +22 | New features documented |
| `UPDATE_NOTES.md` | +24 | Release notes added |

---

## [v3.4.x] — 2026-06-02

**Commit:** `04fbeef` — *Update background migration to auto-clean generic titles on existing sites*

- Background startup migration now scans all stored records and resets generic/placeholder titles to `null`.
- This triggers a re-fetch of the proper branded title from the actual website on next visit.
- Generic title patterns: `"Home"`, `"Welcome"`, `"Dashboard"`, `"Index"`, `"Untitled"`, `""` etc.

**Commit:** `3d5bad6` — *Refactor description limit to 450 characters and refine branded title selection logic*

- `content.js` description character limit raised from 300 → **450 characters** to preserve more context.
- Title selection now ranks candidates: (1) OG title with brand keyword, (2) longest OG/meta tag, (3) `document.title` fallback.
- Branded title algorithm now handles em-dashes and pipe separators more robustly.

---

## [v3.3.2] — 2026-06-01

**Commit:** `d67843a` — *Fix congested sitecards by adding flex-shrink: 0 to popup site items*

- Fixed layout overflow on popup site list — items were being squeezed by flex container.
- Added `flex-shrink: 0` to popup `.site-item` elements so they maintain their minimum height.

---

## [v3.3.1] — 2026-05-31 (late)

**Commit:** `724124f` — *Optimize Google Docs sync database layout, adjust popup viewport size and rounded card corners*

- Improved sync document layout with better spacing, separator lines, and field alignment.
- Popup viewport size adjusted for better fitting on smaller screens.
- Site card corner radius increased for a more modern feel.
- **Removed descriptions from popup site cards** — list is now cleaner and less cluttered (description visible in full dashboard only).

---

## [v3.3.0] — 2026-05-31

**Commit:** `18bf273` — *fix: set synced: true on all site records in storage upon successful sync*

- Fixed a bug where sites remained marked `synced: false` even after a successful Drive sync.
- Now correctly marks all flushed records as `synced: true` after the sync write completes.

**Commit:** `b4385ea` — *feat: color the sync cycle button icon green when fully synced and orange when unsynced*

- Sync cycle SVG icons in both popup and options sidebar dynamically color:
  - 🟠 Orange `#f97316` → unsynced sites pending
  - 🟢 Green `#22c55e` → all records fully synced

**Commit:** `1ebfbed` — *feat: mark upgraded site records as unsynced and rewrite Drive text file to sync modifications continuously*

- Existing records that receive richer descriptions or new feature tags are marked `synced: false`.
- Drive sync is triggered automatically to overwrite the database with updated data.

**Commit:** `1d3442e` — *feat: add sync status badge counter and tick indicator to profile sync icon*

- Sync icon now shows an orange badge with a **count** of pending (unsynced) sites.
- Once all sites are synced the badge flips to a green `✓` checkmark.

**Commit:** `6a00730` — *feat: show notification only after auto-sync to Google Drive completes successfully*

- Desktop notification for Drive sync now only fires **after** the upload completes successfully, not when it starts.

**Commit:** `b6674db` — *perf: cache driveFolderId in local storage for fast sync loading and clean signout*

- `driveFolderId` is now cached in `chrome.storage.local` to avoid repeated Drive API folder lookups.
- On sign-out, the cached folder ID is cleared along with other auth data.

**Commit:** `828240f` — *chore: bump extension version to 3.3.0 for folder sync release*

**Commit:** `7c1d505` — *feat: organize sync database inside a dedicated Google Drive folder 'AI Site Collector'*

- The extension now creates (or discovers) a folder named **`AI Site Collector`** in Google Drive root.
- All sync database file operations are scoped exclusively to this folder — no clutter in root.

---

## [v3.2.x] — 2026-05-31 (fixes)

**Commits:** `b807f2c`, `bf3e0cc`, `8417baf`, `c948a58`, `5e2ecb2`, `39ffcab`, `dec0594`, `7f11829`, `00b75cb`

- Changed sync database file format from `.odt` back to `.txt` / `.md`.
- Fixed race conditions in document name rendering.
- Resolved Google Docs API `segmentId` payload error.
- Updated Google OAuth `client_id` to the correct registered value.
- Retrieved detailed Google API error descriptions in sync failure logs.
- Added Drive API auto-initialization of sync database on login for empty site lists.

---

## [v3.2.0] — 2026-05-29

**Commits:** `530af8e`, `420b5a5`, `c9e1421`, `17dfbe4`, `c47ec1f`, `6b1e433`, `28385a0`

### ✨ New Features
- **Premium AI neon icons** — replaced old icons with new neon-themed PNG assets for 16px, 48px, 128px.
- **Extension version badge** — popup and options profile UI show the current version string from `manifest.json`.
- **Self-healing Doc recovery** — if the stored Drive Doc ID is invalid, trashed, or non-Doc format, the extension auto-recreates or rediscovers the document.
- Replaced obsolete inline SVG logos with premium transparent PNG folder assets and favicons.
- Added robust fallbacks for legacy site metadata in popup and options cards — extension no longer crashes on old format records.
- Skips saving the extension's own GitHub repository page and cleans GitHub subpage URLs (strips path after repo root).

### 🐛 Bug Fixes
- Bumped version to `3.2.0` to force Chrome to kill stale service worker cache.
- Added Docs API scope (`https://www.googleapis.com/auth/documents`) to manifest OAuth scopes.
- Added `.txt` migration for `driveDocName` stored in older format on extension update.

---

## [v3.2.0-docs-enforcement] — 2026-05-29

**Commits:** `8a77180`, `b83a31e`, `52ba604`, `47a1661`, `81e6ce5`

- Full overhaul of Google Drive sync to enforce **Google Docs format only** (`application/vnd.google-apps.document`).
- `listDriveFiles()` queries strictly by `mimeType='application/vnd.google-apps.document'`.
- `getOrCreateDefaultDoc()` now uses `encodeURIComponent()` for safe query encoding.
- `appendToDocument()` reads existing doc via Drive export (plain text) for dedup before writing via Docs `batchUpdate`.
- Self-healing `.txt` stripper added to popup and options dashboard initialization.
- Settings toggles preserved across reloads — only reset on first install (`reason === 'install'`).

---

## [v3.0.2] — 2026-05-29

**Commits:** `f25dbe2`, `648007a`, `90714ee`, `f34ef5f`

- Added **Security & Pentesting AI** category to Knowledge Base: `pentest.ai`, `pentesting.ai`.
- Added weighted cybersecurity keywords to `WEIGHTED_USEFUL_KEYWORDS`:
  - `pentest` (weight 5), `pentesting` (weight 5), `penetration testing` (weight 5)
  - `security scanner` (weight 4), `vulnerability` (weight 4), `cybersecurity` (weight 3)
- Generalized AI TLD matching to `.bot`, `.chat`, `.agent` (not just `.ai`).
- Added `emergent.sh` with dual brand name support.
- Improved classification to use clean hostname + path segments for better URL-based classification.

---

## [v3.0.1] — 2026-05-28

**Commits:** `d57a98e`, `fe2fd32`, `ff5c5c3`, `acdb292`

- Fixed `ReferenceError` for `authBtn` in `options.js` `authenticate()` function.
- Multi-window reactive settings sync via `chrome.storage.onChanged`.
- Popup settings modal shows dynamic profile card when signed in (avatar, email, sign-out button).
- Fixed hidden sync status badge when signed out.
- Dynamic rotating cycle sync buttons added next to profile cards.
- Programmatically open the default **Collected Sites** panel on Options Page startup.
- Removed inline `onclick` handlers in popup to comply with MV3 Content Security Policy.

---

## [v3.0.0] — 2026-05-28

**Commits:** `20ef235`, `878f1f9`, `e314826`, `7860273`, `718efbc`, `c3ad7de`

### ✨ New Features
- **Widescreen Options Dashboard** — full browser tab at `options/index.html`.
- **CSS Glassmorphism slider toggles** for all settings.
- **Custom keyword CRUD** — `customAiKeywords[]` and `customUsefulKeywords[]` stored in local storage.
- **MV3 Content Script Injection Fix** — added `content_scripts` block to `manifest.json`.
- Auto-discovery or creation of default sync document `AI_Site_Collector_Database.txt`.
- Strict security validation for Drive file names.
- Auth page detection improvements: path, title, subdomain, and password input checks.
- Dynamic remote domain rules sync from GitHub at startup, install, and update.

---

## [v2.0] — 2026-05-28 (initial)

**Commit:** `c82b962` — *Initial Commit: Original AI Site Collector extension v2.0 template*

- Initial extension template with `background.js`, `content.js`, `popup/`, `options/`.
- Single Google Doc mode — one file for all collected sites.
- Auto-discovered or auto-created `AI_Site_Collector_Database`.
- `appendToDocument()`, `getOrCreateDefaultDoc()`, `extractFeatures()` core functions.
- Structured numbered sync format per batch replacing CSV.

---

**Repository:** https://github.com/manjunath-27-idea/ai-site-collector-extension
**Current Version:** 3.4.9
**Last Updated:** 2026-06-03
