import { PhotoRepository } from "../repository/photo.repository.js";
import { UserRepository } from "../repository/user.repository.js";
import { toAddress } from "../utils/eth.js";
import { aes256gcmEncrypt, sha256Hex, eciesWrapDataKey, eciesUnwrapDataKey } from "../utils/crypto.js";
import { saveFileAtomic, readFile } from "../utils/fs.js";
import { onchainSendPointer, getFees, hasUnlocked } from "../chain/contract.js";
import { ethers } from "ethers"; 

const norm = (a) => String(a).toLowerCase();
const uniqAddresses = (arr=[]) => [...new Set(arr.map(toAddress))];

function getUncompressedPubKeyFromPriv(privHex) {
  const priv = privHex.startsWith("0x") ? privHex : ("0x" + privHex);

  if (ethers.computePublicKey) {
    return ethers.computePublicKey(priv, false);
  }

  if (ethers.utils?.computePublicKey) {
    return ethers.utils.computePublicKey(priv, false);
  }

  const SigningKey = ethers.SigningKey || ethers.utils?.SigningKey;
  if (!SigningKey) throw new Error("Nu pot calcula public key (ethers v?).");
  const sk = new SigningKey(priv);
  return sk.publicKey; 
}

async function wrapForRecipients({ photoId, dataKey, recipients, recipientPublicKeys, senderPrivateKeyHex }) {
  const pubMap = new Map(Object.entries(recipientPublicKeys || {}).map(([a,p]) => [String(a).toLowerCase(), p]));
  const senderPubUncomp = getUncompressedPubKeyFromPriv(senderPrivateKeyHex);

  for (const r of recipients) {
    const pub = pubMap.get(String(r).toLowerCase());
    if (!pub) throw new Error(`Missing public key for ${r}`);

    const { wrap_version, wrapped_key_hex } = eciesWrapDataKey({
      recipientPublicKeyUncompressedHex: pub,
      senderPrivateKeyHex,
      dataKey,
    });

    await PhotoRepository.addWrappedKey(
      photoId, r, wrap_version, wrapped_key_hex, senderPubUncomp
    );
    await PhotoRepository.setACL(photoId, r, true, true);
  }
}

