# Route Verification & Fixes

## ✅ Backend Routes Status

### Authentication Routes
- ✅ `POST /farmer/register` → redirects to `/api/auth/register/farmer`
- ✅ `POST /api/auth/register/farmer` - Enhanced farmer registration
- ✅ `POST /farmer/login` - Farmer login
- ✅ `POST /distributor/register` → redirects to `/api/auth/register/distributor`
- ✅ `POST /api/auth/register/distributor` - Enhanced distributor registration
- ✅ `POST /distributor/login` - Distributor login
- ✅ `POST /retailer/register` → redirects to `/api/auth/register/retailer`
- ✅ `POST /api/auth/register/retailer` - Enhanced retailer registration
- ✅ `POST /retailer/login` - Retailer login
- ✅ `POST /consumer/register` - Consumer registration
- ✅ `POST /consumer/login` - Consumer login
- ✅ `POST /api/auth/verify-otp` - OTP verification
- ✅ `POST /api/auth/resend-otp` - Resend OTP
- ✅ `POST /api/admin/login` - Admin login

### Farmer Routes
- ✅ `POST /farmer/addProduct/:farmerId` - Add product (legacy, works)
- ✅ `POST /api/farmer/crops` - Create crop batch (new)
- ✅ `GET /farmer/getProducts/:farmerId` - Get farmer products
- ✅ `PUT /farmer/updateProduct/:id` - Update product
- ✅ `DELETE /farmer/deleteProduct/:id` - Delete product
- ✅ `POST /api/farmer/crops/:cropId/select-distributor` - Select distributor
- ✅ `POST /api/farmer/crops/:cropId/logistics-dispatch` - Dispatch logistics
- ✅ `GET /farmer/:id/qr` - Get farmer QR
- ✅ `GET /farmer/getProductType` - Get product types
- ✅ `GET /farmer/distributor-orders/:farmerId` - Get distributor orders

### Distributor Routes
- ✅ `GET /distributors` - Get all distributors
- ✅ `POST /distributor/newRequest` - Create distributor request (legacy)
- ✅ `GET /distributor/getRequests/:id` → redirects to `/api/distributor/notifications`
- ✅ `GET /api/distributor/notifications` - Get notifications
- ✅ `POST /distributor/acceptRequest/:id` → redirects to `/api/distributor/crops/:cropId/accept`
- ✅ `POST /api/distributor/crops/:cropId/accept` - Accept request
- ✅ `POST /distributor/rejectRequest/:id` → redirects to `/api/distributor/crops/:cropId/reject`
- ✅ `POST /api/distributor/crops/:cropId/reject` - Reject request
- ✅ `POST /api/distributor/crops/:cropId/receive` - Receive goods
- ✅ `POST /api/distributor/listings` - Create marketplace listing
- ✅ `GET /api/distributor/marketplace` - Get marketplace listings
- ✅ `POST /distributor/addMarketplaceProduct` - Legacy listing (works)
- ✅ `GET /distributor/stock/:id` - Get distributor stock
- ✅ `POST /distributor/addStock/:id` - Add stock
- ✅ `GET /distributor/ordersToFarmer/:distributorId` - Get orders to farmer
- ✅ `DELETE /distributor/deleteStock/:orderId` - Delete stock
- ✅ `PUT /distributor/updateStock/:stockId` - Update stock
- ✅ `GET /distributor/:id/qr` - Get distributor QR
- ✅ `POST /distributor/checkMarketplace` - Check marketplace

### Retailer Routes
- ✅ `POST /retailer/order` → redirects to `/api/retailer/orders`
- ✅ `POST /api/retailer/orders` - Place order
- ✅ `GET /retailer/orders/:retailerId` → should use `/api/retailer/orders?retailerId=`
- ✅ `GET /api/retailer/orders` - Get retailer orders
- ✅ `POST /api/retailer/orders/:orderId/confirm-receipt` - Confirm receipt
- ✅ `DELETE /retailer/orders/:orderId` - Delete order
- ✅ `POST /retailer/add-marketplace` - Add to retailer marketplace
- ✅ `GET /api/consumer/retailer-products` - Get retailer products

### Product/Marketplace Routes
- ✅ `GET /products` - Get all products
- ✅ `GET /marketplace/all` - Get marketplace products
- ✅ `GET /product/:id/view` - View product (legacy)
- ✅ `GET /api/public/crop/:cropId` - Public crop view (new)
- ✅ `GET /product/:id/qr` - Get product QR

### Order Routes
- ✅ `POST /orders` - Create order (distributor to farmer)
- ✅ `GET /orders?consumerId=` - Get consumer orders

### Admin Routes
- ✅ `GET /api/admin/pending-verifications` - Get pending verifications
- ✅ `POST /api/admin/verify/farmer/:farmerId` - Verify farmer
- ✅ `POST /api/admin/verify/distributor/:distributorId` - Verify distributor
- ✅ `POST /api/admin/verify/retailer/:retailerId` - Verify retailer

### AI Routes
- ✅ `POST /api/ai/chat` - AI chat assistant

## ⚠️ Issues Found & Fixes Needed

### 1. Missing Route: GET /retailer/orders/:retailerId
**Issue**: Frontend calls `GET /retailer/orders/:retailerId` but backend has `GET /api/retailer/orders`
**Fix**: Add legacy route redirect

### 2. Missing Route: GET /farmer/notifyReject/:farmerId
**Issue**: Frontend calls this but route doesn't exist
**Fix**: Add notification route or remove frontend call

### 3. Response Format Inconsistency
**Issue**: Some routes return `{status: "success"}` while others return `{success: true}`
**Fix**: Standardize response format (prefer `{success: true/false}`)

### 4. Missing Field: distributor.phone
**Issue**: Frontend expects `phone` field but backend has `mobileNumber`
**Fix**: Update backend response or frontend

