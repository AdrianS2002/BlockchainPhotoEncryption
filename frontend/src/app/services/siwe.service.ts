import { Injectable } from '@angular/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { BrowserProvider, getAddress } from 'ethers';
import { BehaviorSubject } from 'rxjs';

function extractEthAddressFromMe(me: any): string {
  const cand = [
    me?.ethAddress, me?.address, me?.sub,
    me?.user?.eth_address, me?.user?.ethAddress, me?.user?.address
  ].find((x: any) => typeof x === 'string' && x.toLowerCase().startsWith('0x'));
  return cand ? String(cand).toLowerCase() : '';
}

@Injectable({ providedIn: 'root' })
export class SiweService {
  private api = 'http://localhost:4000';
  private clientId: string | null = null;

  private userSubject = new BehaviorSubject<any | null>(null);
  user$ = this.userSubject.asObservable();

  private tokenKey = 'siwe_token';
  get token(): string | null { return localStorage.getItem(this.tokenKey); }

  private setSession(token: string, user: any) {
    const addr = extractEthAddressFromMe(user);
    const normalized = { ...user, address: addr || user?.address, ethAddress: addr || user?.ethAddress };
    console.log('[SIWE] setSession() normalized user:', normalized);
    localStorage.setItem(this.tokenKey, token);
    this.userSubject.next(normalized ?? null);
  }

  logout() {
    console.log('[SIWE] logout() -> clear token & user');
    localStorage.removeItem(this.tokenKey);
    this.userSubject.next(null);
  }

  async refreshMe() {
    console.log('[SIWE] refreshMe() start. token?', !!this.token);
    try {
      const me = await this.me(this.token ?? undefined);
      const addr = extractEthAddressFromMe(me);
      const normalized = ('user' in me)
        ? { ...(me.user || {}), address: addr || me.user?.address, ethAddress: addr || me.user?.ethAddress }
        : { ...me, address: addr || me?.address, ethAddress: addr || me?.ethAddress };

      console.log('[SIWE] /me OK. normalized ->', normalized);
      this.userSubject.next(normalized);
    } catch (e) {
      console.warn('[SIWE] /me failed:', e);
      this.logout();
    }
  }

  async getNonce(): Promise<{ nonce: string; clientId: string }> {
    console.log('[SIWE] GET /auth/nonce');
    const res = await fetch(`${this.api}/auth/nonce`, { credentials: 'include' });
    console.log('[SIWE] /auth/nonce status:', res.status);
    const data = await res.json();
    console.log('[SIWE] /auth/nonce body:', data);
    this.clientId = data.clientId;
    return data;
  }

  private buildSiweMessage(params: { address: string; nonce: string; chainId?: number; domain?: string; uri?: string; statement?: string; }): string {
    const domain = params.domain ?? window.location.hostname;
    const origin = params.uri ?? window.location.origin;
    const chainId = params.chainId ?? 1337;
    const checksum = getAddress(params.address);
    const msg = [
      `${domain} wants you to sign in with your Ethereum account:`,
      checksum, '',
      params.statement ?? '',
      params.statement ? '' : '',
      `URI: ${origin}`,
      `Version: 1`,
      `Chain ID: ${chainId}`,
      `Nonce: ${params.nonce}`,
      `Issued At: ${new Date().toISOString()}`
    ].filter(Boolean).join('\n');
    console.log('[SIWE] built message:\n', msg);
    return msg;
  }

  async signIn(): Promise<void> {
    console.log('[SIWE] signIn() start');
    const providerObj: any = await detectEthereumProvider({ mustBeMetaMask: true });
    if (!providerObj) throw new Error('MetaMask nu este instalat.');

    const [addressRaw] = await providerObj.request({ method: 'eth_requestAccounts' });
    const address = getAddress(addressRaw);
    console.log('[SIWE] eth_requestAccounts ->', address);

    const { nonce } = await this.getNonce();
    const message = this.buildSiweMessage({ address, nonce, chainId: 1337, statement: 'Autentificare via SIWE (Hardhat 1337).' });

    const provider = new BrowserProvider(providerObj);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);
    console.log('[SIWE] signature (short):', signature.slice(0, 14) + '...');

    const resp = await fetch(`${this.api}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, signature, clientId: this.clientId }),
    });
    console.log('[SIWE] POST /auth/verify status:', resp.status);
    const data = await resp.json().catch(() => ({}));
    console.log('[SIWE] /auth/verify body:', data);

    if (!resp.ok) throw new Error(data?.error || 'Verify failed');

    this.setSession(data.token, data.user ?? { address: data.address });
    console.log('[SIWE] signIn() done.');
  }

  async me(token?: string) {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    console.log('[SIWE] GET /me. hasToken?', !!token);
    const resp = await fetch(`${this.api}/me`, { headers, credentials: 'include' });
    console.log('[SIWE] /me status:', resp.status);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      console.warn('[SIWE] /me not ok. body:', txt);
      throw new Error('Unauthorized');
    }
    const body = await resp.json();
    console.log('[SIWE] /me body:', body);
    return body;
  }
}
