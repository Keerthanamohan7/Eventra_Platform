import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** authGuard() = any signed-in user; authGuard('admin') = only that role(s). */
export const authGuard = (...roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService), router = inject(Router), u = auth.user();
  if (!u) return router.parseUrl('/login');
  if (roles.length && !roles.includes(u.role)) {
    return router.parseUrl(u.role === 'admin' ? '/admin' : u.role === 'organizer' ? '/organizer' : '/');
  }
  return true;
};
