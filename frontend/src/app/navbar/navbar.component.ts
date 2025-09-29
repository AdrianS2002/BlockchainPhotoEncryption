import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { SiweService } from '../services/siwe.service';
import { TransitionService } from '../services/transition.service';
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
  private transitionService = inject(TransitionService);

  ngOnInit() { console.log('[Navbar] created'); }
  ngOnDestroy() { console.log('[Navbar] destroyed'); }

  navigateWithTransition(path: string): void {
    this.transitionService.animateTransition().then(() => {
      this.router.navigateByUrl(path);
    });
  }

  navigateToEncrypt() { console.log('[Navbar] -> /encrypt'); this.navigateWithTransition('/encryption_decryption'); }
  navigateToDecrypt() { console.log('[Navbar] -> /decrypt'); this.navigateWithTransition('/decrypt'); }
  navigateToUserProfile() { console.log('[Navbar] -> /user-profile'); this.navigateWithTransition('/user-profile'); }
  logout() { console.log('[Navbar] logout clicked'); this.siwe.logout(); this.user.clear(); this.navigateWithTransition('/auth'); }
}
