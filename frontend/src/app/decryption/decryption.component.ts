import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoApiService } from '../services/photo.service';
import { UserService } from '../services/user.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { decryptPhotoBin, deriveKek, unwrapDataKey, viewToArrayBuffer } from '../utils/crypto.util';

type Sender = { name?: string; address: string };
type DecryptItem = {
  id: string;
  sender: Sender;
  imageUrl: string;
  encrypted: boolean;
  decrypting?: boolean;
};

@Component({
  selector: 'app-decryption',
  imports: [CommonModule],
  templateUrl: './decryption.component.html',
  styleUrl: './decryption.component.css'
})
export class DecryptionComponent implements OnInit {
  items: DecryptItem[] = [];
  loading = false;
  private sub?: Subscription;

  constructor(private photoApi: PhotoApiService, private userService: UserService) { }

  ngOnInit() {
    console.log('[Decryption] ngOnInit');
    this.sub = this.userService.dbUser$.subscribe(u => {
      console.log('[Decryption] dbUser$ ->', u);
      if (!u?.eth_address) { this.items = []; return; }
      this.loadInbox(u.eth_address);
    });
  }

  loadInbox(address: string) {
    console.log('[Decryption] loadInbox for', address);
    this.loading = true;
    this.photoApi.inbox(address).subscribe({
      next: (res) => {
        console.log('[Decryption] inbox response items:', res?.items?.length, res?.items?.slice?.(0, 3));
        this.items = (res.items ?? [])
          .map((it: any) => {
            const pid = it.id ?? it.photoId ?? it.photo_id;
            if (pid == null) {
              console.warn('[Decryption] item without id -> skip', it);
              return null;
            }
            const sender = it.owner_address ?? it.sender ?? it.from ?? '';
            const mapped: DecryptItem = {
              id: String(pid),
              sender: { address: sender },
              imageUrl: '',
              encrypted: true
            };
            console.log('[Decryption] mapped item:', mapped);
            return mapped;
          })
          .filter(Boolean) as DecryptItem[];
      },
      error: (err) => {
        console.error('[Decryption] inbox error', err);
      },
      complete: () => {
        this.loading = false;
        console.log('[Decryption] loadInbox complete. items=', this.items);
      }
    });
  }

  trackById = (_: number, it: DecryptItem) => it.id;

  short(addr: string) {
    if (!addr) return '';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  async decrypt(item: DecryptItem) {
    if (!item.encrypted || item.decrypting) return;
    item.decrypting = true;
    console.log('[Decryption] decrypt start for', item.id);

    try {
      const addr = this.userService.dbUser?.eth_address!;
      const photoId = Number(item.id);

 
      const st = await this.photoApi.ensurePaidDev(photoId, addr);
      console.log('[Decryption] ensurePaidDev result:', st);


      console.log('[Decryption] fetch key() …');
      const k = await firstValueFrom(this.photoApi.key(photoId, addr));
      console.log('[Decryption] key response:', k);

  
      console.log('[Decryption] downloadEncrypted…');
      const encBlob = await firstValueFrom(this.photoApi.downloadEncrypted(photoId, addr));
      const encBuf = await encBlob.arrayBuffer();
      console.log('[Decryption] enc size=', encBuf.byteLength);

 
      const dev = await firstValueFrom(this.photoApi.devPrivateKey(addr));
      const kek = deriveKek(k.sender_pubkey_uncompressed, dev.privateKey); 
      const dataKey = await unwrapDataKey(k.wrapped_key_hex, kek);       


      const plainU8 = await decryptPhotoBin(encBuf, dataKey);            

      const ab = viewToArrayBuffer(plainU8);   
      const outBlob = new Blob([ab], { type: k.mime_type || 'image/png' });
      item.imageUrl = URL.createObjectURL(outBlob);
      item.encrypted = false;
      console.log('[Decryption] imageUrl set:', item.imageUrl, 'mime=', k.mime_type);
    } catch (e) {
      console.error('[Decryption] decrypt failed', e);
      alert((e as any)?.message || 'Decrypt failed');
    } finally {
      item.decrypting = false;
      console.log('[Decryption] decrypt end for', item.id);
    }
  }
}


