import { Component, signal, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <a class="logo" (click)="goHome()" id="brand">🎟 Eventra</a>

      @if (auth.user(); as u) {
        <nav id="nav">
          @if (u.role === 'user') {
            <button id="nav-home" [class.on]="isExact('/')" routerLink="/" [routerLinkActive]="['on']" [routerLinkActiveOptions]="{exact:true}">Home</button>
            <button id="nav-explore" routerLink="/explore" [routerLinkActive]="['on']">Explore</button>
            <button id="nav-assist" routerLink="/assistant" [routerLinkActive]="['on']">🤖 AI</button>
            <button id="nav-dash" routerLink="/dashboard" [routerLinkActive]="['on']">Dashboard</button>
          }
          @if (u.role === 'organizer' || u.role === 'org') {
            <button id="nav-org" routerLink="/organizer" [routerLinkActive]="['on']">Organizer</button>
            <button id="nav-explore-org" routerLink="/explore" [routerLinkActive]="['on']">Explore</button>
          }
          @if (u.role === 'admin') {
            <button id="nav-admin" routerLink="/admin" [routerLinkActive]="['on']">Admin</button>
            <button id="nav-explore-admin" routerLink="/explore" [routerLinkActive]="['on']">Explore</button>
          }
        </nav>
        <span id="who" class="mu">{{ u.name }} · {{ roleLabel(u.role) }}</span>
        <button id="theme-toggle" (click)="toggleTheme()" title="Toggle theme">{{ isDark() ? '☀️' : '🌙' }}</button>
        <button id="signout" (click)="auth.logout()">Sign out</button>
      } @else {
        <nav id="nav" style="justify-content:flex-end">
          <button id="nav-login" routerLink="/login" [routerLinkActive]="['on']">Sign in</button>
          <button id="nav-register" routerLink="/register" [routerLinkActive]="['on']" class="p">Create account</button>
        </nav>
        <button id="theme-toggle-guest" (click)="toggleTheme()" title="Toggle theme">{{ isDark() ? '☀️' : '🌙' }}</button>
      }
    </header>

    <main id="app">
      <router-outlet />
    </main>
  `,
  styles: [`
    #who { font-size: 13px; font-weight: 500; white-space: nowrap; }
    #theme-toggle, #theme-toggle-guest {
      border: none; background: transparent; font-size: 18px;
      padding: 4px 6px; cursor: pointer; border-radius: 8px;
    }
    #theme-toggle:hover, #theme-toggle-guest:hover { background: var(--bd); }
  `]
})
export class AppComponent {
  isDark = signal(false);

  constructor(public auth: AuthService, private router: Router) {
    // Restore saved theme
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDark.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  toggleTheme() {
    const next = !this.isDark();
    this.isDark.set(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  goHome() {
    if (this.auth.user()) this.auth.home();
    else this.router.navigate(['/login']);
  }

  isExact(path: string): boolean {
    return this.router.url === path;
  }

  roleLabel(r: string): string {
    if (r === 'admin') return 'Admin';
    if (r === 'organizer' || r === 'org') return 'Organizer';
    return 'User';
  }
}
