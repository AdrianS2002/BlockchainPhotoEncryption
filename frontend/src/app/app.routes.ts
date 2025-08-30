import { Routes } from '@angular/router';
import {EncryptionDecriptionComponent} from './encryption/encryption.component'
import { AuthComponent } from './auth/auth.component';
export const routes: Routes = [
    { path: 'encryption_decryption', component: EncryptionDecriptionComponent},
    { path: 'auth', component: AuthComponent },
    { path: '**', redirectTo: 'auth' }
];
