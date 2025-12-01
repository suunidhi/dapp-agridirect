# IPFS & Certificate Structure Specification

Complete specification for IPFS storage, document management, and certificate generation.

---

## IPFS Configuration

### Service Provider

**Recommended**: Pinata or Infura IPFS

```javascript
// services/ipfs.js
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_KEY
});

// Or Infura
const { create } = require('ipfs-http-client');
const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: `Basic ${Buffer.from(`${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}`).toString('base64')}`
  }
});
```

### Upload Function

```javascript
async function uploadToIPFS(fileBuffer, fileName) {
  try {
    // Option 1: Pinata
    const result = await pinata.pinFileToIPFS(fileBuffer, {
      pinataMetadata: { name: fileName },
      pinataOptions: { cidVersion: 1 }
    });
    return `ipfs://${result.IpfsHash}`;
    
    // Option 2: Infura
    // const result = await ipfs.add(fileBuffer);
    // return `ipfs://${result.path}`;
  } catch (error) {
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}
```

---

## Document Storage Structure

### 1. Farmer Documents

#### Agriculture Certificate
- **File Type**: PDF, JPG, PNG
- **Max Size**: 10MB
- **IPFS Path**: `ipfs://QmAgricultureCert...`
- **MongoDB Field**: `agricultureCertificateCID`

#### Land Records (Array)
Each land record document:
```json
{
  "type": "712 extract", // or "pattadar", "passbook", "title deed", "khasra", "khatuni", "ghataNumber"
  "documentCID": "ipfs://QmLandRecord...",
  "areaHectares": 5.5,
  "plotNumber": "PLOT-001",
  "uploadedAt": "2025-11-29T10:00:00Z"
}
```

#### Optional Documents
- **Lease Deed**: `leaseDeedCID` (optional)
- **Income Tax Return**: `incomeTaxReturnCID` (optional)
- **Bank Passbook**: `bankPassbookCID` (optional, can be removed later but upload record remains)

#### Payment QR Code
- **File Type**: PNG, JPG
- **IPFS Path**: `ipfs://QmPaymentQR...`
- **MongoDB Field**: `paymentQRCode`

### 2. Distributor Documents

#### Distributor Certificate
- **File Type**: PDF, JPG, PNG
- **IPFS Path**: `ipfs://QmDistributorCert...`
- **MongoDB Field**: `distributorCertificateCID`

#### Payment QR Code
- Same structure as farmer

### 3. Retailer Documents

#### Retailer Certificate
- **File Type**: PDF, JPG, PNG
- **IPFS Path**: `ipfs://QmRetailerCert...`
- **MongoDB Field**: `retailerCertificateCID`

### 4. Crop Batch Media

#### Images (Minimum 2 Required)
- **File Type**: JPG, PNG, WEBP
- **Max Size**: 5MB per image
- **Array of CIDs**: `["ipfs://QmImage1...", "ipfs://QmImage2...", ...]`
- **MongoDB Field**: `images` (array)

#### Video (Optional but Recommended)
- **File Type**: MP4, MOV
- **Max Size**: 50MB
- **IPFS Path**: `ipfs://QmVideo...`
- **MongoDB Field**: `videoCID`

#### Lab Report (Optional)
- **File Type**: PDF
- **Max Size**: 10MB
- **IPFS Path**: `ipfs://QmLabReport...`
- **MongoDB Field**: `labReportCID`

---

## Profile JSON Structure (IPFS)

### Farmer Profile

```json
{
  "profileType": "farmer",
  "farmerId": "507f1f77bcf86cd799439011",
  "fullName": "John Doe",
  "farmName": "Green Fields Farm",
  "location": {
    "addressLine1": "123 Farm Road",
    "addressLine2": "Near Village",
    "city": "Pune",
    "district": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
    "lat": 18.5204,
    "long": 73.8567
  },
  "contact": {
    "email": "farmer@example.com",
    "mobileNumber": "+919876543210"
  },
  "farmingExperienceYears": 10,
  "documents": {
    "agricultureCertificateCID": "ipfs://QmAgricultureCert...",
    "landRecords": [
      {
        "type": "712 extract",
        "documentCID": "ipfs://QmLandRecord1...",
        "areaHectares": 5.5,
        "plotNumber": "PLOT-001"
      }
    ],
    "leaseDeedCID": "ipfs://QmLeaseDeed...",
    "incomeTaxReturnCID": "ipfs://QmITR...",
    "bankPassbookCID": "ipfs://QmBankPassbook..."
  },
  "paymentQRCode": "ipfs://QmPaymentQR...",
  "verificationStatus": "approved",
  "verifiedAt": "2025-11-29T10:00:00Z",
  "createdAt": "2025-11-29T09:00:00Z"
}
```

