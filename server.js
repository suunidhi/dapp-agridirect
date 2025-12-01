import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

// Import enhanced models and services
import {
  Farmer as FarmerEnhanced,
  Distributor as DistributorEnhanced,
  Retailer as RetailerEnhanced,
  Consumer as ConsumerEnhanced,
  Admin,
  CropBatch,
  DistributorRequest,
  LogisticsEntry,
  DistributorListing,
  RetailerOrder,
  PriceTrace,
  QRCode as QRCodeModel,
  Product,
  DistributorStock,
  MarketplaceProduct,
  RetailerProducts,
  Order,
  DistributorOrder
} from "./models/index.js";

import BlockchainService from "./services/blockchain.js";
import CertificateService from "./services/certificate.js";
import IPFSService from "./services/ipfs.js";
import OTPService from "./services/otp.js";

// Load environment variables (suppress dotenv tips)
dotenv.config({ quiet: true });
console.log("✅ Gemini API Key Loaded:", process.env.GEMINI_API_KEY ? "Yes" : "No");

// Initialize Gemini AI (only if API key is provided)
let genAI = null;
let model = null;
if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  } catch (error) {
    console.error("❌ Gemini AI initialization error:", error.message);
  }
} else {
  console.warn("⚠️ GEMINI_API_KEY not set - AI features will be disabled");
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ✅ Serve static files from public folder
app.use(express.static(path.join(process.cwd(), 'public')));

// ✅ Make uploads folder public
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ✅ NEW — Make uploads/qrs folder public too
app.use("/uploads/qrs", express.static(path.join(process.cwd(), "uploads/qrs")));

// ------------------ DB CONNECTION ------------------
mongoose.connect("mongodb://127.0.0.1:27017/agriDirect")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// ------------------ MODELS ------------------
// Use enhanced models from models/index.js
const Farmer = FarmerEnhanced;
const Consumer = ConsumerEnhanced;
const Distributor = DistributorEnhanced;
const Retailer = RetailerEnhanced;

// All other models (Product, DistributorStock, MarketplaceProduct, RetailerProducts, Order, DistributorOrder)
// are already imported from models/index.js, so we use them directly

// ------------------ MULTER ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
// Configure multer to ignore unknown fields (text fields are handled by body parser)
const upload = multer({ 
  storage,
  // Allow unknown fields (text fields) - only validate file fields
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Enhanced upload for farmer registration with multiple document types
const uploadFarmerDocs = upload.fields([
  { name: "agricultureCertificate", maxCount: 1 },
  { name: "paymentQRCode", maxCount: 1 },
  { name: "leaseDeed", maxCount: 1 },
  { name: "incomeTaxReturn", maxCount: 1 },
  { name: "bankPassbook", maxCount: 1 },
  { name: "landRecords", maxCount: 10 } // Multiple land record documents
]);

// ------------------ FARMER ROUTES ------------------

// Enhanced Farmer Registration with all required fields
app.post("/api/auth/register/farmer", uploadFarmerDocs, async (req, res) => {
  try {
    const {
      fullName,
      farmName,
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      pincode,
      lat,
      long,
      email,
      mobileNumber,
      password,
      farmingExperienceYears,
      metamaskAddress,
      // Land records (JSON stringified array)
      landRecordsData,
      // Optional fields
      leaseDeedArea,
      incomeTaxReturnYear
    } = req.body;

    // Validation
    if (!fullName || !farmName || !email || !mobileNumber || !password) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Missing required fields: " + [
          !fullName ? "Full Name" : "",
          !farmName ? "Farm Name" : "",
          !email ? "Email" : "",
          !mobileNumber ? "Mobile Number" : "",
          !password ? "Password" : ""
        ].filter(Boolean).join(", ")
      });
    }

    // Check if email or mobile already exists
    const existingEmail = await Farmer.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Email already registered"
      });
    }

    const existingMobile = await Farmer.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Mobile number already registered"
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Upload documents to IPFS
    const documentCIDs = {};

    // Agriculture Certificate (required) - Validate and upload to IPFS
    if (!req.files?.agricultureCertificate?.[0]) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Agriculture certificate is required"
      });
    }

    const certFile = req.files.agricultureCertificate[0];
    
    // Check if file exists
    if (!certFile || !certFile.path) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file not found"
      });
    }
    
    // Check if file path exists on disk
    if (!fs.existsSync(certFile.path)) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file path does not exist"
      });
    }
    
    console.log("📤 Uploading agriculture certificate to IPFS:", certFile.path);
    console.log("   File size:", fs.statSync(certFile.path).size, "bytes");
    
    const ipfsResult = await IPFSService.uploadFile(certFile.path);
    
    // Clean up local file after upload attempt (only if successful or after error handling)
    if (ipfsResult.success) {
      try { fs.unlinkSync(certFile.path); } catch (e) {
        console.warn("⚠️ Could not delete temp file:", certFile.path);
      }
    }
    
    if (!ipfsResult.success || !ipfsResult.cid) {
      console.error("❌ IPFS upload failed:", ipfsResult.error || "Unknown error");
      console.error("   File path:", certFile.path);
      console.error("   File exists:", fs.existsSync(certFile.path));
      
      // Don't delete file if upload failed, for debugging
      
      return res.status(500).json({
        status: "error",
        success: false,
        message: `Failed to upload agriculture certificate to IPFS: ${ipfsResult.error || "Please check IPFS configuration. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env file"}`
      });
    }
    
    console.log("✅ Certificate uploaded to IPFS:", ipfsResult.cid);
    documentCIDs.agricultureCertificateCID = ipfsResult.cid;

    // Payment QR Code
    if (req.files?.paymentQRCode?.[0]) {
      const qrFile = req.files.paymentQRCode[0];
      const ipfsResult = await IPFSService.uploadFile(qrFile.path);
      if (ipfsResult.success) {
        documentCIDs.paymentQRCode = ipfsResult.cid;
      }
      try { fs.unlinkSync(qrFile.path); } catch (e) {}
    }

    // Optional documents
    if (req.files?.leaseDeed?.[0]) {
      const leaseFile = req.files.leaseDeed[0];
      const ipfsResult = await IPFSService.uploadFile(leaseFile.path);
      if (ipfsResult.success) {
        documentCIDs.leaseDeedCID = ipfsResult.cid;
      }
      try { fs.unlinkSync(leaseFile.path); } catch (e) {}
    }

    if (req.files?.incomeTaxReturn?.[0]) {
      const itrFile = req.files.incomeTaxReturn[0];
      const ipfsResult = await IPFSService.uploadFile(itrFile.path);
      if (ipfsResult.success) {
        documentCIDs.incomeTaxReturnCID = ipfsResult.cid;
      }
      try { fs.unlinkSync(itrFile.path); } catch (e) {}
    }

    if (req.files?.bankPassbook?.[0]) {
      const passbookFile = req.files.bankPassbook[0];
      const ipfsResult = await IPFSService.uploadFile(passbookFile.path);
      if (ipfsResult.success) {
        documentCIDs.bankPassbookCID = ipfsResult.cid;
      }
      try { fs.unlinkSync(passbookFile.path); } catch (e) {}
    }

    // Process land records (async)
    const landRecords = [];
    if (landRecordsData && req.files?.landRecords) {
      let landRecordsArray;
      try {
        landRecordsArray = JSON.parse(landRecordsData);
      } catch (e) {
        landRecordsArray = Array.isArray(landRecordsData) ? landRecordsData : [];
      }

      // Match uploaded files with land record data
      const landRecordFiles = req.files.landRecords;
      const uploadPromises = landRecordsArray.map(async (record, index) => {
        if (landRecordFiles[index]) {
          const filePath = landRecordFiles[index].path;
          const ipfsResult = await IPFSService.uploadFile(filePath);
          
          // Clean up local file
          try { fs.unlinkSync(filePath); } catch (e) {}
          
          if (ipfsResult.success) {
            return {
              type: record.type,
              documentCID: ipfsResult.cid,
              areaHectares: parseFloat(record.areaHectares) || 0,
              plotNumber: record.plotNumber
            };
          }
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);
      landRecords.push(...results.filter(r => r !== null));
    }

    // Create farmer profile
    const farmer = new Farmer({
      fullName,
      farmName,
      location: {
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        pincode,
        lat: lat ? parseFloat(lat) : undefined,
        long: long ? parseFloat(long) : undefined
      },
      email,
      mobileNumber,
      passwordHash,
      farmingExperienceYears: parseInt(farmingExperienceYears) || 0,
      metamaskAddress: metamaskAddress || undefined,
      agricultureCertificateCID: documentCIDs.agricultureCertificateCID,
      paymentQRCode: documentCIDs.paymentQRCode,
      leaseDeedCID: documentCIDs.leaseDeedCID,
      incomeTaxReturnCID: documentCIDs.incomeTaxReturnCID,
      bankPassbookCID: documentCIDs.bankPassbookCID,
      landRecords,
      verificationStatus: "pending"
    });

    await farmer.save();

    // Generate and send OTPs
    const emailOTPResult = await OTPService.generateAndSendEmailOTP(email);
    const mobileOTPResult = await OTPService.generateAndSendMobileOTP(mobileNumber);

    // Return response in format expected by frontend (status: "success"/"error")
    res.json({
      status: "success",
      message: "Farmer registered successfully. Please verify email and mobile.",
      farmerId: farmer._id.toString(),
      verificationStatus: "pending",
      emailOTPSent: emailOTPResult.success,
      mobileOTPSent: mobileOTPResult.success,
      // In development, return OTPs for testing
      ...(process.env.NODE_ENV === 'development' && {
        emailOTP: emailOTPResult.otp,
        mobileOTP: mobileOTPResult.otp
      })
    });
  } catch (error) {
    console.error("❌ Farmer registration error:", error);
    res.status(500).json({
      status: "error",
      success: false,
      message: error.message || "Error registering farmer"
    });
  }
});

// Legacy route for backward compatibility - calls the enhanced registration
app.post("/farmer/register", uploadFarmerDocs, async (req, res) => {
  try {
    // Call the enhanced registration handler
    const {
      fullName,
      farmName,
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      pincode,
      lat,
      long,
      email,
      mobileNumber,
      password,
      farmingExperienceYears,
      metamaskAddress,
      landRecordsData,
      leaseDeedArea,
      incomeTaxReturnYear
    } = req.body;

    // Validation
    if (!fullName || !farmName || !email || !mobileNumber || !password) {
      return res.json({
        status: "error",
        message: "Missing required fields"
      });
    }

    // Check if email or mobile already exists
    const existingEmail = await Farmer.findOne({ email });
    if (existingEmail) {
      return res.json({
        status: "error",
        message: "Email already registered"
      });
    }

    const existingMobile = await Farmer.findOne({ mobileNumber });
    if (existingMobile) {
      return res.json({
        status: "error",
        message: "Mobile number already registered"
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Upload documents to IPFS - Validate and upload agriculture certificate (required)
    const documentCIDs = {};
    
    if (!req.files?.agricultureCertificate?.[0]) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Agriculture certificate is required"
      });
    }

    const certFile = req.files.agricultureCertificate[0];
    
    // Check if file exists
    if (!certFile || !certFile.path) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file not found"
      });
    }
    
    // Check if file path exists on disk
    if (!fs.existsSync(certFile.path)) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file path does not exist"
      });
    }
    
    console.log("📤 Uploading agriculture certificate to IPFS:", certFile.path);
    console.log("   File size:", fs.statSync(certFile.path).size, "bytes");
    
    const ipfsResult = await IPFSService.uploadFile(certFile.path);
    
    // Clean up local file after upload attempt (only if successful or after error handling)
    if (ipfsResult.success) {
      try { fs.unlinkSync(certFile.path); } catch (e) {
        console.warn("⚠️ Could not delete temp file:", certFile.path);
      }
    }
    
    if (!ipfsResult.success || !ipfsResult.cid) {
      console.error("❌ IPFS upload failed:", ipfsResult.error || "Unknown error");
      console.error("   File path:", certFile.path);
      console.error("   File exists:", fs.existsSync(certFile.path));
      
      // Don't delete file if upload failed, for debugging
      
      return res.status(500).json({
        status: "error",
        success: false,
        message: `Failed to upload agriculture certificate to IPFS: ${ipfsResult.error || "Please check IPFS configuration. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env file"}`
      });
    }
    
    console.log("✅ Certificate uploaded to IPFS:", ipfsResult.cid);
    documentCIDs.agricultureCertificateCID = ipfsResult.cid;

    if (req.files?.paymentQRCode?.[0]) {
      const qrFile = req.files.paymentQRCode[0];
      const ipfsResult = await IPFSService.uploadFile(qrFile.path);
      if (ipfsResult.success) {
        documentCIDs.paymentQRCode = ipfsResult.cid;
      }
      try { fs.unlinkSync(qrFile.path); } catch (e) {}
    }

    // Create farmer with enhanced model
    const farmer = new Farmer({
      fullName,
      farmName,
      location: {
        addressLine1: addressLine1 || "",
        addressLine2: addressLine2 || "",
        city: city || "",
        district: district || "",
        state: state || "",
        pincode: pincode || "",
        lat: lat ? parseFloat(lat) : undefined,
        long: long ? parseFloat(long) : undefined
      },
      email,
      mobileNumber,
      passwordHash,
      farmingExperienceYears: farmingExperienceYears ? parseInt(farmingExperienceYears) : 0,
      metamaskAddress: metamaskAddress || "",
      agricultureCertificateCID: documentCIDs.agricultureCertificateCID,
      paymentQRCode: documentCIDs.paymentQRCode,
      verificationStatus: "pending"
    });

    await farmer.save();

    // Send OTP (simplified)
    const emailOTP = OTPService.generateOTP();
    farmer.emailOTP = emailOTP;
    farmer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await farmer.save();

    // Send OTP via email (if configured)
    if (process.env.SMTP_USER) {
      await OTPService.sendEmailOTP(email, emailOTP);
    }

    res.json({
      status: "success",
      message: "Farmer registered successfully. Please verify your email with OTP."
    });

  } catch (error) {
    console.error("❌ Farmer registration error:", error);
    res.json({
      status: "error",
      message: error.message || "Error registering farmer"
    });
  }
});

