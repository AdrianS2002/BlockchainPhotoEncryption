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
  sender_pubkey_uncompressed: string;
  wrapped_key_hex: string;             
  storage_ref: string;
  mime_type: string;
  bytes_size: number;
  sha256_hex: string;
};

@Injectable({ providedIn: 'root' })
export class PhotoApiService {
  private base = 'http://localhost:4000';

  constructor(private http: HttpClient) {}

  private log(...a: any[]) { console.log('[PhotoApiService]', ...a); }
  private sleep(ms: number) { return new Promise<void>(res => setTimeout(res, ms)); }

  fees() {
    this.log('GET /photos/fees');
    return this.http.get<Fees>(`${this.base}/photos/fees`);
  }

  upload(form: FormData) {
    this.log('POST /photos (upload)', 'form keys=', Array.from(form.keys()));
    return this.http.post<UploadResponse>(`${this.base}/photos`, form);
  }

  shareExisting(photoId: number, body: any) {
    this.log('POST /photos/:id/share', { photoId, body });
    return this.http.post<{ ok: boolean; chain_tx?: string }>(`${this.base}/photos/${photoId}/share`, body);
  }

  owned(address: string) {
    this.log('GET /photos/owned/:address', address);
    return this.http.get<{ items: any[] }>(`${this.base}/photos/owned/${address}`);
  }

  inbox(address: string) {
    this.log('GET /photos/inbox/:address', address);
    return this.http.get<{ items: any[] }>(`${this.base}/photos/inbox/${address}`);
  }

  status(photoId: number, address: string) {
    this.log('GET /photos/:id/status/:address', { photoId, address });
    return this.http.get<{ paid: boolean; decryptFeeWei: string }>(
      `${this.base}/photos/${photoId}/status/${address}`
    );
  }

  pay(photoId: number, privateKey: string) {
    this.log('POST /photos/:id/pay', { photoId, pkLast4: privateKey?.slice(-4) });
    return this.http.post<{ hash: string }>(`${this.base}/photos/${photoId}/pay`, { privateKey });
  }

  key(photoId: number, address: string) {
    this.log('GET /photos/:id/key/:address', { photoId, address });
    return this.http.get<KeyResponse>(`${this.base}/photos/${photoId}/key/${address}`);
  }

  downloadEncrypted(photoId: number, as?: string) {
    const url = `${this.base}/photos/${photoId}/download`;
    const opts = as
      ? { params: new HttpParams().set('as', as), responseType: 'blob' as const }
      : { responseType: 'blob' as const };
    this.log('GET', url, as ? `(as=${as})` : '');
    return this.http.get(url, opts);
  }

  private devSecretHeader() { return { 'x-dev-secret': 'dev-secret-123' }; }

  devPublicKey(address: string) {
    this.log('GET /dev/public-key/:address', address);
    return this.http.get<{ address: string; publicKeyUncompressed: string }>(
      `${this.base}/dev/public-key/${address}`,
      { headers: this.devSecretHeader() }
    );
  }

  devPrivateKey(address: string) {
    this.log('GET /dev/private-key/:address', address);
    return this.http.get<{ address: string; privateKey: string }>(
      `${this.base}/dev/private-key/${address}`,
      { headers: this.devSecretHeader() }
    );
  }

  async waitUntilPaid(photoId: number, address: string, tries = 12, intervalMs = 800) {
    this.log('waitUntilPaid start', { photoId, address, tries, intervalMs });
    for (let i = 0; i < tries; i++) {
      const st = await firstValueFrom(this.status(photoId, address));
      this.log(`status try ${i + 1}/${tries}:`, st);
      if (st.paid) {
        this.log('waitUntilPaid: PAID');
        return st;
      }
      await this.sleep(intervalMs);
    }
    this.log('waitUntilPaid: TIMEOUT');
    throw new Error('Payment not confirmed in time.');
  }

  async ensurePaid(photoId: number, address: string, getPrivateKey?: () => Promise<string>) {
    this.log('ensurePaid start', { photoId, address });
    const st = await firstValueFrom(this.status(photoId, address));
    this.log('ensurePaid current status:', st);
    if (st.paid) return st;

    if (!getPrivateKey) {
      this.log('ensurePaid: missing getPrivateKey -> throw');
      throw new Error('Unlock fee required. No private key provider available.');
    }

    const pk = await getPrivateKey();
    this.log('ensurePaid: paying now…');
    const payRes = await firstValueFrom(this.pay(photoId, pk));
    this.log('ensurePaid: pay tx hash', payRes.hash);

    const finalSt = await this.waitUntilPaid(photoId, address);
    this.log('ensurePaid: done, final status', finalSt);
    return finalSt;
  }

  async ensurePaidDev(photoId: number, address: string) {
    return this.ensurePaid(photoId, address, async () => {
      const dev = await firstValueFrom(this.devPrivateKey(address));
      this.log('ensurePaidDev: got dev PK (last4)', dev.privateKey?.slice(-4));
      return dev.privateKey;
    });
  }
}
