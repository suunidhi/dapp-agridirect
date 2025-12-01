# Frontend-Backend Route Mapping & Fixes

## 🔍 Route Analysis

### Frontend Routes → Backend Routes Mapping

#### ✅ Working Routes (Already Compatible)
1. **Farmer Registration**
   - Frontend: `POST /farmer/register`
   - Backend: `POST /farmer/register` → redirects to `/api/auth/register/farmer`
   - Status: ✅ Working

2. **Farmer Login**
   - Frontend: `POST /farmer/login`
   - Backend: `POST /farmer/login`
   - Status: ✅ Working

3. **Add Product**
   - Frontend: `POST /farmer/addProduct/:farmerId`
   - Backend: `POST /farmer/addProduct/:farmerId` (legacy) + `POST /api/farmer/crops` (new)
   - Status: ✅ Working (needs update to new endpoint)

4. **Get Distributors**
   - Frontend: `GET /distributors`
   - Backend: `GET /distributors`
   - Status: ✅ Working

5. **Distributor Request**
   - Frontend: `POST /distributor/newRequest`
   - Backend: `POST /distributor/newRequest` (legacy) + `POST /api/farmer/crops/:cropId/select-distributor` (new)
   - Status: ✅ Working (needs update)

#### ⚠️ Routes That Need Updates

1. **Get Distributor Requests**
   - Frontend: `GET /distributor/getRequests/:id`
   - Backend: `GET /api/distributor/notifications` (new)
   - Status: ⚠️ Needs frontend update

2. **Accept/Reject Request**
   - Frontend: `POST /distributor/acceptRequest/:id`
   - Backend: `POST /api/distributor/crops/:cropId/accept` (new)
   - Status: ⚠️ Needs frontend update

3. **Get Products**
   - Frontend: `GET /farmer/getProducts/:farmerId`
   - Backend: `GET /farmer/getProducts/:farmerId`
   - Status: ✅ Working

4. **Get Marketplace Products**
   - Frontend: `GET /marketplace/all`
   - Backend: `GET /marketplace/all` (legacy) + `GET /api/distributor/marketplace` (new)
   - Status: ✅ Working

5. **Retailer Order**
   - Frontend: `POST /retailer/order`
   - Backend: `POST /api/retailer/orders` (new)
   - Status: ⚠️ Needs frontend update

6. **Get Retailer Orders**
   - Frontend: `GET /retailer/orders/:retailerId`
   - Backend: `GET /api/retailer/orders` (new)
   - Status: ⚠️ Needs frontend update

## 🔧 Required Fixes

### 1. Update Frontend to Use New API Endpoints
### 2. Ensure All Legacy Routes Redirect Properly
### 3. Add Missing Error Handling
### 4. Update Response Format Handling

