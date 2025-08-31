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
    // Populează formularul din DB user
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
    const addr = this.form.getRawValue().eth_address;
    const first_name = this.form.get('first_name')?.value || '';
    const last_name  = this.form.get('last_name')?.value || '';
    if (!addr) { this.error = 'Nu există adresă de utilizator.'; return; }

    this.loading = true;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.siwe.token) headers['Authorization'] = `Bearer ${this.siwe.token}`;

      const resp = await fetch(`http://localhost:4000/users/${addr}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ first_name, last_name }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `Update failed (${resp.status})`);

      // Reîmprospătează user-ul din DB în serviciu
      await this.userService.refreshByAddress(addr);
      this.zone.run(() => this.okMessage = 'Profil actualizat cu succes.');
    } catch (e: any) {
      this.zone.run(() => this.error = e?.message || 'Eroare la actualizare.');
    } finally {
      this.zone.run(() => this.loading = false);
    }
  }
}