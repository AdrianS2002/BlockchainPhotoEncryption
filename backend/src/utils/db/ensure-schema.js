import fs from "fs";
import path from "path";
import { db } from "../db/pool.js";

const DB_NAME = process.env.DB_NAME || "blockchain_app";

async function tableExists(tableName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [DB_NAME, tableName]
  );
  return (rows?.[0]?.c || 0) > 0;
}

function resolveSchemaPath() {
  if (process.env.SCHEMA_PATH) {
    const p = path.resolve(process.env.SCHEMA_PATH);
    if (fs.existsSync(p)) return p;
    throw new Error(`SCHEMA_PATH setat dar fișierul nu există: ${p}`);
  }
  const fallback = path.resolve(process.cwd(), "schema.sql");
  if (fs.existsSync(fallback)) return fallback;
  throw new Error(`Nu găsesc schema.sql. Setează SCHEMA_PATH în .env sau pune fișierul la: ${fallback}`);
}

function loadStatements(schemaPath) {
  let sql = fs.readFileSync(schemaPath, "utf8");

  sql = sql.replace(/\/\*[\s\S]*?\*\//g, "")
           .split("\n")
           .filter(l => !l.trim().startsWith("--"))
           .join("\n");

  sql = sql.replace(/\bUSE\s+[`"]?[^`";]+[`"]?;?/gi, "");

  const statements = sql
    .split(/;\s*(?:\n|$)/g)
    .map(s => s.trim())
    .filter(Boolean);
  return statements;
}

export async function ensureSchema() {
  const hasUsers = await tableExists("users");
  if (hasUsers) return;

  const schemaPath = resolveSchemaPath();
  const statements = loadStatements(schemaPath);

  const conn = await db.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    console.log(` Schema SQL aplicată (source: ${schemaPath})`);
  } finally {
    conn.release();
  }
}