// OTP Verification Endpoint
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, mobileNumber, otp, type } = req.body;

    if (!type || (type !== "email" && type !== "mobile")) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'email' or 'mobile'"
      });
    }

    const identifier = type === "email" ? email : mobileNumber;
    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: "Missing identifier or OTP"
      });
    }

    const verifyResult = OTPService.verifyOTP(identifier, otp, type);

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.error
      });
    }

    // Update user verification status
    const updateField = type === "email" ? "emailVerified" : "mobileVerified";
    let user = null;

    if (type === "email") {
      user = await Farmer.findOneAndUpdate(
        { email },
        { [updateField]: true },
        { new: true }
      );
      if (!user) {
        user = await DistributorEnhanced.findOneAndUpdate(
          { email },
          { [updateField]: true },
          { new: true }
        );
      }
      if (!user) {
        user = await RetailerEnhanced.findOneAndUpdate(
          { email },
          { [updateField]: true },
          { new: true }
        );
      }
    } else {
      user = await Farmer.findOneAndUpdate(
        { mobileNumber },
        { [updateField]: true },
        { new: true }
      );
      if (!user) {
        user = await DistributorEnhanced.findOneAndUpdate(
          { mobileNumber },
          { [updateField]: true },
          { new: true }
        );
      }
      if (!user) {
        user = await RetailerEnhanced.findOneAndUpdate(
          { mobileNumber },
          { [updateField]: true },
          { new: true }
        );
      }
    }

    res.json({
      success: true,
      message: "OTP verified successfully",
      verified: true
    });
  } catch (error) {
    console.error("❌ OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying OTP",
      error: error.message
    });
  }
});

// Resend OTP
app.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { email, mobileNumber, type } = req.body;

    if (!type || (type !== "email" && type !== "mobile")) {
      return res.status(400).json({
        success: false,
        message: "Invalid type"
      });
    }

    if (type === "email" && !email) {
      return res.status(400).json({
        success: false,
        message: "Email required"
      });
    }

    if (type === "mobile" && !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number required"
      });
    }

    let result;
    if (type === "email") {
      result = await OTPService.generateAndSendEmailOTP(email);
    } else {
      result = await OTPService.generateAndSendMobileOTP(mobileNumber);
    }

    res.json({
      success: result.success,
      message: result.success ? "OTP sent successfully" : "Failed to send OTP",
      ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
    });
  } catch (error) {
    console.error("❌ Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending OTP"
    });
  }
});

// Enhanced Distributor Selection API
app.post("/api/farmer/crops/:cropId/select-distributor", async (req, res) => {
  try {
    const { cropId } = req.params;
    const { distributorId } = req.body;

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "Distributor ID is required"
      });
    }

    // Find crop batch
    const cropBatch = await CropBatch.findOne({ cropId });
    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    // Check if crop is in correct status
    if (cropBatch.status !== "created") {
      return res.status(400).json({
        success: false,
        message: "Crop batch cannot be assigned. Current status: " + cropBatch.status
      });
    }

    // Validate distributor exists
    const distributor = await DistributorEnhanced.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found"
      });
    }

    // Check if distributor is verified
    if (distributor.verificationStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Distributor is not verified"
      });
    }

    // Create distributor request
    const distributorRequest = new DistributorRequest({
      farmerId: cropBatch.farmerId,
      distributorId,
      cropBatchId: cropBatch._id,
      status: "pending"
    });
    await distributorRequest.save();

    // Update crop batch
    cropBatch.selectedDistributorId = distributorId;
    cropBatch.status = "assignedToDistributor";
    
    // Add ledger entry
    cropBatch.history.push({
      type: "distributorSelected",
      actorId: cropBatch.farmerId,
      actorRole: "Farmer",
      timestamp: new Date(),
      metadata: {
        distributorId: distributorId.toString(),
        distributorName: distributor.fullName || distributor.companyName
      }
    });

    await cropBatch.save();

    res.json({
      success: true,
      message: "Distributor request sent successfully",
      requestId: distributorRequest._id,
      cropBatch: {
        cropId: cropBatch.cropId,
        status: cropBatch.status,
        selectedDistributorId: cropBatch.selectedDistributorId
      }
    });
  } catch (error) {
    console.error("❌ Select distributor error:", error);
    res.status(500).json({
      success: false,
      message: "Error selecting distributor",
      error: error.message
    });
  }
});

// Legacy route
app.post("/distributor/newRequest", async (req, res) => {
  try {
    const { farmerId, distributorId, cropBatchId } = req.body;

    if (!farmerId || !distributorId || !cropBatchId) {
      return res.json({ success: false, message: "Missing data" });
    }

    const cropBatch = await CropBatch.findById(cropBatchId);
    if (!cropBatch) {
      return res.json({ success: false, message: "Crop batch not found" });
    }

    const newReq = new DistributorRequest({ 
      farmerId, 
      distributorId, 
      cropBatchId: cropBatch._id 
    });
    await newReq.save();

    res.json({ success: true, message: "Request sent successfully" });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Server error" });
  }
});
// Get distributor requests/notifications
app.get("/api/distributor/notifications", async (req, res) => {
  try {
    const { distributorId } = req.query;

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "Distributor ID is required"
      });
    }

    const requests = await DistributorRequest.find({
      distributorId,
      status: "pending"
    })
    .populate("farmerId", "fullName farmName location email")
    .populate("cropBatchId", "cropId productName category quantity pricePerUnitFarmer")
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: requests.map(req => ({
        _id: req._id,
        farmer: {
          name: req.farmerId?.fullName,
          farmName: req.farmerId?.farmName,
          location: req.farmerId?.location
        },
        cropBatch: {
          cropId: req.cropBatchId?.cropId,
          productName: req.cropBatchId?.productName,
          category: req.cropBatchId?.category,
          quantity: req.cropBatchId?.quantity,
          pricePerUnit: req.cropBatchId?.pricePerUnitFarmer
        },
        status: req.status,
        createdAt: req.createdAt
      }))
    });
  } catch (error) {
    console.error("❌ Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications"
    });
  }
});

// Legacy route
app.get("/distributor/getRequests/:id", async (req, res) => {
  req.query.distributorId = req.params.id;
  req.url = "/api/distributor/notifications";
  app._router.handle(req, res);
});

// Accept distributor request
app.post("/api/distributor/crops/:cropId/accept", async (req, res) => {
  try {
    const { cropId } = req.params;
    const { distributorId } = req.body;

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "Distributor ID is required"
      });
    }

    // Find crop batch
    const cropBatch = await CropBatch.findOne({ cropId });
    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    // Find request
    const request = await DistributorRequest.findOne({
      cropBatchId: cropBatch._id,
      distributorId,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found or already processed"
      });
    }

    // Update request
    request.status = "accepted";
    request.respondedAt = new Date();
    await request.save();

    // Update crop batch
    cropBatch.distributorAccepted = true;
    cropBatch.distributorAcceptedAt = new Date();
    cropBatch.status = "assignedToDistributor";
    
    // Add ledger entry
    cropBatch.history.push({
      type: "distributorAccepted",
      actorId: distributorId,
      actorRole: "Distributor",
      timestamp: new Date(),
      metadata: {
        requestId: request._id.toString()
      }
    });

    await cropBatch.save();

    // Optional: Record on blockchain
    if (cropBatch.farmerMetamaskAddress && cropBatch.blockchainCropHash) {
      try {
        const { ethers } = await import('ethers');
        // This would require the distributor's signer
        // For now, we'll just log it
        console.log("📝 Blockchain registration should happen here");
      } catch (e) {
        console.warn("⚠️ Blockchain registration skipped:", e.message);
      }
    }

    res.json({
      success: true,
      message: "Request accepted successfully",
      cropBatch: {
        cropId: cropBatch.cropId,
        status: cropBatch.status,
        distributorAccepted: cropBatch.distributorAccepted
      }
    });
  } catch (error) {
    console.error("❌ Accept request error:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting request",
      error: error.message
    });
  }
});

// Legacy route
app.post("/distributor/acceptRequest/:id", async (req, res) => {
  try {
    const request = await DistributorRequest.findById(req.params.id);
    if (!request) {
      return res.json({ success: false, message: "Request not found" });
    }

    const cropBatch = await CropBatch.findById(request.cropBatchId);
    if (!cropBatch) {
      return res.json({ success: false, message: "Crop batch not found" });
    }

    req.params.cropId = cropBatch.cropId;
    req.body.distributorId = request.distributorId.toString();
    req.url = `/api/distributor/crops/${cropBatch.cropId}/accept`;
    app._router.handle(req, res);
  } catch (err) {
    console.log("Error accepting request:", err);
    res.json({ success: false, message: "Error accepting request" });
  }
});

// Reject distributor request
app.post("/api/distributor/crops/:cropId/reject", async (req, res) => {
  try {
    const { cropId } = req.params;
    const { distributorId, reason } = req.body;

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "Distributor ID is required"
      });
    }

    // Find crop batch
    const cropBatch = await CropBatch.findOne({ cropId });
    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    // Find request
    const request = await DistributorRequest.findOne({
      cropBatchId: cropBatch._id,
      distributorId,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found or already processed"
      });
    }

    // Update request
    request.status = "rejected";
    request.respondedAt = new Date();
    request.responseNotes = reason;
    await request.save();

    // Update crop batch - reset distributor selection
    cropBatch.selectedDistributorId = null;
    cropBatch.status = "created";
    
    // Add ledger entry
    cropBatch.history.push({
      type: "distributorRejected",
      actorId: distributorId,
      actorRole: "Distributor",
      timestamp: new Date(),
      metadata: {
        reason: reason || "No reason provided"
      }
    });

    await cropBatch.save();

    res.json({
      success: true,
      message: "Request rejected",
      cropBatch: {
        cropId: cropBatch.cropId,
        status: cropBatch.status
      }
    });
  } catch (error) {
    console.error("❌ Reject request error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting request",
      error: error.message
    });
  }
});

// Legacy route
app.post("/distributor/rejectRequest/:id", async (req, res) => {
  try {
    const request = await DistributorRequest.findById(req.params.id);
    if (!request) return res.json({ success: false, message: "Request not found" });

    const cropBatch = await CropBatch.findById(request.cropBatchId);
    if (!cropBatch) {
      return res.json({ success: false, message: "Crop batch not found" });
    }

    req.params.cropId = cropBatch.cropId;
    req.body.distributorId = request.distributorId.toString();
    req.body.reason = req.body.reason || "No reason provided";
    req.url = `/api/distributor/crops/${cropBatch.cropId}/reject`;
    app._router.handle(req, res);
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error rejecting request" });
  }
});


// ==================== LOGISTICS APIs ====================

// Logistics Dispatch (Farmer -> Distributor)
app.post("/api/farmer/crops/:cropId/logistics-dispatch", async (req, res) => {
  try {
    const { cropId } = req.params;
    const {
      vehicleNumber,
      vehicleType,
      driverName,
      driverPhone,
      transportCompany,
      transportCost,
      fromLocation,
      toLocation,
      expectedArrival
    } = req.body;

    if (!vehicleNumber || !transportCost) {
      return res.status(400).json({
        success: false,
        message: "Vehicle number and transport cost are required"
      });
    }

    const cropBatch = await CropBatch.findOne({ cropId });
    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    if (cropBatch.status !== "assignedToDistributor" && !cropBatch.distributorAccepted) {
      return res.status(400).json({
        success: false,
        message: "Distributor must accept before dispatch"
      });
    }

    // Create logistics entry
    const logisticsEntry = new LogisticsEntry({
      cropBatchId: cropBatch._id,
      dispatchedBy: cropBatch.farmerId,
      dispatchedByRole: "Farmer",
      dispatchTimestamp: new Date(),
      vehicleNumber,
      vehicleType,
      driverName,
      driverPhone,
      transportCompany,
      transportCost: parseFloat(transportCost),
      fromLocation: fromLocation || cropBatch.farmerId?.location?.addressLine1,
      toLocation,
      expectedArrival: expectedArrival ? new Date(expectedArrival) : undefined
    });
    await logisticsEntry.save();

    // Update crop batch
    cropBatch.status = "inTransitToDistributor";
    
    // Update price trace
    const priceTrace = await PriceTrace.findOne({ cropBatchId: cropBatch._id });
    if (priceTrace) {
      priceTrace.transportCost = parseFloat(transportCost);
      priceTrace.priceUpdates.push({
        stage: "transport",
        oldPrice: priceTrace.transportCost || 0,
        newPrice: parseFloat(transportCost),
        updatedBy: cropBatch.farmerId,
        updatedByRole: "Farmer",
        reason: "Logistics dispatch",
        timestamp: new Date()
      });
      await priceTrace.save();
    }

    // Add ledger entry
    cropBatch.history.push({
      type: "logisticsDispatched",
      actorId: cropBatch.farmerId,
      actorRole: "Farmer",
      timestamp: new Date(),
      metadata: {
        vehicleNumber,
        driverName,
        transportCompany,
        transportCost: parseFloat(transportCost),
        expectedArrival
      }
    });

    await cropBatch.save();

    // Optional: Record on blockchain
    if (cropBatch.farmerMetamaskAddress && cropBatch.blockchainCropHash) {
      console.log("📝 Blockchain logistics dispatch should happen here");
    }

    res.json({
      success: true,
      message: "Logistics dispatch recorded",
      logisticsEntry: {
        _id: logisticsEntry._id,
        vehicleNumber,
        transportCost: parseFloat(transportCost),
        dispatchTimestamp: logisticsEntry.dispatchTimestamp
      },
      cropBatch: {
        cropId: cropBatch.cropId,
        status: cropBatch.status
      }
    });
  } catch (error) {
    console.error("❌ Logistics dispatch error:", error);
    res.status(500).json({
      success: false,
      message: "Error recording logistics dispatch",
      error: error.message
    });
  }
});

