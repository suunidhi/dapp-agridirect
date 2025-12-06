import mongoose from 'mongoose';

// ============ FARMER SCHEMA ============
const farmerSchema = new mongoose.Schema({
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
  metamaskAddress: { type: String },
  blockchainRegistered: { type: Boolean, default: false },
  blockchainTxHash: { type: String },
  
  // Payment
  paymentQRCode: { type: String }, // IPFS CID or file path
  
  // Experience
  farmingExperienceYears: { type: Number, required: true },
  
  // Documents (IPFS CIDs)
  agricultureCertificateCID: { type: String },
  
  // Land Records (Array of Objects)
  landRecords: [{
    type: { 
      type: String, 
      enum: ["712 extract", "pattadar", "passbook", "title deed", "khasra", "khatuni", "ghataNumber"],
      required: true
    },
    documentCID: { type: String, required: true },
    areaHectares: { type: Number, required: true },
    plotNumber: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Optional Documents
  leaseDeedCID: { type: String },
  incomeTaxReturnCID: { type: String },
  bankPassbookCID: { type: String },
  
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
});

// Indexes (email and mobileNumber already indexed via unique: true)
farmerSchema.index({ metamaskAddress: 1 });
farmerSchema.index({ verificationStatus: 1 });

export const Farmer = mongoose.model("Farmer", farmerSchema);

// ============ DISTRIBUTOR SCHEMA ============
const distributorSchema = new mongoose.Schema({
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
  metamaskAddress: { type: String },
  blockchainRegistered: { type: Boolean, default: false },
  blockchainTxHash: { type: String },
  
  // Payment
  paymentQRCode: { type: String },
  
  // Documents
  distributorCertificateCID: { type: String, required: true },
  
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
  
  // Services Offered
  services: [{
    type: String,
    enum: ["milling", "coldStorage", "packaging", "transport"]
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes (email already indexed via unique: true)
distributorSchema.index({ companyGSTNumber: 1 });
distributorSchema.index({ verificationStatus: 1 });

export const Distributor = mongoose.model("Distributor", distributorSchema, "distributor");

// ============ RETAILER SCHEMA ============
const retailerSchema = new mongoose.Schema({
  // Basic Information
  fullName: { type: String, required: true },
  shopName: { type: String, required: true },
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
  metamaskAddress: { type: String },
  blockchainRegistered: { type: Boolean, default: false },
  blockchainTxHash: { type: String },
  
  // Documents
  retailerCertificateCID: { type: String, required: true },
  
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
});

// Indexes (email already indexed via unique: true)
retailerSchema.index({ verificationStatus: 1 });
retailerSchema.index({ companyGSTNumber: 1 });

export const Retailer = mongoose.model("Retailer", retailerSchema);

// ============ CONSUMER SCHEMA ============
const consumerSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  mobileNumber: { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
  metamaskAddress: { type: String },
  preferences: [{
    type: String,
    enum: ["Jain", "Swaminarayan", "Vegan", "Organic", "Fruitarian", "Gluten-free"]
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Consumer = mongoose.model("Consumer", consumerSchema);

// ============ ADMIN SCHEMA ============
const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["superAdmin", "admin", "moderator"], default: "admin" },
  permissions: [{
    type: String,
    enum: ["verifyFarmers", "verifyDistributors", "verifyRetailers", "resolveDisputes", "viewLogs"]
  }],
  lastLogin: { type: Date },
  verificationCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Admin = mongoose.model("Admin", adminSchema);

// ============ CROP BATCH SCHEMA ============
const cropBatchSchema = new mongoose.Schema({
  cropId: { type: String, required: true, unique: true },
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
  images: [{ type: String , required: true }],
  imageCID: { type: String, required: true },
  videoCID: { type: String },
  
  // Quantity & Pricing
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  pricePerUnitFarmer: { type: Number, required: true },
  
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
  labReportCID: { type: String },
  qualityGrade: { type: String, enum: ["A", "B", "C"] },
  
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
    metadata: { type: mongoose.Schema.Types.Mixed },
    blockchainTxHash: { type: String }
  }],
  
  // Final Certificate
  cropCertificateCID: { type: String },
  
  // Blockchain
  blockchainRegistered: { type: Boolean, default: false },
  blockchainCropHash: { type: String },
  badgeId: { type: String },
  
  // Event Ledger
  latestBlockHash: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes (cropId already indexed via unique: true)
cropBatchSchema.index({ farmerId: 1 });
cropBatchSchema.index({ selectedDistributorId: 1 });
cropBatchSchema.index({ status: 1 });
cropBatchSchema.index({ createdAt: -1 });

export const CropBatch = mongoose.model("CropBatch", cropBatchSchema);

// ============ DISTRIBUTOR REQUEST SCHEMA ============
const distributorRequestSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor", required: true },
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  status: { 
    type: String, 
    enum: ["pending", "accepted", "rejected"], 
    default: "pending" 
  },
  offeredPrice: { type: Number },
  respondedAt: { type: Date },
  responseNotes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

distributorRequestSchema.index({ distributorId: 1, status: 1 });
distributorRequestSchema.index({ farmerId: 1 });

export const DistributorRequest = mongoose.model("DistributorRequest", distributorRequestSchema);

// ============ LOGISTICS ENTRY SCHEMA ============
const logisticsEntrySchema = new mongoose.Schema({
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  dispatchedByRole: { type: String, enum: ["Farmer", "Distributor"], required: true },
  dispatchTimestamp: { type: Date, required: true },
  vehicleNumber: { type: String, required: true },
  vehicleType: { type: String },
  driverName: { type: String },
  driverPhone: { type: String },
  transportCompany: { type: String },
  transportCost: { type: Number, required: true },
  fromLocation: { type: String, required: true },
  toLocation: { type: String, required: true },
  expectedArrival: { type: Date },
  receivedBy: { type: mongoose.Schema.Types.ObjectId },
  receivedByRole: { type: String, enum: ["Distributor", "Retailer"] },
  receivedTimestamp: { type: Date },
  qualityAtReceipt: {
    photos: [{ type: String }],
    moistureAtArrival: { type: Number },
    temperature: { type: Number },
    condition: { type: String, enum: ["excellent", "good", "fair", "poor"] },
    notes: { type: String }
  },
  blockchainTxHash: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const LogisticsEntry = mongoose.model("LogisticsEntry", logisticsEntrySchema);

// ============ DISTRIBUTOR LISTING SCHEMA ============
const distributorListingSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor", required: true },
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  productName: { type: String, required: true },
  category: { type: String, required: true },
  dateDistributorPurchased: { type: Date, required: true },
  dateProductCameFromFarmer: { type: Date, required: true },
  coldStorageUsed: { type: Boolean, default: false },
  coldStorageTemperature: { type: Number },
  coldStorageDuration: { type: Number },
  storedDays: { type: Number },
  processingStatus: { type: String, enum: ["processed", "notProcessed", "milled", "cleaned"] },
  isCleaned: { type: Boolean },
  grade: { type: String },
  impurityPercentage: { type: Number },
  initialWeight: { type: Number, required: true },
  finalUsableWeight: { type: Number, required: true },
  pricePerUnitDistributor: { type: Number, required: true },
  distributorMargin: { type: Number, required: true },
  packageDate: { type: Date },
  packSize: { type: String },
  packMaterial: { type: String },
  badgeId: { type: String, required: true, unique: true },
  finalImageCID: { type: String },
  status: { type: String, enum: ["listed", "sold", "archived"], default: "listed" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

distributorListingSchema.index({ distributorId: 1 });
// badgeId already indexed via unique: true
distributorListingSchema.index({ status: 1 });

export const DistributorListing = mongoose.model("DistributorListing", distributorListingSchema);

// ============ RETAILER ORDER SCHEMA ============
const retailerOrderSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "Retailer", required: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor", required: true },
  distributorListingId: { type: mongoose.Schema.Types.ObjectId, ref: "DistributorListing", required: true },
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cod", "qr", "upi"], required: true },
  paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  paymentTransactionId: { type: String },
  address: { type: String, required: true },
  deliveryStatus: { type: String, enum: ["pending", "inTransit", "delivered"], default: "pending" },
  receivedTimestamp: { type: Date },
  receivedTemperature: { type: Number },
  receivedQuality: { type: String },
  receivedQuantity: { type: Number },
  coldStorageUsed: { type: Boolean },
  coldStorageDuration: { type: Number },
  retailerPrice: { type: Number },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  orderDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

retailerOrderSchema.index({ retailerId: 1 });
retailerOrderSchema.index({ distributorId: 1 });
retailerOrderSchema.index({ status: 1 });

export const RetailerOrder = mongoose.model("RetailerOrder", retailerOrderSchema);

// ============ PRICE TRACE SCHEMA ============
const priceTraceSchema = new mongoose.Schema({
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true },
  farmerSalePrice: { type: Number, required: true },
  transportCost: { type: Number, default: 0 },
  distributorPurchasePrice: { type: Number },
  distributorSalePrice: { type: Number },
  distributorMargin: { type: Number },
  retailerPurchasePrice: { type: Number },
  retailerSalePrice: { type: Number },
  retailerMargin: { type: Number },
  finalConsumerPrice: { type: Number },
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
});

export const PriceTrace = mongoose.model("PriceTrace", priceTraceSchema);

// ============ QR CODE SCHEMA ============
const qrCodeSchema = new mongoose.Schema({
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch", required: true, unique: true },
  qrCodeUrl: { type: String, required: true },
  qrCodeImagePath: { type: String },
  qrCodeImageCID: { type: String },
  publicViewUrl: { type: String, required: true },
  blockchainHash: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const QRCode = mongoose.model("QRCode", qrCodeSchema);

// Legacy Product model (for backward compatibility)
const productSchema = new mongoose.Schema({
  farmerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Farmer', 
    required: true 
  },  
  // Link to enhanced CropBatch (if created)
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'CropBatch' },
  name: String,
  category: String,
  preferences: { type: [String], default: [] },
  price: Number,
  quantity: Number,
  location: String,
  image: String,
  harvestDate: Date,
  moisture: Number,
  protein: Number,
  pesticideResidue: Number,
  soilPh: Number,
  labReport: String,
  qrPath: String,
  latestBlockHash: { type: String },
});

export const Product = mongoose.model("Product", productSchema);

// Legacy DistributorStock model
const distributorStockSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor" },
  productName: String,
  quantity: Number,
  price: Number,
  date: { type: Date, default: Date.now }
});

export const DistributorStock = mongoose.model("DistributorStock", distributorStockSchema);

// Legacy MarketplaceProduct model
const marketplaceProductSchema = new mongoose.Schema({
  distributorId: { type: String, required: true },
  distributorName: String,
  productName: String,
  productType: String,
  distributorPurchaseDate: String,
  boughtDate: String,
  storedDays: Number,
  coldStorage: String,
  temperature: Number,
  isCleaned: String,
  grade: String,
  impurityPercentage: Number,
  packSize: String,
  packMaterial: String,
  moisturePercentage: Number,
  ripenessLevel: String,
  coldStorageUsed: String,
  coldStorageDuration: Number,
  storageTemperature: Number,
  fruitSize: String,
  colorGrade: String,
  damagePercentage: Number,
  freshnessScore: String,
  isWashed: String,
  preservationMethod: String,
  preservationDuration: Number,
  initialWeight: Number,
  finalWeight: Number,
  distributorMargin: Number,
  batchId: String,
  processingStatus: String,
  packagedAt: String,
  marketPrice: Number,
  image: String
}, { timestamps: true });

export const MarketplaceProduct = mongoose.model("MarketplaceProduct", marketplaceProductSchema);

// Legacy RetailerProducts model
const retailerProductSchema = new mongoose.Schema({
  retailerId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Retailer",
    required: true
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "RetailerOrder",
    required: true
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  productName: { type: String, required: true },
  buyingPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  description: { type: String },
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const RetailerProducts = mongoose.model("RetailerProducts", retailerProductSchema);
// ============ NOTIFICATION SCHEMA (FIXES 500 ERROR) ============
const notificationSchema = new mongoose.Schema({
  distributorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Distributor', 
    required: true 
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: true 
  },
  farmerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Farmer',
    required: true 
  },
  cropBatchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CropBatch' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ distributorId: 1, status: 1 });
export const Notification = mongoose.model("Notification", notificationSchema);

// Legacy Order model
const orderSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: String,
  unitPrice: Number,
  quantity: Number,
  totalPrice: Number,
  address: String,
  paymentMethod: String,
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor" },
  distributorName: String,
  distributorEmail: String,
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer" },
  orderDate: { type: Date, default: Date.now }
});

export const Order = mongoose.model("Order", orderSchema);

// Legacy DistributorOrder model
const distributorOrderSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor" },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "Retailer" },
  productName: String,
  quantity: Number,
  totalPrice: Number,
  date: { type: Date, default: Date.now }
});

export const DistributorOrder = mongoose.model("DistributorOrder", distributorOrderSchema);

// ============ EVENT LEDGER SCHEMA (Immutable Blockchain-Style Blocks) ============
const eventLedgerSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  cropBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CropBatch" },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      "PRODUCT_CREATED",
      "SENT_TO_DISTRIBUTOR",
      "DISTRIBUTOR_ACCEPTED",
      "CHECKOUT_INITIATED_BY_DISTRIBUTOR",
      "PRODUCT_UPGRADED_BY_DISTRIBUTOR",
      "PRODUCT_LISTED_IN_DISTRIBUTOR_MARKETPLACE",
      "RETAILER_REQUESTED_TO_BUY",
      "DISTRIBUTOR_LOGISTICS_ADDED",
      "RETAILER_CHECKOUT_INITIATED",
      "RETAILER_ACCEPTED_DELIVERY",
      "CERTIFICATE_GENERATED",
      "QR_GENERATED"
    ]
  },
  cid: { type: String, required: true },
  previousHash: { type: String },
  currentHash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId },
  actorRole: { type: String, enum: ["Farmer", "Distributor", "Retailer", "Admin"] }
});

eventLedgerSchema.index({ productId: 1 });
eventLedgerSchema.index({ cropBatchId: 1 });
eventLedgerSchema.index({ currentHash: 1 });
eventLedgerSchema.index({ timestamp: -1 });

export const EventLedger = mongoose.model("EventLedger", eventLedgerSchema);