### Distributor Profile

```json
{
  "profileType": "distributor",
  "distributorId": "507f1f77bcf86cd799439012",
  "fullName": "Distributor Name",
  "companyName": "ABC Distribution Pvt Ltd",
  "companyGSTNumber": "27ABCDE1234F1Z5",
  "location": {
    "addressLine1": "456 Warehouse Street",
    "city": "Mumbai",
    "district": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "contact": {
    "email": "distributor@example.com",
    "mobileNumber": "+919876543211"
  },
  "services": ["milling", "coldStorage", "packaging"],
  "documents": {
    "distributorCertificateCID": "ipfs://QmDistributorCert...",
    "paymentQRCode": "ipfs://QmPaymentQR..."
  },
  "verificationStatus": "approved",
  "verifiedAt": "2025-11-29T10:00:00Z"
}
```

### Retailer Profile

```json
{
  "profileType": "retailer",
  "retailerId": "507f1f77bcf86cd799439013",
  "fullName": "Retailer Name",
  "shopName": "Fresh Mart",
  "location": {
    "addressLine1": "789 Shop Street",
    "city": "Mumbai",
    "district": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400002"
  },
  "contact": {
    "email": "retailer@example.com",
    "mobileNumber": "+919876543212"
  },
  "documents": {
    "retailerCertificateCID": "ipfs://QmRetailerCert..."
  },
  "verificationStatus": "approved"
}
```

---

## Crop Certificate Structure (Final Certificate)

### Complete Certificate JSON

