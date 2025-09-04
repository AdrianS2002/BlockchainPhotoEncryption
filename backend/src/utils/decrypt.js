import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { createDecipheriv } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

function arg(name, def=null) {
  const i = process.argv.findIndex(a => a === `--${name}`);
  return i !== -1 ? (process.argv[i+1] ?? true) : def;
}
const PHOTO_ID = Number(arg('photo'));
const ME = (arg('me') || '').trim();
const AUTO_PAY = !!arg('auto-pay', false);
if (!PHOTO_ID || !ME) {
  console.error('Usage: node tools/decrypt-photo.js --photo <id> --me <0xaddr> [--auto-pay]');
  process.exit(1);
}

function findPrivateKeyFor(addr) {
  const A = addr.toLowerCase();
  const env = process.env;

  if (env.PRIVATE_KEY) return env.PRIVATE_KEY;
  for (const [k, v] of Object.entries(env)) {
    if (/^ACCOUNT_\d+_ADDRESS$/i.test(k) && String(v).toLowerCase() === A) {
      const idx = k.match(/^ACCOUNT_(\d+)_ADDRESS$/i)[1];
      const pk = env[`ACCOUNT_${idx}_PRIVATE_KEY`];
      if (pk) return pk;
    }
  }
  return null;
}

async function json(url, opts){ const r = await fetch(url, opts); if(!r.ok){throw new Error(`${r.status} ${await r.text()}`)} return r.json(); }
async function bin(url){ const r = await fetch(url); if(!r.ok){throw new Error(`${r.status} ${await r.text()}`)} return Buffer.from(await r.arrayBuffer()); }

function kekFromECDH(senderPubUncomp, recipientPriv) {
  const sk = new ethers.SigningKey(recipientPriv);
  const shared = sk.computeSharedSecret(senderPubUncomp);
  return Buffer.from(ethers.keccak256(shared).slice(2), 'hex');
}
function unwrapDataKey(wrappedHex, kek) {
  const buf = Buffer.from(wrappedHex, 'hex');
  const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), ct = buf.subarray(28);
  const dec = createDecipheriv('aes-256-gcm', kek, iv); dec.setAuthTag(tag);
  return Buffer.concat([dec.update(ct), dec.final()]); // 32B
}
function decryptPhotoBin(binBuf, dataKey) {
  const iv = binBuf.subarray(0,12), tag = binBuf.subarray(12,28), ct = binBuf.subarray(28);
  const dec = createDecipheriv('aes-256-gcm', dataKey, iv); dec.setAuthTag(tag);
  return Buffer.concat([dec.update(ct), dec.final()]);
}

const mePk = findPrivateKeyFor(ME);
if(!mePk){ console.error('Nu găsesc PRIVATE KEY pentru', ME, 'în .env/.env.local'); process.exit(1); }

const status = await json(`${BACKEND}/photos/${PHOTO_ID}/status/${ME}`);
if (!status.paid) {
  if (!AUTO_PAY) {
    console.error('Nu e plătit. Rulează cu --auto-pay sau plătește din wallet.');
    process.exit(2);
  }
  const pay = await json(`${BACKEND}/photos/${PHOTO_ID}/pay`, {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({ privateKey: mePk })
  });
  console.log('Paid tx:', pay.hash);
}

const key = await json(`${BACKEND}/photos/${PHOTO_ID}/key/${ME}`);
const blob = await bin(`${BACKEND}/photos/${PHOTO_ID}/download?as=${ME}`);

const kek = kekFromECDH(key.sender_pubkey_uncompressed, mePk);
const dataKey = unwrapDataKey(key.wrapped_key_hex, kek);
const plain = decryptPhotoBin(blob, dataKey);

const ext = key.mime_type?.split('/')[1] || 'bin';
const outPath = path.resolve(__dirname, `../out/photo-${PHOTO_ID}.${ext}`);
await writeFile(outPath, plain);
console.log('Decriptat:', outPath, `(${plain.length} bytes)`);