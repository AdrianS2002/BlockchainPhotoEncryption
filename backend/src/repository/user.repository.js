import { db } from "../utils/db/pool.js";        
import { toAddress } from "../utils/eth.js";

let ALLOWLIST = new Set();


async function findByAddressDB(addr) {
  const [rows] = await db.query(
    "SELECT id, eth_address, first_name, last_name, created_at, updated_at FROM users WHERE eth_address = ? LIMIT 1",
    [addr]
  );
  return rows[0] ?? null;
}


async function upsertAddressDB(addr) {

  await db.query(
    `INSERT INTO users (eth_address, first_name, last_name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [addr, "", ""]      
  );
  return findByAddressDB(addr);
}

export const UserRepository = {
  setAllowlist(addressSet) {
    
    ALLOWLIST = new Set([...addressSet].map(a => a.toLowerCase()));
  },

  isAllowed(address) {
    return ALLOWLIST.has(address.toLowerCase());
  },


  async upsertByAddress(address) {
    const addr = toAddress(address);
    const user = await upsertAddressDB(addr);
   
    return {
      id: user?.id,
      address: addr,
      firstName: user?.first_name,
      lastName: user?.last_name,
      createdAt: user?.created_at?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: user?.updated_at?.toISOString?.()
    };
  },

  async getAllUsers() {
    const [rows] = await db.query(
      "SELECT id, eth_address, first_name, last_name, created_at, updated_at FROM users ORDER BY created_at DESC"
    );
   
    return rows.map(r => ({
      id: r.id,
      address: r.eth_address,
      firstName: r.first_name,
      lastName: r.last_name,
      createdAt: r.created_at?.toISOString?.(),
      updatedAt: r.updated_at?.toISOString?.()
    }));
  }
};
