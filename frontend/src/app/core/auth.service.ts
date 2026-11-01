import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<any>(null);

  constructor(private api: ApiService, private router: Router) {
    this.initSession();
  }

  initSession() {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      this.clearSession();
      return;
    }

    try {
      this.user.set(JSON.parse(storedUser));
      // Validate token with backend
      this.api.get('/auth/me').subscribe({
        next: (u: any) => {
          this.user.set(u);
          localStorage.setItem('user', JSON.stringify(u));
        },
        error: () => {
          this.logout();
        }
      });
    } catch {
      this.clearSession();
    }
  }

  login(identifier: string, password: string) {
    return this.api
      .post('/auth/login', { email: identifier, username: identifier, password })
      .pipe(tap(r => this.store(r)));
  }

  register(data: any) {
    return this.api.post('/auth/register', data).pipe(tap(r => this.store(r)));
  }

  private store(r: any) {
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.user));
    this.user.set(r.user);
  }

  home() {
    const role = this.user()?.role;
    this.router.navigate([role === 'admin' ? '/admin' : role === 'organizer' || role === 'org' ? '/organizer' : '/']);
  }

  private clearSession() {
    localStorage.clear();
    this.user.set(null);
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/login']);
  }
}
