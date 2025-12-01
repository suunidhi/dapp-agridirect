// MetaMask Connection Utility
// This file provides MetaMask connection functionality for all user types

class MetaMaskConnector {
  constructor() {
    this.accounts = [];
    this.isConnected = false;
  }

  // Check if MetaMask is installed
  async checkMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
      return true;
    }
    return false;
  }

  // Connect to MetaMask
  async connect() {
    try {
      if (!await this.checkMetaMask()) {
        throw new Error('MetaMask is not installed. Please install MetaMask extension.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      this.accounts = accounts;
      this.isConnected = true;
      
      return {
        success: true,
        address: accounts[0],
        message: 'MetaMask connected successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to connect to MetaMask'
      };
    }
  }

  // Get current account
  async getCurrentAccount() {
    try {
      if (!await this.checkMetaMask()) {
        return null;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      if (accounts.length > 0) {
        this.accounts = accounts;
        this.isConnected = true;
        return accounts[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  }

  // Listen for account changes
  onAccountsChanged(callback) {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.isConnected = false;
          this.accounts = [];
        } else {
          this.accounts = accounts;
          this.isConnected = true;
        }
        if (callback) callback(accounts);
      });
    }
  }

  // Listen for chain changes
  onChainChanged(callback) {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('chainChanged', (chainId) => {
        if (callback) callback(chainId);
        // Reload page on chain change
        window.location.reload();
      });
    }
  }

  // Get network ID
  async getNetworkId() {
    try {
      if (!await this.checkMetaMask()) {
        return null;
      }
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainId, 16);
    } catch (error) {
      console.error('Error getting network ID:', error);
      return null;
    }
  }

  // Validate Ethereum address
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

// Global instance
const metaMaskConnector = new MetaMaskConnector();

// Helper function to connect MetaMask and update form field
async function connectMetaMaskAndUpdateField(fieldId, role = 'user') {
  const field = document.getElementById(fieldId);
  if (!field) return;

  const result = await metaMaskConnector.connect();
  
  if (result.success) {
    field.value = result.address;
    field.style.borderColor = '#28a745';
    
    // Show success message
    showMetaMaskMessage('MetaMask connected: ' + result.address.substring(0, 10) + '...', 'success');
    
    // Store in localStorage
    localStorage.setItem(`${role}MetamaskAddress`, result.address);
    
    return result.address;
  } else {
    field.style.borderColor = '#dc3545';
    showMetaMaskMessage(result.error, 'error');
    return null;
  }
}

// Helper function to show MetaMask messages
function showMetaMaskMessage(message, type = 'info') {
  // Create or update message element
  let msgEl = document.getElementById('metamask-message');
  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.id = 'metamask-message';
    msgEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(msgEl);
  }

  const colors = {
    success: '#28a745',
    error: '#dc3545',
    info: '#17a2b8'
  };

  msgEl.style.backgroundColor = colors[type] || colors.info;
  msgEl.textContent = message;
  msgEl.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    msgEl.style.display = 'none';
  }, 5000);
}

// Auto-connect on page load if previously connected
async function autoConnectMetaMask(fieldId, role = 'user') {
  const storedAddress = localStorage.getItem(`${role}MetamaskAddress`);
  if (storedAddress && metaMaskConnector.isValidAddress(storedAddress)) {
    const currentAccount = await metaMaskConnector.getCurrentAccount();
    if (currentAccount && currentAccount.toLowerCase() === storedAddress.toLowerCase()) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = currentAccount;
        field.style.borderColor = '#28a745';
      }
      return currentAccount;
    }
  }
  return null;
}

