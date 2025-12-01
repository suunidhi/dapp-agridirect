# API Endpoints Specification

Complete REST API specification with request/response formats, validation rules, and error handling.

---

## Base URL

```
Development: http://localhost:5000
Production: https://api.agridirect.com
```

---

## Authentication

Most endpoints require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

For blockchain operations, MetaMask signature verification required.

---

## 1. Authentication & Registration Endpoints

### 1.1 Farmer Registration

**POST** `/api/auth/register/farmer`

**Content-Type**: `multipart/form-data`

**Request Body**:
```javascript
{
  // Basic Info
  fullName: "John Doe",
  farmName: "Green Fields Farm",
  
  // Location
  addressLine1: "123 Farm Road",
  addressLine2: "Near Village",
  city: "Pune",
  district: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  lat: 18.5204, // Optional
  long: 73.8567, // Optional
  
  // Contact
  email: "farmer@example.com",
  mobileNumber: "+919876543210",
  password: "securePassword123",
  
  // Experience
  farmingExperienceYears: 10,
  
  // Files (multipart)
  agricultureCertificate: File, // Required
  paymentQRCode: File, // Required
  
  // Land Records (JSON string or array)
  landRecords: JSON.stringify([
    {
      type: "712 extract",
      document: File, // Will be uploaded to IPFS
      areaHectares: 5.5,
      plotNumber: "PLOT-001"
    },
    {
      type: "pattadar",
      document: File,
      areaHectares: 3.2,
      plotNumber: "PLOT-002"
    }
  ]),
  
  // Optional Documents
  leaseDeed: File, // Optional
  incomeTaxReturn: File, // Optional
  bankPassbook: File, // Optional
  
  // Blockchain
  metamaskAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" // Optional at registration
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Farmer registered successfully. Please verify email and mobile.",
  farmerId: "507f1f77bcf86cd799439011",
  verificationStatus: "pending",
  emailOTPSent: true,
  mobileOTPSent: true
}
```

**Error Response** (400):
```javascript
{
  success: false,
  message: "Email already registered",
  errors: {
    email: "Email already exists"
  }
}
```

---

### 1.2 Verify OTP (Email/Mobile)

**POST** `/api/auth/verify-otp`

**Request Body**:
```javascript
{
  email: "farmer@example.com", // or mobileNumber
  otp: "123456",
  type: "email" // or "mobile"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "OTP verified successfully",
  verified: true
}
```

---

### 1.3 Login

**POST** `/api/auth/login`

**Request Body**:
```javascript
{
  email: "farmer@example.com",
  password: "securePassword123",
  role: "farmer" // "farmer" | "distributor" | "retailer" | "consumer" | "admin"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Login successful",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: "507f1f77bcf86cd799439011",
    role: "farmer",
    fullName: "John Doe",
    email: "farmer@example.com",
    verificationStatus: "approved",
    metamaskAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}
```

---

### 1.4 Distributor Registration

**POST** `/api/auth/register/distributor`

**Content-Type**: `multipart/form-data`

**Request Body**:
```javascript
{
  fullName: "Distributor Name",
  companyName: "ABC Distribution Pvt Ltd",
  companyGSTNumber: "27ABCDE1234F1Z5",
  
  // Location (same structure as farmer)
  addressLine1: "456 Warehouse Street",
  city: "Mumbai",
  district: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  
  email: "distributor@example.com",
  mobileNumber: "+919876543211",
  password: "securePassword123",
  
  paymentQRCode: File,
  distributorCertificate: File, // License/certificate
  
  services: JSON.stringify(["milling", "coldStorage", "packaging"]), // Optional
  
  metamaskAddress: "0x..." // Optional
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Distributor registered successfully",
  distributorId: "507f1f77bcf86cd799439012",
  verificationStatus: "pending"
}
```

---

### 1.5 Retailer Registration

**POST** `/api/auth/register/retailer`

