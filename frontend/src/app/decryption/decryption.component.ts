import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoApiService } from '../services/photo.service';
import { UserService } from '../services/user.service';
import { firstValueFrom, Subscription } from 'rxjs';

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
    this.sub = this.userService.dbUser$.subscribe(u => {
      if (!u?.eth_address) { this.items = []; return; }
      this.loadInbox(u.eth_address);
    });
  }

  loadInbox(address: string) {
    this.loading = true;
    this.photoApi.inbox(address).subscribe({
      next: (res) => {
        this.items = (res.items ?? [])
          .map((it: any) => {
            const pid = it.id ?? it.photoId ?? it.photo_id;   // <- important!
            if (pid == null) return null; // respinge rândurile fără ID
            return {
              id: String(pid),
              sender: { address: it.owner_address ?? it.sender ?? it.from ?? '' },
              imageUrl: '',               // NU pune /download aici; îl setezi după decrypt
              encrypted: true
            } as DecryptItem;
          })
          .filter(Boolean) as DecryptItem[];
      },
      error: (err) => console.error('Inbox error', err),
      complete: () => (this.loading = false)
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
    try {
      const addr = this.userService.dbUser?.eth_address!;
      const photoId = Number(item.id);

      await this.photoApi.ensurePaidDev(photoId, addr);

      const blob = await firstValueFrom(this.photoApi.downloadEncrypted(photoId, addr));
      item.imageUrl = URL.createObjectURL(blob);
      item.encrypted = false;

      item.encrypted = false;
    } catch (e) {
      console.error('decrypt failed', e);
      alert((e as any)?.message || 'Decrypt failed');
    } finally {
      item.decrypting = false;
    }
  }
}