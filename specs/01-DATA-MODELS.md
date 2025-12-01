# Data Models & MongoDB Schemas

This document defines all MongoDB schemas with complete field specifications.

---

## 1. Farmer Schema

```javascript
{
  // Basic Information
  fullName: { type: String, required: true },
  farmName: { type: String, required: true },
  
  // Location (Detailed Object)
  location: {
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    lat: { type: Number },
    long: { type: Number }
  },
  
  // Contact & Auth
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  mobileVerified: { type: Boolean, default: false },
  emailOTP: { type: String },
  mobileOTP: { type: String },
  otpExpiry: { type: Date },
  
  // Blockchain
  metamaskAddress: { type: String }, // Required for on-chain actions
  blockchainRegistered: { type: Boolean, default: false },
  blockchainTxHash: { type: String }, // Registration transaction hash
  
  // Payment
  paymentQRCode: { type: String }, // IPFS CID or file path
  
  // Experience
  farmingExperienceYears: { type: Number, required: true },
  
  // Documents (IPFS CIDs)
  agricultureCertificateCID: { type: String }, // Required
  
  // Land Records (Array of Objects)
  landRecords: [{
    type: { 
      type: String, 
      enum: ["712 extract", "pattadar", "passbook", "title deed", "khasra", "khatuni", "ghataNumber"],
      required: true
    },
    documentCID: { type: String, required: true }, // IPFS CID
    areaHectares: { type: Number, required: true },
    plotNumber: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Optional Documents
  leaseDeedCID: { type: String }, // Optional
  incomeTaxReturnCID: { type: String }, // Optional
  bankPassbookCID: { type: String }, // Optional (can be removed later but original upload record remains)
  
  // Verification
  verificationStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  verifiedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  verifiedAt: { type: Date },
  rejectionReason: { type: String },
  
  // Profile on IPFS
  profileCID: { type: String }, // Complete profile JSON pinned to IPFS
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 2. Distributor Schema

```javascript
{
  // Basic Information
  fullName: { type: String, required: true },
  companyName: { type: String, required: true },
  companyGSTNumber: { type: String, required: true },
  
  // Location
  location: {
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    lat: { type: Number },
    long: { type: Number }
  },
  
  // Contact & Auth
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  mobileVerified: { type: Boolean, default: false },
  
  // Blockchain
  metamaskAddress: { type: String }, // Required for on-chain actions
  blockchainRegistered: { type: Boolean, default: false },
  blockchainTxHash: { type: String },
  
  // Payment
  paymentQRCode: { type: String }, // IPFS CID or file path
  
  // Documents
  distributorCertificateCID: { type: String, required: true }, // License/certificate
  
  // Verification
  verificationStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  verifiedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  verifiedAt: { type: Date },
  rejectionReason: { type: String },
  
  // Profile on IPFS
  profileCID: { type: String },
  
  // Services Offered (for farmer selection)
  services: [{
    type: String,
    enum: ["milling", "coldStorage", "packaging", "transport"]
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 3. Retailer Schema

```javascript
{
  // Basic Information
  fullName: { type: String, required: true },
  shopName: { type: String, required: true },
  
  // Location
  location: {
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    lat: { type: Number },
    long: { type: Number }
  },
  
  // Contact & Auth
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  mobileVerified: { type: Boolean, default: false },
  
  // Blockchain
  metamaskAddress: { type: String }, // Required for on-chain actions
  blockchainRegistered: { type: Boolean, default: false },
  blockchainTxHash: { type: String },
  
  // Documents
  retailerCertificateCID: { type: String, required: true }, // License
  
  // Verification
  verificationStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  verifiedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  verifiedAt: { type: Date },
  rejectionReason: { type: String },
  
  // Profile on IPFS
  profileCID: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 4. Consumer Schema

```javascript
{
  // Basic Information (All Optional)
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  mobileNumber: { type: String, unique: true, sparse: true },
  
  // Optional Auth
  passwordHash: { type: String },
  
  // Optional Blockchain (if making on-chain purchases)
  metamaskAddress: { type: String },
  
  // Preferences (for personalized marketplace)
  preferences: [{
    type: String,
    enum: ["Jain", "Swaminarayan", "Vegan", "Organic", "Fruitarian", "Gluten-free"]
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 5. Admin Schema

```javascript
{
  // Basic Information
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  
  // Role & Permissions
  role: { type: String, enum: ["superAdmin", "admin", "moderator"], default: "admin" },
  permissions: [{
    type: String,
    enum: ["verifyFarmers", "verifyDistributors", "verifyRetailers", "resolveDisputes", "viewLogs"]
  }],
  
  // Activity Log
  lastLogin: { type: Date },
  verificationCount: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 6. CropBatch Schema (Core Product Model)

```javascript
{
  // Identification
  _id: { type: mongoose.Schema.Types.ObjectId },
  cropId: { type: String, required: true, unique: true }, // Format: FARMER-YYYYMMDD-SEQ (e.g., FARMER-20251129-001)
  
  // Farmer Reference
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  farmerMetamaskAddress: { type: String },
  
  // Product Details
  productName: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["fruits", "vegetables", "grains", "others"], 
    required: true 
  },
  dietLabels: [{ 
    type: String, 
    enum: ["Jain", "Swaminarayan", "Vegan", "Organic", "Fruitarian", "Gluten-free"] 
  }],
  
  // Media (IPFS CIDs)
  images: [{ type: String }], // Array of IPFS CIDs, minimum 2 required
  videoCID: { type: String }, // Optional but recommended
  
  // Quantity & Pricing
  quantity: { type: Number, required: true },
  unit: { type: String, required: true }, // e.g., "kg", "quintal", "packet", "box"
  pricePerUnitFarmer: { type: Number, required: true }, // Initial farmer price
  
  // Harvest & Quality
  harvestDate: { type: Date, required: true },
  soilPH: { type: Number },
  moisturePercent: { type: Number },
  proteinPercent: { type: Number },
  pesticideUsed: [{
    name: { type: String },
    timesUsed: { type: Number },
    dosage: { type: String }
  }],
  labReportCID: { type: String }, // IPFS CID if available
  qualityGrade: { type: String, enum: ["A", "B", "C"] }, // Set by distributor or lab
  
  // Status & Flow
  status: { 
    type: String, 
    enum: [
      "created", 
      "assignedToDistributor", 
      "inTransitToDistributor", 
      "withDistributor", 
      "processed", 
      "inTransitToRetailer", 
      "withRetailer", 
      "sold", 
      "archived"
    ], 
    default: "created" 
  },
  
  // Distributor Assignment
  selectedDistributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor" },
  distributorAccepted: { type: Boolean, default: false },
  distributorAcceptedAt: { type: Date },
  
  // Ledger (Append-only array)
  history: [{
    type: { 
      type: String, 
      enum: [
        "batchCreated", 
        "distributorSelected", 
        "distributorAccepted",
        "distributorRejected",
        "logisticsDispatched", 
        "logisticsReceived", 
        "qualityChecked", 
        "processed", 
        "storedCold", 
        "soldToRetailer", 
        "soldToConsumer", 
        "priceUpdate", 
        "feedback"
      ],
      required: true
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorRole: { type: String, enum: ["Farmer", "Distributor", "Retailer", "Admin"], required: true },
    timestamp: { type: Date, default: Date.now, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed }, // Flexible object for event-specific data
    blockchainTxHash: { type: String } // If this event triggered on-chain transaction
  }],
  
  // Final Certificate
  cropCertificateCID: { type: String }, // Generated when finalized, pinned to IPFS
  
  // Blockchain
  blockchainRegistered: { type: Boolean, default: false },
  blockchainCropHash: { type: String }, // keccak256 hash of cropId + certificateCID
  badgeId: { type: String }, // Generated when listed on distributor marketplace
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 7. DistributorRequest Schema

```javascript
{
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor", required: true },
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  
  status: { 
    type: String, 
    enum: ["pending", "accepted", "rejected"], 
    default: "pending" 
  },
  
  // Price offered by farmer
  offeredPrice: { type: Number },
  
  // Response
  respondedAt: { type: Date },
  responseNotes: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 8. LogisticsEntry Schema

```javascript
{
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  
  // Dispatch Details
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, required: true }, // Farmer or Distributor
  dispatchedByRole: { type: String, enum: ["Farmer", "Distributor"], required: true },
  dispatchTimestamp: { type: Date, required: true },
  
  // Transport Details
  vehicleNumber: { type: String, required: true },
  vehicleType: { type: String }, // e.g., "tempo", "truck", "van"
  driverName: { type: String },
  driverPhone: { type: String },
  transportCompany: { type: String },
  transportCost: { type: Number, required: true },
  
  // Route
  fromLocation: { type: String, required: true },
  toLocation: { type: String, required: true },
  expectedArrival: { type: Date },
  
  // Receipt Details
  receivedBy: { type: mongoose.Schema.Types.ObjectId }, // Distributor or Retailer
  receivedByRole: { type: String, enum: ["Distributor", "Retailer"] },
  receivedTimestamp: { type: Date },
  
  // Quality at Receipt
  qualityAtReceipt: {
    photos: [{ type: String }], // IPFS CIDs
    moistureAtArrival: { type: Number },
    temperature: { type: Number },
    condition: { type: String, enum: ["excellent", "good", "fair", "poor"] },
    notes: { type: String }
  },
  
  // Blockchain
  blockchainTxHash: { type: String }, // If logged on-chain
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 9. DistributorListing Schema

```javascript
{
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor", required: true },
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  
  // Product Details
  productName: { type: String, required: true },
  category: { type: String, required: true },
  
  // Purchase Details
  dateDistributorPurchased: { type: Date, required: true },
  dateProductCameFromFarmer: { type: Date, required: true },
  
  // Storage
  coldStorageUsed: { type: Boolean, default: false },
  coldStorageTemperature: { type: Number },
  coldStorageDuration: { type: Number }, // in days
  storedDays: { type: Number },
  
  // Processing (for grains)
  processingStatus: { type: String, enum: ["processed", "notProcessed", "milled", "cleaned"] },
  isCleaned: { type: Boolean },
  grade: { type: String },
  impurityPercentage: { type: Number },
  
  // Weight
  initialWeight: { type: Number, required: true },
  finalUsableWeight: { type: Number, required: true },
  
  // Pricing
  pricePerUnitDistributor: { type: Number, required: true },
  distributorMargin: { type: Number, required: true },
  
  // Packaging
  packageDate: { type: Date },
  packSize: { type: String },
  packMaterial: { type: String },
  
  // Badge & Certificate
  badgeId: { type: String, required: true, unique: true }, // Generated on listing
  finalImageCID: { type: String }, // IPFS CID of final product image
  
  // Status
  status: { type: String, enum: ["listed", "sold", "archived"], default: "listed" },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 10. RetailerOrder Schema

```javascript
{
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "Retailer", required: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor", required: true },
  distributorListingId: { type: mongoose.Schema.Types.ObjectId, ref: "DistributorListing", required: true },
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  
  // Product Details
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  
  // Payment
  paymentMethod: { type: String, enum: ["cod", "qr", "upi"], required: true },
  paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  paymentTransactionId: { type: String },
  
  // Delivery
  address: { type: String, required: true },
  deliveryStatus: { type: String, enum: ["pending", "inTransit", "delivered"], default: "pending" },
  
  // Receipt Details (filled by retailer)
  receivedTimestamp: { type: Date },
  receivedTemperature: { type: Number },
  receivedQuality: { type: String },
  receivedQuantity: { type: Number },
  coldStorageUsed: { type: Boolean },
  coldStorageDuration: { type: Number },
  
  // Retailer Listing
  retailerPrice: { type: Number }, // Set by retailer for consumer sale
  
  // Status
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  
  orderDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 11. PriceTrace Schema (for transparency)

```javascript
{
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  
  // Price at each stage
  farmerSalePrice: { type: Number, required: true },
  transportCost: { type: Number, default: 0 },
  distributorPurchasePrice: { type: Number },
  distributorSalePrice: { type: Number },
  distributorMargin: { type: Number },
  retailerPurchasePrice: { type: Number },
  retailerSalePrice: { type: Number },
  retailerMargin: { type: Number },
  finalConsumerPrice: { type: Number },
  
  // Price Updates History
  priceUpdates: [{
    stage: { type: String, enum: ["farmer", "transport", "distributor", "retailer", "consumer"] },
    oldPrice: { type: Number },
    newPrice: { type: Number },
    updatedBy: { type: mongoose.Schema.Types.ObjectId },
    updatedByRole: { type: String },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 12. QRCode Schema

```javascript
{
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true, unique: true },
  
  // QR Code Data
  qrCodeUrl: { type: String, required: true }, // URL that QR points to
  qrCodeImagePath: { type: String }, // Local file path or IPFS CID
  qrCodeImageCID: { type: String }, // IPFS CID of QR image
  
  // Public View URL
  publicViewUrl: { type: String, required: true }, // e.g., /api/public/crop/:cropId
  
  // Blockchain
  blockchainHash: { type: String }, // Hash stored on-chain
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## Indexes Required

```javascript
// Farmer
Farmer.index({ email: 1 });
Farmer.index({ mobileNumber: 1 });
Farmer.index({ metamaskAddress: 1 });
Farmer.index({ verificationStatus: 1 });

// Distributor
Distributor.index({ email: 1 });
Distributor.index({ companyGSTNumber: 1 });
Distributor.index({ verificationStatus: 1 });

// Retailer
Retailer.index({ email: 1 });
Retailer.index({ verificationStatus: 1 });

// CropBatch
CropBatch.index({ cropId: 1 });
CropBatch.index({ farmerId: 1 });
CropBatch.index({ selectedDistributorId: 1 });
CropBatch.index({ status: 1 });
CropBatch.index({ createdAt: -1 });

// DistributorRequest
DistributorRequest.index({ distributorId: 1, status: 1 });
DistributorRequest.index({ farmerId: 1 });

// DistributorListing
DistributorListing.index({ distributorId: 1 });
DistributorListing.index({ badgeId: 1 });
DistributorListing.index({ status: 1 });

// RetailerOrder
RetailerOrder.index({ retailerId: 1 });
RetailerOrder.index({ distributorId: 1 });
RetailerOrder.index({ status: 1 });
```

---

## Validation Rules

1. **Farmer Registration**:
   - Email must be unique and verified via OTP
   - Mobile must be unique and verified via OTP
   - At least one land record required
   - Agriculture certificate required

2. **CropBatch Creation**:
   - Minimum 2 images required
   - cropId must follow format: FARMER-YYYYMMDD-SEQ
   - All numeric fields must be >= 0

3. **Distributor Listing**:
   - badgeId must be unique
   - finalUsableWeight <= initialWeight
   - pricePerUnitDistributor > pricePerUnitFarmer (typically)

4. **Price Trace**:
   - Each price update must have reason
   - Prices must be positive numbers

