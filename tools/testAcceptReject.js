import mongoose from 'mongoose';
import {DistributorRequest} from '../models/index.js';

(async()=>{
  await mongoose.connect('mongodb://127.0.0.1:27017/agriDirect');
  const req = await DistributorRequest.findOne({status:'pending'}).lean();
  if(!req){ console.log('No pending request'); process.exit(0); }
  console.log('Found pending request:', req._id.toString());
  
  // Test accept endpoint
  try{
    const res = await fetch(`http://localhost:5000/distributor/acceptRequest/${req._id.toString()}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})});
    const data = await res.json();
    console.log('Accept response:', data);
  } catch(e){ console.error('Accept error:', e.message); }
  
  process.exit(0);
})();