import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

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

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers() {

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
    return false;
  }

  short(addr: string): string {
    return "asdad"
  }

  async encryptAndSend() {

  }

  async decryptLocal() {


  }
}