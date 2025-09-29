// src/chain/contract.js
import { ethers } from 'ethers';
import { config } from '../config.js';
import fs from 'node:fs';
import path from 'node:path';

const FALLBACK_ABI = [
  'event PhotoSent(address indexed from, address indexed to, string storageRef, bytes32 sha256sum, uint256 photoId)',
  'event DecryptPaid(address indexed user, uint256 indexed photoId, uint256 amount, uint64 timestamp)',
  'function sendPhoto(address to, string storageRef, bytes32 sha256sum, uint256 photoId) external payable',
  'function payToUnlock(uint256 photoId) external payable',
  'function hasUnlocked(uint256 photoId, address user) external view returns (bool)',
  'function sendFeeWei() view returns (uint256)',
  'function decryptFeeWei() view returns (uint256)',
];

function cleanPath(p) {
  if (!p) return null;
  return p.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/');
}

function loadAddressAndAbi() {
  const ROOT = process.cwd();
  const envPath = cleanPath(process.env.CONTRACT_ABI_PATH);

  const candidates = [
    envPath,
    path.resolve(ROOT, 'contract-abi.json'),
    path.resolve(ROOT, '../contract-abi.json'),
    path.resolve(ROOT, '../blockchainapi/contract-abi.json'), // backend/../blockchainapi/...
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const j = JSON.parse(fs.readFileSync(p, 'utf8'));
        return {
          address: (j.address ?? '').trim() || config.contractAddress,
          abi: (Array.isArray(j.abi) && j.abi.length) ? j.abi : FALLBACK_ABI,
        };
      }
    } catch (e) {
      console.warn('ABI read failed at', p, e?.message);
    }
  }
  return { address: config.contractAddress, abi: FALLBACK_ABI };
}

export function getProvider() {
  return new ethers.JsonRpcProvider(config.rpcUrl, { chainId: config.chainId, name: 'local' });
}

export function getContract(signerOrProvider) {
  const { address, abi } = loadAddressAndAbi();
  if (!address) {
    throw new Error(
      'Missing contract address. Set CONTRACT_ADDRESS în backend/.env sau dă un CONTRACT_ABI_PATH valid spre contract-abi.json.'
    );
  }
  return new ethers.Contract(address, abi, signerOrProvider);
}

export function debugContractResolution() {
  const ROOT = process.cwd();
  const envPath = cleanPath(process.env.CONTRACT_ABI_PATH);
  const candidates = [
    envPath,
    path.resolve(ROOT, 'contract-abi.json'),
    path.resolve(ROOT, '../contract-abi.json'),
    path.resolve(ROOT, '../blockchainapi/contract-abi.json'),
  ].filter(Boolean);
  const exists = candidates.map(p => ({ path: p, exists: fs.existsSync(p) }));
  return {
    env: {
      CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI_PATH: envPath,
      RPC_URL: process.env.RPC_URL,
      CHAIN_ID: process.env.CHAIN_ID,
    },
    configAddr: config.contractAddress,
    candidates: exists,
  };
}

export async function getFees() {
  const c = getContract(getProvider());
  const [sendFeeWei, decryptFeeWei] = await Promise.all([c.sendFeeWei(), c.decryptFeeWei()]);
  return { sendFeeWei, decryptFeeWei };
}

export async function onchainSendPointer({ fromPrivateKey, toAddress, storageRef, sha256hex, photoId, valueWei }) {
  const provider = getProvider();
  const wallet = new ethers.Wallet(fromPrivateKey, provider);
  const c = getContract(wallet);
  const fee = valueWei ?? (await c.sendFeeWei());
  const tx = await c.sendPhoto(toAddress, storageRef, '0x' + sha256hex, BigInt(photoId), { value: fee });
  const receipt = await tx.wait();
  return { hash: receipt?.hash ?? tx.hash };
}

export async function hasUnlocked(photoId, userAddress) {
  const c = getContract(getProvider());
  return await c.hasUnlocked(BigInt(photoId), userAddress);
}


export async function payToUnlock({ fromPrivateKey, photoId, valueWei }) {
  const provider = getProvider();
  const wallet = new ethers.Wallet(fromPrivateKey, provider);
  const c = getContract(wallet);
  const fee = valueWei ?? (await c.decryptFeeWei());
  const tx = await c.payToUnlock(BigInt(photoId), { value: fee });
  const receipt = await tx.wait();
  return { hash: receipt?.hash ?? tx.hash };
}

export async function unlockStatus(photoId, address) {
  const c = getContract(getProvider());
  const paid = await c.hasUnlocked(BigInt(photoId), address);
  const fee = await c.decryptFeeWei();
  return { paid, decryptFeeWei: fee };
}
