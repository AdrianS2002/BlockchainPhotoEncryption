import { Component, inject, NgZone, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { SiweService } from '../services/siwe.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  public userService = inject(UserService);
  private siwe = inject(SiweService);
  private zone = inject(NgZone);

  loading = false;
  error = '';
  okMessage = '';

  form = this.fb.group({
    eth_address: [{ value: '', disabled: true }],
    first_name: [''],
    last_name: [''],
    created_at: [{ value: '', disabled: true }],
    updated_at: [{ value: '', disabled: true }],
  });
  ngOnInit(): void {
    this.userService.dbUser$.subscribe((u) => {
      if (!u) return;
      this.form.patchValue({
        eth_address: u.eth_address || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        created_at: this.formatDate(u.created_at),
        updated_at: this.formatDate(u.updated_at),
      });
    });
  }

  formatDate(v?: string) {
    if (!v) return '';
    try { return new Date(v).toLocaleString(); } catch { return v; }
  }

  async save() {
    this.error = '';
    this.okMessage = '';
    this.loading = true;

    try {
      const raw = this.form.getRawValue();
      const addr = (raw.eth_address || '').toString().toLowerCase();
      const first_name = (this.form.get('first_name')?.value || '').toString();
      const last_name = (this.form.get('last_name')?.value || '').toString();

      if (!addr) throw new Error('Adresa lipsește.');
      const updated = await this.userService.updateByAddress(addr, { first_name, last_name });
      await this.userService.refreshByAddress(addr);

      const u = this.userService.dbUser ?? updated;
      this.form.patchValue({
        first_name: u.first_name ?? first_name,
        last_name: u.last_name ?? last_name,
        updated_at: u.updated_at ? new Date(u.updated_at).toLocaleString() : '',
      });

      this.okMessage = 'Profil actualizat cu succes.';
    } catch (e: any) {
      this.error = e?.message || 'Eroare la actualizare.';
    } finally {
      this.loading = false;
    }
  }
}