import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { NavbarComponent } from './navbar/navbar.component';
import { SiweService } from './services/siwe.service';
import { UserService } from './services/user.service';

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

  ngOnInit(): void {
    console.log('[AppComponent] ngOnInit -> call siwe.refreshMe()');
    this.siwe.refreshMe();
  }
}
