import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import detectEthereumProvider from '@metamask/detect-provider';
import { BrowserProvider, getAddress } from 'ethers';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule],
    templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']

})
export class AuthComponent {
  private api = 'http://localhost:4000';
  loading = false;
  switching = false;
  error = '';
  address = '';
  token = '';
  me: any = null;
  clientId: string | null = null;
  networkWarn = false;

  private async ethProvider(): Promise<any> {
    const p = await detectEthereumProvider({ mustBeMetaMask: true }) as any;
    if (!p) throw new Error('MetaMask nu este instalat.');
    return p;
  }

  public async ensureHardhatNetwork() {
    this.switching = true;
    this.error = '';
    try {
      const p = await this.ethProvider();
      const current = await p.request({ method: 'eth_chainId' });
      if (current === '0x7a69') { 
        this.networkWarn = false;
        return;
      }

      await p.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }] 
      });
      this.networkWarn = false;
    } catch (e: any) {
  
      if (e?.code === 4902) {
        try {
          const p = await this.ethProvider();
          await p.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '539',
              chainName: 'Hardhat Localhost 1337',
              rpcUrls: ['http://127.0.0.1:8545'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
            }]
          });
          this.networkWarn = false;
        } catch (err: any) {
          this.error = err?.message || 'Nu s-a putut adăuga rețeaua Hardhat.';
        }
      } else {
        this.error = e?.message || 'Nu s-a putut comuta rețeaua.';
      }
    } finally {
      this.switching = false;
    }
  }

  private async checkNetworkWarn() {
    try {
      const p = await this.ethProvider();
      const chainId = await p.request({ method: 'eth_chainId' });
      this.networkWarn = chainId !== '539';
    } catch {
      this.networkWarn = true;
    }
  }

  private async getNonce(): Promise<{ nonce: string; clientId: string }> {
    const res = await fetch(`${this.api}/auth/nonce`, { credentials: 'include' });
    const data = await res.json(); 
    this.clientId = data.clientId;
    return data;
  }

  private buildSiweMessage(params: {
    address: string;
    nonce: string;
    chainId?: number;
    domain?: string;
    uri?: string;
    statement?: string;
  }): string {
    const domain = params.domain ?? window.location.hostname; 
    const origin = params.uri ?? window.location.origin;
    const chainId = params.chainId ?? 31337;
    const checksum = getAddress(params.address);

    const lines: string[] = [];
    lines.push(`${domain} wants you to sign in with your Ethereum account:`);
    lines.push(`${checksum}`);
    lines.push('');

    if (params.statement) {
      lines.push(params.statement);
      lines.push('');
    }

    lines.push(`URI: ${origin}`);
    lines.push(`Version: 1`);
    lines.push(`Chain ID: ${chainId}`);
    lines.push(`Nonce: ${params.nonce}`);
    lines.push(`Issued At: ${new Date().toISOString()}`);

    return lines.join('\n');
  }

  copy(value: string) {
    navigator.clipboard?.writeText(value);
  }

  reset() {
    this.error = '';
    this.address = '';
    this.token = '';
    this.me = null;
   
  }

  async login() {
    this.loading = true;
    this.error = '';
    this.me = null;

    try {
      await this.checkNetworkWarn();
      if (this.networkWarn) {
        await this.ensureHardhatNetwork();
        if (this.networkWarn) throw new Error('Comută pe Hardhat (1337) și reîncearcă.');
      }

      const providerObj: any = await this.ethProvider();


      const [addressRaw] = await providerObj.request({ method: 'eth_requestAccounts' });
      const address = getAddress(addressRaw);


      const { nonce } = await this.getNonce();

      const message = this.buildSiweMessage({
        address,
        nonce,
        chainId: 1337,
        statement: 'Autentificare via SIWE (Hardhat 1337).'
      });

      const provider = new BrowserProvider(providerObj);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const resp = await fetch(`${this.api}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, signature, clientId: this.clientId })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Verify failed');

      this.address = address;
      this.token = data.token;
    } catch (e: any) {
      this.error = e?.message || 'Eroare la login';
    } finally {
      this.loading = false;
    }
  }

  async whoAmI() {
    this.error = '';
    this.me = null;
    try {
      const headers: Record<string, string> = {};
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
      const resp = await fetch(`${this.api}/me`, { headers, credentials: 'include' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Unauthorized');
      this.me = data;
    } catch (e: any) {
      this.error = e?.message || 'Eroare /me';
    }
  }

  async ngOnInit() {
    await this.checkNetworkWarn();
  }
}