```json
{
  "certificateVersion": "1.0",
  "certificateId": "CERT-FARMER-20251129-001",
  "cropId": "FARMER-20251129-001",
  "issuedAt": "2025-12-02T10:00:00Z",
  "issuedBy": "AgriDirect Platform",
  
  "farmer": {
    "farmerId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "farmName": "Green Fields Farm",
    "location": {
      "addressLine1": "123 Farm Road",
      "city": "Pune",
      "district": "Pune",
      "state": "Maharashtra",
      "pincode": "411001"
    },
    "contact": {
      "email": "farmer@example.com",
      "mobileNumber": "+919876543210"
    },
    "profileCID": "ipfs://QmFarmerProfile...",
    "metamaskAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  },
  
  "distributor": {
    "distributorId": "507f1f77bcf86cd799439012",
    "fullName": "Distributor Name",
    "companyName": "ABC Distribution Pvt Ltd",
    "companyGSTNumber": "27ABCDE1234F1Z5",
    "location": {
      "addressLine1": "456 Warehouse Street",
      "city": "Mumbai",
      "district": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "profileCID": "ipfs://QmDistributorProfile...",
    "metamaskAddress": "0x..."
  },
  
  "retailer": {
    "retailerId": "507f1f77bcf86cd799439013",
    "fullName": "Retailer Name",
    "shopName": "Fresh Mart",
    "location": {
      "addressLine1": "789 Shop Street",
      "city": "Mumbai",
      "district": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400002"
    },
    "profileCID": "ipfs://QmRetailerProfile...",
    "metamaskAddress": "0x..."
  },
  
  "product": {
    "productName": "Organic Wheat",
    "category": "grains",
    "dietLabels": ["Organic", "Vegan", "Gluten-free"],
    "quantity": 1000,
    "unit": "kg",
    "harvestDate": "2025-11-29",
    "images": [
      "ipfs://QmImage1...",
      "ipfs://QmImage2...",
      "ipfs://QmImage3..."
    ],
    "videoCID": "ipfs://QmVideo...",
    "labReportCID": "ipfs://QmLabReport..."
  },
  
  "quality": {
    "soilPH": 6.8,
    "moisturePercent": 12.5,
    "proteinPercent": 10.2,
    "qualityGrade": "A",
    "pesticideUsed": [
      {
        "name": "Neem Oil",
        "timesUsed": 2,
        "dosage": "500ml per acre"
      }
    ]
  },
  
  "processing": {
    "processingStatus": "processed",
    "isCleaned": true,
    "grade": "A",
    "impurityPercentage": 2.5,
    "initialWeight": 980,
    "finalUsableWeight": 950,
    "packSize": "50kg",
    "packMaterial": "jute"
  },
  
  "storage": {
    "coldStorageUsed": true,
    "coldStorageTemperature": 4.0,
    "coldStorageDuration": 2,
    "storedDays": 2
  },
  
  "logistics": [
    {
      "type": "dispatch",
      "from": "Pune, Maharashtra",
      "to": "Mumbai, Maharashtra",
      "vehicleNumber": "MH-12-AB-1234",
      "vehicleType": "tempo",
      "driverName": "Driver Name",
      "transportCompany": "ABC Transport",
      "transportCost": 5000,
      "dispatchTimestamp": "2025-11-30T08:00:00Z",
      "expectedArrival": "2025-11-30T14:00:00Z"
    },
    {
      "type": "receive",
      "receivedBy": "Distributor",
      "receivedTimestamp": "2025-11-30T14:30:00Z",
      "qualityAtReceipt": {
        "moistureAtArrival": 12.8,
        "temperature": 25.5,
        "condition": "good"
      }
    },
    {
      "type": "dispatch",
      "from": "Mumbai, Maharashtra",
      "to": "Mumbai, Maharashtra",
      "vehicleNumber": "MH-01-CD-5678",
      "transportCost": 2000,
      "dispatchTimestamp": "2025-12-02T10:00:00Z"
    },
    {
      "type": "receive",
      "receivedBy": "Retailer",
      "receivedTimestamp": "2025-12-03T15:00:00Z",
      "qualityAtReceipt": {
        "temperature": 25.0,
        "condition": "good"
      }
    }
  ],
  
  "priceTrace": {
    "farmerSalePrice": 25.50,
    "transportCostFarmerToDistributor": 5.00,
    "distributorPurchasePrice": 25.50,
    "distributorSalePrice": 30.00,
    "distributorMargin": 4.50,
    "transportCostDistributorToRetailer": 2.00,
    "retailerPurchasePrice": 30.00,
    "retailerSalePrice": 35.00,
    "retailerMargin": 5.00,
    "finalConsumerPrice": 35.00,
    "priceUpdates": [
      {
        "stage": "farmer",
        "oldPrice": null,
        "newPrice": 25.50,
        "updatedBy": "507f1f77bcf86cd799439011",
        "updatedByRole": "Farmer",
        "timestamp": "2025-11-29T10:00:00Z"
      },
      {
        "stage": "transport",
        "oldPrice": null,
        "newPrice": 5.00,
        "updatedBy": "507f1f77bcf86cd799439011",
        "updatedByRole": "Farmer",
        "timestamp": "2025-11-30T08:00:00Z",
        "reason": "Transport cost from farmer to distributor"
      },
      {
        "stage": "distributor",
        "oldPrice": 25.50,
        "newPrice": 30.00,
        "updatedBy": "507f1f77bcf86cd799439012",
        "updatedByRole": "Distributor",
        "timestamp": "2025-12-02T10:00:00Z",
        "reason": "Processing and packaging costs"
      },
      {
        "stage": "retailer",
        "oldPrice": 30.00,
        "newPrice": 35.00,
        "updatedBy": "507f1f77bcf86cd799439013",
        "updatedByRole": "Retailer",
        "timestamp": "2025-12-03T15:00:00Z",
        "reason": "Retail margin"
      }
    ]
  },
  
  "timeline": [
    {
      "type": "batchCreated",
      "actorRole": "Farmer",
      "timestamp": "2025-11-29T10:00:00Z",
      "metadata": {}
    },
    {
      "type": "distributorSelected",
      "actorRole": "Farmer",
      "timestamp": "2025-11-29T11:00:00Z",
      "metadata": {
        "distributorId": "507f1f77bcf86cd799439012"
      }
    },
    {
      "type": "distributorAccepted",
      "actorRole": "Distributor",
      "timestamp": "2025-11-29T12:00:00Z",
      "metadata": {},
      "blockchainTxHash": "0xabc123..."
    },
    {
      "type": "logisticsDispatched",
      "actorRole": "Farmer",
      "timestamp": "2025-11-30T08:00:00Z",
      "metadata": {
        "vehicleNumber": "MH-12-AB-1234",
        "transportCompany": "ABC Transport",
        "transportCost": 5000
      },
      "blockchainTxHash": "0xdef456..."
    },
    {
      "type": "logisticsReceived",
      "actorRole": "Distributor",
      "timestamp": "2025-11-30T14:30:00Z",
      "metadata": {
        "moistureAtArrival": 12.8,
        "condition": "good"
      }
    },
    {
      "type": "processed",
      "actorRole": "Distributor",
      "timestamp": "2025-12-01T10:00:00Z",
      "metadata": {
        "processingType": "milled",
        "finalUsableWeight": 950
      }
    },
    {
      "type": "storedCold",
      "actorRole": "Distributor",
      "timestamp": "2025-12-01T12:00:00Z",
      "metadata": {
        "temperature": 4.0,
        "duration": 2
      }
    },
    {
      "type": "soldToRetailer",
      "actorRole": "Distributor",
      "timestamp": "2025-12-02T10:00:00Z",
      "metadata": {
        "retailerId": "507f1f77bcf86cd799439013",
        "price": 30.00
      },
      "blockchainTxHash": "0xghi789..."
    },
    {
      "type": "logisticsReceived",
      "actorRole": "Retailer",
      "timestamp": "2025-12-03T15:00:00Z",
      "metadata": {
        "temperature": 25.0,
        "condition": "good"
      }
    },
    {
      "type": "priceUpdate",
      "actorRole": "Retailer",
      "timestamp": "2025-12-03T16:00:00Z",
      "metadata": {
        "oldPrice": 30.00,
        "newPrice": 35.00,
        "reason": "Retail margin"
      }
    }
  ],
  
  "badgeId": "BADGE-20251202-001",
  "blockchain": {
    "blockchainRegistered": true,
    "blockchainCropHash": "0x...",
    "blockchainTxHash": "0x...",
    "network": "sepolia", // or "polygon" for production
    "contractAddress": "0x..."
  },
  
  "verification": {
    "verified": true,
    "blockchainVerified": true,
    "certificateHash": "0x...", // keccak256 of this JSON
    "certificateCID": "ipfs://QmCertificate..." // This CID itself
  }
}
```

