import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type Fees = { contract: string; sendFeeWei: string; decryptFeeWei: string };

export type UploadResponse = {
  photoId: number;
  storage_ref: string;
  sha256_hex: string;
  chain_tx?: string;
};

export type KeyResponse = {
  photoId: number;
  iv_base64: string;
  wrap_version: string;
  sender_pubkey_uncompressed: string; // 0x04...
  wrapped_key_hex: string;             // hex fără 0x
  storage_ref: string;
  mime_type: string;
  bytes_size: number;
  sha256_hex: string;
};

@Injectable({ providedIn: 'root' })
export class PhotoApiService {
  // ajustează dacă ai alt BACKEND_URL
  private base = 'http://localhost:4000';

  constructor(private http: HttpClient) { }

  fees() {
    return this.http.get<Fees>(`${this.base}/photos/fees`);
  }

  upload(form: FormData) {
    return this.http.post<UploadResponse>(`${this.base}/photos`, form);
  }

  shareExisting(photoId: number, body: any) {
    return this.http.post<{ ok: boolean; chain_tx?: string }>(`${this.base}/photos/${photoId}/share`, body);
  }

  owned(address: string) {
    return this.http.get<{ items: any[] }>(`${this.base}/photos/owned/${address}`);
  }

  inbox(address: string) {
    return this.http.get<{ items: any[] }>(`${this.base}/photos/inbox/${address}`);
  }

  status(photoId: number, address: string) {
    return this.http.get<{ paid: boolean; decryptFeeWei: string }>(
      `${this.base}/photos/${photoId}/status/${address}`
    );
  }

  pay(photoId: number, privateKey: string) {
    return this.http.post<{ hash: string }>(`${this.base}/photos/${photoId}/pay`, { privateKey });
  }

  key(photoId: number, address: string) {
    return this.http.get<KeyResponse>(`${this.base}/photos/${photoId}/key/${address}`);
  }

  downloadEncrypted(photoId: number, as?: string) {
    let url = `${this.base}/photos/${photoId}/download`;
    if (as) {
      const p = new HttpParams().set('as', as);
      return this.http.get(url, { responseType: 'blob', params: p });
    }
    return this.http.get(url, { responseType: 'blob' });
  }

  devSecretHeader() {
    return { 'x-dev-secret': 'dev-secret-123' };
  }

  devPublicKey(address: string) {
    return this.http.get<{ address: string; publicKeyUncompressed: string }>(
      `${this.base}/dev/public-key/${address}`,
      { headers: this.devSecretHeader() }
    );
  }

  devPrivateKey(address: string) {
    return this.http.get<{ address: string; privateKey: string }>(
      `${this.base}/dev/private-key/${address}`,
      { headers: this.devSecretHeader() }
    );
  }

   private sleep(ms: number) {
    return new Promise<void>(res => setTimeout(res, ms));
  }

  async waitUntilPaid(photoId: number, address: string, tries = 12, intervalMs = 800) {
    for (let i = 0; i < tries; i++) {
      const st = await firstValueFrom(this.status(photoId, address));
      if (st.paid) return st;
      await this.sleep(intervalMs);
    }
    throw new Error('Payment not confirmed in time.');
  }

  async ensurePaid(
    photoId: number,
    address: string,
    getPrivateKey?: () => Promise<string>
  ) {
    const st = await firstValueFrom(this.status(photoId, address));
    if (st.paid) return st;

    if (!getPrivateKey) {
      throw new Error('Unlock fee required. No private key provider available.');
    }

    const pk = await getPrivateKey();
    await firstValueFrom(this.pay(photoId, pk));   // trimite plata
    return this.waitUntilPaid(photoId, address);   // așteaptă confirmarea
  }

   async ensurePaidDev(photoId: number, address: string) {
    return this.ensurePaid(photoId, address, async () => {
      const dev = await firstValueFrom(this.devPrivateKey(address));
      return dev.privateKey;
    });
  }

}
