import { db } from "../utils/db/pool.js";
import { toAddress } from "../utils/eth.js";

let ALLOWLIST = new Set();

async function findByAddressDB(addr) {
  const [rows] = await db.query(
    `SELECT id, eth_address, first_name, last_name, created_at, updated_at
     FROM users
     WHERE eth_address = ?
     LIMIT 1`,
    [addr]
  );
  return rows[0] ?? null;
}

async function upsertUserDB(eth_address, first_name = "", last_name = "") {
  await db.query(
    `INSERT INTO users (eth_address, first_name, last_name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       updated_at = NOW()`,
    [eth_address, first_name, last_name]
  );
  return findByAddressDB(eth_address);
}

async function updateByAddressDB(addr, fields) {
  const sets = [];
  const vals = [];
  if (fields.first_name != null) { sets.push("first_name = ?"); vals.push(fields.first_name); }
  if (fields.last_name  != null) { sets.push("last_name  = ?"); vals.push(fields.last_name);  }

  if (!sets.length) return findByAddressDB(addr);

  const sql = `UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE eth_address = ?`;
  vals.push(addr);
  await db.query(sql, vals);
  return findByAddressDB(addr);
}

async function deleteByAddressDB(addr) {
  const [res] = await db.query(
    "DELETE FROM users WHERE eth_address = ?",
    [addr]
  );
  return res.affectedRows > 0;
}


export const UserRepository = {
  
  setAllowlist(addressSet) {
    ALLOWLIST = new Set([...addressSet].map(a => a.toLowerCase()));
  },
  isAllowed(address) {
    return ALLOWLIST.has(address.toLowerCase());
  },


  async create({ eth_address, first_name = "", last_name = "" }) {
    const addr = toAddress(eth_address);
    return upsertUserDB(addr, first_name, last_name);
  },


  async upsertByAddress(address) {
    const addr = toAddress(address);
    const user = await upsertUserDB(addr, "", "");
    return {
      id: user?.id,
      address: addr,
      firstName: user?.first_name,
      lastName: user?.last_name,
      createdAt: user?.created_at?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: user?.updated_at?.toISOString?.()
    };
  },


  async getByAddress(address) {
    return findByAddressDB(toAddress(address));
  },


  async updateByAddress(address, fields) {
    const addr = toAddress(address);
    return updateByAddressDB(addr, fields);
  },

  async deleteByAddress(address) {
    return deleteByAddressDB(toAddress(address));
  },


  async list({ page = 1, limit = 20, search = "" } = {}) {
    const off = (Math.max(1, page) - 1) * Math.max(1, limit);
    const like = `%${search}%`;
    const [rows] = await db.query(
      `SELECT SQL_CALC_FOUND_ROWS id, eth_address, first_name, last_name, created_at, updated_at
       FROM users
       WHERE (? = '' OR eth_address LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [search, like, like, like, Math.max(1, limit), off]
    );
    const [[{ "FOUND_ROWS()": total }]] = await db.query("SELECT FOUND_ROWS()");
    return { items: rows, total };
  }
};
