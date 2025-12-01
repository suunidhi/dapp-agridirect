# AgriDirect Quick Start Guide

## 🚀 What Has Been Implemented

Your AgriDirect system now has a comprehensive backend with:

### ✅ Core Features Implemented

1. **Complete Registration System**
   - Farmer registration with all documents (land records, certificates, etc.)
   - Distributor registration with GST and services
   - Retailer registration
   - OTP verification for email and mobile
   - All documents uploaded to IPFS

2. **Crop Batch Management**
   - Create crop batches with images, video, lab reports
   - Automatic QR code generation
   - IPFS integration for all media

3. **Distributor Selection Flow**
   - Farmer selects distributor
   - Distributor receives notifications
   - Accept/reject functionality
   - Status tracking

4. **Logistics Tracking**
   - Dispatch recording with vehicle details
   - Receive with quality checks
   - Price trace updates

5. **Public QR View**
   - Complete journey visibility
   - Price transparency
   - Certificate display

## 📝 API Endpoints Summary

### Authentication & Registration
- `POST /api/auth/register/farmer` - Farmer registration
- `POST /api/auth/register/distributor` - Distributor registration
- `POST /api/auth/register/retailer` - Retailer registration
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/resend-otp` - Resend OTP

### Crop Management
- `POST /api/farmer/crops` - Create crop batch
- `POST /api/farmer/crops/:cropId/select-distributor` - Select distributor
- `POST /api/farmer/crops/:cropId/logistics-dispatch` - Dispatch logistics

### Distributor
- `GET /api/distributor/notifications` - Get requests
- `POST /api/distributor/crops/:cropId/accept` - Accept request
- `POST /api/distributor/crops/:cropId/reject` - Reject request
- `POST /api/distributor/crops/:cropId/receive` - Receive goods

### Public
- `GET /api/public/crop/:cropId` - View crop details (QR code)

## 🔧 Environment Variables Needed

Create a `.env` file with:

```env
# Server
SERVER_URL=http://localhost:5000
JWT_SECRET=your-secret-key

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/agriDirect

# IPFS (choose one)
# Option 1: Pinata
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_KEY=your-pinata-secret
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Option 2: Public IPFS
IPFS_NODE=https://ipfs.infura.io:5001

# Email (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@agridirect.com

# SMS (for OTP) - Optional
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Blockchain
NETWORK=localhost
CONTRACT_ADDRESS=your-contract-address
PRIVATE_KEY=your-private-key

# AI (Gemini)
GEMINI_API_KEY=your-gemini-key
```

## 🏃 Running the Server

```bash
# Install dependencies
npm install

# Start MongoDB (if local)
mongod

# Run server
npm start

# Or with nodemon for development
npm run dev
```

## 📋 Next Steps to Complete

1. **Distributor Marketplace Listing**
   - Create listing API with badge generation
   - Certificate finalization
   - Processing status tracking

2. **Retailer Order Management**
   - Order placement
   - Order receipt with quality checks
   - Retailer price setting

3. **Admin Verification**
   - Admin dashboard APIs
   - Verification endpoints
   - Blockchain registration after verification

4. **Price Trace Updates**
   - Automatic price updates throughout supply chain
   - Price change notifications

5. **Testing**
   - Unit tests
   - Integration tests
   - End-to-end testing

## 🔍 Testing the APIs

### 1. Register a Farmer
```bash
curl -X POST http://localhost:5000/api/auth/register/farmer \
  -F "fullName=John Doe" \
  -F "farmName=Green Farm" \
  -F "email=farmer@example.com" \
  -F "mobileNumber=+1234567890" \
  -F "password=secure123" \
  -F "farmingExperienceYears=10" \
  -F "agricultureCertificate=@certificate.pdf"
```

### 2. Create a Crop Batch
```bash
curl -X POST http://localhost:5000/api/farmer/crops \
  -F "farmerId=YOUR_FARMER_ID" \
  -F "productName=Organic Tomatoes" \
  -F "category=vegetables" \
  -F "quantity=100" \
  -F "unit=kg" \
  -F "pricePerUnitFarmer=50" \
  -F "harvestDate=2024-01-15" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"
```

### 3. View Crop via QR
```bash
curl http://localhost:5000/api/public/crop/FARMER-20240115-001
```

## 📚 Documentation

- See `IMPLEMENTATION_STATUS.md` for detailed status
- See `specs/` folder for API specifications
- See `models/index.js` for data models

## ⚠️ Important Notes

1. **IPFS**: Currently configured for Pinata or public IPFS. Make sure to set up your IPFS service.

2. **OTP**: In development mode, OTPs are returned in the response. In production, they're sent via email/SMS.

3. **Blockchain**: Blockchain integration is prepared but requires proper signer setup. Currently logs to console.

4. **File Cleanup**: Uploaded files are automatically deleted after IPFS upload to save disk space.

5. **Legacy Routes**: Old routes are maintained for backward compatibility but redirect to new endpoints.

