import { Injectable } from '@angular/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { BrowserProvider, getAddress } from 'ethers';

@Injectable({ providedIn: 'root' })
export class SiweService {
    private api = "http://localhost:4000";
    private clientId: string | null = null;

    async isMetaMaskAvailable(): Promise<boolean> {
        const provider = await detectEthereumProvider({ mustBeMetaMask: true });
        return !!provider;
    }

    async requestAccounts(): Promise<string> {
        const provider: any = await detectEthereumProvider({ mustBeMetaMask: true });
        if (!provider) throw new Error('MetaMask nu este instalat.');
        const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts?.length) throw new Error('Nu s-a obținut niciun cont.');
        return accounts[0];
    }

    async getNonce(): Promise<{ nonce: string; clientId: string }> {
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
        const chainId = params.chainId ?? 1337;

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

    async signIn(): Promise<{ address: string; token: string; user: any }> {
        const providerObj: any = await detectEthereumProvider({ mustBeMetaMask: true });
        if (!providerObj) throw new Error('MetaMask nu este instalat.');

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

        return data;
    }


    async me(token?: string) {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const resp = await fetch(`${this.api}/me`, { headers, credentials: 'include' });
        if (!resp.ok) throw new Error('Unauthorized');
        return await resp.json();
    }
}