---

## Certificate Generation Process

### Step-by-Step

1. **Initial Certificate** (when crop batch created):
   - Basic crop info
   - Farmer info
   - Initial quality data
   - CID: `cropCertificateCID` (initial)

2. **Updated Certificate** (when distributor receives):
   - Add distributor info
   - Add logistics entries
   - Add quality check data
   - Update CID

3. **Final Certificate** (when listed in distributor marketplace):
   - Complete all fields
   - Add price trace
   - Add complete timeline
   - Generate `badgeId`
   - Pin to IPFS
   - Store CID in MongoDB
   - Hash CID and store on blockchain

### Certificate Generation Code

```javascript
// services/certificate.js
const ipfsService = require('./ipfs');

async function generateCertificate(cropBatch) {
  // Fetch all related data
  const farmer = await Farmer.findById(cropBatch.farmerId);
  const distributor = cropBatch.selectedDistributorId 
    ? await Distributor.findById(cropBatch.selectedDistributorId) 
    : null;
  const retailer = await RetailerOrder.findOne({ cropBatchId: cropBatch._id })
    .then(order => order ? Retailer.findById(order.retailerId) : null);
  
  // Fetch price trace
  const priceTrace = await PriceTrace.findOne({ cropBatchId: cropBatch._id });
  
  // Build certificate JSON
  const certificate = {
    certificateVersion: "1.0",
    certificateId: `CERT-${cropBatch.cropId}`,
    cropId: cropBatch.cropId,
    issuedAt: new Date().toISOString(),
    issuedBy: "AgriDirect Platform",
    
    farmer: {
      farmerId: farmer._id.toString(),
      fullName: farmer.fullName,
      farmName: farmer.farmName,
      location: farmer.location,
      contact: {
        email: farmer.email,
        mobileNumber: farmer.mobileNumber
      },
      profileCID: farmer.profileCID,
      metamaskAddress: farmer.metamaskAddress
    },
    
    // ... add all other fields from cropBatch and related data
    
    timeline: cropBatch.history,
    priceTrace: priceTrace ? {
      farmerSalePrice: priceTrace.farmerSalePrice,
      transportCost: priceTrace.transportCost,
      distributorSalePrice: priceTrace.distributorSalePrice,
      retailerSalePrice: priceTrace.retailerSalePrice,
      finalConsumerPrice: priceTrace.finalConsumerPrice,
      priceUpdates: priceTrace.priceUpdates
    } : null,
    
    verification: {
      verified: true,
      blockchainVerified: cropBatch.blockchainRegistered,
      certificateHash: null, // Will be calculated after pinning
      certificateCID: null // Will be set after pinning
    }
  };
  
  // Convert to JSON buffer
  const certificateJSON = JSON.stringify(certificate, null, 2);
  const certificateBuffer = Buffer.from(certificateJSON);
  
  // Pin to IPFS
  const certificateCID = await ipfsService.uploadToIPFS(
    certificateBuffer,
    `certificate-${cropBatch.cropId}.json`
  );
  
  // Calculate hash
  const { keccak256 } = require('ethers');
  const certificateHash = keccak256(
    ethers.utils.toUtf8Bytes(certificateCID)
  );
  
  // Update certificate with CID and hash
  certificate.verification.certificateCID = certificateCID;
  certificate.verification.certificateHash = certificateHash;
  
  // Update cropBatch
  cropBatch.cropCertificateCID = certificateCID;
  await cropBatch.save();
  
  return {
    certificate,
    certificateCID,
    certificateHash
  };
}
```

