import { Component } from '@angular/core';
import { AuthComponent } from './auth/auth.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

}
