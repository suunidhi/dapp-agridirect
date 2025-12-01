import { create } from 'ipfs-http-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import FormData from 'form-data';
import https from 'https';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * IPFS Service for uploading files and JSON to IPFS
 * Uses Pinata or public IPFS gateway
 */
class IPFSService {
  constructor() {
    // Initialize IPFS client
    // Option 1: Use Pinata (recommended for production)
    if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
      this.usePinata = true;
      this.pinataApiKey = process.env.PINATA_API_KEY;
      this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
      this.pinataGateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
      console.log('✅ IPFS Service: Using Pinata');
      console.log('   API Key:', this.pinataApiKey.substring(0, 10) + '...');
    } else {
      // Option 2: Use public IPFS node
      this.usePinata = false;
      console.warn('⚠️ IPFS Service: Pinata keys not found in .env file');
      console.warn('   Looking for: PINATA_API_KEY and PINATA_SECRET_KEY');
      console.warn('   Falling back to IPFS node (requires authentication)');
      const ipfsNode = process.env.IPFS_NODE || 'https://ipfs.infura.io:5001';
      try {
        this.ipfs = create({
          url: ipfsNode,
          headers: {
            authorization: process.env.IPFS_AUTH ? `Basic ${process.env.IPFS_AUTH}` : undefined
          }
        });
        console.log('⚠️ IPFS Service: Using IPFS node (may require authentication)');
      } catch (error) {
        console.error('❌ IPFS initialization error:', error);
        this.ipfs = null;
        console.warn('⚠️ IPFS Service: No IPFS configuration available. Please set PINATA_API_KEY and PINATA_SECRET_KEY in .env file');
      }
    }
  }

  /**
   * Upload file to IPFS using Pinata
   */
  async uploadToPinata(filePath, fileName) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Validate API keys
      if (!this.pinataApiKey || !this.pinataSecretKey) {
        throw new Error('Pinata API keys are not configured. Please set PINATA_API_KEY and PINATA_SECRET_KEY in .env file');
      }

      // Read file as buffer
      const fileBuffer = fs.readFileSync(filePath);
      const fileStats = fs.statSync(filePath);
      
      const formData = new FormData();
      
      // Append file buffer with filename - form-data v4 syntax
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'application/octet-stream'
      });
      
      const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
          uploadedAt: new Date().toISOString()
        }
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append('pinataOptions', options);

      // Get headers from form-data (includes boundary)
      // form-data.getHeaders() returns Content-Type with boundary
      const formHeaders = formData.getHeaders();
      const headers = {
        ...formHeaders,
        'pinata_api_key': this.pinataApiKey,
        'pinata_secret_api_key': this.pinataSecretKey,
      };

      console.log('📤 Uploading to Pinata:', fileName);
      console.log('   File size:', fileStats.size, 'bytes');
      console.log('   API Key:', this.pinataApiKey.substring(0, 10) + '...');
      
      // Use https module instead of fetch for better form-data compatibility
      const data = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.pinata.cloud',
          path: '/pinning/pinFileToIPFS',
          method: 'POST',
          headers: headers
        }, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(responseData));
              } catch (e) {
                reject(new Error(`Failed to parse response: ${e.message}`));
              }
            } else {
              reject(new Error(`Pinata API error (${res.statusCode}): ${responseData}`));
            }
          });
        });
        
        req.on('error', (error) => {
          reject(new Error(`Request failed: ${error.message}`));
        });
        
        formData.pipe(req);
      });
      
      if (data.IpfsHash) {
        console.log('✅ Pinata upload successful:', data.IpfsHash);
        return {
          success: true,
          cid: data.IpfsHash,
          ipfsUrl: `ipfs://${data.IpfsHash}`,
          gatewayUrl: `${this.pinataGateway}${data.IpfsHash}`
        };
      } else {
        throw new Error('Pinata upload failed: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('❌ Pinata upload error:', error.message);
      console.error('   File path:', filePath);
      console.error('   Error details:', error);
      return {
        success: false,
        error: error.message || 'Unknown Pinata upload error'
      };
    }
  }

  /**
   * Upload file buffer to IPFS
   */
  async uploadFile(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      if (this.usePinata) {
        const fileName = path.basename(filePath);
        return await this.uploadToPinata(filePath, fileName);
      }

      if (!this.ipfs) {
        throw new Error('IPFS client not initialized. Please configure PINATA_API_KEY and PINATA_SECRET_KEY in .env file, or set up IPFS_NODE.');
      }

      console.log('📤 Uploading to IPFS node:', filePath);
      const file = fs.readFileSync(filePath);
      const result = await this.ipfs.add(file);
      
      console.log('✅ IPFS upload successful:', result.cid.toString());
      return {
        success: true,
        cid: result.cid.toString(),
        ipfsUrl: `ipfs://${result.cid.toString()}`,
        gatewayUrl: `https://ipfs.io/ipfs/${result.cid.toString()}`
      };
    } catch (error) {
      console.error('❌ IPFS file upload error:', error.message);
      console.error('   File path:', filePath);
      console.error('   Error details:', error);
      return {
        success: false,
        error: error.message || 'Unknown IPFS upload error'
      };
    }
  }

  /**
   * Upload buffer directly to IPFS
   */
  async uploadBuffer(buffer, fileName = 'file') {
    try {
      if (this.usePinata) {
        // For Pinata, we need to save to temp file first
        const tempPath = path.join(__dirname, '../uploads/temp', `${Date.now()}-${fileName}`);
        const tempDir = path.dirname(tempPath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        fs.writeFileSync(tempPath, buffer);
        
        const result = await this.uploadToPinata(tempPath, fileName);
        
        // Clean up temp file
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        return result;
      }

      if (!this.ipfs) {
        throw new Error('IPFS client not initialized');
      }

      const result = await this.ipfs.add(buffer);
      
      return {
        success: true,
        cid: result.cid.toString(),
        ipfsUrl: `ipfs://${result.cid.toString()}`,
        gatewayUrl: `https://ipfs.io/ipfs/${result.cid.toString()}`
      };
    } catch (error) {
      console.error('❌ IPFS buffer upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload JSON object to IPFS
   */
  async uploadJSON(jsonObject) {
    try {
      const jsonString = JSON.stringify(jsonObject);
      const buffer = Buffer.from(jsonString, 'utf-8');
      
      if (this.usePinata) {
        const tempPath = path.join(__dirname, '../uploads/temp', `json-${Date.now()}.json`);
        const tempDir = path.dirname(tempPath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        fs.writeFileSync(tempPath, buffer);
        
        const result = await this.uploadToPinata(tempPath, 'data.json');
        
        // Clean up
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {}
        
        return result;
      }

      if (!this.ipfs) {
        throw new Error('IPFS client not initialized');
      }

      const result = await this.ipfs.add(jsonString);
      
      return {
        success: true,
        cid: result.cid.toString(),
        ipfsUrl: `ipfs://${result.cid.toString()}`,
        gatewayUrl: `https://ipfs.io/ipfs/${result.cid.toString()}`
      };
    } catch (error) {
      console.error('❌ IPFS JSON upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Pin JSON to IPFS (for certificates)
   */
  async pinCertificate(certificateData) {
    return await this.uploadJSON(certificateData);
  }

  /**
   * Get IPFS URL from CID
   */
  getIPFSUrl(cid) {
    if (!cid) return null;
    
    // Remove ipfs:// prefix if present
    const cleanCid = cid.replace('ipfs://', '');
    
    if (this.usePinata) {
      return {
        ipfsUrl: `ipfs://${cleanCid}`,
        gatewayUrl: `${this.pinataGateway}${cleanCid}`
      };
    }
    
    return {
      ipfsUrl: `ipfs://${cleanCid}`,
      gatewayUrl: `https://ipfs.io/ipfs/${cleanCid}`
    };
  }
}

export default new IPFSService();