// Logistics Receive (Distributor receives from Farmer)
app.post("/api/distributor/crops/:cropId/receive", upload.fields([
  { name: "qualityPhotos", maxCount: 5 }
]), async (req, res) => {
  try {
    const { cropId } = req.params;
    const {
      distributorId,
      moistureAtArrival,
      temperature,
      condition,
      notes,
      qualityGrade,
      finalUsableWeight
    } = req.body;

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "Distributor ID is required"
      });
    }

    const cropBatch = await CropBatch.findOne({ cropId });
    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    if (cropBatch.status !== "inTransitToDistributor") {
      return res.status(400).json({
        success: false,
        message: "Crop batch is not in transit"
      });
    }

    // Find logistics entry
    const logisticsEntry = await LogisticsEntry.findOne({
      cropBatchId: cropBatch._id,
      receivedTimestamp: null
    });

    if (!logisticsEntry) {
      return res.status(404).json({
        success: false,
        message: "Logistics entry not found"
      });
    }

    // Upload quality photos to IPFS
    const qualityPhotoCIDs = [];
    if (req.files?.qualityPhotos) {
      for (const photoFile of req.files.qualityPhotos) {
        const ipfsResult = await IPFSService.uploadFile(photoFile.path);
        if (ipfsResult.success) {
          qualityPhotoCIDs.push(ipfsResult.cid);
        }
        try { fs.unlinkSync(photoFile.path); } catch (e) {}
      }
    }

    // Update logistics entry
    logisticsEntry.receivedBy = distributorId;
    logisticsEntry.receivedByRole = "Distributor";
    logisticsEntry.receivedTimestamp = new Date();
    logisticsEntry.qualityAtReceipt = {
      photos: qualityPhotoCIDs,
      moistureAtArrival: moistureAtArrival ? parseFloat(moistureAtArrival) : undefined,
      temperature: temperature ? parseFloat(temperature) : undefined,
      condition: condition || "good",
      notes
    };
    await logisticsEntry.save();

    // Update crop batch
    cropBatch.status = "withDistributor";
    if (qualityGrade) {
      cropBatch.qualityGrade = qualityGrade;
    }
    if (finalUsableWeight) {
      // Update quantity if weight changed
      cropBatch.quantity = parseFloat(finalUsableWeight);
    }

    // Add ledger entry
    cropBatch.history.push({
      type: "logisticsReceived",
      actorId: distributorId,
      actorRole: "Distributor",
      timestamp: new Date(),
      metadata: {
        moistureAtArrival,
        temperature,
        condition,
        qualityGrade,
        finalUsableWeight
      }
    });

    // Add quality check entry
    cropBatch.history.push({
      type: "qualityChecked",
      actorId: distributorId,
      actorRole: "Distributor",
      timestamp: new Date(),
      metadata: {
        qualityGrade,
        moistureAtArrival,
        temperature,
        condition
      }
    });

    await cropBatch.save();

    // Optional: Record on blockchain
    if (cropBatch.blockchainCropHash) {
      console.log("📝 Blockchain logistics receive should happen here");
    }

    res.json({
      success: true,
      message: "Logistics receive recorded",
      cropBatch: {
        cropId: cropBatch.cropId,
        status: cropBatch.status,
        qualityGrade: cropBatch.qualityGrade
      }
    });
  } catch (error) {
    console.error("❌ Logistics receive error:", error);
    res.status(500).json({
      success: false,
      message: "Error recording logistics receive",
      error: error.message
    });
  }
});

// Login
app.post("/farmer/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const farmer = await Farmer.findOne({ email });
    if (!farmer) {
      return res.json({ status: "error", message: "Invalid email or password" });
    }

    // Use passwordHash from enhanced model (fallback to password for legacy)
    const passwordField = farmer.passwordHash || farmer.password;
    if (!passwordField) {
      return res.json({ status: "error", message: "Account password not set. Please contact support." });
    }
    const isMatch = await bcrypt.compare(password, passwordField);
    if (!isMatch) {
      return res.json({ status: "error", message: "Invalid email or password" });
    }

    res.json({
      status: "success",
      message: "Login successful",
      farmerId: farmer._id.toString(),
      farmerName: farmer.fullName || farmer.name, // Use fullName from enhanced model
    });

  } catch (error) {
    console.error("❌ Farmer login error:", error);
    res.json({ status: "error", message: "Server error" });
  }
});

// Enhanced CropBatch Creation API
const uploadCropBatch = upload.fields([
  { name: "images", maxCount: 10 }, // At least 2 required
  { name: "video", maxCount: 1 },
  { name: "labReport", maxCount: 1 }
]);

app.post("/api/farmer/crops", uploadCropBatch, async (req, res) => {
  try {
    const {
      farmerId,
      productName,
      category,
      dietLabels, // JSON array
      quantity,
      unit,
      pricePerUnitFarmer,
      harvestDate,
      soilPH,
      moisturePercent,
      proteinPercent,
      pesticideUsed, // JSON array
      qualityGrade,
      metamaskAddress
    } = req.body;

    // Validation
    if (!farmerId || !productName || !category || !quantity || !unit || !pricePerUnitFarmer || !harvestDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Validate farmer exists
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    // Validate at least 2 images
    if (!req.files?.images || req.files.images.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 product images are required"
      });
    }

    // Generate crop ID
    const cropId = CertificateService.generateCropId(farmerId);

    // Upload images to IPFS
    const imageCIDs = [];
    for (const imageFile of req.files.images) {
      const ipfsResult = await IPFSService.uploadFile(imageFile.path);
      if (ipfsResult.success) {
        imageCIDs.push(ipfsResult.cid);
      }
      try { fs.unlinkSync(imageFile.path); } catch (e) {}
    }

    // Upload video to IPFS (optional)
    let videoCID = null;
    if (req.files?.video?.[0]) {
      const videoFile = req.files.video[0];
      const ipfsResult = await IPFSService.uploadFile(videoFile.path);
      if (ipfsResult.success) {
        videoCID = ipfsResult.cid;
      }
      try { fs.unlinkSync(videoFile.path); } catch (e) {}
    }

    // Upload lab report to IPFS (optional)
    let labReportCID = null;
    if (req.files?.labReport?.[0]) {
      const labFile = req.files.labReport[0];
      const ipfsResult = await IPFSService.uploadFile(labFile.path);
      if (ipfsResult.success) {
        labReportCID = ipfsResult.cid;
      }
      try { fs.unlinkSync(labFile.path); } catch (e) {}
    }

    // Parse diet labels
    let dietLabelsArray = [];
    if (dietLabels) {
      try {
        dietLabelsArray = JSON.parse(dietLabels);
      } catch (e) {
        dietLabelsArray = Array.isArray(dietLabels) ? dietLabels : [];
      }
    }

    // Parse pesticide used
    let pesticideArray = [];
    if (pesticideUsed) {
      try {
        pesticideArray = JSON.parse(pesticideUsed);
      } catch (e) {
        pesticideArray = Array.isArray(pesticideUsed) ? pesticideUsed : [];
      }
    }

    // Create crop batch
    const cropBatch = new CropBatch({
      cropId,
      farmerId,
      farmerMetamaskAddress: metamaskAddress || farmer.metamaskAddress,
      productName,
      category,
      dietLabels: dietLabelsArray,
      images: imageCIDs,
      videoCID,
      quantity: parseFloat(quantity),
      unit,
      pricePerUnitFarmer: parseFloat(pricePerUnitFarmer),
      harvestDate: new Date(harvestDate),
      soilPH: soilPH ? parseFloat(soilPH) : undefined,
      moisturePercent: moisturePercent ? parseFloat(moisturePercent) : undefined,
      proteinPercent: proteinPercent ? parseFloat(proteinPercent) : undefined,
      pesticideUsed: pesticideArray,
      labReportCID,
      qualityGrade,
      status: "created"
    });

    // Add initial ledger entry
    cropBatch.history.push({
      type: "batchCreated",
      actorId: farmerId,
      actorRole: "Farmer",
      timestamp: new Date(),
      metadata: {
        cropId,
        productName,
        quantity,
        unit
      }
    });

    await cropBatch.save();

    // Create initial price trace
    const priceTrace = new PriceTrace({
      cropBatchId: cropBatch._id,
      farmerSalePrice: parseFloat(pricePerUnitFarmer)
    });
    await priceTrace.save();

    // Generate QR code
    const qrDir = path.join(process.cwd(), "uploads/qrs");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const serverUrl = process.env.SERVER_URL || "http://localhost:5000";
    const qrUrl = `${serverUrl}/api/public/crop/${cropId}`;
    const qrFileName = `${cropBatch._id}-qr.png`;
    const qrFullPath = path.join(qrDir, qrFileName);

    await QRCode.toFile(qrFullPath, qrUrl);

    // Upload QR to IPFS
    const qrIPFSResult = await IPFSService.uploadFile(qrFullPath);
    let qrCID = null;
    if (qrIPFSResult.success) {
      qrCID = qrIPFSResult.cid;
    }

    // Save QR code record
    const qrCodeRecord = new QRCodeModel({
      cropBatchId: cropBatch._id,
      qrCodeUrl: qrUrl,
      qrCodeImagePath: `/uploads/qrs/${qrFileName}`,
      qrCodeImageCID: qrCID,
      publicViewUrl: qrUrl
    });
    await qrCodeRecord.save();

    res.json({
      success: true,
      message: "Crop batch created successfully",
      cropBatch: {
        _id: cropBatch._id,
        cropId: cropBatch.cropId,
        productName: cropBatch.productName,
        status: cropBatch.status,
        qrCodeUrl: qrUrl,
        qrCodeImagePath: `/uploads/qrs/${qrFileName}`
      }
    });
  } catch (error) {
    console.error("❌ Create crop batch error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating crop batch",
      error: error.message
    });
  }
});

// Enhanced Product Creation API (for AddProduct.html)
app.post(
  "/api/products",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "labReport", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        farmerId,
        name,
        category,
        price,
        quantity,
        location,
        harvestDate,
        moisture,
        protein,
        pesticide,
        ph,
        preferences
      } = req.body;

      // Validation
      if (!farmerId || !name || !category || !price || !quantity || !location) {
        return res.status(400).json({
          status: "error",
          success: false,
          message: "Missing required fields: farmerId, name, category, price, quantity, location"
        });
      }

      if (!mongoose.Types.ObjectId.isValid(farmerId)) {
        return res.status(400).json({ 
          status: "error", 
          success: false,
          message: "Invalid Farmer ID" 
        });
      }

      const farmer = await Farmer.findById(farmerId);
      if (!farmer) {
        return res.status(404).json({ 
          status: "error", 
          success: false,
          message: "Farmer not found" 
        });
      }

      // Validate and upload product image to IPFS (required)
      if (!req.files?.image?.[0]) {
        return res.status(400).json({ 
          status: "error", 
          success: false,
          message: "Product image is required" 
        });
      }

      const imageFile = req.files.image[0];
      
      // Check if file exists
      if (!imageFile || !imageFile.path) {
        return res.status(400).json({
          status: "error",
          success: false,
          message: "Image file not found"
        });
      }
      
      // Check if file path exists on disk
      if (!fs.existsSync(imageFile.path)) {
        return res.status(400).json({
          status: "error",
          success: false,
          message: "Image file path does not exist"
        });
      }
      
      console.log("📤 Uploading product image to IPFS:", imageFile.path);
      console.log("   File size:", fs.statSync(imageFile.path).size, "bytes");
      
      const imageIpfsResult = await IPFSService.uploadFile(imageFile.path);
      
      // Clean up local file after upload attempt (only if successful)
      if (imageIpfsResult.success) {
        try { fs.unlinkSync(imageFile.path); } catch (e) {
          console.warn("⚠️ Could not delete temp file:", imageFile.path);
        }
      }
      
      if (!imageIpfsResult.success || !imageIpfsResult.cid) {
        console.error("❌ IPFS upload failed:", imageIpfsResult.error || "Unknown error");
        console.error("   File path:", imageFile.path);
        console.error("   File exists:", fs.existsSync(imageFile.path));
        
        return res.status(500).json({
          status: "error",
          success: false,
          message: `Failed to upload product image to IPFS: ${imageIpfsResult.error || "Please check IPFS configuration. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env file"}`
        });
      }
      
      console.log("✅ Product image uploaded to IPFS:", imageIpfsResult.cid);
      const imageCID = imageIpfsResult.cid;

      // Upload lab report to IPFS if provided (optional)
      let labReportCID = null;
      if (req.files?.labReport?.[0]) {
        const labFile = req.files.labReport[0];
        console.log("📤 Uploading lab report to IPFS:", labFile.path);
        const labIpfsResult = await IPFSService.uploadFile(labFile.path);
        if (labIpfsResult.success) {
          labReportCID = labIpfsResult.cid;
          console.log("✅ Lab report uploaded to IPFS:", labReportCID);
          try { fs.unlinkSync(labFile.path); } catch (e) {
            console.warn("⚠️ Could not delete temp file:", labFile.path);
          }
        } else {
          console.warn("⚠️ Lab report upload failed:", labIpfsResult.error);
          // Don't fail the whole request if lab report upload fails
        }
      }

      const numericPrice = parseFloat(price) || 0;
      const numericQuantity = parseFloat(quantity) || 0;
      const numericMoisture = parseFloat(moisture) || 0;
      const numericProtein = parseFloat(protein) || 0;
      const numericPesticide = parseFloat(pesticide) || 0;
      const numericPh = parseFloat(ph) || 0;

      // Convert preferences (if array/string)
      let preferenceArray = [];
      if (typeof preferences === "string") {
        try {
          preferenceArray = JSON.parse(preferences);
        } catch {
          preferenceArray = preferences.split(",").map(p => p.trim());
        }
      } else if (Array.isArray(preferences)) {
        preferenceArray = preferences;
      }

      const qrDir = path.join(process.cwd(), "uploads/qrs");
      if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

      // Get IPFS gateway URL for the image
      const imageUrl = IPFSService.getIPFSUrl(imageCID);
      const labReportUrl = labReportCID ? IPFSService.getIPFSUrl(labReportCID) : null;

      const product = new Product({
        farmerId,
        name,
        category,
        preferences: preferenceArray,
        price: numericPrice,
        quantity: numericQuantity,
        location,
        image: imageUrl.gatewayUrl || imageUrl.ipfsUrl, // Use IPFS gateway URL
        imageCID: imageCID, // Store CID for future reference
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        moisture: numericMoisture,
        protein: numericProtein,
        pesticideResidue: numericPesticide,
        soilPh: numericPh,
        labReport: labReportUrl ? (labReportUrl.gatewayUrl || labReportUrl.ipfsUrl) : null,
        labReportCID: labReportCID || null,
      });

      await product.save();

      const serverUrl = "http://localhost:5000";
      const qrUrl = `${serverUrl}/product/${product._id}/view`;
      const qrFileName = `${product._id}-authQR.png`;
      const qrFullPath = path.join(qrDir, qrFileName);

      await QRCode.toFile(qrFullPath, qrUrl);

      product.qrPath = `/uploads/qrs/${qrFileName}`;
      await product.save();

      console.log("✅ QR generated for:", product.name, "→", product.qrPath);

      res.json({
        status: "success",
        success: true,
        message: "Product added successfully with QR!",
        product,
      });
    } catch (error) {
      console.error("❌ Add Product Error:", error.message, error.stack);
      res.status(500).json({ 
        status: "error", 
        success: false,
        message: error.message || "Error adding product" 
      });
    }
  }
);

