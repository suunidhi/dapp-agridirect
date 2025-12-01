# AgriDirect - Complete Implementation Specification

## Project Overview

**AgriDirect** is a blockchain-based transparent supply chain system for agricultural produce that tracks products from farmer → distributor → retailer → consumer with full traceability, pricing transparency, and tamper-proof verification.

### Core Objectives

1. **Transparency**: Every price change, transaction, and logistics movement is recorded
2. **Traceability**: Complete journey from farm to consumer via QR codes
3. **Fair Pricing**: Dynamic pricing model ensures farmers get fair prices
4. **Verification**: Blockchain-backed certificates prevent fraud
5. **Trust**: Immutable ledger entries for all stakeholders

### Technology Stack

- **Blockchain**: Ethereum (Solidity + Hardhat)
- **Storage**: IPFS (Pinata/Infura) for documents and media
- **Backend**: Node.js + Express
- **Database**: MongoDB (MongoDB Atlas)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **AI Services**: Python Flask (for crop guidance and pricing)
- **QR Codes**: QRCode.js
- **Wallet Integration**: MetaMask

### Stakeholders

1. **Farmer**: Creates crop batches, selects distributors, manages logistics dispatch
2. **Distributor**: Receives crops, processes/stores, lists in marketplace
3. **Retailer**: Buys from distributor, sells to consumers
4. **Consumer**: Scans QR codes, views full product journey
5. **Admin**: Verifies all registrations, resolves disputes

---

## Document Structure

This specification is organized into the following documents:

1. **01-DATA-MODELS.md** - Complete MongoDB schemas and data structures
2. **02-API-ENDPOINTS.md** - All REST API endpoints with request/response formats
3. **03-SMART-CONTRACTS.md** - Solidity contract specifications and events
4. **04-IPFS-CERTIFICATES.md** - IPFS structure and certificate JSON formats
5. **05-UI-FLOWS.md** - User interface flows and wireframe requirements
6. **06-BLOCKCHAIN-INTEGRATION.md** - On-chain transaction flows and gas optimization
7. **07-IMPLEMENTATION-ROADMAP.md** - Step-by-step implementation guide
8. **08-FIELD-REFERENCE.md** - Quick reference for all fields across the system

---

## Key Features

### 1. QR-Based Verification
- Every crop batch gets a unique QR code
- QR links to immutable certificate showing full journey
- Blockchain hash verification ensures authenticity

### 2. Pricing Transparency
- Complete price trace: Farmer → Logistics → Distributor → Retailer → Consumer
- All price changes logged in ledger
- Visible in final certificate

### 3. Ledger System
- Append-only ledger entries for every action
- Blockchain transaction hashes linked to ledger entries
- Complete audit trail

### 4. Document Management
- All certificates, images, videos stored in IPFS
- IPFS CIDs stored in MongoDB
- Blockchain stores hashes of IPFS CIDs

### 5. AI Assistant
- Crop disease detection (image upload)
- Crop selection guidance
- Pesticide recommendations
- Local language support (Hindi/English)

### 6. Dynamic Pricing
- AI-powered pricing model
- Considers demand, season, location, quality
- Ensures fair prices for farmers

---

## Implementation Priority

### Phase 1: Core Registration & Data Models
- Complete registration forms with all fields
- MongoDB schemas with all required fields
- Document upload to IPFS
- Admin verification system

### Phase 2: Crop Batch Management
- Farmer creates crop batches
- Image/video upload to IPFS
- QR code generation
- Distributor selection flow

### Phase 3: Blockchain Integration
- Smart contract deployment
- MetaMask integration
- On-chain registration
- Event emission

### Phase 4: Marketplace & Transactions
- Distributor marketplace
- Retailer marketplace
- Order management
- Payment integration (UPI/COD)

### Phase 5: Ledger & Certificates
- Ledger entry system
- Certificate generation
- QR code resolution
- Public product view

### Phase 6: AI & Advanced Features
- AI assistant integration
- Dynamic pricing model
- Personalized marketplace
- Analytics dashboard

---

## Security Considerations

1. **Document Privacy**: Sensitive documents encrypted before IPFS upload
2. **OTP Verification**: Email and mobile OTP required for registration
3. **Admin Verification**: Manual verification prevents fake accounts
4. **Blockchain Immutability**: Critical events stored on-chain
5. **Access Control**: Role-based access to dashboards and APIs

---

## Deployment Notes

- **IPFS**: Use Pinata or Infura IPFS with pinning service
- **Ethereum**: Start with Sepolia/Goerli testnet, migrate to Polygon for production
- **Backend**: Deploy on Heroku/Render/VPS
- **Database**: MongoDB Atlas (cloud)
- **AI Service**: Deploy Flask app on separate VM or cloud ML instance

---

## Next Steps

1. Review all specification documents
2. Set up development environment (Hardhat, IPFS node, MongoDB)
3. Implement data models first
4. Build API endpoints
5. Deploy smart contracts
6. Integrate frontend
7. Test end-to-end flows
8. Deploy to production

