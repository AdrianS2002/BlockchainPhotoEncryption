import { Routes } from '@angular/router';
import {EncryptionDecriptionComponent} from './encryption/encryption.component'
import { AuthComponent } from './auth/auth.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
export const routes: Routes = [
    { path: 'encryption_decryption', component: EncryptionDecriptionComponent},
    {path: 'user-profile', component: UserProfileComponent},
    { path: 'auth', component: AuthComponent },
    { path: '**', redirectTo: 'auth' }
];
