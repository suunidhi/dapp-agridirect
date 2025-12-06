import mongoose from 'mongoose';
import {DistributorRequest} from '../models/index.js';
(async()=>{
  await mongoose.connect('mongodb://127.0.0.1:27017/agriDirect');
  const total = await DistributorRequest.countDocuments();
  const pending = await DistributorRequest.countDocuments({status:'pending'});
  console.log('total requests:', total, 'pending:', pending);
  const docs = await DistributorRequest.find({status:'pending'}).limit(20).lean();
  console.log(docs.map(d=>({id:d._id, farmerId:d.farmerId, distributorId:d.distributorId, cropBatchId:d.cropBatchId, createdAt:d.createdAt})));
  process.exit(0);
})();