**Request Body** (similar structure to distributor, but simpler):
```javascript
{
  fullName: "Retailer Name",
  shopName: "Fresh Mart",
  location: { /* same as farmer */ },
  email: "retailer@example.com",
  mobileNumber: "+919876543212",
  password: "securePassword123",
  retailerCertificate: File,
  metamaskAddress: "0x..."
}
```

---

### 1.6 Consumer Registration (Optional)

**POST** `/api/auth/register/consumer`

**Request Body**:
```javascript
{
  name: "Consumer Name", // Optional
  email: "consumer@example.com", // Optional
  mobileNumber: "+919876543213", // Optional
  password: "securePassword123", // Optional
  preferences: ["Jain", "Organic"] // Optional
}
```

---

## 2. Farmer Endpoints

### 2.1 Create Crop Batch

**POST** `/api/farmer/crops`

**Headers**: `Authorization: Bearer <token>`

**Content-Type**: `multipart/form-data`

**Request Body**:
```javascript
{
  productName: "Organic Wheat",
  category: "grains", // "fruits" | "vegetables" | "grains" | "others"
  dietLabels: JSON.stringify(["Organic", "Vegan", "Gluten-free"]),
  
  // Media (Required: min 2 images)
  images: [File, File, File], // Array of image files
  video: File, // Optional but recommended
  
  // Quantity & Price
  quantity: 1000,
  unit: "kg", // "kg" | "quintal" | "packet" | "box"
  pricePerUnitFarmer: 25.50,
  
  // Quality Details
  harvestDate: "2025-11-29",
  soilPH: 6.8,
  moisturePercent: 12.5,
  proteinPercent: 10.2,
  
  // Pesticides
  pesticides: JSON.stringify([
    { name: "Neem Oil", timesUsed: 2, dosage: "500ml per acre" }
  ]),
  
  // Lab Report (Optional)
  labReport: File,
  
  // Location
  location: "Pune, Maharashtra"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Crop batch created successfully",
  cropBatch: {
    _id: "507f1f77bcf86cd799439013",
    cropId: "FARMER-20251129-001",
    productName: "Organic Wheat",
    status: "created",
    qrCodeUrl: "/api/public/crop/FARMER-20251129-001",
    qrCodeImagePath: "/uploads/qrs/FARMER-20251129-001.png",
    images: [
      "ipfs://QmXxxx...",
      "ipfs://QmYyyy..."
    ],
    videoCID: "ipfs://QmZzzz...",
    createdAt: "2025-11-29T10:00:00Z"
  }
}
```

---

### 2.2 Get My Crops

**GET** `/api/farmer/crops`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `status`: Filter by status (optional)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response** (200):
```javascript
{
  success: true,
  crops: [
    {
      _id: "...",
      cropId: "FARMER-20251129-001",
      productName: "Organic Wheat",
      category: "grains",
      status: "created",
      quantity: 1000,
      pricePerUnitFarmer: 25.50,
      selectedDistributorId: null,
      qrCodeImagePath: "/uploads/qrs/...",
      createdAt: "2025-11-29T10:00:00Z"
    }
  ],
  total: 10,
  page: 1,
  limit: 10
}
```

---

### 2.3 Update Crop Batch

**PUT** `/api/farmer/crops/:cropId`

**Headers**: `Authorization: Bearer <token>`

**Note**: Only allowed if `status === "created"`

**Request Body** (same as create, but all fields optional):
```javascript
{
  productName: "Updated Name",
  pricePerUnitFarmer: 26.00,
  // ... other fields
}
```

---

### 2.4 Delete Crop Batch

**DELETE** `/api/farmer/crops/:cropId`

**Headers**: `Authorization: Bearer <token>`

**Note**: Only allowed if `status === "created"`

**Response** (200):
```javascript
{
  success: true,
  message: "Crop batch deleted successfully"
}
```

---

### 2.5 Select Distributor

