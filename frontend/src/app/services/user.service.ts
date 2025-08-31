import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import detectEthereumProvider from '@metamask/detect-provider';
import { SiweService } from './siwe.service';

export interface DbUser {
  id: number;
  eth_address: string;
  first_name: string;
  last_name: string;
  created_at?: string;
  updated_at?: string;
}

function extractEthAddress(obj: any): string {
  const candidates = [
    obj?.ethAddress,
    obj?.address,
    obj?.sub,                       // din JWT
    obj?.user?.eth_address,         // răspuns backend { user: { eth_address } }
    obj?.user?.ethAddress,
    obj?.user?.address
  ].filter(Boolean);

  const first = candidates.find((x: any) => typeof x === 'string' && x.toLowerCase().startsWith('0x')) || '';
  return first ? String(first).toLowerCase() : '';
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = 'http://localhost:4000';
  private siwe = inject(SiweService);

  private dbUserSubject = new BehaviorSubject<DbUser | null>(null);
  dbUser$ = this.dbUserSubject.asObservable();
  loggedIn$ = this.dbUser$.pipe(map(Boolean), distinctUntilChanged());

  get dbUser(): DbUser | null { return this.dbUserSubject.value; }
  get isLoggedIn(): boolean { return !!this.dbUserSubject.value; }

  constructor() {
    console.log('[UserService] ctor');

    this.loggedIn$.subscribe(v => console.log('[UserService] loggedIn$ ->', v));

    // 🔎 Corelează SIWE -> DB (cu extractor + log-uri)
    this.siwe.user$.subscribe((siweUser) => {
      const addr = extractEthAddress(siweUser);
      console.log('[UserService] siwe.user$ emitted:', siweUser, ' | extracted addr:', addr);
      if (!addr) { this.dbUserSubject.next(null); return; }
      this.refreshByAddress(addr);
    });

    this.listenAccountsChanged();
  }

  async refreshByAddress(address: string): Promise<void> {
    console.log('[UserService] refreshByAddress() ->', address);
    try {
      const headers: Record<string, string> = {};
      if (this.siwe.token) headers['Authorization'] = `Bearer ${this.siwe.token}`;
      const url = `${this.api}/users/${address}`;
      console.log('[UserService] GET', url, 'headers=', headers);
      const resp = await fetch(url, { headers, credentials: 'include' });
      console.log('[UserService] /users/:address status:', resp.status);
      const data = await resp.json().catch(() => ({}));
      console.log('[UserService] /users/:address body:', data);

      if (!resp.ok) throw new Error(JSON.stringify(data));

      const user: DbUser | undefined = data?.user ?? data;
      console.log('[UserService] mapped DB user:', user);
      this.dbUserSubject.next(user ?? null);
    } catch (e) {
      console.warn('[UserService] refreshByAddress failed:', e);
      this.dbUserSubject.next(null);
    }
  }

  clear() {
    console.log('[UserService] clear()');
    this.dbUserSubject.next(null);
  }

  private async listenAccountsChanged() {
    const provider: any = await detectEthereumProvider({ mustBeMetaMask: true });
    if (!provider?.on) { console.log('[UserService] accountsChanged listener not available'); return; }

    provider.on('accountsChanged', (accounts: string[]) => {
      console.log('[UserService] accountsChanged ->', accounts);
      const newAddr = (accounts?.[0] ?? '').toLowerCase();
      const currentDbAddr = (this.dbUserSubject.value?.eth_address ?? '').toLowerCase();

      if (!newAddr) { this.siwe.logout(); this.clear(); return; }
      if (newAddr !== currentDbAddr) { this.refreshByAddress(newAddr); }
    });
  }
}
