import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from } from 'rxjs';
import { switchMap, take, map } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { SiweService } from '../services/siwe.service';

export const authGuard: CanActivateFn = (route, state) => {
  const user = inject(UserService);
  const siwe = inject(SiweService);
  const router = inject(Router);
  console.log('[AuthGuard] for', state.url, '| isLoggedIn?', user.isLoggedIn, '| token?', !!siwe.token);
  const maybeRefresh =(!user.isLoggedIn && !!siwe.token)
    ? siwe.refreshMe()
    : Promise.resolve();
  return from(maybeRefresh).pipe(
    switchMap(() =>
      user.loggedIn$.pipe(
        take(1),
        map(isIn =>{
          console.log('[AuthGuard] loggedIn$ ->', isIn);
          return isIn
            ? true
            : router.createUrlTree(['/auth'],{ queryParams:{ redirect: state.url } });
        })
      )
    )
  );
};
