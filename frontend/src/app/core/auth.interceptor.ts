import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // If unauthorized on protected routes (not login/register), clear localStorage and go to /login
      if ((err.status === 401 || err.status === 422) && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
        localStorage.clear();
        auth.user.set(null);
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