**POST** `/api/farmer/crops/:cropId/select-distributor`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  distributorId: "507f1f77bcf86cd799439012",
  offeredPrice: 25.50 // Price farmer is offering to distributor
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Distributor request sent successfully",
  requestId: "507f1f77bcf86cd799439014",
  notificationSent: true
}
```

**Process**:
1. Creates `DistributorRequest` with status "pending"
2. Appends ledger entry `distributorSelected` to CropBatch
3. Sends notification to distributor
4. Optionally triggers on-chain event `DistributorAssigned`

---

### 2.6 Dispatch Logistics

**POST** `/api/farmer/crops/:cropId/logistics-dispatch`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  vehicleNumber: "MH-12-AB-1234",
  vehicleType: "tempo", // "tempo" | "truck" | "van"
  driverName: "Driver Name",
  driverPhone: "+919876543214",
  transportCompany: "ABC Transport",
  transportCost: 5000,
  fromLocation: "Pune, Maharashtra",
  toLocation: "Mumbai, Maharashtra",
  expectedArrival: "2025-11-30T14:00:00Z"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Logistics dispatched successfully",
  logisticsEntryId: "507f1f77bcf86cd799439015",
  cropBatchStatus: "inTransitToDistributor",
  blockchainTxHash: "0xabc123..." // If logged on-chain
}
```

**Process**:
1. Creates `LogisticsEntry`
2. Updates CropBatch status to `inTransitToDistributor`
3. Appends ledger entry `logisticsDispatched`
4. Optionally triggers on-chain event

---

## 3. Distributor Endpoints

### 3.1 Get Notifications (Farmer Requests)

**GET** `/api/distributor/notifications`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `status`: Filter by status (default: "pending")

**Response** (200):
```javascript
{
  success: true,
  notifications: [
    {
      _id: "...",
      requestId: "507f1f77bcf86cd799439014",
      farmer: {
        name: "John Doe",
        farmName: "Green Fields Farm",
        location: "Pune, Maharashtra"
      },
      cropBatch: {
        cropId: "FARMER-20251129-001",
        productName: "Organic Wheat",
        quantity: 1000,
        unit: "kg",
        pricePerUnitFarmer: 25.50,
        images: ["ipfs://..."],
        harvestDate: "2025-11-29"
      },
      offeredPrice: 25.50,
      status: "pending",
      createdAt: "2025-11-29T10:30:00Z"
    }
  ]
}
```

---

### 3.2 Accept Distributor Request

**POST** `/api/distributor/requests/:requestId/accept`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  notes: "Will process and package within 3 days" // Optional
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Request accepted successfully",
  cropBatchId: "507f1f77bcf86cd799439013",
  blockchainTxHash: "0xdef456..." // If logged on-chain
}
```

**Process**:
1. Updates `DistributorRequest` status to "accepted"
2. Updates CropBatch: `selectedDistributorId`, `distributorAccepted: true`
3. Updates CropBatch status to `assignedToDistributor`
4. Appends ledger entry `distributorAccepted`
5. Triggers on-chain event `DistributorAssigned`

---

### 3.3 Reject Distributor Request

**POST** `/api/distributor/requests/:requestId/reject`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  reason: "Insufficient storage capacity" // Optional
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Request rejected",
  notificationSent: true
}
```

---

### 3.4 Receive Logistics

**POST** `/api/distributor/crops/:cropId/receive`

**Headers**: `Authorization: Bearer <token>`

**Content-Type**: `multipart/form-data`

**Request Body**:
```javascript
{
  receivedTimestamp: "2025-11-30T14:30:00Z",
  
  // Quality Check
  qualityPhotos: [File, File], // Photos at arrival
  moistureAtArrival: 12.8,
  temperature: 25.5,
  condition: "good", // "excellent" | "good" | "fair" | "poor"
  notes: "Product received in good condition",
  
  // Weight Check
  receivedQuantity: 980, // May differ from dispatched quantity
  unit: "kg"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Product received and quality checked",
  logisticsEntryId: "507f1f77bcf86cd799439015",
  cropBatchStatus: "withDistributor",
  qualityGrade: "A" // Auto-assigned based on condition
}
```

