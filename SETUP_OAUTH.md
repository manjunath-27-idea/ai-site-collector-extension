# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth 2.0 for the AI Site Collector extension.
The extension requires both **Google Drive API** and **Google Docs API** to be enabled.

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top → **NEW PROJECT**
3. Project name: `AI Site Collector`
4. Click **CREATE** and wait for it to be ready

---

## Step 2: Enable Required APIs

You need **both** APIs enabled:

1. In Cloud Console, go to **APIs & Services → Library**
2. Search for and enable **Google Drive API** → click **ENABLE**
3. Search for and enable **Google Docs API** → click **ENABLE**

> The extension uses Google Drive API to find/create the document and Google Docs API to write content to it.

---

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** → click **CREATE**
3. Fill in:
   - **App name:** `AI Site Collector`
   - **User support email:** your email
   - **Developer contact:** your email
4. Click **SAVE AND CONTINUE** through all steps
5. Return to the Dashboard

---

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **CREATE CREDENTIALS → OAuth client ID**
3. **Application type:** Chrome App
4. **Name:** `AI Site Collector`
5. Click **CREATE**
6. Copy the **Client ID** (format: `xxxx-xxxx.apps.googleusercontent.com`)

---

## Step 5: Update `manifest.json`

Open `manifest.json` in the extension folder and replace `YOUR_CLIENT_ID`:

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/documents"
  ]
}
```

> **Important:** Both scopes are required:
> - `drive.file` — to search/create the Google Doc in Drive
> - `documents` — to write content to the Google Doc via Docs API

---

## Step 6: Load the Extension

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the extension folder
4. Extension appears in the toolbar

---

## Step 7: Sign In & Test

1. Click the extension icon
2. Click **Sign in with Google**
3. Google login window appears
4. Sign in with your Google account
5. Grant all requested permissions
6. You should see your email in the popup — you're authenticated!

---

## How Google Doc Sync Works

On first sync, the extension:
1. Searches your Drive for a Google Doc named `AI_Site_Collector_Database`
2. If found → reuses it and appends new sites
3. If not found → creates a new Google Doc with that name automatically
4. Saves the document ID to local storage for all future syncs

The document is a **native Google Doc** (not a `.txt` file) — it opens beautifully in Google Docs.

---

## Troubleshooting

| Error | Solution |
|---|---|
| Invalid Client ID | Double-check you copied the full ID including `.apps.googleusercontent.com` |
| Permission denied | Ensure both Google Drive API and Google Docs API are enabled |
| Sync failed | Re-authenticate; check if both API scopes are in `manifest.json` |
| Doc not found in Drive | Extension will auto-create it on next sync |
| Token expired | Extension silently refreshes OAuth token automatically |
| Extension not loading | Verify all files are present; reload at `chrome://extensions/` |

---

## Required OAuth Scopes Explained

| Scope | Why It's Needed |
|---|---|
| `drive.file` | Search Drive for existing `AI_Site_Collector_Database` doc; create it if missing |
| `documents` | Write site data to the Google Doc using the Docs API `batchUpdate` endpoint |

---

## Security Notes

- Your **Client ID is public** — it's safe to include in `manifest.json`
- The extension uses OAuth 2.0 — your Google password is never seen or stored
- Token management is handled by Chrome's `chrome.identity` API
- Only the `AI_Site_Collector_Database` Google Doc is ever read or written to

---

## External Resources

- [Google Drive API Docs](https://developers.google.com/drive/api)
- [Google Docs API Docs](https://developers.google.com/docs/api)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [OAuth 2.0 for Chrome Extensions](https://developer.chrome.com/docs/extensions/mv3/oauth/)