export const PhotoService = {

  async upload({ buffer, mimeType, ownerAddress, isPrivate = true, recipients = [], senderPrivateKeyHex, recipientPublicKeys = {}, callOnchain = true }) {
    if (!buffer?.length) throw new Error("file buffer required");
    if (!ownerAddress) throw new Error("ownerAddress required");
    const owner = toAddress(ownerAddress);

    await UserRepository.create({ eth_address: owner });
    const sha = sha256Hex(buffer);
    const { enc, key: dataKey, iv, tag } = aes256gcmEncrypt(buffer);
    const rel = `photos/${owner}/${Date.now()}-${sha}.bin`;
    await saveFileAtomic(rel, Buffer.concat([iv, tag, enc]));

    const photoId = await PhotoRepository.create({
      owner_address: owner,
      owner_user_id: null,
      storage: "LOCAL",
      storage_ref: rel,
      mime_type: mimeType,
      bytes_size: buffer.length,
      sha256_hex: sha,
      enc_scheme: "AES-256-GCM",
      enc_status: "encrypted",
      iv_base64: iv.toString("base64"),
      is_private: isPrivate ? 1 : 0,
    });

    if (senderPrivateKeyHex && recipientPublicKeys && recipientPublicKeys[owner]) {
      await wrapForRecipients({
        photoId,
        dataKey,
        recipients: [owner],
        recipientPublicKeys,
        senderPrivateKeyHex
      });
    }

    const recips = uniqAddresses(recipients);
    let chain;
    if (recips.length) {
      if (!senderPrivateKeyHex) throw new Error("senderPrivateKeyHex required for sharing");
      await wrapForRecipients({ photoId, dataKey, recipients: recips, recipientPublicKeys, senderPrivateKeyHex });

      if (callOnchain && recips.length === 1) {
        const { sendFeeWei } = await getFees();
        chain = await onchainSendPointer({
          fromPrivateKey: senderPrivateKeyHex,
          toAddress: recips[0],
          storageRef: rel,
          sha256hex: sha,
          photoId,
          valueWei: sendFeeWei,
        });
      }
    }

    return { photoId, storage_ref: rel, sha256_hex: sha, chain_tx: chain?.hash };
  },

  async shareExisting({ photoId, ownerAddress, ownerPrivateKeyHex, ownerPublicKeyUncompressedHex, recipients, recipientPublicKeys, callOnchain = true }) {
    const owner = toAddress(ownerAddress);
    const recips = uniqAddresses(recipients ?? []);
    if (!recips.length) throw new Error("recipients required");

    const ownerKeyRow = await PhotoRepository.getWrappedKey(photoId, owner);
    if (!ownerKeyRow) {
      throw new Error("Owner has no wrapped key stored for this photo. Re-upload with owner self-wrap, sau furnizează dataKey pe alte căi.");
    }

   
    const dataKey = eciesUnwrapDataKey({
      senderPublicKeyUncompressedHex: ownerPublicKeyUncompressedHex, 
      recipientPrivateKeyHex: ownerPrivateKeyHex,                  
      wrappedHex: ownerKeyRow.wrapped_key_hex,
    });

    await wrapForRecipients({
      photoId,
      dataKey,
      recipients: recips,
      recipientPublicKeys,
      senderPrivateKeyHex: ownerPrivateKeyHex,
    });

    let chain;
    if (callOnchain && recips.length === 1) {
      const photo = await PhotoRepository.getById(photoId);
      const { sendFeeWei } = await getFees();
      chain = await onchainSendPointer({
        fromPrivateKey: ownerPrivateKeyHex,
        toAddress: recips[0],
        storageRef: photo.storage_ref,
        sha256hex: photo.sha256_hex,
        photoId,
        valueWei: sendFeeWei,
      });
    }

    return { ok: true, chain_tx: chain?.hash };
  },

  async keyForRecipientEnforcingPayment(photoId, recipientAddress) {
  const who = toAddress(recipientAddress);
  const paid = await hasUnlocked(photoId, who);
  if (!paid) { const e = new Error("unlock_fee_required"); e.code="UNLOCK_FEE_REQUIRED"; throw e; }

  const keyRow = await PhotoRepository.getWrappedKey(photoId, who);
  if (!keyRow) throw new Error("No key for recipient");
  const photo = await PhotoRepository.getById(photoId);
  if (!photo) throw new Error("Photo not found");

  return {
    photoId,
    iv_base64: photo.iv_base64,
    wrap_version: keyRow.wrap_version,
    sender_pubkey_uncompressed: keyRow.sender_pubkey_uncomp, 
    wrapped_key_hex: keyRow.wrapped_key_hex,
    storage_ref: photo.storage_ref,
    mime_type: photo.mime_type,
    bytes_size: photo.bytes_size,
    sha256_hex: photo.sha256_hex,
  };
},

  async listOwned(address)  { return PhotoRepository.listByOwner(address); },
  async listInbox(address)  { return PhotoRepository.listForRecipient(address); },
  async downloadEncrypted(photoId, as) {
    const photo = await PhotoRepository.getById(Number(photoId));
    if (!photo) throw new Error("Photo not found");
    if (as) {
      const ok = await PhotoRepository.canView(photoId, as);
      if (!ok) { const e = new Error("Forbidden"); e.status = 403; throw e; }
    }
    const blob = await readFile(photo.storage_ref);
    return { blob, photo };
  },
  async touch(photoId, fields) { return PhotoRepository.touch(photoId, fields); },
  remove(photoId) { return PhotoRepository.remove(photoId); },
};