**Process**:
1. Updates `LogisticsEntry` with receipt details
2. Updates CropBatch status to `withDistributor`
3. Appends ledger entry `logisticsReceived`
4. Sets `qualityGrade` if applicable
5. Optionally triggers on-chain event

---

### 3.5 Process Crop (for grains)

**POST** `/api/distributor/crops/:cropId/process`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  processingType: "milled", // "milled" | "cleaned" | "polished"
  processingDate: "2025-12-01",
  initialWeight: 980,
  finalUsableWeight: 950, // After processing loss
  grade: "A",
  impurityPercentage: 2.5,
  notes: "Milled and cleaned"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Crop processed successfully",
  cropBatchStatus: "processed"
}
```

---

### 3.6 Store in Cold Storage

**POST** `/api/distributor/crops/:cropId/cold-storage`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  temperature: 4.0, // Celsius
  humidity: 85, // Percentage
  storageStartDate: "2025-12-01",
  expectedDuration: 30, // days
  notes: "Stored in cold storage unit 3"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Product stored in cold storage",
  storageEntryId: "507f1f77bcf86cd799439016"
}
```

---

### 3.7 Create Distributor Listing

**POST** `/api/distributor/listings`

**Headers**: `Authorization: Bearer <token>`

**Content-Type**: `multipart/form-data`

**Request Body**:
```javascript
{
  cropBatchId: "507f1f77bcf86cd799439013",
  
  // Dates
  dateDistributorPurchased: "2025-11-30",
  dateProductCameFromFarmer: "2025-11-30",
  packageDate: "2025-12-02",
  storedDays: 2,
  
  // Storage
  coldStorageUsed: true,
  coldStorageTemperature: 4.0,
  coldStorageDuration: 2, // days
  
  // Processing (for grains)
  processingStatus: "processed",
  isCleaned: true,
  grade: "A",
  impurityPercentage: 2.5,
  
  // Weight
  initialWeight: 980,
  finalUsableWeight: 950,
  
  // Pricing
  pricePerUnitDistributor: 30.00,
  distributorMargin: 4.50, // Calculated or manual
  
  // Packaging
  packSize: "50kg",
  packMaterial: "jute",
  
  // Final Image
  finalImage: File // Required
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Product listed in distributor marketplace",
  listing: {
    _id: "...",
    badgeId: "BADGE-20251202-001",
    productName: "Organic Wheat",
    pricePerUnitDistributor: 30.00,
    finalImageCID: "ipfs://QmFinal...",
    cropCertificateCID: "ipfs://QmCert...", // Generated certificate
    blockchainTxHash: "0xghi789..." // If logged on-chain
  }
}
```

**Process**:
1. Creates `DistributorListing`
2. Generates unique `badgeId`
3. Generates final `cropCertificateCID` (pinned to IPFS)
4. Updates CropBatch status to `processed` or `withDistributor`
5. Appends ledger entry
6. Triggers on-chain event `CropListed`
7. Updates `PriceTrace`

---

### 3.8 Get My Listings

**GET** `/api/distributor/listings`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```javascript
{
  success: true,
  listings: [
    {
      _id: "...",
      badgeId: "BADGE-20251202-001",
      productName: "Organic Wheat",
      category: "grains",
      pricePerUnitDistributor: 30.00,
      finalUsableWeight: 950,
      status: "listed",
      createdAt: "2025-12-02T10:00:00Z"
    }
  ]
}
```

---

## 4. Retailer Endpoints

### 4.1 Get Distributor Marketplace

**GET** `/api/retailer/marketplace`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `category`: Filter by category
- `minPrice`, `maxPrice`: Price range
- `location`: Filter by location
- `sortBy`: "price_asc" | "price_desc" | "newest"

