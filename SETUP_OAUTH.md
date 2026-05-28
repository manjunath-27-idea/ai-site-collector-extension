# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth 2.0 for the AI Site Collector extension.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name: `AI Site Collector`
5. Click "CREATE"
6. Wait for the project to be created

## Step 2: Enable Google Drive API

1. In the Cloud Console, search for "Google Drive API"
2. Click on "Google Drive API"
3. Click "ENABLE"
4. Wait for it to enable

## Step 3: Create OAuth 2.0 Credentials

1. Go to "Credentials" in the left sidebar
2. Click "CREATE CREDENTIALS"
3. Select "OAuth client ID"
4. If prompted, click "CONFIGURE CONSENT SCREEN" first:
   - Choose "External" user type
   - Fill in the form:
     - App name: `AI Site Collector`
     - User support email: Your email
     - Developer contact: Your email
   - Click "SAVE AND CONTINUE"
   - Skip scopes (click "SAVE AND CONTINUE")
   - Review and click "BACK TO DASHBOARD"

5. Now create the OAuth client ID:
   - Click "CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Chrome App**
   - Name: `AI Site Collector`
   - Click "CREATE"

## Step 4: Get Your Client ID

1. After creation, you'll see your credentials
2. Copy the **Client ID** (it looks like: `xxxxx-xxxxx.apps.googleusercontent.com`)

## Step 5: Update the Extension

1. Open `manifest.json` in the extension folder
2. Find this line:
   ```json
   "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
   ```
3. Replace `YOUR_CLIENT_ID` with your actual Client ID
4. Save the file

## Step 6: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Turn on "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `ai-site-collector-ext` folder
5. The extension should now appear in your extensions list

## Step 7: Test Authentication

1. Click the extension icon in Chrome
2. Click "Sign in with Google"
3. A Google login window will appear
4. Sign in with your Google account
5. Grant the requested permissions
6. You should see "Authenticated as [your-email]"

## Troubleshooting

### "Invalid Client ID" Error
- Double-check that you copied the Client ID correctly
- Make sure it includes the `.apps.googleusercontent.com` part
- Reload the extension after updating

### "Permission Denied" Error
- Make sure you enabled the Google Drive API
- Check that your OAuth credentials are set to "Chrome App" type
- Try signing out and back in

### Extension Not Loading
- Ensure the folder path is correct
- Check that all required files are present
- Try reloading the extension (refresh button on chrome://extensions/)

### Can't Sign In
- Make sure you're connected to the internet
- Check your Google account security settings
- Try clearing Chrome cache and cookies
- Create a new OAuth credential if the old one seems broken

## Security Notes

- Your Client ID is not sensitive (it's public)
- The extension uses OAuth 2.0 for secure authentication
- Your Google Drive files are only accessible by you
- The extension never stores your password

## Need More Help?

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Chrome Extension Development Guide](https://developer.chrome.com/docs/extensions/)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
