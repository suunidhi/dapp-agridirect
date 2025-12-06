import mongoose from 'mongoose';
import {Distributor,CropBatch,DistributorRequest} from '../models/index.js';

(async()=>{
  try{
    await mongoose.connect('mongodb://127.0.0.1:27017/agriDirect');
    const distributors = await Distributor.find({}).lean();
    if(!distributors.length){ console.error('No distributors'); process.exit(1); }
    const crop = await CropBatch.findOne({latestBlockHash:{$exists:true}}).sort({createdAt:-1}).lean();
    if(!crop){ console.error('No crop with event'); process.exit(1); }
    for(const d of distributors){
      const exists = await DistributorRequest.findOne({distributorId: d._id, cropBatchId: crop._id, status:'pending'});
      if(!exists){
        const r = new DistributorRequest({farmerId: crop.farmerId, distributorId: d._id, cropBatchId: crop._id, offeredPrice: Math.max(1, Math.round((crop.pricePerUnitFarmer||10)*1.1)), status:'pending'});
        await r.save();
        console.log('Created request for distributor', d._id.toString());
      } else {
        console.log('Already exists for', d._id.toString());
      }
    }
    process.exit(0);
  }catch(e){ console.error(e); process.exit(1); }
})();