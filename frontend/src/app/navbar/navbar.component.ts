import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { SiweService } from '../services/siwe.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  public user = inject(UserService);
  private router = inject(Router);
  private siwe = inject(SiweService);

  ngOnInit() { console.log('[Navbar] created'); }
  ngOnDestroy() { console.log('[Navbar] destroyed'); }

  navigateToEncrypt() { console.log('[Navbar] -> /encrypt'); this.router.navigate(['/encryption_decryption']); }
  navigateToDecrypt() { console.log('[Navbar] -> /decrypt'); this.router.navigate(['/decrypt']); }
  navigateToUserProfile() { console.log('[Navbar] -> /user-profile'); this.router.navigate(['/user-profile']); }
  logout() { console.log('[Navbar] logout clicked'); this.siwe.logout(); this.user.clear(); this.router.navigateByUrl('/auth'); }
}
