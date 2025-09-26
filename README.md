# BlockchainPhotoEncryption
A decentralized photo mailbox system that enables users to send and unlock encrypted photos on-chain with fee-based access control.  

This project is built with:  
- **Solidity** for the Ethereum smart contract.  
- **MySQL** for storing photo metadata
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

##  Photo Storage Design 
One important design choice in this project is **how photos are stored**:  

- **Photos are not stored directly on-chain or inside MySQL.**  
- Instead, the system separates storage into two layers:  

### 1. MySQL Database (Metadata Only)
The `photos` table contains only metadata about each photo:  
- `owner_address` → Ethereum address of the uploader  
- `storage` → where the encrypted photo is stored (`LOCAL`, `IPFS`, etc.)  
- `storage_ref` → a reference/path to the encrypted file (e.g., `photos/0x123/1696000000-abc123.bin`)  
- `mime_type` → file type (e.g., `image/png`)  
- `bytes_size` → file size in bytes  
- `sha256_hex` → checksum of the original file for integrity  
- `enc_scheme` → encryption scheme (`AES-256-GCM`)  
- `enc_status` → whether the file is `"encrypted"` or `"decrypted"`  
- `iv_base64` → AES initialization vector, Base64-encoded  
- `is_private` → privacy flag  

### 2. Filesystem (Encrypted Photo Binaries)
When a user uploads a photo:
- The backend encrypts it with **AES-256-GCM**.  
- The encrypted blob is saved as a binary `.bin` file on the server (or potentially IPFS/Arweave in the future).  
- Only the path to this file is stored in MySQL (`storage_ref`).
### 3. Encryption (Upload)
1. A random **AES-256-GCM key** is generated.  
2. The photo is encrypted → `[IV | TAG | Ciphertext]` and saved as a binary file off-chain.  
3. Metadata (IV, hash, path) is stored in MySQL.  
4. The AES key is encrypted (ECIES) with the recipient’s Ethereum public key and stored in DB.  

### 4. Decryption (View)
1. Recipient pays the **unlock fee** (`decryptFeeWei`) on-chain.  
2. Backend returns the wrapped AES key (only if unlocked).  
3. Recipient unwraps the AES key with their Ethereum private key.  
4. The encrypted file is downloaded and decrypted with **AES-256-GCM**, restoring the original photo.

## Setup
### Prerequisites
- Node.js **18+**  
- npm **9+** 
- MySQL **8+**   
- MetaMask
- Hardhat
### Config
```bash
cd backend
npm install
npm run dev
```
```bash
cd frontend
npm install
npm star
```
```bash
cd blockchainapi
npm install
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```