// Legacy route for backward compatibility
// Add Product + QR Generation
app.post(
  "/farmer/addProduct/:farmerId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "labReport", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { farmerId } = req.params;
      const {
        name,
        category,
        price,
        quantity,
        location,
        harvestDate,
        moisture,
        protein,
        pesticide,
        ph,
        preferences // ✅ added this
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(farmerId))
        return res.json({ status: "error", message: "Invalid Farmer ID" });

      const farmer = await Farmer.findById(farmerId);
      if (!farmer)
        return res.json({ status: "error", message: "Farmer not found" });

      // Validate and upload product image to IPFS (required)
      if (!req.files["image"] || !req.files["image"][0]) {
        return res.status(400).json({ 
          status: "error", 
          success: false,
          message: "Product image is required" 
        });
      }

      const imageFile = req.files["image"][0];
      
      // Check if file exists
      if (!imageFile || !imageFile.path) {
        return res.status(400).json({
          status: "error",
          success: false,
          message: "Image file not found"
        });
      }
      
      // Check if file path exists on disk
      if (!fs.existsSync(imageFile.path)) {
        return res.status(400).json({
          status: "error",
          success: false,
          message: "Image file path does not exist"
        });
      }
      
      console.log("📤 Uploading product image to IPFS:", imageFile.path);
      console.log("   File size:", fs.statSync(imageFile.path).size, "bytes");
      
      const imageIpfsResult = await IPFSService.uploadFile(imageFile.path);
      
      // Clean up local file after upload attempt (only if successful)
      if (imageIpfsResult.success) {
        try { fs.unlinkSync(imageFile.path); } catch (e) {
          console.warn("⚠️ Could not delete temp file:", imageFile.path);
        }
      }
      
      if (!imageIpfsResult.success || !imageIpfsResult.cid) {
        console.error("❌ IPFS upload failed:", imageIpfsResult.error || "Unknown error");
        console.error("   File path:", imageFile.path);
        console.error("   File exists:", fs.existsSync(imageFile.path));
        
        return res.status(500).json({
          status: "error",
          success: false,
          message: `Failed to upload product image to IPFS: ${imageIpfsResult.error || "Please check IPFS configuration. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env file"}`
        });
      }
      
      console.log("✅ Product image uploaded to IPFS:", imageIpfsResult.cid);
      const imageCID = imageIpfsResult.cid;

      // Upload lab report to IPFS if provided (optional)
      let labReportCID = null;
      if (req.files["labReport"] && req.files["labReport"][0]) {
        const labFile = req.files["labReport"][0];
        console.log("📤 Uploading lab report to IPFS:", labFile.path);
        const labIpfsResult = await IPFSService.uploadFile(labFile.path);
        if (labIpfsResult.success) {
          labReportCID = labIpfsResult.cid;
          console.log("✅ Lab report uploaded to IPFS:", labReportCID);
          try { fs.unlinkSync(labFile.path); } catch (e) {
            console.warn("⚠️ Could not delete temp file:", labFile.path);
          }
        } else {
          console.warn("⚠️ Lab report upload failed:", labIpfsResult.error);
          // Don't fail the whole request if lab report upload fails
        }
      }

      const numericPrice = parseFloat(price) || 0;
      const numericQuantity = parseFloat(quantity) || 0;
      const numericMoisture = parseFloat(moisture) || 0;
      const numericProtein = parseFloat(protein) || 0;
      const numericPesticide = parseFloat(pesticide) || 0;
      const numericPh = parseFloat(ph) || 0;

      // ✅ Convert preferences (if array/string)
      let preferenceArray = [];
      if (typeof preferences === "string") {
        try {
          preferenceArray = JSON.parse(preferences);
        } catch {
          preferenceArray = preferences.split(",").map(p => p.trim());
        }
      } else if (Array.isArray(preferences)) {
        preferenceArray = preferences;
      }

      const qrDir = path.join(process.cwd(), "uploads/qrs");
      if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

      // Get IPFS gateway URL for the image
      const imageUrl = IPFSService.getIPFSUrl(imageCID);
      const labReportUrl = labReportCID ? IPFSService.getIPFSUrl(labReportCID) : null;

      const product = new Product({
        farmerId,
        name,
        category,
        preferences: preferenceArray,
        price: numericPrice,
        quantity: numericQuantity,
        location,
        image: imageUrl.gatewayUrl || imageUrl.ipfsUrl, // Use IPFS gateway URL
        imageCID: imageCID, // Store CID for future reference
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        moisture: numericMoisture,
        protein: numericProtein,
        pesticideResidue: numericPesticide,
        soilPh: numericPh,
        labReport: labReportUrl ? (labReportUrl.gatewayUrl || labReportUrl.ipfsUrl) : null,
        labReportCID: labReportCID || null,
      });

      await product.save();

      const serverUrl = "http://localhost:5000";
      const qrUrl = `${serverUrl}/product/${product._id}/view`;
      const qrFileName = `${product._id}-authQR.png`;
      const qrFullPath = path.join(qrDir, qrFileName);

      await QRCode.toFile(qrFullPath, qrUrl);

      product.qrPath = `/uploads/qrs/${qrFileName}`;
      await product.save();

      console.log("✅ QR generated for:", product.name, "→", product.qrPath);

      res.json({
        status: "success",
        message: "Product added successfully with QR!",
        product,
      });
    } catch (error) {
      console.error("❌ Add Product Error:", error.message, error.stack);
      res.json({ status: "error", message: "Error adding product" });
    }
  }
);
// ✅ Check if consumer email already exists
app.post("/consumer/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    const existing = await Consumer.findOne({ email });
    if (existing) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking email:", error);
    res.status(500).json({ exists: false, message: "Server error" });
  }
});


// ------------------ CONSUMER ROUTES ------------------
app.post("/consumer/register", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const existing = await Consumer.findOne({ email });
    if (existing) {
      return res.json({ status: "error", message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Use enhanced Consumer model with correct field names
    const consumer = new Consumer({ 
      name, 
      email, 
      mobileNumber: mobile, // Map mobile to mobileNumber
      passwordHash: hashedPassword // Map password to passwordHash
    });
    await consumer.save();

    res.json({ 
      status: "success", 
      success: true, // Also include for compatibility
      message: "Consumer registered successfully", 
      consumer 
    });
  } catch (error) {
    console.error("❌ Consumer registration error:", error);
    res.json({ status: "error", message: error.message || "Error registering consumer" });
  }
});
// ✅ Consumer Login Route
// ✅ Consumer Login (consistent with success:true/false)
app.post("/consumer/login", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const consumer = await Consumer.findOne({ name, email });
    if (!consumer) {
      return res.json({ status: "error", message: "Invalid name, email, or password" });
    }

    // Use passwordHash field from enhanced model
    const isMatch = await bcrypt.compare(password, consumer.passwordHash || consumer.password);
    if (!isMatch) {
      return res.json({ status: "error", message: "Invalid name, email, or password" });
    }

    res.json({
      status: "success",
      success: true, // Also include for frontend compatibility
      message: "Login successful",
      consumer: {
        _id: consumer._id.toString(),
        name: consumer.name,
        email: consumer.email,
      },
    });
  } catch (error) {
    console.error("❌ Consumer login error:", error);
    res.json({ status: "error", message: "Server error" });
  }
});
// ------------------ DISTRIBUTOR ROUTES ------------------
// Enhanced upload for distributor registration
const uploadDistributorDocs = upload.fields([
  { name: "qrCode", maxCount: 1 },
  { name: "distributorCertificate", maxCount: 1 }
]);

app.post("/distributor/register", uploadDistributorDocs, async (req, res) => {
  try {
    const { 
      name, 
      companyName, 
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      pincode,
      email, 
      mobile, 
      password, 
      companyGSTNumber,
      metamaskAddress,
      services
    } = req.body;

    // Validation
    if (!name || !companyName || !companyGSTNumber || !addressLine1 || !city || !district || !state || !pincode || !email || !mobile || !password) {
      return res.json({ status: "error", message: "Missing required fields" });
    }

    // Validate GSTIN format
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinPattern.test(companyGSTNumber.toUpperCase())) {
      return res.json({ status: "error", message: "Invalid GSTIN format" });
    }

    // Validate pincode
    if (!/^[0-9]{6}$/.test(pincode)) {
      return res.json({ status: "error", message: "Invalid pincode format" });
    }

    const existing = await Distributor.findOne({ email });
    if (existing) {
      return res.json({ status: "error", message: "Email already registered" });
    }

    // Check if GSTIN already exists
    const existingGST = await Distributor.findOne({ companyGSTNumber: companyGSTNumber.toUpperCase() });
    if (existingGST) {
      return res.json({ status: "error", message: "GSTIN already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate and upload certificate to IPFS (required)
    if (!req.files?.distributorCertificate?.[0]) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Distributor certificate is required"
      });
    }

    const certFile = req.files.distributorCertificate[0];
    
    // Check if file exists
    if (!certFile || !certFile.path) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file not found"
      });
    }
    
    // Check if file path exists on disk
    if (!fs.existsSync(certFile.path)) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file path does not exist"
      });
    }
    
    console.log("📤 Uploading distributor certificate to IPFS:", certFile.path);
    console.log("   File size:", fs.statSync(certFile.path).size, "bytes");
    
    const ipfsResult = await IPFSService.uploadFile(certFile.path);
    
    // Clean up local file after upload attempt (only if successful or after error handling)
    if (ipfsResult.success) {
      try { fs.unlinkSync(certFile.path); } catch (e) {
        console.warn("⚠️ Could not delete temp file:", certFile.path);
      }
    }
    
    if (!ipfsResult.success || !ipfsResult.cid) {
      console.error("❌ IPFS upload failed:", ipfsResult.error || "Unknown error");
      console.error("   File path:", certFile.path);
      console.error("   File exists:", fs.existsSync(certFile.path));
      
      // Don't delete file if upload failed, for debugging
      
      return res.status(500).json({
        status: "error",
        success: false,
        message: `Failed to upload distributor certificate to IPFS: ${ipfsResult.error || "Please check IPFS configuration. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env file"}`
      });
    }
    
    console.log("✅ Certificate uploaded to IPFS:", ipfsResult.cid);

    const distributorCertificateCID = ipfsResult.cid;

    // Upload payment QR code to IPFS if provided
    let paymentQRCodeCID = "";
    if (req.files?.qrCode?.[0]) {
      const qrFile = req.files.qrCode[0];
      const ipfsResult = await IPFSService.uploadFile(qrFile.path);
      if (ipfsResult.success) {
        paymentQRCodeCID = ipfsResult.cid;
      }
      try { fs.unlinkSync(qrFile.path); } catch (e) {}
    }

    // Parse services if provided
    let servicesArray = [];
    if (services) {
      try {
        servicesArray = typeof services === 'string' ? JSON.parse(services) : services;
      } catch (e) {
        servicesArray = Array.isArray(services) ? services : [];
      }
    }

    // Use enhanced Distributor model with correct field names
    const distributor = new Distributor({
      fullName: name, // Map name to fullName
      companyName,
      companyGSTNumber: companyGSTNumber.toUpperCase(),
      location: {
        addressLine1: addressLine1 || "",
        addressLine2: addressLine2 || "",
        city: city || "",
        district: district || "",
        state: state || "",
        pincode: pincode || ""
      },
      email,
      mobileNumber: mobile, // Map mobile to mobileNumber
      passwordHash: hashedPassword, // Use passwordHash
      metamaskAddress: metamaskAddress || "",
      paymentQRCode: paymentQRCodeCID || undefined,
      distributorCertificateCID: distributorCertificateCID, // Required, already validated above
      services: servicesArray,
      verificationStatus: "pending"
    });

    await distributor.save();

    res.json({ 
      status: "success", 
      success: true,
      message: "Distributor registered successfully" 
    });
  } catch (error) {
    console.error("❌ Distributor registration error:", error);
    res.status(500).json({ 
      status: "error", 
      success: false,
      message: error.message || "Server error" 
    });
  }
});
app.post("/distributor/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const distributor = await Distributor.findOne({ email });
    if (!distributor) {
      return res.json({ status: "error", message: "Invalid credentials" });
    }

    // Use passwordHash from enhanced model (fallback to password for legacy)
    const passwordField = distributor.passwordHash || distributor.password;
    const isMatch = await bcrypt.compare(password, passwordField);
    if (!isMatch) {
      return res.json({ status: "error", message: "Invalid credentials" });
    }

    res.json({
      status: "success",
      message: "Login successful",
      distributorId: distributor._id.toString(),
      distributorName: distributor.fullName || distributor.name, // Use fullName from enhanced model
    });
  } catch (error) {
    console.error("❌ Distributor login error:", error);
    res.json({ status: "error", message: "Server error" });
  }
});
app.post("/distributor/addStock/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, quantity, price } = req.body;

    const stock = new DistributorStock({
      distributorId: id,
      productName,
      quantity,
      price,
    });

    await stock.save();

    res.json({ success: true, message: "Stock added successfully!" });
  } catch (error) {
    res.json({ success: false, message: "Error adding stock" });
  }
});
app.get("/distributor/stock/:id", async (req, res) => {
  try {
    const stocks = await DistributorStock.find({ distributorId: req.params.id });

    res.json({ success: true, stock: stocks });
  } catch (error) {
    res.json({ success: false, message: "Error fetching stock" });
  }
});
app.post("/distributor/placeOrder", async (req, res) => {
  try {
    const { distributorId, retailerId, productName, quantity, totalPrice } = req.body;

    const order = new DistributorOrder({
      distributorId,
      retailerId,
      productName,
      quantity,
      totalPrice,
    });

    await order.save();
    res.json({ success: true, message: "Order placed to distributor!" });
    
  } catch (error) {
    res.json({ success: false, message: "Error placing order" });
  }
});

