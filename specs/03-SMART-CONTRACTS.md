# Smart Contracts Specification

Complete Solidity smart contract specifications for AgriDirect blockchain integration.

---

## Contract Architecture

### Main Contract: `AgriRegistry.sol`

Single main contract that handles all on-chain operations. Uses events for gas efficiency.

---

## Contract Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgriRegistry {
    // ============ STRUCTS ============
    
    struct Farmer {
        address farmerAddress;
        bytes32 profileHash; // keccak256 hash of profile data
        bytes32 profileCIDHash; // keccak256 hash of IPFS CID
        bool verified;
        uint256 registeredAt;
    }
    
    struct Distributor {
        address distributorAddress;
        bytes32 profileHash;
        bytes32 profileCIDHash;
        bool verified;
        uint256 registeredAt;
    }
    
    struct Retailer {
        address retailerAddress;
        bytes32 profileHash;
        bytes32 profileCIDHash;
        bool verified;
        uint256 registeredAt;
    }
    
    struct Crop {
        bytes32 cropHash; // keccak256(cropId + certificateCID)
        address farmerAddress;
        bytes32 certificateCIDHash; // keccak256 hash of final certificate IPFS CID
        address currentOwner; // Farmer -> Distributor -> Retailer
        uint8 status; // 0=created, 1=assigned, 2=inTransit, 3=received, 4=processed, 5=listed, 6=sold
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // ============ STATE VARIABLES ============
    
    address public admin; // Admin address (can be multi-sig later)
    mapping(address => Farmer) public farmers;
    mapping(address => Distributor) public distributors;
    mapping(address => Retailer) public retailers;
    mapping(bytes32 => Crop) public crops; // cropHash => Crop
    mapping(bytes32 => bool) public cropExists; // cropHash => exists
    
    // Arrays for enumeration (optional, for frontend)
    address[] public farmerAddresses;
    address[] public distributorAddresses;
    address[] public retailerAddresses;
    bytes32[] public cropHashes;
    
    // ============ EVENTS ============
    
    event FarmerRegistered(
        address indexed farmer,
        bytes32 profileHash,
        bytes32 profileCIDHash,
        uint256 timestamp
    );
    
    event DistributorRegistered(
        address indexed distributor,
        bytes32 profileHash,
        bytes32 profileCIDHash,
        uint256 timestamp
    );
    
    event RetailerRegistered(
        address indexed retailer,
        bytes32 profileHash,
        bytes32 profileCIDHash,
        uint256 timestamp
    );
    
    event CropCreated(
        bytes32 indexed cropHash,
        address indexed farmer,
        bytes32 certificateCIDHash,
        uint256 timestamp
    );
    
    event DistributorAssigned(
        bytes32 indexed cropHash,
        address indexed distributor,
        uint256 timestamp
    );
    
    event LogisticsDispatched(
        bytes32 indexed cropHash,
        string vehicleNumber,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    event LogisticsReceived(
        bytes32 indexed cropHash,
        address indexed receiver,
        uint256 timestamp
    );
    
    event CropProcessed(
        bytes32 indexed cropHash,
        address indexed processor,
        uint256 timestamp
    );
    
    event CropListed(
        bytes32 indexed cropHash,
        address indexed lister,
        uint256 price,
        bytes32 badgeId,
        uint256 timestamp
    );
    
    event CropSold(
        bytes32 indexed cropHash,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );
    
    event CertificateFinalized(
        bytes32 indexed cropHash,
        bytes32 certificateCIDHash,
        uint256 timestamp
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlyVerifiedFarmer(address farmerAddr) {
        require(farmers[farmerAddr].verified, "Farmer not verified");
        _;
    }
    
    modifier onlyVerifiedDistributor(address distributorAddr) {
        require(distributors[distributorAddr].verified, "Distributor not verified");
        _;
    }
    
    modifier onlyVerifiedRetailer(address retailerAddr) {
        require(retailers[retailerAddr].verified, "Retailer not verified");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        admin = msg.sender;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Register a farmer (called by admin after off-chain verification)
     */
    function registerFarmer(
        address farmerAddress,
        bytes32 profileHash,
        bytes32 profileCIDHash
    ) external onlyAdmin {
        require(farmers[farmerAddress].farmerAddress == address(0), "Farmer already registered");
        
        farmers[farmerAddress] = Farmer({
            farmerAddress: farmerAddress,
            profileHash: profileHash,
            profileCIDHash: profileCIDHash,
            verified: true,
            registeredAt: block.timestamp
        });
        
        farmerAddresses.push(farmerAddress);
        
        emit FarmerRegistered(farmerAddress, profileHash, profileCIDHash, block.timestamp);
    }
    
    /**
     * @dev Register a distributor (called by admin after off-chain verification)
     */
    function registerDistributor(
        address distributorAddress,
        bytes32 profileHash,
        bytes32 profileCIDHash
    ) external onlyAdmin {
        require(distributors[distributorAddress].distributorAddress == address(0), "Distributor already registered");
        
        distributors[distributorAddress] = Distributor({
            distributorAddress: distributorAddress,
            profileHash: profileHash,
            profileCIDHash: profileCIDHash,
            verified: true,
            registeredAt: block.timestamp
        });
        
        distributorAddresses.push(distributorAddress);
        
        emit DistributorRegistered(distributorAddress, profileHash, profileCIDHash, block.timestamp);
    }
    
    /**
     * @dev Register a retailer (called by admin after off-chain verification)
     */
    function registerRetailer(
        address retailerAddress,
        bytes32 profileHash,
        bytes32 profileCIDHash
    ) external onlyAdmin {
        require(retailers[retailerAddress].retailerAddress == address(0), "Retailer already registered");
        
        retailers[retailerAddress] = Retailer({
            retailerAddress: retailerAddress,
            profileHash: profileHash,
            profileCIDHash: profileCIDHash,
            verified: true,
            registeredAt: block.timestamp
        });
        
        retailerAddresses.push(retailerAddress);
        
        emit RetailerRegistered(retailerAddress, profileHash, profileCIDHash, block.timestamp);
    }
    
    // ============ FARMER FUNCTIONS ============
    
    /**
     * @dev Create a new crop batch
     * @param cropId Human-readable crop ID (e.g., "FARMER-20251129-001")
     * @param certificateCID IPFS CID of initial certificate (can be updated later)
     */
    function createCrop(
        string memory cropId,
        string memory certificateCID
    ) external onlyVerifiedFarmer(msg.sender) {
        bytes32 cropHash = keccak256(abi.encodePacked(cropId, certificateCID));
        bytes32 certificateCIDHash = keccak256(abi.encodePacked(certificateCID));
        
        require(!cropExists[cropHash], "Crop already exists");
        
        crops[cropHash] = Crop({
            cropHash: cropHash,
            farmerAddress: msg.sender,
            certificateCIDHash: certificateCIDHash,
            currentOwner: msg.sender,
            status: 0, // created
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        cropExists[cropHash] = true;
        cropHashes.push(cropHash);
        
        emit CropCreated(cropHash, msg.sender, certificateCIDHash, block.timestamp);
    }
    
    // ============ DISTRIBUTOR FUNCTIONS ============
    
    /**
     * @dev Assign distributor to a crop (called after farmer selects distributor)
     * @param cropHash Hash of the crop
     */
    function assignDistributor(bytes32 cropHash) external onlyVerifiedDistributor(msg.sender) {
        Crop storage crop = crops[cropHash];
        require(crop.farmerAddress != address(0), "Crop does not exist");
        require(crop.status == 0, "Crop already assigned");
        
        crop.currentOwner = msg.sender;
        crop.status = 1; // assigned
        crop.updatedAt = block.timestamp;
        
        emit DistributorAssigned(cropHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Record logistics dispatch
     * @param cropHash Hash of the crop
     * @param vehicleNumber Vehicle number
     * @param toAddress Address of receiver (distributor or retailer)
     */
    function recordLogisticsDispatch(
        bytes32 cropHash,
        string memory vehicleNumber,
        address toAddress
    ) external {
        Crop storage crop = crops[cropHash];
        require(crop.currentOwner == msg.sender, "Not authorized");
        require(crop.status == 1 || crop.status == 4, "Invalid status");
        
        crop.status = 2; // inTransit
        crop.updatedAt = block.timestamp;
        
        emit LogisticsDispatched(cropHash, vehicleNumber, msg.sender, toAddress, block.timestamp);
    }
    
    /**
     * @dev Record logistics receipt
     * @param cropHash Hash of the crop
     */
    function recordLogisticsReceive(bytes32 cropHash) external {
        Crop storage crop = crops[cropHash];
        require(crop.status == 2, "Crop not in transit");
        
        // Verify receiver is distributor or retailer
        require(
            distributors[msg.sender].verified || retailers[msg.sender].verified,
            "Not a verified distributor or retailer"
        );
        
        crop.currentOwner = msg.sender;
        crop.status = 3; // received
        crop.updatedAt = block.timestamp;
        
        emit LogisticsReceived(cropHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Record crop processing
     * @param cropHash Hash of the crop
     */
    function recordProcessing(bytes32 cropHash) external onlyVerifiedDistributor(msg.sender) {
        Crop storage crop = crops[cropHash];
        require(crop.currentOwner == msg.sender, "Not the owner");
        require(crop.status == 3, "Invalid status");
        
        crop.status = 4; // processed
        crop.updatedAt = block.timestamp;
        
        emit CropProcessed(cropHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev List crop in distributor marketplace
     * @param cropHash Hash of the crop
     * @param price Price per unit (in wei or smallest unit)
     * @param badgeId Unique badge ID for the listing
     * @param certificateCID Final certificate IPFS CID
     */
    function listCrop(
        bytes32 cropHash,
        uint256 price,
        string memory badgeId,
        string memory certificateCID
    ) external onlyVerifiedDistributor(msg.sender) {
        Crop storage crop = crops[cropHash];
        require(crop.currentOwner == msg.sender, "Not the owner");
        require(crop.status == 3 || crop.status == 4, "Invalid status");
        
        bytes32 certificateCIDHash = keccak256(abi.encodePacked(certificateCID));
        crop.certificateCIDHash = certificateCIDHash;
        crop.status = 5; // listed
        crop.updatedAt = block.timestamp;
        
        emit CropListed(cropHash, msg.sender, price, keccak256(abi.encodePacked(badgeId)), block.timestamp);
        emit CertificateFinalized(cropHash, certificateCIDHash, block.timestamp);
    }
    
    // ============ RETAILER FUNCTIONS ============
    
    /**
     * @dev Record crop sale to retailer
     * @param cropHash Hash of the crop
     * @param price Purchase price
     */
    function buyCrop(
        bytes32 cropHash,
        uint256 price
    ) external onlyVerifiedRetailer(msg.sender) {
        Crop storage crop = crops[cropHash];
        require(crop.status == 5, "Crop not listed");
        require(crop.currentOwner != msg.sender, "Already owner");
        
        address previousOwner = crop.currentOwner;
        crop.currentOwner = msg.sender;
        crop.status = 6; // sold
        crop.updatedAt = block.timestamp;
        
        emit CropSold(cropHash, msg.sender, previousOwner, price, block.timestamp);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get crop details
     */
    function getCrop(bytes32 cropHash) external view returns (Crop memory) {
        return crops[cropHash];
    }
    
    /**
     * @dev Check if farmer is verified
     */
    function isFarmerVerified(address farmerAddr) external view returns (bool) {
        return farmers[farmerAddr].verified;
    }
    
    /**
     * @dev Check if distributor is verified
     */
    function isDistributorVerified(address distributorAddr) external view returns (bool) {
        return distributors[distributorAddr].verified;
    }
    
    /**
     * @dev Check if retailer is verified
     */
    function isRetailerVerified(address retailerAddr) external view returns (bool) {
        return retailers[retailerAddr].verified;
    }
    
    /**
     * @dev Get total counts
     */
    function getCounts() external view returns (
        uint256 farmerCount,
        uint256 distributorCount,
        uint256 retailerCount,
        uint256 cropCount
    ) {
        return (
            farmerAddresses.length,
            distributorAddresses.length,
            retailerAddresses.length,
            cropHashes.length
        );
    }
    
    /**
     * @dev Update admin (only current admin)
     */
    function updateAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }
}
```

---

## Helper Functions (Off-Chain)

### Hash Generation

```javascript
// Generate crop hash
function generateCropHash(cropId, certificateCID) {
  const { keccak256 } = require('ethers');
  return keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['string', 'string'],
      [cropId, certificateCID]
    )
  );
}

// Generate profile hash
function generateProfileHash(profileData) {
  const profileJSON = JSON.stringify(profileData);
  return keccak256(ethers.utils.toUtf8Bytes(profileJSON));
}

// Generate IPFS CID hash
function generateCIDHash(ipfsCID) {
  return keccak256(ethers.utils.toUtf8Bytes(ipfsCID));
}
```

---

## Gas Optimization Strategy

### Minimal On-Chain Operations

Only critical events are stored on-chain:

1. **Registration** (Farmer, Distributor, Retailer) - One-time
2. **Crop Creation** - Anchor transaction
3. **Distributor Assignment** - Ownership transfer
4. **Certificate Finalization** - Final proof
5. **Crop Sale** - Ownership transfer

### Off-Chain Ledger

All other events (logistics, quality checks, processing details) are stored in MongoDB ledger and referenced via certificate CID.

### Batch Operations

For multiple crops, consider batching:
```solidity
function batchCreateCrops(
    string[] memory cropIds,
    string[] memory certificateCIDs
) external {
    // Batch creation to save gas
}
```

---

## Deployment Configuration

### Hardhat Config

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

### Deployment Script

```javascript
// scripts/deploy.js
async function main() {
  const AgriRegistry = await ethers.getContractFactory("AgriRegistry");
  const registry = await AgriRegistry.deploy();
  
  await registry.deployed();
  
  console.log("AgriRegistry deployed to:", registry.address);
  
  // Verify on Etherscan
  await hre.run("verify:verify", {
    address: registry.address,
    constructorArguments: []
  });
}
```

---

## Testing

### Unit Tests (Hardhat + Waffle)

```javascript
// test/AgriRegistry.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgriRegistry", function() {
  let registry;
  let admin, farmer, distributor, retailer;
  
  beforeEach(async function() {
    [admin, farmer, distributor, retailer] = await ethers.getSigners();
    
    const AgriRegistry = await ethers.getContractFactory("AgriRegistry");
    registry = await AgriRegistry.deploy();
    await registry.deployed();
  });
  
  it("Should register a farmer", async function() {
    const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profile"));
    const profileCIDHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ipfs://..."));
    
    await registry.connect(admin).registerFarmer(
      farmer.address,
      profileHash,
      profileCIDHash
    );
    
    const farmerData = await registry.farmers(farmer.address);
    expect(farmerData.verified).to.be.true;
  });
  
  it("Should create a crop", async function() {
    // First register farmer
    // ... registration code ...
    
    // Then create crop
    await registry.connect(farmer).createCrop(
      "FARMER-20251129-001",
      "ipfs://QmCertificate..."
    );
    
    // Verify crop exists
    const cropHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['string', 'string'],
        ['FARMER-20251129-001', 'ipfs://QmCertificate...']
      )
    );
    
    const crop = await registry.getCrop(cropHash);
    expect(crop.farmerAddress).to.equal(farmer.address);
  });
  
  // More tests...
});
```

---

## Integration with Backend

### Backend Service: `services/blockchain.js`

```javascript
const { ethers } = require("ethers");
const AgriRegistryABI = require("../abis/AgriRegistry.json");

class BlockchainService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.contract = new ethers.Contract(
      this.contractAddress,
      AgriRegistryABI,
      this.provider
    );
  }
  
  async registerFarmer(farmerAddress, profileHash, profileCIDHash) {
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, this.provider);
    const contractWithSigner = this.contract.connect(wallet);
    
    const tx = await contractWithSigner.registerFarmer(
      farmerAddress,
      profileHash,
      profileCIDHash
    );
    
    await tx.wait();
    return tx.hash;
  }
  
  async createCrop(farmerAddress, cropId, certificateCID) {
    // Get signer from farmer's metamask
    // This should be called from frontend with MetaMask
    // Or use a relayer pattern
    
    const cropHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['string', 'string'],
        [cropId, certificateCID]
      )
    );
    
    return cropHash;
  }
  
  async listenToEvents() {
    this.contract.on("CropCreated", (cropHash, farmer, certificateCIDHash, timestamp) => {
      console.log("Crop created:", {
        cropHash,
        farmer,
        certificateCIDHash,
        timestamp: new Date(timestamp * 1000)
      });
      
      // Update MongoDB
      // ...
    });
  }
}
```

---

## Security Considerations

1. **Access Control**: Only verified users can perform actions
2. **Reentrancy**: Use checks-effects-interactions pattern
3. **Input Validation**: Validate all inputs
4. **Gas Limits**: Set appropriate gas limits
5. **Admin Functions**: Consider multi-sig for admin operations
6. **Upgradeability**: Consider proxy pattern for future upgrades

---

## Event Indexing

Events are indexed for efficient querying:

```javascript
// Query events
const filter = contract.filters.CropCreated(null, farmerAddress);
const events = await contract.queryFilter(filter, fromBlock, toBlock);
```

---

## Cost Estimates (Sepolia Testnet)

- Register Farmer: ~150,000 gas (~$0.15 at 20 gwei)
- Create Crop: ~100,000 gas (~$0.10)
- Assign Distributor: ~80,000 gas (~$0.08)
- List Crop: ~120,000 gas (~$0.12)
- Buy Crop: ~90,000 gas (~$0.09)

**Total per crop journey**: ~540,000 gas (~$0.54)

For production on Polygon: ~$0.01-0.02 per transaction.

