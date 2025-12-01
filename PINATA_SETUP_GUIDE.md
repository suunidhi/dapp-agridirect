# Pinata IPFS Setup Guide

This guide will help you set up Pinata API keys for IPFS file storage in AgriDirect.

## Step 1: Sign Up for Pinata

1. Go to **https://pinata.cloud**
2. Click **"Sign Up"** (top right corner)
3. Create an account using:
   - Email address, or
   - GitHub account (recommended for developers)
4. Verify your email if required

## Step 2: Navigate to API Keys

1. After logging in, click on your **profile icon** (top right)
2. Select **"API Keys"** from the dropdown menu
   - Or go directly to: https://app.pinata.cloud/developers/api-keys

## Step 3: Create a New API Key

1. Click the **"+ New Key"** button (usually green/blue button)
2. You'll see a form to create a new API key

## Step 4: Configure API Key Settings

### Key Name
- Enter a descriptive name, e.g., `AgriDirect-Development` or `AgriDirect-Production`

### Admin Permissions
- **For Development/Testing**: You can enable **"Admin"** permissions (full access)
  - This allows all operations: pin, unpin, list pins, etc.
  - ✅ Check the **"Admin"** checkbox

### OR Specific Permissions (Recommended for Production)
If you want more granular control, select specific permissions:
- ✅ **pinFileToIPFS** - Required (to upload files)
- ✅ **pinJSONToIPFS** - Required (to upload JSON/certificates)
- ✅ **unpin** - Optional (to remove pins if needed)
- ✅ **pinJobs** - Optional (to check upload status)

### Rate Limits (Optional)
- Leave default or set custom rate limits if needed
- Free tier usually has generous limits

### Expiration (Optional)
- Leave blank for no expiration (recommended for development)
- Or set a future date if you want the key to expire

## Step 5: Generate and Copy Keys

1. Click **"Create Key"** or **"Generate"** button
2. **IMPORTANT**: Pinata will show you:
   - **API Key** (starts with something like `a1b2c3d4e5f6...`)
   - **Secret API Key** (starts with something like `1a2b3c4d5e6f...`)
3. **⚠️ COPY BOTH KEYS IMMEDIATELY** - The Secret Key is shown only once!
4. If you lose the Secret Key, you'll need to create a new API key

## Step 6: Add Keys to Your Project

1. In your project root directory (`SIH_2025`), create or edit the `.env` file
2. Add the following lines:

```env
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_secret_key_here
```

**Example:**
```env
PINATA_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
PINATA_SECRET_KEY=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
```

3. **Save the file**
4. **Restart your Node.js server** for changes to take effect

## Step 7: Verify Setup

1. Start your server: `node server.js`
2. Look for this message in the console:
   ```
   ✅ IPFS Service: Using Pinata
   ```
3. If you see this, your Pinata keys are configured correctly!

## Troubleshooting

### Error: "IPFS Service: Pinata keys not found"
- Make sure `.env` file exists in the project root
- Check that keys are spelled correctly: `PINATA_API_KEY` and `PINATA_SECRET_KEY`
- Ensure there are no extra spaces or quotes around the values
- Restart the server after adding keys

### Error: "Pinata API error (401): Unauthorized"
- Your API keys are incorrect or expired
- Create a new API key and update `.env` file
- Make sure you copied the full keys (they're long strings)

### Error: "Pinata API error (403): Forbidden"
- Your API key doesn't have the required permissions
- Go back to Pinata and ensure the key has:
  - `pinFileToIPFS` permission (required)
  - `pinJSONToIPFS` permission (required)

## Free Tier Limits

Pinata's free tier typically includes:
- ✅ Unlimited pins
- ✅ 1 GB storage
- ✅ Public gateway access
- ✅ API access

This is usually sufficient for development and testing.

## Security Best Practices

1. **Never commit `.env` file to Git**
   - Make sure `.env` is in your `.gitignore` file
   
2. **Use different keys for development and production**
   - Development: Use one API key
   - Production: Use a separate API key with limited permissions

3. **Rotate keys periodically**
   - Delete old keys and create new ones
   - Update `.env` file with new keys

## Additional Resources

- Pinata Documentation: https://docs.pinata.cloud
- Pinata API Reference: https://docs.pinata.cloud/api
- Support: https://pinata.cloud/support

---

**Need Help?** Check the server console logs when uploading files. The improved error messages will guide you to the specific issue.