**Response** (200):
```javascript
{
  success: true,
  products: [
    {
      _id: "...",
      badgeId: "BADGE-20251202-001",
      distributorName: "ABC Distribution",
      productName: "Organic Wheat",
      category: "grains",
      pricePerUnitDistributor: 30.00,
      finalUsableWeight: 950,
      unit: "kg",
      finalImage: "ipfs://...",
      grade: "A",
      processingStatus: "processed",
      createdAt: "2025-12-02T10:00:00Z"
    }
  ],
  total: 50
}
```

---

### 4.2 Place Order (Buy from Distributor)

**POST** `/api/retailer/orders`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  distributorListingId: "507f1f77bcf86cd799439017",
  cropBatchId: "507f1f77bcf86cd799439013",
  quantity: 100, // kg
  unitPrice: 30.00,
  totalPrice: 3000.00,
  paymentMethod: "cod", // "cod" | "qr" | "upi"
  address: "123 Shop Street, Mumbai, Maharashtra, 400001"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Order placed successfully",
  orderId: "507f1f77bcf86cd799439018",
  paymentStatus: "pending"
}
```

---

### 4.3 Confirm Receipt

**POST** `/api/retailer/orders/:orderId/confirm-receipt`

**Headers**: `Authorization: Bearer <token>`

**Content-Type**: `multipart/form-data`

**Request Body**:
```javascript
{
  receivedTimestamp: "2025-12-03T15:00:00Z",
  receivedTemperature: 25.0,
  receivedQuality: "good",
  receivedQuantity: 98, // May differ from ordered
  coldStorageUsed: false,
  coldStorageDuration: 0,
  notes: "Received in good condition"
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Receipt confirmed",
  orderStatus: "completed",
  cropBatchStatus: "withRetailer",
  blockchainTxHash: "0xjkl012..." // If logged on-chain
}
```

**Process**:
1. Updates `RetailerOrder` with receipt details
2. Updates CropBatch status to `withRetailer`
3. Appends ledger entry
4. Optionally triggers on-chain event

---

### 4.4 Set Retailer Price

**POST** `/api/retailer/orders/:orderId/set-price`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  retailerPrice: 35.00 // Price per unit for consumer sale
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Retailer price set successfully",
  priceTrace: {
    farmerSalePrice: 25.50,
    transportCost: 5.00,
    distributorSalePrice: 30.00,
    retailerSalePrice: 35.00,
    finalConsumerPrice: 35.00
  }
}
```

---

## 5. Public Endpoints (No Auth Required)

### 5.1 Get Crop by Crop ID (QR Resolution)

**GET** `/api/public/crop/:cropId`

**Response** (200):
```javascript
{
  success: true,
  crop: {
    cropId: "FARMER-20251129-001",
    productName: "Organic Wheat",
    category: "grains",
    
    // Farmer Info
    farmer: {
      name: "John Doe",
      farmName: "Green Fields Farm",
      location: "Pune, Maharashtra",
      profileCID: "ipfs://..."
    },
    
    // Distributor Info (if assigned)
    distributor: {
      name: "ABC Distribution",
      companyName: "ABC Distribution Pvt Ltd",
      location: "Mumbai, Maharashtra",
      profileCID: "ipfs://..."
    },
    
    // Retailer Info (if sold)
    retailer: {
      name: "Fresh Mart",
      shopName: "Fresh Mart",
      location: "Mumbai, Maharashtra"
    },
    
    // Quality
    quality: {
      soilPH: 6.8,
      moisturePercent: 12.5,
      proteinPercent: 10.2,
      qualityGrade: "A",
      labReportCID: "ipfs://..."
    },
    
    // Price Trace
    priceTrace: {
      farmerSalePrice: 25.50,
      transportCost: 5.00,
      distributorSalePrice: 30.00,
      retailerSalePrice: 35.00,
      finalConsumerPrice: 35.00
    },
    
    // Timeline (Ledger Entries)
    timeline: [
      {
        type: "batchCreated",
        actorRole: "Farmer",
        timestamp: "2025-11-29T10:00:00Z",
        metadata: {}
      },
      {
        type: "distributorAccepted",
        actorRole: "Distributor",
        timestamp: "2025-11-29T11:00:00Z",
        metadata: {}
      },
      // ... more entries
    ],
    
    // Certificate
    certificateCID: "ipfs://QmCertificate...",
    certificateUrl: "https://ipfs.io/ipfs/QmCertificate...",
    
    // Verification
    blockchainVerified: true,
    blockchainHash: "0xabc123...",
    verified: true
  }
}
```

