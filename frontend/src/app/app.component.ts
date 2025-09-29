import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { NavbarComponent } from './navbar/navbar.component';
import { SiweService } from './services/siwe.service';
import { UserService } from './services/user.service';
import { filter } from 'rxjs';
import { gsap } from 'gsap';
import { TransitionService } from './services/transition.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, NavbarComponent, AsyncPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public user = inject(UserService);
  private siwe = inject(SiweService);
  private router = inject(Router);
  private transitionService = inject(TransitionService);
  ngOnInit(): void {
    console.log('[AppComponent] ngOnInit -> call siwe.refreshMe()');
    this.siwe.refreshMe();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.transitionService.revealTransition().then(() => {
        gsap.set('.block', { visibility: 'hidden' });
      });
    });
  }
}
