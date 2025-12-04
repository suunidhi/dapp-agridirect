import fs from 'fs';
import path from 'path';
import https from 'https';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * IPFS Service for uploading files and JSON to IPFS via Pinata
 */
class IPFSService {
  constructor() {
    // Ensure Pinata keys are present
    if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_KEY) {
      throw new Error('Pinata API keys are not configured. Please set PINATA_API_KEY and PINATA_SECRET_KEY in .env file');
    }

    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataGateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

    console.log('✅ IPFS Service: Using Pinata');
    console.log('   API Key:', this.pinataApiKey.substring(0, 10) + '...');
  }

  /**
   * Upload file to Pinata
   */
  async uploadToPinata(filePath, fileName) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileStats = fs.statSync(filePath);
      
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'application/octet-stream'
      });

      const metadata = JSON.stringify({
        name: fileName,
        keyvalues: { uploadedAt: new Date().toISOString() }
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({ cidVersion: 0 });
      formData.append('pinataOptions', options);

      const formHeaders = formData.getHeaders();
      const headers = {
        ...formHeaders,
        'pinata_api_key': this.pinataApiKey,
        'pinata_secret_api_key': this.pinataSecretKey,
      };

      console.log('📤 Uploading to Pinata:', fileName);
      console.log('   File size:', fileStats.size, 'bytes');

      const data = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.pinata.cloud',
          path: '/pinning/pinFileToIPFS',
          method: 'POST',
          headers: headers
        }, (res) => {
          let responseData = '';
          res.on('data', chunk => responseData += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try { resolve(JSON.parse(responseData)); } 
              catch (e) { reject(new Error(`Failed to parse response: ${e.message}`)); }
            } else {
              reject(new Error(`Pinata API error (${res.statusCode}): ${responseData}`));
            }
          });
        });

        req.on('error', error => reject(new Error(`Request failed: ${error.message}`)));
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
      return { success: false, error: error.message || 'Unknown Pinata upload error' };
    }
  }

  /**
   * Upload local file
   */
  async uploadFile(filePath) {
    const fileName = path.basename(filePath);
    return this.uploadToPinata(filePath, fileName);
  }

  /**
   * Upload buffer
   */
  async uploadBuffer(buffer, fileName = 'file') {
    try {
      const tempPath = path.join(__dirname, '../uploads/temp', `${Date.now()}-${fileName}`);
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(tempPath, buffer);

      const result = await this.uploadToPinata(tempPath, fileName);

      // Clean up
      try { fs.unlinkSync(tempPath); } catch (e) {}

      return result;
    } catch (error) {
      console.error('❌ IPFS buffer upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload JSON object
   */
  async uploadJSON(jsonObject) {
    const buffer = Buffer.from(JSON.stringify(jsonObject), 'utf-8');
    return this.uploadBuffer(buffer, 'data.json');
  }

  /**
   * Pin certificate (alias for uploadJSON)
   */
  async pinCertificate(certificateData) {
    return this.uploadJSON(certificateData);
  }

  /**
   * Get IPFS URL from CID
   */
  getIPFSUrl(cid) {
    if (!cid) return null;
    const cleanCid = cid.replace('ipfs://', '');
    return {
      ipfsUrl: `ipfs://${cleanCid}`,
      gatewayUrl: `${this.pinataGateway}${cleanCid}`
    };
  }
}

export default new IPFSService();