// ------------------ RETAILER ROUTES ------------------

// Enhanced Retailer Registration
const uploadRetailerDocs = upload.fields([
  { name: "retailerCertificate", maxCount: 1 }
]);

app.post("/api/auth/register/retailer", uploadRetailerDocs, async (req, res) => {
  try {
    const {
      fullName,
      shopName,
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      pincode,
      lat,
      long,
      email,
      mobileNumber,
      password,
      metamaskAddress
    } = req.body;

    // Validation
    if (!fullName || !shopName || !email || !mobileNumber || !password) {
      return res.json({
        status: "error",
        message: "Missing required fields"
      });
    }

    // Check if email or mobile already exists
    const existingEmail = await RetailerEnhanced.findOne({ email });
    if (existingEmail) {
      return res.json({
        status: "error",
        message: "Email already registered"
      });
    }

    const existingMobile = await RetailerEnhanced.findOne({ mobileNumber });
    if (existingMobile) {
      return res.json({
        status: "error",
        message: "Mobile number already registered"
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Validate and upload certificate to IPFS (required)
    if (!req.files?.retailerCertificate?.[0]) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Retailer certificate is required"
      });
    }

    const certFile = req.files.retailerCertificate[0];
    
    // Check if file exists
    if (!certFile || !certFile.path) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file not found"
      });
    }
    
    // Check if file path exists on disk
    if (!fs.existsSync(certFile.path)) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file path does not exist"
      });
    }
    
    console.log("📤 Uploading retailer certificate to IPFS:", certFile.path);
    console.log("   File size:", fs.statSync(certFile.path).size, "bytes");
    
    const ipfsResult = await IPFSService.uploadFile(certFile.path);
    
    // Clean up local file after upload attempt (only if successful or after error handling)
    if (ipfsResult.success) {
      try { fs.unlinkSync(certFile.path); } catch (e) {
        console.warn("⚠️ Could not delete temp file:", certFile.path);
      }
    }
    
    if (!ipfsResult.success || !ipfsResult.cid) {
      console.error("❌ IPFS upload failed:", ipfsResult.error || "Unknown error");
      console.error("   File path:", certFile.path);
      console.error("   File exists:", fs.existsSync(certFile.path));
      
      // Don't delete file if upload failed, for debugging
      
      return res.status(500).json({
        status: "error",
        success: false,
        message: `Failed to upload retailer certificate to IPFS: ${ipfsResult.error || "Please check IPFS configuration. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env file"}`
      });
    }
    
    console.log("✅ Certificate uploaded to IPFS:", ipfsResult.cid);
    const retailerCertificateCID = ipfsResult.cid;

    // Create retailer
    const retailer = new RetailerEnhanced({
      fullName,
      shopName,
      location: {
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        pincode,
        lat: lat ? parseFloat(lat) : undefined,
        long: long ? parseFloat(long) : undefined
      },
      email,
      mobileNumber,
      passwordHash,
      metamaskAddress: metamaskAddress || undefined,
      retailerCertificateCID,
      verificationStatus: "pending"
    });

    await retailer.save();

    // Generate and send OTPs
    const emailOTPResult = await OTPService.generateAndSendEmailOTP(email);
    const mobileOTPResult = await OTPService.generateAndSendMobileOTP(mobileNumber);

    // Return response in format expected by frontend (status: "success"/"error")
    res.json({
      status: "success",
      message: "Retailer registered successfully. Please verify email and mobile.",
      retailerId: retailer._id.toString(),
      verificationStatus: "pending",
      emailOTPSent: emailOTPResult.success,
      mobileOTPSent: mobileOTPResult.success,
      ...(process.env.NODE_ENV === 'development' && {
        emailOTP: emailOTPResult.otp,
        mobileOTP: mobileOTPResult.otp
      })
    });
  } catch (error) {
    console.error("❌ Retailer registration error:", error);
    res.json({
      status: "error",
      message: error.message || "Error registering retailer"
    });
  }
});

// Legacy route for backward compatibility (handles FormData from frontend)
app.post("/retailer/register", uploadRetailerDocs, async (req, res) => {
  try {
    // Extract data from request (frontend sends FormData for file upload)
    const {
      name, // Frontend sends "name" not "fullName"
      shopName,
      companyGSTNumber, // GSTIN number
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      pincode,
      email,
      mobile, // Frontend sends "mobile" not "mobileNumber"
      password,
      metamaskAddress
    } = req.body;

    // Validation
    if (!name || !shopName || !companyGSTNumber || !addressLine1 || !city || !district || !state || !pincode || !email || !mobile || !password) {
      return res.json({
        status: "error",
        message: "Missing required fields. Please fill all required fields."
      });
    }

    // Validate GSTIN format
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinPattern.test(companyGSTNumber.toUpperCase())) {
      return res.json({
        status: "error",
        message: "Invalid GSTIN format. Please enter a valid 15-digit GSTIN."
      });
    }

    // Validate pincode
    if (!/^[0-9]{6}$/.test(pincode)) {
      return res.json({
        status: "error",
        message: "Invalid pincode format. Please enter a 6-digit pincode."
      });
    }

    // Check if email already exists
    const existing = await Retailer.findOne({ email });
    if (existing) {
      return res.json({
        status: "error",
        message: "Email already registered"
      });
    }

    // Check if GSTIN already exists
    const existingGST = await Retailer.findOne({ companyGSTNumber: companyGSTNumber.toUpperCase() });
    if (existingGST) {
      return res.json({
        status: "error",
        message: "GSTIN already registered"
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Validate and upload certificate to IPFS (required)
    // Note: Legacy route uses req.file (single file) instead of req.files
    if (!req.file && !req.files?.retailerCertificate?.[0]) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Retailer certificate is required"
      });
    }

    const certFile = req.file || req.files?.retailerCertificate?.[0];
    
    // Check if file exists
    if (!certFile || !certFile.path) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file not found"
      });
    }
    
    // Check if file path exists on disk
    if (!fs.existsSync(certFile.path)) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Certificate file path does not exist"
      });
    }
    
    console.log("📤 Uploading retailer certificate to IPFS:", certFile.path);
    console.log("   File size:", fs.statSync(certFile.path).size, "bytes");
    
    const ipfsResult = await IPFSService.uploadFile(certFile.path);
    
    // Clean up local file after upload attempt (only if successful or after error handling)
    if (ipfsResult.success) {
      try { fs.unlinkSync(certFile.path); } catch (e) {
        console.warn("⚠️ Could not delete temp file:", certFile.path);
      }
    }
    
    if (!ipfsResult.success || !ipfsResult.cid) {
      console.error("❌ IPFS upload failed:", ipfsResult.error || "Unknown error");
      console.error("   File path:", certFile.path);
      console.error("   File exists:", fs.existsSync(certFile.path));
      
      // Don't delete file if upload failed, for debugging
      
      return res.status(500).json({
        status: "error",
        success: false,
        message: `Failed to upload retailer certificate to IPFS: ${ipfsResult.error || "Please check IPFS configuration. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env file"}`
      });
    }
    
    console.log("✅ Certificate uploaded to IPFS:", ipfsResult.cid);
    const retailerCertificateCID = ipfsResult.cid;

    // Create retailer with enhanced model (map frontend fields to model fields)
    const retailer = new Retailer({
      fullName: name, // Map name to fullName
      shopName,
      companyGSTNumber: companyGSTNumber.toUpperCase(), // Store in uppercase
      location: {
        addressLine1: addressLine1 || "",
        addressLine2: addressLine2 || "",
        city: city || "",
        district: district || "",
        state: state || "",
        pincode: pincode || ""
      },
      email,
      mobileNumber: mobile, // Map mobile to mobileNumber
      passwordHash,
      metamaskAddress: metamaskAddress || "",
      retailerCertificateCID: retailerCertificateCID || "",
      verificationStatus: "pending"
    });

    await retailer.save();

    res.json({
      status: "success",
      message: "Retailer registered successfully"
    });

  } catch (error) {
    console.error("❌ Retailer registration error:", error);
    res.json({
      status: "error",
      message: error.message || "Error registering retailer"
    });
  }
});
app.post("/retailer/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const retailer = await Retailer.findOne({ email });
    if (!retailer) {
      return res.json({ status: "error", message: "Invalid credentials" });
    }

    // Use passwordHash from enhanced model (fallback to password for legacy)
    const passwordField = retailer.passwordHash || retailer.password;
    const isMatch = await bcrypt.compare(password, passwordField);
    if (!isMatch) {
      return res.json({ status: "error", message: "Invalid credentials" });
    }

    res.json({
      status: "success",
      message: "Login successful",
      retailerId: retailer._id.toString(),
      retailerName: retailer.fullName || retailer.name, // Use fullName from enhanced model
    });
  } catch (error) {
    console.error("❌ Retailer login error:", error);
    res.json({ status: "error", message: "Server error" });
  }
});

// ✅ Get all products by farmerId
app.get("/farmer/getProducts/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.json({ status: "error", message: "Invalid Farmer ID" });
    }

    const products = await Product.find({ farmerId });

    res.json({
      status: "success",
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.json({ status: "error", message: "Error fetching products" });
  }
});
// ✅ Get all products with optional filters
app.get("/products", async (req, res) => {
  try {
    const { category, minPrice, maxPrice, location, preferences, sortBy } = req.query;

    let filter = {};

    // Category Filter
    if (category) filter.category = category;

    // Price Range Filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Location Filter (from product's location)
    if (location) {
      filter.location = { $regex: new RegExp(location, "i") }; // case-insensitive
    }

    // Preferences Filter
    if (preferences) {
      const prefArray = Array.isArray(preferences)
        ? preferences
        : preferences.split(",").map((p) => p.trim());
      filter.preferences = { $in: prefArray };
    }

    // ✅ Sorting logic
    let sortQuery = {};
    if (sortBy) {
      switch (sortBy) {
        case "price_asc":
          sortQuery.price = 1;
          break;
        case "price_desc":
          sortQuery.price = -1;
          break;
        case "newest":
          sortQuery._id = -1;
          break;
        default:
          break;
      }
    }

    const products = await Product.find(filter)
      .populate("farmerId", "name location")
      .sort(sortQuery);

    res.json({
      status: "success",
      count: products.length,
      filters: filter,
      products,
    });
  } catch (error) {
    console.error("❌ Product Filter Error:", error);
    res.json({ status: "error", message: "Error fetching filtered products" });
  }
});

// ✅ Update product
app.put("/farmer/updateProduct/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price, quantity, location } = req.body;
    const productId = req.params.id;

    const numericPrice = parseFloat(price);
    const numericQuantity = parseFloat(quantity);
    if (isNaN(numericPrice) || isNaN(numericQuantity)) {
      return res.json({ status: "error", message: "Price and Quantity must be numbers" });
    }

    const updateData = { name, category, price: numericPrice, quantity: numericQuantity, location };
    if (req.file) updateData.image = "/uploads/" + req.file.filename;

    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });
    if (!updatedProduct) {
      return res.json({ status: "error", message: "Product not found" });
    }

    res.json({
      status: "success",
      message: "Product updated successfully!",
      filePath: updatedProduct.image,
    });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ status: "error", message: "Error updating product" });
  }
});

