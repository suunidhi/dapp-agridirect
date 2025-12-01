# How to Create .env File with Pinata Keys

## The Problem
You saved your Pinata API keys in `.env.example`, but the application reads from `.env` file. That's why you're getting the error: "project id required" - it's trying to use Infura IPFS instead of Pinata.

## Solution: Create .env File

### Step 1: Create .env file in your project root

**Option A: Using PowerShell (Recommended)**
```powershell
cd C:\Users\Shikhaa\OneDrive\Desktop\SIH_2025
New-Item -Path .env -ItemType File
```

**Option B: Manually**
1. Open your project folder in File Explorer
2. Create a new file named `.env` (not `.env.txt` - make sure it has no extension)
3. If Windows adds `.txt` extension, rename it to just `.env`

### Step 2: Add Your Pinata Keys

Open the `.env` file and add these lines (replace with your actual keys):

```env
# Pinata IPFS Configuration
PINATA_API_KEY=your_actual_pinata_api_key_here
PINATA_SECRET_KEY=your_actual_pinata_secret_key_here
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Other configurations (optional)
GEMINI_API_KEY=your_gemini_api_key_here
MONGO_URI=mongodb://127.0.0.1:27017/agriDirect
NODE_ENV=development
```

### Step 3: Important Notes

1. **No spaces around the `=` sign**
   - ✅ Correct: `PINATA_API_KEY=abc123`
   - ❌ Wrong: `PINATA_API_KEY = abc123`

2. **No quotes needed** (unless the value has spaces)
   - ✅ Correct: `PINATA_API_KEY=abc123def456`
   - ❌ Wrong: `PINATA_API_KEY="abc123def456"`

3. **Copy the FULL keys** from Pinata (they're long strings)

4. **Save the file** after adding keys

### Step 4: Restart Your Server

After creating `.env` file with your keys:
1. Stop your server (Ctrl+C)
2. Start it again: `npm run dev`
3. Look for this message: `✅ IPFS Service: Using Pinata`

## Quick Check

After restarting, check the console output. You should see:
```
✅ IPFS Service: Using Pinata
   API Key: abc123def4...
```

If you still see:
```
⚠️ IPFS Service: Pinata keys not found in .env file
```

Then:
- Check that `.env` file exists (not `.env.example`)
- Check that keys are spelled correctly: `PINATA_API_KEY` and `PINATA_SECRET_KEY`
- Check there are no extra spaces
- Restart the server

## Example .env File

Here's what a complete `.env` file should look like:

```env
PINATA_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
PINATA_SECRET_KEY=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
GEMINI_API_KEY=your_gemini_key_here
NODE_ENV=development
```

**Remember**: Replace the example keys with your actual Pinata API keys!

