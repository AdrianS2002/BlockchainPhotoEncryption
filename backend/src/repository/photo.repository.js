import { db } from "../utils/db/pool.js";
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

  async getById(id) {
    const n = Number(id);
    const [rows] = await db.query(`SELECT * FROM photos WHERE id = ? LIMIT 1`, [n]);
    return rows[0] ?? null;
  },

  async addWrappedKey(photoId, recipient, wrapVersion, wrappedKeyHex, senderPubKeyUncomp) {
    await db.query(
      `INSERT INTO photo_keys (photo_id, recipient_address, wrap_version, sender_pubkey_uncomp, wrapped_key_hex)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         wrap_version=VALUES(wrap_version),
         sender_pubkey_uncomp=VALUES(sender_pubkey_uncomp),
         wrapped_key_hex=VALUES(wrapped_key_hex),
         updated_at=NOW()`,
      [photoId, toAddress(recipient), wrapVersion, senderPubKeyUncomp, wrappedKeyHex]
    );
  },

  async getWrappedKey(photoId, recipient) {
    const [rows] = await db.query(
      `SELECT wrap_version, sender_pubkey_uncomp, wrapped_key_hex
         FROM photo_keys
        WHERE photo_id = ? AND recipient_address = ?
        LIMIT 1`,
      [photoId, toAddress(recipient)]
    );
    return rows[0] ?? null;
  },

  async setACL(photoId, grantee, canView, canDownload) {
    await db.query(
      `INSERT INTO photo_access (photo_id, grantee_address, can_view, can_download)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE can_view=VALUES(can_view), can_download=VALUES(can_download)`,
      [photoId, toAddress(grantee), canView ? 1 : 0, canDownload ? 1 : 0]
    );
  },

  async canView(photoId, grantee) {
    const [rows] = await db.query(
      `SELECT 1
         FROM photo_access
        WHERE photo_id = ? AND grantee_address = ? AND can_view = 1
        LIMIT 1`,
      [photoId, toAddress(grantee)]
    );
    return !!rows.length;
  },

  async listByOwner(owner) {
    const [rows] = await db.query(
      `SELECT * FROM v_photos_with_owners
        WHERE owner_address = ?
        ORDER BY created_at DESC`,
      [toAddress(owner)]
    );
    return rows;
  },

  async listForRecipient(address) {
    const [rows] = await db.query(
      `SELECT p.*
         FROM photos p
         JOIN photo_access a ON a.photo_id = p.id
        WHERE a.grantee_address = ? AND a.can_view = 1
        ORDER BY p.created_at DESC`,
      [toAddress(address)]
    );
    return rows;
  },

  async touch(photoId, fields = {}) {
    const sets = [], vals = [];
    if (fields.enc_status != null) { sets.push("enc_status = ?"); vals.push(fields.enc_status); }
    if (fields.iv_base64 != null) { sets.push("iv_base64 = ?"); vals.push(fields.iv_base64); }
    if (!sets.length) return this.getById(photoId);
    vals.push(Number(photoId));
    await db.query(`UPDATE photos SET ${sets.join(", ")}, updated_at = NOW() WHERE id = ?`, vals);
    return this.getById(photoId);
  },
  async remove(photoId) {
    const [res] = await db.query(`DELETE FROM photos WHERE id = ?`, [Number(photoId)]);
    return res.affectedRows > 0;
  },
};