---

## IPFS Access & Privacy

### Public Access

- Crop certificates: **Public** (anyone can view via IPFS gateway)
- Product images/videos: **Public**
- Lab reports: **Public** (for transparency)

### Private Access (Optional)

- Farmer documents (land records, bank passbook): **Private** (encrypted)
- Distributor/Retailer certificates: **Public** (for verification)

### Encryption (Optional for Sensitive Docs)

```javascript
const crypto = require('crypto');

function encryptDocument(buffer, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64')
  };
}

function decryptDocument(encryptedData, key) {
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted;
}
```

---

## IPFS Gateway URLs

### Public Gateways

- **Pinata**: `https://gateway.pinata.cloud/ipfs/{CID}`
- **Infura**: `https://ipfs.infura.io/ipfs/{CID}`
- **IPFS.io**: `https://ipfs.io/ipfs/{CID}`
- **Cloudflare**: `https://cloudflare-ipfs.com/ipfs/{CID}`

### Custom Gateway (Optional)

Set up your own IPFS gateway for faster access:
```
https://ipfs.agridirect.com/ipfs/{CID}
```

---

## File Size Limits

| Document Type | Max Size | Recommended |
|--------------|----------|-------------|
| Images (crop) | 5MB | 2-3MB |
| Video | 50MB | 20-30MB |
| PDF (certificates) | 10MB | 1-5MB |
| Lab Reports | 10MB | 1-5MB |
| Payment QR | 2MB | 500KB-1MB |

---

## Pinning Strategy

### Automatic Pinning

- All uploaded documents: **Pinned immediately**
- Crop certificates: **Pinned when finalized**
- Profile JSONs: **Pinned when verified**

### Unpinning (Rare)

- Only unpin if document is replaced (keep old CID for audit)
- Never unpin certificates (immutable)

### Pinata Pinning Service

```javascript
// Pin with metadata
await pinata.pinFileToIPFS(fileBuffer, {
  pinataMetadata: {
    name: fileName,
    keyvalues: {
      type: 'crop-certificate',
      cropId: cropBatch.cropId,
      timestamp: Date.now().toString()
    }
  },
  pinataOptions: {
    cidVersion: 1,
    wrapWithDirectory: false
  }
});
```

---

## Certificate Verification

### On-Chain Verification

```javascript
// Verify certificate hash matches on-chain
async function verifyCertificate(certificateCID, cropHash) {
  const contract = await getContract();
  const crop = await contract.getCrop(cropHash);
  
  const certificateCIDHash = keccak256(
    ethers.utils.toUtf8Bytes(certificateCID)
  );
  
  return crop.certificateCIDHash === certificateCIDHash;
}
```

### Off-Chain Verification

1. Fetch certificate from IPFS using CID
2. Verify JSON structure
3. Check all CIDs are valid
4. Verify blockchain hash matches
5. Check timeline integrity

---

## Error Handling

### IPFS Upload Failures

```javascript
async function uploadWithRetry(fileBuffer, fileName, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadToIPFS(fileBuffer, fileName);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### CID Validation

```javascript
function isValidCID(cid) {
  // Basic CID validation (starts with Qm for v0 or specific pattern for v1)
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid) || 
         /^baf[a-z0-9]{56,}$/.test(cid);
}
```

---

## Summary

- **All documents stored in IPFS** with CIDs in MongoDB
- **Certificates are comprehensive JSON** pinned to IPFS
- **Blockchain stores hashes** of IPFS CIDs for verification
- **Public access** for certificates and product media
- **Private/encrypted** for sensitive documents (optional)
- **Automatic pinning** on upload
- **Verification** via blockchain hash matching

