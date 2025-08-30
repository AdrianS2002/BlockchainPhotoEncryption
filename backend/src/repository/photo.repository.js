import { db } from "../db/pool.js";
import { toAddress } from "../utils/eth.js";

export const PhotoRepository = {
  async create(p) {
    const [res] = await db.query(
      `INSERT INTO photos
      (owner_address, owner_user_id, storage, storage_ref, mime_type, bytes_size, sha256_hex, enc_scheme, enc_status, iv_base64, is_private)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'AES-256-GCM'), COALESCE(?, 'encrypted'), ?, COALESCE(?, 1))`,
      [
        toAddress(p.owner_address),
        p.owner_user_id ?? null,
        p.storage,
        p.storage_ref,
        p.mime_type,
        p.bytes_size,
        p.sha256_hex,
        p.enc_scheme ?? null,
        p.enc_status ?? null,
        p.iv_base64,
        p.is_private ?? null,
      ]
    );
    return res.insertId;
  },

  async addWrappedKey(photoId, recipient, wrapVersion, wrappedKeyHex) {
    await db.query(
      `INSERT INTO photo_keys (photo_id, recipient_address, wrap_version, wrapped_key_hex)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE wrap_version=VALUES(wrap_version), wrapped_key_hex=VALUES(wrapped_key_hex), updated_at=NOW()`,
      [photoId, toAddress(recipient), wrapVersion, wrappedKeyHex]
    );
  },

  async setACL(photoId, grantee, canView, canDownload) {
    await db.query(
      `INSERT INTO photo_access (photo_id, grantee_address, can_view, can_download)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE can_view=VALUES(can_view), can_download=VALUES(can_download)`,
      [photoId, toAddress(grantee), canView ? 1 : 0, canDownload ? 1 : 0]
    );
  },

  async listByOwner(owner) {
    const [rows] = await db.query(
      `SELECT * FROM v_photos_with_owners WHERE owner_address = ? ORDER BY created_at DESC`,
      [toAddress(owner)]
    );
    return rows;
  }
};
