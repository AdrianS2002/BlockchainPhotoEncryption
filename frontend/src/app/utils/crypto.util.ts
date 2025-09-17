import { ethers } from 'ethers';

export function viewToArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(
    view.byteOffset,
    view.byteOffset + view.byteLength
  ) as ArrayBuffer; 
}
export function deriveKek(senderPubUncompressed: string, recipientPrivateKey: string): Uint8Array {
  const sk = new ethers.SigningKey(recipientPrivateKey);
  const shared = sk.computeSharedSecret(senderPubUncompressed);       
  const hash = ethers.keccak256(shared);                              
  return ethers.getBytes(hash);                                
}

export async function unwrapDataKey(wrappedHex: string, kek: Uint8Array): Promise<Uint8Array> {
  const buf = ethers.getBytes(wrappedHex.startsWith('0x') ? wrappedHex : ('0x' + wrappedHex));
  const iv  = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const ct  = buf.slice(28);

  const ctPlusTag = new Uint8Array(ct.length + tag.length);
  ctPlusTag.set(ct, 0);
  ctPlusTag.set(tag, ct.length);

  const key = await crypto.subtle.importKey(
    'raw',
    viewToArrayBuffer(kek),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: viewToArrayBuffer(iv) },
    key,
    viewToArrayBuffer(ctPlusTag)
  );

  return new Uint8Array(plain);
}

export async function decryptPhotoBin(bin: ArrayBuffer, dataKey: Uint8Array): Promise<Uint8Array> {
  const u8  = new Uint8Array(bin);
  const iv  = u8.slice(0, 12);
  const tag = u8.slice(12, 28);
  const ct  = u8.slice(28);

  const ctPlusTag = new Uint8Array(ct.length + tag.length);
  ctPlusTag.set(ct, 0);
  ctPlusTag.set(tag, ct.length);

  const key = await crypto.subtle.importKey(
    'raw',
    viewToArrayBuffer(dataKey),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: viewToArrayBuffer(iv) },
    key,
    viewToArrayBuffer(ctPlusTag)
  );

  return new Uint8Array(plain);
}
