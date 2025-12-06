import mongoose from 'mongoose';
import {Distributor,CropBatch,DistributorRequest,EventLedger} from '../models/index.js';

async function main(){
  await mongoose.connect('mongodb://127.0.0.1:27017/agriDirect');
  const distributor = await Distributor.findOne().lean();
  if(!distributor){ console.error('No distributor found'); process.exit(1); }
  const requests = await DistributorRequest.find({ distributorId: distributor._id, status: 'pending' })
    .populate('farmerId','fullName farmName location email mobileNumber')
    .populate('cropBatchId')
    .sort({createdAt:-1});

  console.log('found requests:', requests.length);
  const transformed = [];
  for(const r of requests){
    const farmer = r.farmerId || null;
    const crop = r.cropBatchId || null;
    let image = null;
    if(crop){
      if(crop.imageCID){
        image = `http://localhost:5000/ipfs/${crop.imageCID}`;
      } else if(Array.isArray(crop.images) && crop.images.length>0){
        image = `http://localhost:5000/uploads/${crop.images[0]}`;
      }
    }

    let latestEvent = null;
    if(crop && crop._id){
      latestEvent = await EventLedger.findOne({cropBatchId: crop._id}).sort({timestamp:-1}).lean();
    }

    transformed.push({
      _id: r._id,
      farmerId: {
        _id: farmer?._id,
        name: farmer?.fullName,
        farmName: farmer?.farmName,
        location: farmer?.location,
        email: farmer?.email,
        mobileNumber: farmer?.mobileNumber
      },
      productId: {
        _id: crop?._id,
        name: crop?.productName || crop?.name || null,
        quantity: crop?.quantity || null,
        price: crop?.pricePerUnitFarmer || crop?.price || null,
        category: crop?.category || null,
        cropId: crop?.cropId || null,
        image
      },
      eventLedger: latestEvent ? {
        _id: latestEvent._id,
        eventType: latestEvent.eventType,
        cid: latestEvent.cid,
        previousHash: latestEvent.previousHash,
        currentHash: latestEvent.currentHash,
        timestamp: latestEvent.timestamp,
        actorId: latestEvent.actorId,
        actorRole: latestEvent.actorRole
      } : null,
      status: r.status,
      createdAt: r.createdAt
    });
  }

  console.log(JSON.stringify(transformed,null,2));
  process.exit(0);
}

main().catch(e=>{console.error(e);process.exit(1);});