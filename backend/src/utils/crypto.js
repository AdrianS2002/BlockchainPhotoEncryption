
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { keccak256, SigningKey } from 'ethers';


export function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function aes256gcmEncrypt(plaintext ) {
  const key = randomBytes(32);    
  const iv  = randomBytes(12);    
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { enc, key, iv, tag };
}

export function aes256gcmDecrypt(enc, key, iv, tag) {
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}

function kdfFromSharedSecret(shared ) {
  return Buffer.from(keccak256(shared).slice(2), 'hex'); 
}

export function eciesWrapDataKey({ recipientPublicKeyUncompressedHex, senderPrivateKeyHex, dataKey }) {
  if (!recipientPublicKeyUncompressedHex?.startsWith('0x04')) {
    throw new Error('Recipient public key trebuie să fie necomprimată (0x04...)');
  }
  const sk = new SigningKey(senderPrivateKeyHex);
  const shared = sk.computeSharedSecret(recipientPublicKeyUncompressedHex); 
  const kek = kdfFromSharedSecret(shared); 

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', kek, iv);
  const wrapped = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    wrap_version: 'ecies-secp256k1/aes-256-gcm',
    wrapped_key_hex: Buffer.concat([iv, tag, wrapped]).toString('hex'),
  };
}

export function eciesUnwrapDataKey({ senderPublicKeyUncompressedHex, recipientPrivateKeyHex, wrappedHex }) {
  if (!senderPublicKeyUncompressedHex?.startsWith('0x04')) {
    throw new Error('Sender public key trebuie să fie necomprimată (0x04...)');
  }
  const sk = new SigningKey(recipientPrivateKeyHex);
  const shared = sk.computeSharedSecret(senderPublicKeyUncompressedHex); 
  const kek = kdfFromSharedSecret(shared);

  const buf = Buffer.from(wrappedHex, 'hex');
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);

  const decipher = createDecipheriv('aes-256-gcm', kek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
