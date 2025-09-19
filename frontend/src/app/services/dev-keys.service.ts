import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export type DevPubKey = { address: string; publicKeyUncompressed: string; publicKeyCompressed: string };
export type DevPrivKey = { address: string; privateKey: string };

@Injectable({ providedIn: 'root' })
export class DevKeysService {
  private base = 'http://localhost:4000';
  private devSecret = 'dev-secret-123';

  constructor(private http: HttpClient) {}

  publicKey(address: string) {
    return this.http.get<DevPubKey>(`${this.base}/dev/public-key/${address}`);
  }
  privateKey(address: string) {
    const headers = new HttpHeaders({ 'x-dev-secret': this.devSecret });
    return this.http.get<DevPrivKey>(`${this.base}/dev/private-key/${address}`, { headers });
  }
}
