import { db } from "./db/pool.js";
import { toAddress } from "./eth.js";
import { JsonRpcProvider } from "ethers";

export async function seedHardhatUsers() {
  const rpc = process.env.HARDHAT_RPC || "http://127.0.0.1:8545";
  const provider = new JsonRpcProvider(rpc);

  // în v6 folosim RPC direct:
  const accounts = await provider.send("eth_accounts", []);

  if (!Array.isArray(accounts) || accounts.length === 0) {
    console.warn("  Nu am primit conturi de la Hardhat. E node-ul pornit?");
    return;
  }

  // Inserăm toate adresele: first_name/last_name = ""
  const conn = await db.getConnection();
  try {
    await conn.query("START TRANSACTION");
    for (const a of accounts) {
      const addr = toAddress(a);
      await conn.query(
        `INSERT INTO users (eth_address, first_name, last_name)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [addr, "", ""]
      );
    }
    await conn.query("COMMIT");
    console.log(` Seed Hardhat: ${accounts.length} adrese inserate/actualizate`);
  } catch (e) {
    await conn.query("ROLLBACK");
    throw e;
  } finally {
    conn.release();
  }
}
