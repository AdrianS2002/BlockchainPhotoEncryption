import { Routes } from '@angular/router';
import {EncryptionDecriptionComponent} from './encryption/encryption.component'
import { AuthComponent } from './auth/auth.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { DecryptionComponent } from './decryption/decryption.component';
import { authGuard } from './guards/auth.guard';
export const routes: Routes = [
    { path: 'encryption_decryption', component: EncryptionDecriptionComponent},
    {path: 'user-profile', component: UserProfileComponent, canActivate: [authGuard]},
    {path: 'decrypt', component: DecryptionComponent},
    { path: 'auth', component: AuthComponent },
    { path: '**', redirectTo: 'auth' }
];