// ✅ Delete product
app.delete("/farmer/deleteProduct/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting product" });
  }
});
app.get("/farmer/:id/qr", async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer || !farmer.qrCode)
      return res.json({ success: false, message: "QR not found" });

    res.json({
      success: true,
      qrUrl: `/uploads/${farmer.qrCode}`, // ✅ renamed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Get QR
app.get("/product/:id/qr", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.qrPath) return res.json({ success: false, message: "QR not found" });

    res.json({ success: true, qrUrl: product.qrPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== PUBLIC QR VIEW API ====================

// Comprehensive Public Crop View (for QR code)
app.get("/api/public/crop/:cropId", async (req, res) => {
  try {
    const { cropId } = req.params;

    // Find crop batch by cropId
    const cropBatch = await CropBatch.findOne({ cropId })
      .populate('farmerId', 'fullName farmName location metamaskAddress')
      .populate('selectedDistributorId', 'fullName companyName location metamaskAddress')
      .populate('history.actorId');

    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    // Get price trace
    const priceTrace = await PriceTrace.findOne({ cropBatchId: cropBatch._id });

    // Get logistics entries
    const logisticsEntries = await LogisticsEntry.find({ cropBatchId: cropBatch._id })
      .sort({ dispatchTimestamp: 1 });

    // Get certificate if available
    let certificateData = null;
    if (cropBatch.cropCertificateCID) {
      const certResult = await CertificateService.getCertificate(cropBatch.cropCertificateCID);
      if (certResult.success) {
        certificateData = certResult.certificateData;
      }
    }

    // Get QR code record
    const qrCodeRecord = await QRCodeModel.findOne({ cropBatchId: cropBatch._id });

    // Build comprehensive response
    const response = {
      success: true,
      crop: {
        cropId: cropBatch.cropId,
        productName: cropBatch.productName,
        category: cropBatch.category,
        dietLabels: cropBatch.dietLabels,
        quantity: cropBatch.quantity,
        unit: cropBatch.unit,
        harvestDate: cropBatch.harvestDate,
        status: cropBatch.status,
        badgeId: cropBatch.badgeId
      },
      farmer: {
        name: cropBatch.farmerId?.fullName,
        farmName: cropBatch.farmerId?.farmName,
        location: cropBatch.farmerId?.location,
        metamaskAddress: cropBatch.farmerId?.metamaskAddress
      },
      distributor: cropBatch.selectedDistributorId ? {
        name: cropBatch.selectedDistributorId?.fullName,
        companyName: cropBatch.selectedDistributorId?.companyName,
        location: cropBatch.selectedDistributorId?.location,
        metamaskAddress: cropBatch.selectedDistributorId?.metamaskAddress
      } : null,
      quality: {
        soilPH: cropBatch.soilPH,
        moisturePercent: cropBatch.moisturePercent,
        proteinPercent: cropBatch.proteinPercent,
        qualityGrade: cropBatch.qualityGrade,
        pesticideUsed: cropBatch.pesticideUsed,
        labReportCID: cropBatch.labReportCID ? IPFSService.getIPFSUrl(cropBatch.labReportCID) : null
      },
      media: {
        images: cropBatch.images.map(cid => IPFSService.getIPFSUrl(cid)),
        videoCID: cropBatch.videoCID ? IPFSService.getIPFSUrl(cropBatch.videoCID) : null
      },
      priceTrace: priceTrace ? {
        farmerSalePrice: priceTrace.farmerSalePrice,
        transportCost: priceTrace.transportCost,
        distributorPurchasePrice: priceTrace.distributorPurchasePrice,
        distributorSalePrice: priceTrace.distributorSalePrice,
        distributorMargin: priceTrace.distributorMargin,
        retailerPurchasePrice: priceTrace.retailerPurchasePrice,
        retailerSalePrice: priceTrace.retailerSalePrice,
        retailerMargin: priceTrace.retailerMargin,
        finalConsumerPrice: priceTrace.finalConsumerPrice,
        priceUpdates: priceTrace.priceUpdates
      } : null,
      timeline: cropBatch.history.map(entry => ({
        type: entry.type,
        actorRole: entry.actorRole,
        timestamp: entry.timestamp,
        metadata: entry.metadata,
        blockchainTxHash: entry.blockchainTxHash
      })),
      logistics: logisticsEntries.map(entry => ({
        vehicleNumber: entry.vehicleNumber,
        driverName: entry.driverName,
        transportCompany: entry.transportCompany,
        transportCost: entry.transportCost,
        dispatchTimestamp: entry.dispatchTimestamp,
        receivedTimestamp: entry.receivedTimestamp,
        qualityAtReceipt: entry.qualityAtReceipt
      })),
      certificate: certificateData,
      blockchain: {
        registered: cropBatch.blockchainRegistered,
        cropHash: cropBatch.blockchainCropHash,
        badgeId: cropBatch.badgeId
      },
      qrCode: qrCodeRecord ? {
        url: qrCodeRecord.publicViewUrl,
        imagePath: qrCodeRecord.qrCodeImagePath,
        imageCID: qrCodeRecord.qrCodeImageCID
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error("❌ Public crop view error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching crop details",
      error: error.message
    });
  }
});

// Legacy Product certificate HTML view
app.get("/product/:id/view", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("farmerId");
    if (!product) return res.send("<h2>Product not found</h2>");
    const farmer = product.farmerId;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Product Certificate</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #e0f7fa; display: flex; justify-content: center; padding: 40px; }
          .certificate { background: white; padding: 30px; border-radius: 15px; max-width: 800px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
          .header { text-align: center; margin-bottom: 25px; }
          .header h1 { color: #00796b; font-size: 28px; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #004d40; margin-bottom: 10px; border-bottom: 1px solid #b2dfdb; padding-bottom: 5px; }
          .section p { font-size: 16px; line-height: 1.5; margin: 5px 0; }
          .verified { display: flex; align-items: center; justify-content: flex-end; margin-top: 20px; }
          .verified img { height: 50px; margin-left: 10px; }
          .product-img { text-align: center; margin: 20px 0; }
          .product-img img { max-width: 250px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
          a { color: #00796b; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <h1>Product Authenticity Certificate</h1>
            <img src="https://i.ibb.co/9vCk9f5/verified-badge.png" alt="Verified Badge" />
          </div>
          <div class="section">
            <h3>Farmer Info</h3>
            <p><strong>Name:</strong> ${farmer.name}</p>
            <p><strong>Farm Name:</strong> ${farmer.farmName}</p>
            <p><strong>Location:</strong> ${farmer.location}</p>
            <p><strong>Farmer ID:</strong> ${farmer._id}</p>
          </div>
          <div class="section">
            <h3>Product Info</h3>
            <div class="product-img">
              <img src="${product.image}" alt="${product.name}" />
            </div>
            <p><strong>Name:</strong> ${product.name}</p>
            <p><strong>Category:</strong> ${product.category || 'N/A'}</p>
            <p><strong>Price:</strong> ₹${product.price}</p>
            <p><strong>Quantity:</strong> ${product.quantity} kg</p>
            <p><strong>Harvest Date:</strong> ${product.harvestDate ? new Date(product.harvestDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Moisture:</strong> ${product.moisture || 'N/A'}%</p>
            <p><strong>Protein:</strong> ${product.protein || 'N/A'}%</p>
            <p><strong>Pesticide Residue:</strong> ${product.pesticideResidue || 'N/A'} ppm</p>
            <p><strong>Soil pH:</strong> ${product.soilPh || 'N/A'}</p>
            <p><strong>Lab Report:</strong> ${product.labReport ? `<a href="${product.labReport}" target="_blank">View Report</a>` : 'N/A'}</p>
          </div>
          <div class="verified">
            <p><strong>Verified:</strong> ✅ Authentic Product</p>
            <img src="https://i.ibb.co/9vCk9f5/verified-badge.png" alt="Verified Badge" />
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.send("<h2>Something went wrong!</h2>");
  }
});
const aiUpload = multer({ dest: "uploads/chat_images/" });

app.post("/api/ai/chat", aiUpload.single("image"), async (req, res) => {
  try {
    // Check if Gemini AI is initialized
    if (!model || !genAI) {
      return res.status(503).json({
        success: false,
        message: "AI Assistant is not available. Please configure GEMINI_API_KEY in environment variables."
      });
    }

    const { query, translate } = req.body;
    const imagePath = req.file ? path.join(process.cwd(), req.file.path) : null;

    let messages = [];

    // If image provided, describe it
    if (imagePath) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Describe this image briefly for a farmer." },
          { type: "image_url", image_url: `file://${imagePath}` },
        ],
      });
    }

    // Add user's text query
    if (query) {
      messages.push({ role: "user", content: query });
    }

    let prompt = query || "";
    if (req.file) {
      prompt = `Describe this image briefly for a farmer.`;
    }

    let input = [prompt];
    if (req.file) {
      input = [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: fs.readFileSync(req.file.path).toString("base64"),
          },
        },
        prompt,
      ];
    }
    console.log("🟢 Sending prompt to Gemini:", input);

    const result = await model.generateContent(input);
    let reply = result.response.text();

    if (translate === "hindi") {
      const translateModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const translation = await translateModel.generateContent(`Translate this into Hindi: ${reply}`);
      reply = translation.response.text();
    }
    console.log("🟢 Prompt:", prompt);
    console.log("🟢 Gemini Reply:", reply);

    res.json({ success: true, reply });
  } catch (error) {
    console.error("❌ AI Chat Error:", error);
    if (error.response) {
      console.error("🔴 Response Status:", error.response.status);
      console.error("🔴 Response Data:", error.response.data);
    }
    res.status(500).json({
      success: false,
      message: "AI Assistant error: " + (error.message || "Unknown error"),
    });
  }
});
// ------------------ GET ALL DISTRIBUTORS ------------------
// This route is now handled by the enhanced version below
// ===============================
// FULL CHECKOUT API (Distributor → Farmer)
// ===============================
app.post("/orders", async (req, res) => {
  try {
    const {
      distributorId,
      distributorName,
      distributorEmail,
      farmerId,
      productId,
      productName,
      unitPrice,
      quantity,
      totalPrice,
      address,
      paymentMethod
    } = req.body;

    // -------------------------------
    // 1️⃣ Validate Distributor
    // -------------------------------
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(400).json({
        success: false,
        message: "Invalid Distributor ID"
      });
    }

    // -------------------------------
    // 2️⃣ Validate Product
    // -------------------------------
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({
        success: false,
        message: "Product not found"
      });
    }

    // -------------------------------
    // 3️⃣ Validate Farmer
    // -------------------------------
    if (!farmerId || !product.farmerId || product.farmerId.toString() !== farmerId) {
      return res.status(400).json({
        success: false,
        message: "Farmer not found for this product"
      });
    }

    // -------------------------------
    // 4️⃣ Price Calculation Safety
    // -------------------------------
    const finalUnitPrice = unitPrice || product.price;
    const finalTotalPrice = quantity * finalUnitPrice;

    // -------------------------------
    // 5️⃣ Create Order
    // -------------------------------
    const order = new Order({
      productId,
      productName,
      farmerId,
      distributorId,
      distributorName,
      distributorEmail,
      unitPrice: finalUnitPrice,
      quantity,
      totalPrice: finalTotalPrice,
      address,
      paymentMethod,
      orderDate: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: "Order placed successfully!",
      order
    });

  } catch (err) {
    console.error("🔥 Checkout Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while placing order"
    });
  }
});
app.delete("/distributor/deleteStock/:orderId", async (req, res) => {
  try {
    console.log("Delete request received for ID:", req.params.orderId);
    const deleted = await Order.findByIdAndDelete(req.params.orderId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Stock not found" });
    }

    res.json({ success: true, message: "Stock deleted successfully" });
  } catch (err) {
    console.error("Delete Stock Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// Example: GET /farmer/getProductType?farmerId=123
app.get("/farmer/getProductType", async (req, res) => {
  try {
    const { farmerId } = req.query;

    if (!farmerId) {
      return res.status(400).json({ success: false, message: "Farmer ID is required" });
    }

    // Find all products for the farmer and get unique categories
    const products = await Product.find({ farmerId });

    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, message: "No products found for this farmer" });
    }

    // Extract unique categories
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error("Error fetching product type:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});


app.get("/distributor/ordersToFarmer/:distributorId", async (req, res) => {
  try {
    const orders = await Order.find({ distributorId: req.params.distributorId })
      .populate("farmerId", "name farmName location")
      .populate("productId", "name price");

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Fetch Distributor → Farmer Orders Error:", err);
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
});


app.put("/distributor/updateStock/:stockId", async (req, res) => {
  try {
    const { name, price, quantity, category, image } = req.body;

    // Find stock by ID and update
    const updatedStock = await DistributorStock.findByIdAndUpdate(
      req.params.stockId,
      {
        name,
        price,
        quantity,
        category,
        image
      },
      { new: true } // return updated document
    );

    if (!updatedStock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    res.json({
      success: true,
      message: "Stock updated successfully",
      stock: updatedStock,
    });

  } catch (err) {
    console.error("Update Stock Error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating stock",
    });
  }
});
// ==================== DISTRIBUTOR MARKETPLACE LISTING ====================

// Enhanced Distributor Marketplace Listing API
const uploadDistributorListing = upload.fields([
  { name: "finalImage", maxCount: 1 }
]);

app.post("/api/distributor/listings", uploadDistributorListing, async (req, res) => {
  try {
    const {
      distributorId,
      cropBatchId,
      productName,
      category,
      dateDistributorPurchased,
      dateProductCameFromFarmer,
      coldStorageUsed,
      coldStorageTemperature,
      coldStorageDuration,
      storedDays,
      processingStatus,
      isCleaned,
      grade,
      impurityPercentage,
      initialWeight,
      finalUsableWeight,
      pricePerUnitDistributor,
      distributorMargin,
      packageDate,
      packSize,
      packMaterial,
      // Category-specific fields
      ripenessLevel,
      fruitSize,
      colorGrade,
      damagePercentage,
      freshnessScore,
      isWashed,
      preservationMethod,
      preservationDuration
    } = req.body;

    // Validation
    if (!distributorId || !cropBatchId || !productName || !pricePerUnitDistributor || !distributorMargin) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Find crop batch
    const cropBatch = await CropBatch.findById(cropBatchId);
    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    // Verify distributor owns this crop batch
    if (cropBatch.selectedDistributorId?.toString() !== distributorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: This crop batch is not assigned to you"
      });
    }

    // Check if crop is ready for listing
    if (cropBatch.status !== "withDistributor" && cropBatch.status !== "processed") {
      return res.status(400).json({
        success: false,
        message: "Crop batch must be received or processed before listing"
      });
    }

    // Generate badge ID
    const badgeId = CertificateService.generateBadgeId(distributorId);

    // Upload final image to IPFS
    let finalImageCID = null;
    if (req.files?.finalImage?.[0]) {
      const imageFile = req.files.finalImage[0];
      const ipfsResult = await IPFSService.uploadFile(imageFile.path);
      if (ipfsResult.success) {
        finalImageCID = ipfsResult.cid;
      }
      try { fs.unlinkSync(imageFile.path); } catch (e) {}
    }

    // Generate final certificate
    const certResult = await CertificateService.generateCertificate(cropBatchId);
    if (!certResult.success) {
      console.warn("⚠️ Certificate generation failed:", certResult.error);
    }

    // Update crop batch
    cropBatch.status = "processed";
    cropBatch.badgeId = badgeId;
    if (certResult.success) {
      cropBatch.cropCertificateCID = certResult.certificateCID;
    }
    await cropBatch.save();

    // Update price trace
    const priceTrace = await PriceTrace.findOne({ cropBatchId });
    if (priceTrace) {
      priceTrace.distributorPurchasePrice = cropBatch.pricePerUnitFarmer;
      priceTrace.distributorSalePrice = parseFloat(pricePerUnitDistributor);
      priceTrace.distributorMargin = parseFloat(distributorMargin);
      
      priceTrace.priceUpdates.push({
        stage: "distributor",
        oldPrice: priceTrace.distributorSalePrice || 0,
        newPrice: parseFloat(pricePerUnitDistributor),
        updatedBy: distributorId,
        updatedByRole: "Distributor",
        reason: "Distributor marketplace listing",
        timestamp: new Date()
      });
      await priceTrace.save();
    }

    // Create distributor listing
    const listing = new DistributorListing({
      distributorId,
      cropBatchId,
      productName,
      category,
      dateDistributorPurchased: dateDistributorPurchased ? new Date(dateDistributorPurchased) : new Date(),
      dateProductCameFromFarmer: dateProductCameFromFarmer ? new Date(dateProductCameFromFarmer) : new Date(),
      coldStorageUsed: coldStorageUsed === "true" || coldStorageUsed === true,
      coldStorageTemperature: coldStorageTemperature ? parseFloat(coldStorageTemperature) : undefined,
      coldStorageDuration: coldStorageDuration ? parseFloat(coldStorageDuration) : undefined,
      storedDays: storedDays ? parseInt(storedDays) : undefined,
      processingStatus: processingStatus || "notProcessed",
      isCleaned: isCleaned === "true" || isCleaned === true,
      grade,
      impurityPercentage: impurityPercentage ? parseFloat(impurityPercentage) : undefined,
      initialWeight: parseFloat(initialWeight) || cropBatch.quantity,
      finalUsableWeight: parseFloat(finalUsableWeight) || cropBatch.quantity,
      pricePerUnitDistributor: parseFloat(pricePerUnitDistributor),
      distributorMargin: parseFloat(distributorMargin),
      packageDate: packageDate ? new Date(packageDate) : new Date(),
      packSize,
      packMaterial,
      badgeId,
      finalImageCID,
      status: "listed"
    });

    // Add category-specific fields
    if (category === "fruits") {
      listing.ripenessLevel = ripenessLevel;
      listing.fruitSize = fruitSize;
      listing.colorGrade = colorGrade;
      listing.damagePercentage = damagePercentage ? parseFloat(damagePercentage) : undefined;
    } else if (category === "vegetables") {
      listing.freshnessScore = freshnessScore;
      listing.isWashed = isWashed === "true" || isWashed === true;
      listing.preservationMethod = preservationMethod;
      listing.preservationDuration = preservationDuration ? parseFloat(preservationDuration) : undefined;
    }

    await listing.save();

    // Add ledger entry
    cropBatch.history.push({
      type: "processed",
      actorId: distributorId,
      actorRole: "Distributor",
      timestamp: new Date(),
      metadata: {
        processingStatus,
        badgeId,
        pricePerUnitDistributor: parseFloat(pricePerUnitDistributor),
        distributorMargin: parseFloat(distributorMargin)
      }
    });
    await cropBatch.save();

    // Optional: Record on blockchain
    if (cropBatch.farmerMetamaskAddress && cropBatch.blockchainCropHash) {
      console.log("📝 Blockchain listing should happen here");
    }

    res.json({
      success: true,
      message: "Product listed in marketplace successfully",
      listing: {
        _id: listing._id,
        badgeId: listing.badgeId,
        productName: listing.productName,
        pricePerUnitDistributor: listing.pricePerUnitDistributor,
        status: listing.status
      },
      certificate: certResult.success ? {
        cid: certResult.certificateCID,
        url: certResult.certificateUrl
      } : null
    });
  } catch (error) {
    console.error("❌ Create listing error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating marketplace listing",
      error: error.message
    });
  }
});

// Get distributor marketplace listings
app.get("/api/distributor/marketplace", async (req, res) => {
  try {
    const { distributorId, category, status } = req.query;

    let filter = {};
    if (distributorId) filter.distributorId = distributorId;
    if (category) filter.category = category;
    if (status) filter.status = status;

    const listings = await DistributorListing.find(filter)
      .populate("distributorId", "fullName companyName")
      .populate("cropBatchId", "cropId productName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      listings: listings.map(listing => ({
        _id: listing._id,
        badgeId: listing.badgeId,
        productName: listing.productName,
        category: listing.category,
        distributor: {
          name: listing.distributorId?.fullName,
          companyName: listing.distributorId?.companyName
        },
        pricePerUnitDistributor: listing.pricePerUnitDistributor,
        distributorMargin: listing.distributorMargin,
        finalUsableWeight: listing.finalUsableWeight,
        processingStatus: listing.processingStatus,
        status: listing.status,
        createdAt: listing.createdAt
      }))
    });
  } catch (error) {
    console.error("❌ Get marketplace listings error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching marketplace listings"
    });
  }
});

