import IPFSService from './ipfs.js';
import { CropBatch, Farmer, Distributor, Retailer, PriceTrace } from '../models/index.js';

/**
 * Certificate Service for generating and managing crop certificates
 */
class CertificateService {
  /**
   * Generate final crop certificate and pin to IPFS
   */
  async generateCertificate(cropBatchId) {
    try {
      const cropBatch = await CropBatch.findById(cropBatchId)
        .populate('farmerId')
        .populate('selectedDistributorId');

      if (!cropBatch) {
        throw new Error('Crop batch not found');
      }

      // Get price trace
      const priceTrace = await PriceTrace.findOne({ cropBatchId });

      // Build certificate data
      const certificateData = {
        cropId: cropBatch.cropId,
        generatedAt: new Date().toISOString(),
        
        // Farmer Information
        farmer: {
          name: cropBatch.farmerId?.fullName || cropBatch.farmerId?.name,
          farmName: cropBatch.farmerId?.farmName,
          farmerId: cropBatch.farmerId?._id.toString(),
          location: cropBatch.farmerId?.location,
          profileCID: cropBatch.farmerId?.profileCID,
          metamaskAddress: cropBatch.farmerMetamaskAddress
        },
        
        // Distributor Information (if assigned)
        distributor: cropBatch.selectedDistributorId ? {
          name: cropBatch.selectedDistributorId?.fullName || cropBatch.selectedDistributorId?.name,
          companyName: cropBatch.selectedDistributorId?.companyName,
          distributorId: cropBatch.selectedDistributorId?._id.toString(),
          location: cropBatch.selectedDistributorId?.location,
          profileCID: cropBatch.selectedDistributorId?.profileCID,
          metamaskAddress: cropBatch.selectedDistributorId?.metamaskAddress
        } : null,
        
        // Product Details
        product: {
          productName: cropBatch.productName,
          category: cropBatch.category,
          dietLabels: cropBatch.dietLabels,
          quantity: cropBatch.quantity,
          unit: cropBatch.unit,
          harvestDate: cropBatch.harvestDate?.toISOString(),
          images: cropBatch.images,
          videoCID: cropBatch.videoCID
        },
        
        // Quality Information
        quality: {
          soilPH: cropBatch.soilPH,
          moisturePercent: cropBatch.moisturePercent,
          proteinPercent: cropBatch.proteinPercent,
          qualityGrade: cropBatch.qualityGrade,
          pesticideUsed: cropBatch.pesticideUsed,
          labReportCID: cropBatch.labReportCID
        },
        
        // Price Trace
        priceTrace: priceTrace ? {
          farmerSalePrice: priceTrace.farmerSalePrice,
          transportCost: priceTrace.transportCost,
          distributorPurchasePrice: priceTrace.distributorPurchasePrice,
          distributorSalePrice: priceTrace.distributorSalePrice,
          distributorMargin: priceTrace.distributorMargin,
          retailerPurchasePrice: priceTrace.retailerPurchasePrice,
          retailerSalePrice: priceTrace.retailerSalePrice,
          retailerMargin: priceTrace.retailerMargin,
          finalConsumerPrice: priceTrace.finalConsumerPrice
        } : {
          farmerSalePrice: cropBatch.pricePerUnitFarmer
        },
        
        // Timeline (Ledger Entries)
        timeline: cropBatch.history.map(entry => ({
          type: entry.type,
          actorRole: entry.actorRole,
          timestamp: entry.timestamp.toISOString(),
          metadata: entry.metadata,
          blockchainTxHash: entry.blockchainTxHash
        })),
        
        // Blockchain Verification
        blockchain: {
          blockchainRegistered: cropBatch.blockchainRegistered,
          blockchainCropHash: cropBatch.blockchainCropHash,
          badgeId: cropBatch.badgeId
        },
        
        // Status
        status: cropBatch.status,
        
        // Certificate Metadata
        certificateVersion: '1.0',
        issuedBy: 'AgriDirect',
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/public/crop/${cropBatch.cropId}`
      };

      // Pin certificate to IPFS
      const ipfsResult = await IPFSService.uploadJSON(certificateData);

      if (!ipfsResult.success) {
        throw new Error('Failed to upload certificate to IPFS: ' + ipfsResult.error);
      }

      // Update crop batch with certificate CID
      cropBatch.cropCertificateCID = ipfsResult.cid;
      await cropBatch.save();

      return {
        success: true,
        certificateCID: ipfsResult.cid,
        certificateUrl: ipfsResult.gatewayUrl,
        certificateData
      };
    } catch (error) {
      console.error('❌ Generate certificate error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get certificate data from IPFS
   */
  async getCertificate(certificateCID) {
    try {
      const url = IPFSService.getIPFSUrl(certificateCID);
      
      if (!url) {
        throw new Error('Invalid certificate CID');
      }

      // Fetch from IPFS gateway
      const response = await fetch(url.gatewayUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch certificate from IPFS');
      }

      const certificateData = await response.json();
      
      return {
        success: true,
        certificateData,
        certificateUrl: url.gatewayUrl
      };
    } catch (error) {
      console.error('❌ Get certificate error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate badge ID for distributor listing
   */
  generateBadgeId(distributorId, timestamp = new Date()) {
    const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BADGE-${dateStr}-${randomStr}`;
  }

  /**
   * Generate crop ID
   */
  generateCropId(farmerId, timestamp = new Date()) {
    const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '');
    // Get sequence number for the day
    const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FARMER-${dateStr}-${seq}`;
  }

  /**
   * Verify certificate integrity (check blockchain hash matches IPFS CID)
   */
  async verifyCertificate(cropBatchId, blockchainHash) {
    try {
      const cropBatch = await CropBatch.findById(cropBatchId);
      
      if (!cropBatch || !cropBatch.cropCertificateCID) {
        return {
          success: false,
          verified: false,
          error: 'Certificate not found'
        };
      }

      // Hash the certificate CID and compare with blockchain hash
      const { ethers } = await import('ethers');
      const certificateCIDHash = ethers.keccak256(ethers.toUtf8Bytes(cropBatch.cropCertificateCID));
      
      const verified = certificateCIDHash.toLowerCase() === blockchainHash?.toLowerCase();

      return {
        success: true,
        verified,
        certificateCID: cropBatch.cropCertificateCID,
        blockchainHash,
        computedHash: certificateCIDHash
      };
    } catch (error) {
      console.error('❌ Verify certificate error:', error);
      return {
        success: false,
        verified: false,
        error: error.message
      };
    }
  }
}

export default new CertificateService();

