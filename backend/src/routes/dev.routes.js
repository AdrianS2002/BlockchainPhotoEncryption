import { Router } from "express";
import { ethers } from "ethers";

const r = Router();

/** activăm doar dacă DEV_EXPOSE_PRIVATE_KEYS=1 */
function mustBeEnabled(req, res, next) {
  if (process.env.DEV_EXPOSE_PRIVATE_KEYS !== "1") {
    return res.status(404).json({ error: "not mapped" });
  }
  // mic secret ca să nu expunem din greșeală
  const expected = process.env.DEV_SECRET || "dev-secret-123";
  const got = req.get("x-dev-secret");
  if (expected && got !== expected) {
    return res.status(401).json({ error: "bad dev secret" });
  }
  next();
}

r.get("/ping", (_req, res) => res.json({ ok: true, dev: true }));

function findIndexByAddress(addr) {
  const A = String(addr || "").toLowerCase();
  for (const [k, v] of Object.entries(process.env)) {
    if (/^ACCOUNT_\d+_ADDRESS$/i.test(k) && String(v).toLowerCase() === A) {
      return k.match(/^ACCOUNT_(\d+)_ADDRESS$/i)[1]; // ex: "1"
    }
  }
  return null;
}

r.get("/public-key/:address", mustBeEnabled, (req, res) => {
  const idx = findIndexByAddress(req.params.address);
  if (!idx) return res.status(404).json({ error: "address not in .env" });

  // încercăm întâi cheile din .env
  let pubUncomp = process.env[`ACCOUNT_${idx}_PUBLIC_KEY`]; 
  // dacă nu e setată, o derivăm din private key
  if (!pubUncomp) {
    const pk = process.env[`ACCOUNT_${idx}_PRIVATE_KEY`];
    if (pk) pubUncomp = new ethers.SigningKey(pk).publicKey; 
  }
  if (!pubUncomp?.startsWith("0x04"))
    return res.status(404).json({ error: "no uncompressed public key" });

  res.json({
    address: ethers.getAddress(req.params.address),
    publicKeyUncompressed: pubUncomp,
    publicKeyCompressed: process.env[`ACCOUNT_${idx}_PUBLIC_KEY_COMPRESSED`] || null,
    idx,
  });
});

r.get("/private-key/:address", mustBeEnabled, (req, res) => {
  const idx = findIndexByAddress(req.params.address);
  if (!idx) return res.status(404).json({ error: "address not in .env" });
  const pk = process.env[`ACCOUNT_${idx}_PRIVATE_KEY`];
  if (!pk) return res.status(404).json({ error: "no private key for address" });
  res.json({ address: ethers.getAddress(req.params.address), privateKey: pk, idx });
});

export const devRouter = r;
