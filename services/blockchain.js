import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Blockchain Service for interacting with AgriRegistry smart contract
 */
class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.network = process.env.NETWORK || 'localhost';
    
    this.initializeProvider();
  }

  /**
   * Initialize Ethereum provider
   */
  initializeProvider() {
    try {
      if (this.network === 'localhost') {
        this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      } else if (this.network === 'sepolia') {
        this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      } else if (this.network === 'polygon') {
        this.provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
      }

      // Initialize signer if private key is provided (for admin operations)
      if (process.env.PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      }

      // Load contract ABI
      this.loadContract();
    } catch (error) {
      console.error('❌ Blockchain initialization error:', error);
    }
  }

  /**
   * Load contract ABI and create contract instance
   */
  loadContract() {
    try {
      // Try to load from artifacts (after compilation)
      const artifactsPath = path.join(__dirname, '../artifacts/contracts/AgriRegistry.sol/AgriRegistry.json');
      
      if (fs.existsSync(artifactsPath)) {
        const contractArtifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf-8'));
        this.contractABI = contractArtifact.abi;
        
        if (this.contractAddress && this.signer) {
          this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
        }
      } else {
        console.warn('⚠️ Contract artifacts not found. Please compile contracts first.');
      }
    } catch (error) {
      console.error('❌ Error loading contract:', error);
    }
  }

  /**
   * Get contract instance with a specific signer (for user transactions)
   */
  getContractWithSigner(signer) {
    if (!this.contractABI || !this.contractAddress) {
      console.warn('⚠️ Contract not initialized. Returning null.');
      return null;
    }
    return new ethers.Contract(this.contractAddress, this.contractABI, signer);
  }

  /**
   * Hash a string using keccak256 (for on-chain storage)
   */
  hashString(str) {
    return ethers.keccak256(ethers.toUtf8Bytes(str));
  }

  /**
   * Hash IPFS CID for on-chain storage
   */
  hashCID(cid) {
    return ethers.keccak256(ethers.toUtf8Bytes(cid));
  }

  /**
   * Register farmer on blockchain (called by admin after verification)
   */
  async registerFarmer(farmerAddress, profileHash, profileCIDHash) {
    try {
      if (!this.contract) {
        console.warn('⚠️ Contract not initialized. Blockchain registration skipped.');
        return {
          success: false,
          error: 'Contract not initialized. System will continue without blockchain registration.',
          skipped: true
        };
      }

      const tx = await this.contract.registerFarmer(
        farmerAddress,
        profileHash,
        profileCIDHash
      );

      await tx.wait();
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain registration failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Register distributor on blockchain
   */
  async registerDistributor(distributorAddress, profileHash, profileCIDHash) {
    try {
      if (!this.contract) {
        console.warn('⚠️ Contract not initialized. Blockchain registration skipped.');
        return {
          success: false,
          error: 'Contract not initialized. System will continue without blockchain registration.',
          skipped: true
        };
      }

      const tx = await this.contract.registerDistributor(
        distributorAddress,
        profileHash,
        profileCIDHash
      );

      await tx.wait();
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain registration failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Register retailer on blockchain
   */
  async registerRetailer(retailerAddress, profileHash, profileCIDHash) {
    try {
      if (!this.contract) {
        console.warn('⚠️ Contract not initialized. Blockchain registration skipped.');
        return {
          success: false,
          error: 'Contract not initialized. System will continue without blockchain registration.',
          skipped: true
        };
      }

      const tx = await this.contract.registerRetailer(
        retailerAddress,
        profileHash,
        profileCIDHash
      );

      await tx.wait();
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain registration failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Create crop on blockchain
   */
  async createCrop(cropId, certificateCID, signer) {
    try {
      if (!this.contractABI || !this.contractAddress) {
        console.warn('⚠️ Contract not initialized. Blockchain crop creation skipped.');
        return {
          success: false,
          error: 'Contract not initialized',
          skipped: true
        };
      }
      const contract = this.getContractWithSigner(signer);
      
      const tx = await contract.createCrop(cropId, certificateCID);
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash,
        cropHash: this.hashString(cropId + certificateCID)
      };
    } catch (error) {
      console.warn('⚠️ Blockchain crop creation failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Assign distributor to crop
   */
  async assignDistributor(cropHash, signer) {
    try {
      const contract = this.getContractWithSigner(signer);
      if (!contract) {
        return {
          success: false,
          error: 'Contract not initialized',
          skipped: true
        };
      }
      
      const tx = await contract.assignDistributor(cropHash);
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain assign distributor failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Record logistics dispatch
   */
  async recordLogisticsDispatch(cropHash, vehicleNumber, toAddress, signer) {
    try {
      const contract = this.getContractWithSigner(signer);
      if (!contract) {
        return {
          success: false,
          error: 'Contract not initialized',
          skipped: true
        };
      }
      
      const tx = await contract.recordLogisticsDispatch(
        cropHash,
        vehicleNumber,
        toAddress
      );
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain logistics dispatch failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Record logistics receive
   */
  async recordLogisticsReceive(cropHash, signer) {
    try {
      const contract = this.getContractWithSigner(signer);
      if (!contract) {
        return {
          success: false,
          error: 'Contract not initialized',
          skipped: true
        };
      }
      
      const tx = await contract.recordLogisticsReceive(cropHash);
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain logistics receive failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Record crop processing
   */
  async recordProcessing(cropHash, signer) {
    try {
      const contract = this.getContractWithSigner(signer);
      if (!contract) {
        return {
          success: false,
          error: 'Contract not initialized',
          skipped: true
        };
      }
      
      const tx = await contract.recordProcessing(cropHash);
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain processing record failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * List crop in marketplace
   */
  async listCrop(cropHash, price, badgeId, certificateCID, signer) {
    try {
      const contract = this.getContractWithSigner(signer);
      if (!contract) {
        return {
          success: false,
          error: 'Contract not initialized',
          skipped: true
        };
      }
      
      const tx = await contract.listCrop(
        cropHash,
        price,
        badgeId,
        certificateCID
      );
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain list crop failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Buy crop (retailer purchase)
   */
  async buyCrop(cropHash, price, signer) {
    try {
      const contract = this.getContractWithSigner(signer);
      if (!contract) {
        return {
          success: false,
          error: 'Contract not initialized',
          skipped: true
        };
      }
      
      const tx = await contract.buyCrop(cropHash, price);
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.warn('⚠️ Blockchain buy crop failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Get crop details from blockchain
   */
  async getCrop(cropHash) {
    try {
      if (!this.contract) {
        console.warn('⚠️ Contract not initialized. Cannot fetch crop from blockchain.');
        return {
          success: false,
          error: 'Contract not initialized',
          skipped: true
        };
      }

      const crop = await this.contract.getCrop(cropHash);
      return {
        success: true,
        crop: {
          cropHash: crop.cropHash,
          farmerAddress: crop.farmerAddress,
          certificateCIDHash: crop.certificateCIDHash,
          currentOwner: crop.currentOwner,
          status: crop.status,
          createdAt: new Date(Number(crop.createdAt) * 1000),
          updatedAt: new Date(Number(crop.updatedAt) * 1000)
        }
      };
    } catch (error) {
      console.warn('⚠️ Get crop from blockchain failed (non-critical):', error.message);
      return {
        success: false,
        error: error.message,
        skipped: true
      };
    }
  }

  /**
   * Check if address is verified farmer
   */
  async isFarmerVerified(farmerAddress) {
    try {
      if (!this.contract) {
        return false; // Return false if contract not initialized (non-blocking)
      }
      return await this.contract.isFarmerVerified(farmerAddress);
    } catch (error) {
      console.warn('⚠️ Check farmer verification failed (non-critical):', error.message);
      return false;
    }
  }

  /**
   * Check if address is verified distributor
   */
  async isDistributorVerified(distributorAddress) {
    try {
      if (!this.contract) {
        return false; // Return false if contract not initialized (non-blocking)
      }
      return await this.contract.isDistributorVerified(distributorAddress);
    } catch (error) {
      console.warn('⚠️ Check distributor verification failed (non-critical):', error.message);
      return false;
    }
  }

  /**
   * Check if address is verified retailer
   */
  async isRetailerVerified(retailerAddress) {
    try {
      if (!this.contract) {
        return false; // Return false if contract not initialized (non-blocking)
      }
      return await this.contract.isRetailerVerified(retailerAddress);
    } catch (error) {
      console.warn('⚠️ Check retailer verification failed (non-critical):', error.message);
      return false;
    }
  }

  /**
   * Get signer from private key or wallet
   */
  getSignerFromPrivateKey(privateKey) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Get signer from MetaMask (for frontend)
   * This should be called from frontend with window.ethereum
   */
  async getSignerFromMetaMask() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found');
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return signer;
  }
}

export default new BlockchainService();