// Legacy route
app.post("/distributor/addMarketplaceProduct", uploadDistributorListing, async (req, res) => {
  try {
    const distributorId = req.headers["distributorid"];
    if (!distributorId) {
      return res.status(400).json({ success: false, message: "Distributor ID missing!" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image upload failed!" });
    }
    console.log("BODY RECEIVED:", req.body);


    const {
      productType,
      boughtDate,
      distributorPurchaseDate,
      storedDays,
      coldStorage,
      temperature,
      // Dynamic fields for grains
      isCleaned,
      grade,
      impurityPercentage,
      packSize,
      packMaterial,
      moisturePercentage,
      // Dynamic fields for fruits
      ripenessLevel,
      coldStorageUsed,
      coldStorageDuration,
      storageTemperature,
      fruitSize,
      colorGrade,
      damagePercentage,
      // Dynamic fields for vegetables
      freshnessScore,
      isWashed,
      preservationMethod,
      preservationDuration,
      // Common fields
      initialWeight,
      finalWeight,
      distributorMargin,
      batchId,
      processingStatus,
      packagedAt,
      distributorName,
      productName,
      marketPrice
    } = req.body;

    // Check if product already exists
    const existing = await MarketplaceProduct.findOne({ distributorId, productName });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already added this product to the marketplace!" });
    }

    const newProduct = new MarketplaceProduct({
      distributorId,
      distributorName,
      productName,
      productType,
      distributorPurchaseDate,
      boughtDate,
      storedDays,
      coldStorage,
      temperature,
      isCleaned,
      grade,
      impurityPercentage,
      packSize,
      packMaterial,
      moisturePercentage,
      ripenessLevel,
      coldStorageUsed,
      coldStorageDuration,
      storageTemperature,
      fruitSize,
      colorGrade,
      damagePercentage,
      freshnessScore,
      isWashed,
      preservationMethod,
      preservationDuration,
      initialWeight,
      finalWeight,
      distributorMargin,
      batchId,
      processingStatus,
      packagedAt,
      marketPrice,
      image: req.file.filename
    });

    await newProduct.save();

    res.json({
      success: true,
      message: "Product successfully added to Marketplace!",
      product: newProduct
    });

  } catch (error) {
    console.error("Error adding marketplace product:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});

app.post('/distributor/checkMarketplace', async (req, res) => {
  const { distributorId, productId } = req.body;

  try {
    const exists = await MarketplaceProduct.findOne({ distributorId, productId });
    res.json({ exists: !!exists });
  } catch (err) {
    console.error(err);
    res.json({ exists: false });
  }
});
// Get all orders made by distributors for a specific farmer
app.get("/farmer/distributor-orders/:farmerId", async (req, res) => {
  try {
    const orders = await DistributorOrder.find({
      farmerId: req.params.farmerId,
      customerType: "distributor"
    }).populate("distributorId", "name email shopName");

    res.json({ success: true, orders });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error fetching distributor orders" });
  }
});
app.get("/marketplace/all", async (req, res) => {
  try {
    const products = await MarketplaceProduct.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      products
    });

  } catch (err) {
    console.error("Error fetching marketplace products:", err);
    res.json({ success: false, message: "Server Error" });
  }
});
app.get("/distributor/:id/qr", async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor || !distributor.qrCode) {
      return res.json({ success: false, message: "QR not found" });
    }

    return res.json({
      success: true,
      qrUrl: "/uploads/qrCodes/" + distributor.qrCode,
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});
// ==================== RETAILER ORDER MANAGEMENT ====================

// Enhanced Retailer Order Placement
app.post("/api/retailer/orders", async (req, res) => {
  try {
    const {
      retailerId,
      distributorListingId,
      quantity,
      unitPrice,
      totalPrice,
      paymentMethod,
      address
    } = req.body;

    // Validation
    if (!retailerId || !distributorListingId || !quantity || !unitPrice || !paymentMethod || !address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Find distributor listing
    const listing = await DistributorListing.findById(distributorListingId)
      .populate("distributorId")
      .populate("cropBatchId");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found"
      });
    }

    if (listing.status !== "listed") {
      return res.status(400).json({
        success: false,
        message: "Listing is not available for purchase"
      });
    }

    // Check quantity availability
    if (parseFloat(quantity) > listing.finalUsableWeight) {
      return res.status(400).json({
        success: false,
        message: "Insufficient quantity available"
      });
    }

    // Find retailer
    const retailer = await RetailerEnhanced.findById(retailerId);
    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: "Retailer not found"
      });
    }

    // Create retailer order
    const order = new RetailerOrder({
      retailerId,
      distributorId: listing.distributorId._id,
      distributorListingId: listing._id,
      cropBatchId: listing.cropBatchId._id,
      productName: listing.productName,
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(unitPrice),
      totalPrice: parseFloat(totalPrice),
      paymentMethod: paymentMethod.toLowerCase(),
      paymentStatus: paymentMethod.toLowerCase() === "cod" ? "pending" : "completed",
      address,
      status: "pending"
    });

    await order.save();

    // Update listing status if all quantity sold
    const remainingQuantity = listing.finalUsableWeight - parseFloat(quantity);
    if (remainingQuantity <= 0) {
      listing.status = "sold";
      await listing.save();
    }

    // Update crop batch
    const cropBatch = listing.cropBatchId;
    cropBatch.status = "inTransitToRetailer";
    
    // Add ledger entry
    cropBatch.history.push({
      type: "soldToRetailer",
      actorId: retailerId,
      actorRole: "Retailer",
      timestamp: new Date(),
      metadata: {
        orderId: order._id.toString(),
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        totalPrice: parseFloat(totalPrice)
      }
    });
    await cropBatch.save();

    // Update price trace
    const priceTrace = await PriceTrace.findOne({ cropBatchId: cropBatch._id });
    if (priceTrace) {
      priceTrace.retailerPurchasePrice = parseFloat(unitPrice);
      priceTrace.priceUpdates.push({
        stage: "retailer",
        oldPrice: priceTrace.retailerPurchasePrice || 0,
        newPrice: parseFloat(unitPrice),
        updatedBy: retailerId,
        updatedByRole: "Retailer",
        reason: "Retailer order placed",
        timestamp: new Date()
      });
      await priceTrace.save();
    }

    res.json({
      success: true,
      message: "Order placed successfully",
      order: {
        _id: order._id,
        productName: order.productName,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        status: order.status,
        orderDate: order.orderDate
      }
    });
  } catch (error) {
    console.error("❌ Create retailer order error:", error);
    res.status(500).json({
      success: false,
      message: "Error placing order",
      error: error.message
    });
  }
});

// Retailer Order Receipt with Quality Checks
app.post("/api/retailer/orders/:orderId/confirm-receipt", upload.fields([
  { name: "qualityPhotos", maxCount: 5 }
]), async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      receivedTemperature,
      receivedQuality,
      receivedQuantity,
      coldStorageUsed,
      coldStorageDuration,
      retailerPrice
    } = req.body;

    // Find order
    const order = await RetailerOrder.findById(orderId)
      .populate("cropBatchId")
      .populate("distributorId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status !== "pending" && order.deliveryStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Order already processed"
      });
    }

    // Upload quality photos to IPFS
    const qualityPhotoCIDs = [];
    if (req.files?.qualityPhotos) {
      for (const photoFile of req.files.qualityPhotos) {
        const ipfsResult = await IPFSService.uploadFile(photoFile.path);
        if (ipfsResult.success) {
          qualityPhotoCIDs.push(ipfsResult.cid);
        }
        try { fs.unlinkSync(photoFile.path); } catch (e) {}
      }
    }

    // Update order
    order.deliveryStatus = "delivered";
    order.status = "completed";
    order.receivedTimestamp = new Date();
    order.receivedTemperature = receivedTemperature ? parseFloat(receivedTemperature) : undefined;
    order.receivedQuality = receivedQuality;
    order.receivedQuantity = receivedQuantity ? parseFloat(receivedQuantity) : undefined;
    order.coldStorageUsed = coldStorageUsed === "true" || coldStorageUsed === true;
    order.coldStorageDuration = coldStorageDuration ? parseFloat(coldStorageDuration) : undefined;
    order.retailerPrice = retailerPrice ? parseFloat(retailerPrice) : undefined;
    await order.save();

    // Update crop batch
    const cropBatch = order.cropBatchId;
    cropBatch.status = "withRetailer";
    
    // Add ledger entry
    cropBatch.history.push({
      type: "soldToRetailer",
      actorId: order.retailerId,
      actorRole: "Retailer",
      timestamp: new Date(),
      metadata: {
        orderId: order._id.toString(),
        receivedTemperature,
        receivedQuality,
        receivedQuantity,
        coldStorageUsed,
        retailerPrice
      }
    });
    await cropBatch.save();

    // Update price trace
    const priceTrace = await PriceTrace.findOne({ cropBatchId: cropBatch._id });
    if (priceTrace && retailerPrice) {
      priceTrace.retailerSalePrice = parseFloat(retailerPrice);
      priceTrace.finalConsumerPrice = parseFloat(retailerPrice);
      priceTrace.retailerMargin = parseFloat(retailerPrice) - priceTrace.retailerPurchasePrice;
      
      priceTrace.priceUpdates.push({
        stage: "retailer",
        oldPrice: priceTrace.retailerSalePrice || 0,
        newPrice: parseFloat(retailerPrice),
        updatedBy: order.retailerId,
        updatedByRole: "Retailer",
        reason: "Retailer set consumer price",
        timestamp: new Date()
      });
      await priceTrace.save();
    }

    // Finalize certificate with updated price trace
    const certResult = await CertificateService.generateCertificate(cropBatch._id);
    if (certResult.success) {
      cropBatch.cropCertificateCID = certResult.certificateCID;
      await cropBatch.save();
    }

    res.json({
      success: true,
      message: "Order receipt confirmed",
      order: {
        _id: order._id,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        receivedTimestamp: order.receivedTimestamp,
        retailerPrice: order.retailerPrice
      },
      certificate: certResult.success ? {
        cid: certResult.certificateCID,
        url: certResult.certificateUrl
      } : null
    });
  } catch (error) {
    console.error("❌ Confirm receipt error:", error);
    res.status(500).json({
      success: false,
      message: "Error confirming receipt",
      error: error.message
    });
  }
});

// Get retailer orders (new API)
app.get("/api/retailer/orders", async (req, res) => {
  try {
    const { retailerId, status } = req.query;

    if (!retailerId) {
      return res.status(400).json({
        success: false,
        message: "Retailer ID is required"
      });
    }

    let filter = { retailerId };
    if (status) filter.status = status;

    const orders = await RetailerOrder.find(filter)
      .populate("distributorId", "fullName companyName")
      .populate("distributorListingId", "badgeId productName")
      .populate("cropBatchId", "cropId")
      .sort({ orderDate: -1 });

    res.json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id,
        productName: order.productName,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        status: order.status,
        retailerPrice: order.retailerPrice,
        orderDate: order.orderDate,
        receivedTimestamp: order.receivedTimestamp,
        distributor: {
          name: order.distributorId?.fullName,
          companyName: order.distributorId?.companyName
        }
      }))
    });
  } catch (error) {
    console.error("❌ Get retailer orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders"
    });
  }
});

