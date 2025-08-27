const hre = require("hardhat");
require("dotenv").config();

function pickPrivateKeyFromEnv() {
  const raw = (process.env.PRIVATE_KEYS || process.env.PRIVATE_KEY || "").trim();
  if (!raw) return null;

  // suportă fie un singur key, fie listă separată prin virgulă
  const candidates = raw.split(",").map(s => s.trim().replace(/^0x/, ""));
  const good = candidates.find(k => /^[0-9a-fA-F]{64}$/.test(k));
  return good || null;
}

async function main() {
  const pk = pickPrivateKeyFromEnv();
  if (!pk) throw new Error("Nu am găsit nicio cheie privată validă în .env (64 hex, fără 0x).");

  const provider = hre.ethers.provider;
  const wallet = new hre.ethers.Wallet(pk, provider);
  const deployerAddr = await wallet.getAddress();

  const net = await provider.getNetwork();
  const balance = await provider.getBalance(deployerAddr);

  console.log("Network chainId:", Number(net.chainId));
  console.log("Deployer:", deployerAddr);
  console.log("Balance (wei):", balance.toString());

  const unlockTime = Math.floor(Date.now() / 1000) + 60;
  const Factory = await hre.ethers.getContractFactory("Lock", wallet);
  const contract = await Factory.deploy(unlockTime);

  await contract.waitForDeployment();
  console.log("Deployed at:", await contract.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
