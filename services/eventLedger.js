import crypto from 'crypto';
import IPFSService from './ipfs.js';
import { EventLedger } from '../models/index.js';

class EventLedgerService {
  /**
   * Generate SHA256 hash of data
   */
  generateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get previous block hash for a product
   */
  async getPreviousBlockHash(productId, cropBatchId) {
    const lastBlock = await EventLedger.findOne({
      $or: [
        { productId },
        { cropBatchId }
      ]
    }).sort({ timestamp: -1 });

    return lastBlock ? lastBlock.currentHash : null;
  }

  /**
   * Create event block and save to ledger
   */
  async createEventBlock({
    productId,
    cropBatchId,
    eventType,
    eventData,
    actorId,
    actorRole
  }) {
    try {
      const timestamp = new Date();

      const eventJSON = {
        productId,
        cropBatchId: cropBatchId?.toString(),
        eventType,
        eventData,
        timestamp: timestamp.toISOString(),
        actorId: actorId?.toString(),
        actorRole
      };

      const ipfsResult = await IPFSService.uploadJSON(eventJSON);
      
      if (!ipfsResult.success || !ipfsResult.cid) {
        throw new Error(`IPFS upload failed: ${ipfsResult.error || 'Unknown error'}`);
      }

      const previousHash = await this.getPreviousBlockHash(productId, cropBatchId);

      const blockData = {
        productId,
        cropBatchId: cropBatchId?.toString(),
        eventType,
        cid: ipfsResult.cid,
        previousHash,
        timestamp: timestamp.toISOString(),
        actorId: actorId?.toString(),
        actorRole
      };

      const blockDataString = JSON.stringify(blockData);
      const currentHash = this.generateHash(blockDataString);

      const eventBlock = new EventLedger({
        productId,
        cropBatchId,
        eventType,
        cid: ipfsResult.cid,
        previousHash,
        currentHash,
        timestamp,
        actorId,
        actorRole
      });

      await eventBlock.save();

      return {
        success: true,
        block: eventBlock,
        eventCID: ipfsResult.cid,
        blockHash: currentHash
      };
    } catch (error) {
      console.error('❌ Event block creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update product/cropBatch with latest block hash
   */
  async updateLatestBlockHash(productId, cropBatchId, blockHash) {
    try {
      if (cropBatchId) {
        const { CropBatch } = await import('../models/index.js');
        await CropBatch.findByIdAndUpdate(cropBatchId, { latestBlockHash: blockHash });
      }
      if (productId) {
        const { Product } = await import('../models/index.js');
        await Product.updateOne(
          { $or: [{ _id: productId }, { name: productId }] },
          { latestBlockHash: blockHash }
        );
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Update latest block hash error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EventLedgerService();