// Legacy route
app.post("/retailer/order", async (req, res) => {
  try {
    console.log("Retailer placing order:", req.body);

    const order = new RetailerOrder({
      productId: req.body.productId,
      productName: req.body.productName,
      unitPrice: req.body.unitPrice,
      quantity: req.body.quantity,
      totalPrice: req.body.totalPrice,

      retailerId: req.body.retailerId,
      retailerName: req.body.retailerName,
      retailerEmail: req.body.retailerEmail,

      distributorId: req.body.distributorId,

      paymentMethod: req.body.paymentMethod,
      address: req.body.address
    });

    await order.save();

    res.json({ success: true, message: "Order placed successfully" });

  } catch (err) {
    console.error("Error placing retailer order:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Legacy route - redirects to new API
app.get("/retailer/orders/:retailerId", async (req, res) => {
  req.query.retailerId = req.params.retailerId;
  req.url = "/api/retailer/orders";
  app._router.handle(req, res);
});

// DELETE RETAILER ORDER
app.delete("/retailer/orders/:orderId", async (req, res) => {
    try {
        const deleted = await RetailerOrder.findByIdAndDelete(req.params.orderId);

        if (!deleted) {
            return res.json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, message: "Order deleted successfully" });

    } catch (err) {
        console.error("Delete order error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
app.post("/retailer/add-marketplace", upload.single("image"), async (req, res) => {
    try {
        let { retailerId, orderId, productName, buyingPrice, sellingPrice, quantity, description } = req.body;

        // Validate required fields
        if (!retailerId || !orderId || !productName ||
            buyingPrice == null || sellingPrice == null || quantity == null) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        buyingPrice = Number(buyingPrice);
        sellingPrice = Number(sellingPrice);
        quantity = Number(quantity);

        // Check if the product is already in marketplace
        const existing = await RetailerProducts.findOne({ retailerId, orderId });
        if (existing) {
            return res.json({ success: false, message: "You have already added this product to the marketplace." });
        }

        const imageFileName = req.file ? req.file.filename : null;

        const retailerProduct = new RetailerProducts({
            retailerId,
            orderId,
            productId: new mongoose.Types.ObjectId(),
            productName,
            buyingPrice,
            sellingPrice,
            quantity,
            description,
            image: imageFileName
        });

        await retailerProduct.save();

        res.json({ success: true, message: "Product added successfully" });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});
// 🔹 GET all retailer products for consumer marketplace
app.get("/api/consumer/retailer-products", async (req, res) => {
  try {
    const products = await RetailerProducts.find({})
      .select("productName description sellingPrice image retailerId createdAt") // select only needed fields
      .lean();

    if (!products || products.length === 0) {
      return res.json({ success: true, products: [] });
    }

    const formattedProducts = products.map(p => ({
      id: p._id,
      productName: p.productName,
      description: p.description,
      price: p.sellingPrice,
      image: `/uploads/${p.image}`, // adjust path if needed
      retailer: p.retailerId,      // optionally populate name from Retailer collection
      createdAt: p.createdAt
    }));

    res.json({ success: true, products: formattedProducts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== ADMIN VERIFICATION APIs ====================

// Middleware to check admin authentication (simplified - use JWT in production)
const checkAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.headers;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required"
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Invalid admin credentials"
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Admin authentication error"
    });
  }
};

// Get pending verifications
app.get("/api/admin/pending-verifications", checkAdmin, async (req, res) => {
  try {
    const { role, status } = req.query;

    const farmers = role === "farmer" || !role
      ? await FarmerEnhanced.find({ verificationStatus: status || "pending" })
          .select("fullName farmName email mobileNumber createdAt verificationStatus")
      : [];

    const distributors = role === "distributor" || !role
      ? await DistributorEnhanced.find({ verificationStatus: status || "pending" })
          .select("fullName companyName companyGSTNumber email mobileNumber createdAt verificationStatus")
      : [];

    const retailers = role === "retailer" || !role
      ? await RetailerEnhanced.find({ verificationStatus: status || "pending" })
          .select("fullName shopName email mobileNumber createdAt verificationStatus")
      : [];

    res.json({
      success: true,
      pendingVerifications: {
        farmers,
        distributors,
        retailers,
        total: farmers.length + distributors.length + retailers.length
      }
    });
  } catch (error) {
    console.error("❌ Get pending verifications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending verifications"
    });
  }
});

// Verify Farmer
app.post("/api/admin/verify/farmer/:farmerId", checkAdmin, async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { action, rejectionReason } = req.body; // action: "approve" or "reject"

    if (!action || (action !== "approve" && action !== "reject")) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'"
      });
    }

    const farmer = await FarmerEnhanced.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    if (action === "approve") {
      farmer.verificationStatus = "approved";
      farmer.verifiedByAdminId = req.admin._id;
      farmer.verifiedAt = new Date();
      farmer.rejectionReason = undefined;

      await farmer.save();

      // Register on blockchain if metamask address exists
      if (farmer.metamaskAddress && !farmer.blockchainRegistered) {
        try {
          // Create profile hash
          const { ethers } = await import('ethers');
          const profileData = JSON.stringify({
            fullName: farmer.fullName,
            farmName: farmer.farmName,
            email: farmer.email,
            farmerId: farmer._id.toString()
          });
          const profileHash = ethers.keccak256(ethers.toUtf8Bytes(profileData));
          const profileCIDHash = farmer.profileCID 
            ? ethers.keccak256(ethers.toUtf8Bytes(farmer.profileCID))
            : ethers.keccak256(ethers.toUtf8Bytes(""));

          // Register on blockchain (requires signer setup)
          const blockchainResult = await BlockchainService.registerFarmer(
            farmer.metamaskAddress,
            profileHash,
            profileCIDHash
          );

          if (blockchainResult.success) {
            farmer.blockchainRegistered = true;
            farmer.blockchainTxHash = blockchainResult.txHash;
            await farmer.save();
          }
        } catch (blockchainError) {
          console.warn("⚠️ Blockchain registration failed:", blockchainError.message);
          // Continue even if blockchain registration fails
        }
      }

      res.json({
        success: true,
        message: "Farmer verified and approved",
        farmer: {
          _id: farmer._id,
          fullName: farmer.fullName,
          verificationStatus: farmer.verificationStatus,
          blockchainRegistered: farmer.blockchainRegistered
        }
      });
    } else {
      farmer.verificationStatus = "rejected";
      farmer.verifiedByAdminId = req.admin._id;
      farmer.verifiedAt = new Date();
      farmer.rejectionReason = rejectionReason || "Rejected by admin";

      await farmer.save();

      res.json({
        success: true,
        message: "Farmer verification rejected",
        farmer: {
          _id: farmer._id,
          verificationStatus: farmer.verificationStatus,
          rejectionReason: farmer.rejectionReason
        }
      });
    }

    // Update admin verification count
    req.admin.verificationCount = (req.admin.verificationCount || 0) + 1;
    await req.admin.save();
  } catch (error) {
    console.error("❌ Verify farmer error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying farmer",
      error: error.message
    });
  }
});

// Verify Distributor
app.post("/api/admin/verify/distributor/:distributorId", checkAdmin, async (req, res) => {
  try {
    const { distributorId } = req.params;
    const { action, rejectionReason } = req.body;

    if (!action || (action !== "approve" && action !== "reject")) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'"
      });
    }

    const distributor = await DistributorEnhanced.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found"
      });
    }

    if (action === "approve") {
      distributor.verificationStatus = "approved";
      distributor.verifiedByAdminId = req.admin._id;
      distributor.verifiedAt = new Date();
      distributor.rejectionReason = undefined;

      await distributor.save();

      // Register on blockchain
      if (distributor.metamaskAddress && !distributor.blockchainRegistered) {
        try {
          const { ethers } = await import('ethers');
          const profileData = JSON.stringify({
            fullName: distributor.fullName,
            companyName: distributor.companyName,
            companyGSTNumber: distributor.companyGSTNumber,
            distributorId: distributor._id.toString()
          });
          const profileHash = ethers.keccak256(ethers.toUtf8Bytes(profileData));
          const profileCIDHash = distributor.profileCID 
            ? ethers.keccak256(ethers.toUtf8Bytes(distributor.profileCID))
            : ethers.keccak256(ethers.toUtf8Bytes(""));

          const blockchainResult = await BlockchainService.registerDistributor(
            distributor.metamaskAddress,
            profileHash,
            profileCIDHash
          );

          if (blockchainResult.success) {
            distributor.blockchainRegistered = true;
            distributor.blockchainTxHash = blockchainResult.txHash;
            await distributor.save();
          }
        } catch (blockchainError) {
          console.warn("⚠️ Blockchain registration failed:", blockchainError.message);
        }
      }

      res.json({
        success: true,
        message: "Distributor verified and approved",
        distributor: {
          _id: distributor._id,
          fullName: distributor.fullName,
          companyName: distributor.companyName,
          verificationStatus: distributor.verificationStatus,
          blockchainRegistered: distributor.blockchainRegistered
        }
      });
    } else {
      distributor.verificationStatus = "rejected";
      distributor.verifiedByAdminId = req.admin._id;
      distributor.verifiedAt = new Date();
      distributor.rejectionReason = rejectionReason || "Rejected by admin";

      await distributor.save();

      res.json({
        success: true,
        message: "Distributor verification rejected",
        distributor: {
          _id: distributor._id,
          verificationStatus: distributor.verificationStatus,
          rejectionReason: distributor.rejectionReason
        }
      });
    }

    req.admin.verificationCount = (req.admin.verificationCount || 0) + 1;
    await req.admin.save();
  } catch (error) {
    console.error("❌ Verify distributor error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying distributor",
      error: error.message
    });
  }
});

// Verify Retailer
app.post("/api/admin/verify/retailer/:retailerId", checkAdmin, async (req, res) => {
  try {
    const { retailerId } = req.params;
    const { action, rejectionReason } = req.body;

    if (!action || (action !== "approve" && action !== "reject")) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'"
      });
    }

    const retailer = await RetailerEnhanced.findById(retailerId);
    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: "Retailer not found"
      });
    }

    if (action === "approve") {
      retailer.verificationStatus = "approved";
      retailer.verifiedByAdminId = req.admin._id;
      retailer.verifiedAt = new Date();
      retailer.rejectionReason = undefined;

      await retailer.save();

      // Register on blockchain
      if (retailer.metamaskAddress && !retailer.blockchainRegistered) {
        try {
          const { ethers } = await import('ethers');
          const profileData = JSON.stringify({
            fullName: retailer.fullName,
            shopName: retailer.shopName,
            retailerId: retailer._id.toString()
          });
          const profileHash = ethers.keccak256(ethers.toUtf8Bytes(profileData));
          const profileCIDHash = retailer.profileCID 
            ? ethers.keccak256(ethers.toUtf8Bytes(retailer.profileCID))
            : ethers.keccak256(ethers.toUtf8Bytes(""));

          const blockchainResult = await BlockchainService.registerRetailer(
            retailer.metamaskAddress,
            profileHash,
            profileCIDHash
          );

          if (blockchainResult.success) {
            retailer.blockchainRegistered = true;
            retailer.blockchainTxHash = blockchainResult.txHash;
            await retailer.save();
          }
        } catch (blockchainError) {
          console.warn("⚠️ Blockchain registration failed:", blockchainError.message);
        }
      }

      res.json({
        success: true,
        message: "Retailer verified and approved",
        retailer: {
          _id: retailer._id,
          fullName: retailer.fullName,
          shopName: retailer.shopName,
          verificationStatus: retailer.verificationStatus,
          blockchainRegistered: retailer.blockchainRegistered
        }
      });
    } else {
      retailer.verificationStatus = "rejected";
      retailer.verifiedByAdminId = req.admin._id;
      retailer.verifiedAt = new Date();
      retailer.rejectionReason = rejectionReason || "Rejected by admin";

      await retailer.save();

      res.json({
        success: true,
        message: "Retailer verification rejected",
        retailer: {
          _id: retailer._id,
          verificationStatus: retailer.verificationStatus,
          rejectionReason: retailer.rejectionReason
        }
      });
    }

    req.admin.verificationCount = (req.admin.verificationCount || 0) + 1;
    await req.admin.save();
  } catch (error) {
    console.error("❌ Verify retailer error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying retailer",
      error: error.message
    });
  }
});

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        verificationCount: admin.verificationCount
      }
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Error during login"
    });
  }
});

// ==================== NOTIFICATION ROUTES ====================

// Farmer notification route (for rejections)
app.post("/farmer/notifyReject/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;
    // This is a placeholder - in production, you'd send actual notifications
    // For now, just return success
    res.json({
      success: true,
      message: "Notification sent"
    });
  } catch (error) {
    console.error("❌ Notify reject error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending notification"
    });
  }
});

// ==================== FIX DISTRIBUTOR RESPONSE FORMAT ====================

// Update distributors endpoint to include phone field
app.get("/distributors", async (req, res) => {
  try {
    const distributors = await DistributorEnhanced.find({}, "-passwordHash").lean();
    
    // Format response to match frontend expectations
    const formattedDistributors = distributors.map(d => ({
      _id: d._id,
      id: d._id,
      name: d.fullName || d.name,
      companyName: d.companyName,
      location: d.location ? 
        `${d.location.addressLine1}, ${d.location.city}, ${d.location.state}` : 
        d.location,
      email: d.email,
      phone: d.mobileNumber, // Map mobileNumber to phone for frontend
      mobileNumber: d.mobileNumber,
      companyGSTNumber: d.companyGSTNumber,
      verificationStatus: d.verificationStatus
    }));

    res.json({
      success: true,
      distributors: formattedDistributors
    });
  } catch (err) {
    console.error("Error fetching distributors:", err);
    res.status(500).json({ success: false, message: "Error fetching distributors" });
  }
});

// ------------------ ROOT ROUTE ------------------
// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// ------------------ ERROR HANDLING MIDDLEWARE ------------------
// Multer error handling (must be after all routes, before server start)
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: "error",
        message: `Unexpected field: ${error.field}. Please check your form fields match the expected format.`
      });
    }
    return res.status(400).json({
      status: "error",
      message: `File upload error: ${error.message}`
    });
  }
  // Pass other errors to default error handler
  console.error("❌ Unhandled error:", error);
  res.status(500).json({
    status: "error",
    message: error.message || "Internal server error"
  });
});

// ------------------ START SERVER ------------------
app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
