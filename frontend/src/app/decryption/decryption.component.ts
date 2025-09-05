import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class DecryptionComponent {
items: DecryptItem[] = [
    {
      id: 'msg-1',
      sender: { name: 'Alice', address: '0xA1b2c3D4E5F678901234567890ABCDEF12345678' },
      imageUrl: 'https://picsum.photos/id/1025/600/400', 
      encrypted: true,
    },
    {
      id: 'msg-2',
      sender: { name: 'Bob', address: '0x15D34AAf54267DB7D7C367839AaF71a00A2C6A65' },
      imageUrl: 'https://picsum.photos/id/1015/600/400', 
      encrypted: false,
    },
  ];
  trackById = (_: number, it: DecryptItem) => it.id;

  short(addr: string) {
    if (!addr) return '';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  async decrypt(item: DecryptItem) {
    if (!item.encrypted || item.decrypting) return;

    item.decrypting = true;
    await new Promise(r => setTimeout(r, 1500));
    item.encrypted = false;
    item.decrypting = false;
  }
}