# BlockchainPhotoEncryption
A decentralized photo mailbox system that enables users to send, and unlock encrypted photos on-chain with fee-based access control.  
# BlockchainPhotoEncryption

This project is built with:  
- **Solidity** for the Ethereum smart contract.  
- **MySQL** for storing images in 64Base fromat
- **Express.js (Node.js)** for the backend REST API.  
- **Angular** for the frontend web application.  

---

## Features
- **Smart Contract (`PhotoMailboxPayable.sol`)**
  - Payable photo sending with configurable `sendFeeWei`.
  - Unlocking photos by paying a decryption fee (`decryptFeeWei`).
  - On-chain inbox for each user.
  - Optional allowlist for sender/recipient validation.
  - Treasury and withdrawal management for contract owner.  

- **Backend (Node.js + Express + MySQL)**
  - REST API for user and photo management.
  - Ethereum contract integration via `ethers.js`.
  - AES-256-GCM encryption and ECIES key wrapping.
  - User and access control persisted in database.  

- **Frontend (Angular)**
  - Authentication via **SIWE (Sign-In With Ethereum)**.
  - MetaMask wallet integration.
  - Upload, share, and unlock photos with automatic fee handling.  

---

## Smart Contract Overview

File: [`PhotoMailboxPayable.sol`](./contracts/PhotoMailboxPayable.sol)

### Events
- `PhotoSent(from, to, storageRef, sha256sum, photoId)`  
- `DecryptPaid(user, photoId, amount, timestamp)`  
- `FeesUpdated(sendFeeWei, decryptFeeWei)`  
- `TreasuryUpdated(newTreasury)`  
- `AllowlistToggled(enabled)`  
- `AllowlistSet(user, allowed)`  

### Key Functions
- `sendPhoto(address to, string storageRef, bytes32 sha256sum, uint256 photoId)`  
- `payToUnlock(uint256 photoId)`  
- `hasUnlocked(uint256 photoId, address user)`  
- `setFees()`, `setTreasury()`, `setAllowlistEnabled()`, `setAllowed()`  
- `withdraw(amount)`, `withdrawAll()`  

---