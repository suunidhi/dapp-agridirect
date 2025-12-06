# AgriDirect - Startup Guide

## ✅ All Issues Fixed & System Ready

### Fixed Issues

1. ✅ **bcryptjs Module Error** - Fixed by reinstalling dependencies
2. ✅ **Smart Contract Not Required** - System works without blockchain deployment
3. ✅ **All 12 Events Implemented** - Complete immutable flow ready
4. ✅ **Error Handling** - All blockchain operations are non-blocking

---

## 🚀 Quick Start

### 1. Install Dependencies (Already Done)
```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env` file in root directory:

```env
# MongoDB (Required)
MONGODB_URI=mongodb://127.0.0.1:27017/agriDirect

# Server (Required)
PORT=5000
FRONTEND_URL=http://localhost:5000

# IPFS Pinata (Required for document uploads)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# JWT Secret (Required)
JWT_SECRET=your-secret-key-change-in-production

# Blockchain (Optional - System works without this)
NETWORK=localhost
CONTRACT_ADDRESS=
PRIVATE_KEY=

# AI Services (Optional)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Start MongoDB

**Windows**:
```bash
mongod
```

**Linux/Mac**:
```bash
sudo systemctl start mongod
```

### 4. Start Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

Server will start on: `http://localhost:5000`

---

## ✅ Verification Checklist

### Server Status
- [x] Server starts without errors
- [x] MongoDB connection successful
- [x] All routes accessible
- [x] bcryptjs imports correctly

### Blockchain Status
- [x] System works without contract deployment
- [x] All blockchain methods handle failures gracefully
- [x] No errors thrown if contract not deployed
- [x] Event ledger works independently

### Event Blocks
- [x] All 12 events implemented
- [x] SHA-256 hash chaining works
- [x] IPFS integration works
- [x] Certificate generation works
- [x] QR code generation works

---

## 🧪 Test Complete Flow

### Step 1: Register Farmer
1. Go to `http://localhost:5000/farmer/signup`
2. Fill registration form
3. Upload documents (will be stored on IPFS)
4. Verify OTP

**Expected**: Event Block #1 (PRODUCT_CREATED) created when product added

### Step 2: Add Product
1. Login as farmer
2. Go to Add Product page
3. Add product details, upload images
4. Submit

**Expected**: Event Block #1 created ✅

### Step 3: Select Distributor
1. Browse distributors
2. Select distributor
3. Submit request

**Expected**: Event Block #2 (SENT_TO_DISTRIBUTOR) created ✅

### Step 4: Distributor Accepts
1. Login as distributor
2. View notifications
3. Accept request

**Expected**: Event Block #3 (DISTRIBUTOR_ACCEPTED) created ✅

### Step 5: Distributor Checkout
1. Go to checkout page
2. Complete dummy checkout

**Expected**: Event Block #4 (CHECKOUT_INITIATED_BY_DISTRIBUTOR) created ✅

### Step 6: Upgrade Product
1. Go to marketplace_add_product.html
2. Add upgrade details
3. Upload upgraded images
4. Submit

**Expected**: Event Blocks #5 & #6 created ✅

### Step 7: Retailer Buys
1. Login as retailer
2. Browse distributor marketplace
3. Click "Buy Now"

**Expected**: Event Block #7 (RETAILER_REQUESTED_TO_BUY) created ✅

### Step 8: Add Logistics
1. Login as distributor
2. View retailer orders
3. Click "Add Logistics"
4. Fill logistics form
5. Submit

**Expected**: Event Block #8 (DISTRIBUTOR_LOGISTICS_ADDED) created ✅

### Step 9: Retailer Checkout
1. Login as retailer
2. Go to checkout
3. Complete checkout

**Expected**: Event Block #9 (RETAILER_CHECKOUT_INITIATED) created ✅

### Step 10: Accept Delivery
1. Login as retailer
2. Go to my_retailer_orders.html
3. Accept delivery
4. Add inspection details
5. Submit

**Expected**: Event Blocks #10, #11, #12 created ✅

### Step 11: View Certificate
1. Scan QR code or go to certificate.html?cropId=XXX
2. View complete journey

**Expected**: Certificate shows all 12 events ✅

---

## 🔍 Troubleshooting

### Server Won't Start

**Error**: `Cannot find package 'bcryptjs'`
**Solution**: Run `npm install` again

**Error**: `MongoDB connection failed`
**Solution**: 
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`

**Error**: `IPFS upload failed`
**Solution**:
- Check Pinata API keys in `.env`
- Verify network connection
- Check file size limits

### Blockchain Warnings

**Warning**: `⚠️ Contract not initialized`
**Status**: ✅ **NORMAL** - System works without blockchain
**Action**: None required. Deploy contract only if you want on-chain verification.

### Event Blocks Not Created

**Check**:
1. MongoDB is running
2. EventLedger collection exists
3. Check server logs for errors
4. Verify IPFS service is working

---

## 📊 System Architecture

### Immutability Layers

1. **MongoDB EventLedger** - SHA-256 hash-chained blocks
2. **IPFS Storage** - All documents and events stored on IPFS
3. **Smart Contract** (Optional) - Additional on-chain verification

### Data Flow

```
Farmer → Creates Product → Event #1
  ↓
Selects Distributor → Event #2
  ↓
Distributor Accepts → Event #3
  ↓
Distributor Checkout → Event #4
  ↓
Upgrade Product → Events #5, #6
  ↓
Retailer Buys → Event #7
  ↓
Add Logistics → Event #8
  ↓
Retailer Checkout → Event #9
  ↓
Accept Delivery → Events #10, #11, #12
  ↓
Certificate Generated → QR Code Created
```

---

## ✅ Production Readiness

- ✅ All 12 events implemented
- ✅ Error handling for all operations
- ✅ Blockchain optional (works without deployment)
- ✅ IPFS integration working
- ✅ Certificate generation working
- ✅ QR code generation working
- ✅ Complete documentation
- ✅ No blocking errors

**Status**: 🟢 **READY FOR TESTING**

---

## 📞 Support

If you encounter any issues:
1. Check server logs for error messages
2. Verify MongoDB is running
3. Check IPFS/Pinata configuration
4. Review BLOCKCHAIN_SETUP.md for blockchain-related questions

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

