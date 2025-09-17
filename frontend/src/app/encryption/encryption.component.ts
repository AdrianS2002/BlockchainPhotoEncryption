import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DbUser, UserService } from '../services/user.service';
import { PhotoApiService } from '../services/photo.service';

type UserOpt = { address: string; name?: string };

@Component({
  selector: 'app-encryption-decription',
  imports: [CommonModule, FormsModule],
  templateUrl: './encryption.component.html',
  styleUrl: './encryption.component.css'
})

export class EncryptionDecriptionComponent {

  users: UserOpt[] = [];
  selectedAddress = '';
  file: File | null = null;
  previewUrl: string | null = null;

  loading = false;
  error = '';
  okMessage = '';

  constructor(public userService: UserService, private photoApi: PhotoApiService) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    this.error = '';
    try {
      const dbUsers: DbUser[] = await this.userService.getAll();

      this.users = dbUsers.map(u => {
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
        return {
          address: u.eth_address,
          name: fullName || '(fără nume)'
        };
      });
    } catch (e: any) {
      console.error('[EncryptionDecriptionComponent] loadUsers failed:', e);
      this.error = e.message || 'Nu am putut încărca utilizatorii.';
    } finally {
      this.loading = false;
    }
  }


  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    this.file = f;

    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = f ? URL.createObjectURL(f) : null;
  }

  clearFile() {
    this.file = null;
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }

  canEncrypt(): boolean {
    return !!this.file && !!this.selectedAddress && !!this.userService.dbUser?.eth_address;
  }

  short(addr: string): string {
    if (!addr) return '';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  async encryptAndSend() {
    this.error = ''; this.okMessage = ''; this.loading = true;
    try {
      if (!this.canEncrypt() || !this.file) throw new Error('Selectează fișierul și destinatarul.');
      const owner = (this.userService.dbUser!.eth_address).toLowerCase();
      const recip = this.selectedAddress.toLowerCase();

      // 1) ia cheile din backend/dev (din .env.local)
      const [ownerPub, recipPub, ownerPriv] = await Promise.all([
        this.photoApi.devPublicKey(owner).toPromise(),
        this.photoApi.devPublicKey(recip).toPromise(),
        this.photoApi.devPrivateKey(owner).toPromise(), // PK al owner-ului pentru ECDH + tx on-chain
      ]);

      const recipientPublicKeys = {
        [recip]: recipPub!.publicKeyUncompressed,  // 0x04...
        [owner]: ownerPub!.publicKeyUncompressed,  // self-wrap pentru owner
      };

      // 2) form-data pentru POST /photos (backendul cripta și share-uiește)
      const fd = new FormData();
      fd.append('file', this.file);
      fd.append('ownerAddress', owner);
      fd.append('recipients', JSON.stringify([recip]));
      fd.append('isPrivate', 'true');
      fd.append('callOnchain', 'true'); // sau 'false' dacă nu vrei tx
      fd.append('senderPrivateKeyHex', ownerPriv!.privateKey);
      fd.append('recipientPublicKeys', JSON.stringify(recipientPublicKeys));

      const resp = await this.photoApi.upload(fd).toPromise();
      this.okMessage = `Trimis! photoId=${resp?.photoId} tx=${resp?.chain_tx ?? '-'}`;
    } catch (e: any) {
      console.error(e);
      this.error = e?.error || e?.message || 'Upload failed';
    } finally {
      this.loading = false;
    }
  }

  async decryptLocal() {


  }
}