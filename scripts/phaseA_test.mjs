import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import mongoose from 'mongoose';
import EventLedgerService from '../services/eventLedger.js';
import CertificateService from '../services/certificate.js';
import fetch from 'node-fetch';

import {
  Farmer,
  Distributor,
  CropBatch,
  DistributorRequest,
  EventLedger
} from '../models/index.js';

async function main() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/agriDirect');
    console.log('Connected to MongoDB for test script');

    // Create test farmer
    const farmer = new Farmer({
      fullName: 'Test Farmer',
      farmName: 'Test Farm',
      location: {
        addressLine1: '1 Test Rd',
        city: 'TestCity',
        district: 'TestDistrict',
        state: 'TestState',
        pincode: '123456'
      },
      email: `testfarmer${Date.now()}@example.com`,
      mobileNumber: `99999${Math.floor(Math.random()*90000)+10000}`,
      passwordHash: 'testhash',
      farmingExperienceYears: 1
    });
    await farmer.save();
    console.log('Created farmer:', farmer._id.toString());

    // Create test distributor
    const distributor = new Distributor({
      fullName: 'Test Distributor',
      companyName: 'Test Dist Co',
      companyGSTNumber: 'GSTTEST1234',
      location: {
        addressLine1: '10 Dist Rd',
        city: 'DistCity',
        district: 'DistDistrict',
        state: 'DistState',
        pincode: '654321'
      },
      email: `testdist${Date.now()}@example.com`,
      mobileNumber: `88888${Math.floor(Math.random()*90000)+10000}`,
      passwordHash: 'testhash',
      distributorCertificateCID: 'QmTestDistCert'
    });
    await distributor.save();
    console.log('Created distributor:', distributor._id.toString());

    // Create crop batch
    const cropId = CertificateService.generateCropId(farmer._id.toString());
    const cropBatch = new CropBatch({
      cropId,
      farmerId: farmer._id,
      productName: 'Test Crop',
      category: 'grains',
      images: ['QmTestImageCid'],
      imageCID: 'QmTestImageCid',
      quantity: 100,
      unit: 'kg',
      pricePerUnitFarmer: 100,
      harvestDate: new Date(),
      status: 'created'
    });
    cropBatch.history.push({ type: 'batchCreated', actorId: farmer._id, actorRole: 'Farmer', timestamp: new Date(), metadata: { productName: 'Test Crop' } });
    await cropBatch.save();
    console.log('Created cropBatch:', cropBatch._id.toString(), 'cropId:', cropId);

    // Create PRODUCT_CREATED block
    const created = await EventLedgerService.createEventBlock({
      productId: cropId,
      cropBatchId: cropBatch._id,
      eventType: 'PRODUCT_CREATED',
      eventData: { productName: 'Test Crop', category: 'grains', quantity: 100 },
      actorId: farmer._id,
      actorRole: 'Farmer'
    });
    console.log('PRODUCT_CREATED:', created.success, created.blockHash || created.error);

    // Create distributor request
    const distReq = new DistributorRequest({
      farmerId: farmer._id,
      distributorId: distributor._id,
      cropBatchId: cropBatch._id,
      status: 'pending'
    });
    await distReq.save();
    console.log('Created DistributorRequest', distReq._id.toString());

    // Create SENT_TO_DISTRIBUTOR block
    const sent = await EventLedgerService.createEventBlock({
      productId: cropId,
      cropBatchId: cropBatch._id,
      eventType: 'SENT_TO_DISTRIBUTOR',
      eventData: { distributorId: distributor._id.toString(), requestId: distReq._id.toString() },
      actorId: farmer._id,
      actorRole: 'Farmer'
    });
    console.log('SENT_TO_DISTRIBUTOR:', sent.success, sent.blockHash || sent.error);

    // Wait for server to be available, then query the API endpoint for distributor requests
    const url = `http://localhost:5000/distributor/getRequests/${distributor._id.toString()}`;
    console.log('Waiting for server then querying', url);

    // simple retry loop
    async function waitForUrl(u, attempts = 10, delayMs = 1000) {
      for (let i = 0; i < attempts; i++) {
        try {
          const r = await fetch(u, { method: 'GET' });
          if (r.ok) return r;
        } catch (e) {
          // ignore and retry
        }
        await new Promise(res => setTimeout(res, delayMs));
      }
      throw new Error('Server did not respond at ' + u);
    }

    const resp = await waitForUrl(url, 15, 1000);
    const json = await resp.json();
    console.log('GET /distributor/getRequests response:', JSON.stringify(json, null, 2));

    console.log('Phase A test completed');
    process.exit(0);
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
}

main();
