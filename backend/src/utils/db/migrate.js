import { db } from "./pool.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const schemaPath = path.resolve(process.cwd(), "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Nu găsesc schema.sql la: ${schemaPath}`);
  }
  let sql = fs.readFileSync(schemaPath, "utf8");

    sql = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter(l => !l.trim().startsWith("--"))
    .join("\n");

  const statements = sql
    .split(/;\s*\n/) 
    .map(s => s.trim())
    .filter(Boolean);

  const conn = await db.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    console.log("✅ Schema aplicată cu succes");
  } finally {
    conn.release();
    await db.end();
  }
}

run().catch(err => {
  console.error("❌ Migrarea a eșuat:", err);
  process.exit(1);
});