---

### 5.2 Get QR by QR ID

**GET** `/api/public/qr/:qrId`

**Response**: Redirects to `/api/public/crop/:cropId`

---

## 6. Admin Endpoints

### 6.1 Get Pending Verifications

**GET** `/api/admin/verifications`

**Headers**: `Authorization: Bearer <admin_token>`

**Query Parameters**:
- `role`: "farmer" | "distributor" | "retailer"
- `status`: "pending" | "approved" | "rejected"

**Response** (200):
```javascript
{
  success: true,
  verifications: [
    {
      _id: "...",
      role: "farmer",
      fullName: "John Doe",
      email: "farmer@example.com",
      farmName: "Green Fields Farm",
      verificationStatus: "pending",
      documents: {
        agricultureCertificateCID: "ipfs://...",
        landRecords: [...]
      },
      createdAt: "2025-11-29T09:00:00Z"
    }
  ]
}
```

---

### 6.2 Approve/Reject Verification

**POST** `/api/admin/verifications/:userId/verify`

**Headers**: `Authorization: Bearer <admin_token>`

**Request Body**:
```javascript
{
  action: "approve", // "approve" | "reject"
  reason: "All documents verified" // Required if reject
}
```

**Response** (200):
```javascript
{
  success: true,
  message: "Verification approved",
  verificationStatus: "approved",
  blockchainTxHash: "0x..." // If on-chain registration triggered
}
```

**Process**:
1. Updates user `verificationStatus`
2. Sets `verifiedByAdminId` and `verifiedAt`
3. Optionally triggers on-chain registration (if metamaskAddress exists)
4. Sends notification to user

---

## 7. AI Assistant Endpoints

### 7.1 AI Chat (Farmer Only)

**POST** `/api/ai/chat`

**Headers**: `Authorization: Bearer <farmer_token>`

**Content-Type**: `multipart/form-data`

**Request Body**:
```javascript
{
  query: "What pesticides should I use for wheat?",
  image: File, // Optional - for disease detection
  translate: "hindi" // Optional - "hindi" | "english"
}
```

**Response** (200):
```javascript
{
  success: true,
  reply: "For wheat, you can use Neem Oil as a natural pesticide...",
  translated: false // true if translation was requested
}
```

---

### 7.2 Dynamic Pricing (Internal/Admin)

**POST** `/api/ai/pricing`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```javascript
{
  cropType: "wheat",
  location: "Pune, Maharashtra",
  quality: "A",
  quantity: 1000,
  season: "winter",
  marketDemand: "high"
}
```

**Response** (200):
```javascript
{
  success: true,
  suggestedPrice: 26.50,
  priceRange: {
    min: 24.00,
    max: 28.00
  },
  factors: {
    demand: "high",
    season: "favorable",
    location: "good",
    quality: "premium"
  }
}
```

---

## Error Responses

All endpoints return consistent error format:

**400 Bad Request**:
```javascript
{
  success: false,
  message: "Validation error",
  errors: {
    fieldName: "Error message"
  }
}
```

**401 Unauthorized**:
```javascript
{
  success: false,
  message: "Unauthorized. Please login."
}
```

**403 Forbidden**:
```javascript
{
  success: false,
  message: "Access denied. Insufficient permissions."
}
```

**404 Not Found**:
```javascript
{
  success: false,
  message: "Resource not found"
}
```

**500 Internal Server Error**:
```javascript
{
  success: false,
  message: "Internal server error",
  error: "Error details (development only)"
}
```

