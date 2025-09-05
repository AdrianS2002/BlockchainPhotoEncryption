import dotenv from "dotenv";
import path from 'node:path';
dotenv.config();
const csv = (v) => (v ?? '').split(',').map(s => s.trim()).filter(Boolean);
export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4200",
  contractAddress: (process.env.CONTRACT_ADDRESS ?? '').trim() || null,
  serverDomain: process.env.SERVER_DOMAIN || "localhost:4000",
  chainId: Number(process.env.CHAIN_ID || 1337), // Hardhat local
  hardhatRpc: process.env.HARDHAT_RPC || "http://127.0.0.1:8545",
   rpcUrl: process.env.RPC_URL || process.env.HARDHAT_RPC || 'http://127.0.0.1:8545',
  allowedAddressesEnv: (process.env.ALLOWED_ADDRESSES || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean),

  filesDir: process.env.FILES_DIR
    ? path.resolve(process.env.FILES_DIR)
    : path.resolve(process.cwd(), 'storage'),
};
if (!config.jwtSecret) {
  console.error("FATAL: JWT_SECRET lipsă în .env");
  process.exit(1);
}