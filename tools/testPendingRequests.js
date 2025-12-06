import mongoose from 'mongoose';
import {Distributor, DistributorRequest} from '../models/index.js';

(async() => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/agriDirect');
    
    // Get the first distributor
    const distributor = await Distributor.findOne().lean();
    if (!distributor) {
      console.log('No distributor found in DB');
      process.exit(0);
    }
    
    const distributorId = distributor._id.toString();
    console.log('Testing with distributorId:', distributorId);
    console.log('Distributor name:', distributor.companyName || distributor.fullName);
    
    // Check if there are pending requests for this distributor
    const count = await DistributorRequest.countDocuments({
      distributorId: distributor._id,
      status: 'pending'
    });
    console.log('Pending requests for this distributor:', count);
    
    // Test the endpoint
    console.log('\nTesting GET /distributor/getRequests/' + distributorId + '\n');
    const response = await fetch(`http://localhost:5000/distributor/getRequests/${distributorId}`);
    const data = await response.json();
    
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.requests && data.requests.length > 0) {
      console.log('\n✅ SUCCESS! Found', data.requests.length, 'pending requests');
      console.log('First request:', JSON.stringify(data.requests[0], null, 2));
    } else {
      console.log('\n⚠️  No pending requests returned (this may be expected if none exist for this distributor)');
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
})();
