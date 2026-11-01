import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:20px">
      <div class="card" style="width:100%;max-width:420px;padding:32px">
        <!-- Logo -->
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px;margin-bottom:8px">🎟</div>
          <h1 style="font-size:24px;margin:0 0 4px;background:linear-gradient(135deg,var(--ac),var(--ac2));
              -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
            {{ register() ? 'Join Eventra' : 'Welcome back' }}
          </h1>
          <p class="mu" style="margin:0">
            {{ register() ? 'Create an account to book events.' : 'Sign in to continue.' }}
          </p>
        </div>

        <div style="display:grid;gap:10px">
          @if (register()) {
            <input
              id="an"
              placeholder="Full name"
              [(ngModel)]="f.name"
              autocomplete="name"
              (keyup.enter)="submit()"
            >
          }

          <input
            id="ae"
            type="email"
            placeholder="Email address"
            [(ngModel)]="f.email"
            autocomplete="email"
            (keyup.enter)="submit()"
          >

          <input
            id="ap"
            type="password"
            placeholder="Password"
            [(ngModel)]="f.password"
            [autocomplete]="register() ? 'new-password' : 'current-password'"
            (keyup.enter)="submit()"
          >

          @if (register()) {
            <select id="ar" [(ngModel)]="f.role">
              <option value="user">🎟 I want to attend events</option>
              <option value="organizer">🎪 I am an event organizer</option>
            </select>
          }

          @if (error()) {
            <div id="ax" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;
                 padding:10px 12px;color:var(--bad);font-size:13px">
              ⚠️ {{ error() }}
            </div>
          }

          <button
            id="auth-submit"
            type="button"
            class="p"
            style="width:100%;padding:12px;font-size:15px;margin-top:4px"
            (click)="submit()"
            [disabled]="submitting()"
          >
            {{ submitting() ? '…' : (register() ? 'Create account →' : 'Sign in →') }}
          </button>
        </div>

        <div style="text-align:center;margin-top:16px">
          <span class="mu">{{ register() ? 'Already have an account? ' : "New to Eventra? " }}</span>
          <a href="javascript:void(0)" (click)="toggleMode()" style="font-weight:600">
            {{ register() ? 'Sign in' : 'Create account' }}
          </a>
        </div>

        @if (!register()) {
          <hr>
          <p class="mu" style="text-align:center;margin-bottom:10px;font-size:13px">Try a demo account (password: demo123)</p>
          <div class="row" style="justify-content:center">
            <button id="demo-user" (click)="demo('user')">👤 User</button>
            <button id="demo-org" (click)="demo('org')">🎪 Organizer</button>
            <button id="demo-admin" (click)="demo('admin')">🔧 Admin</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class AuthComponent implements OnInit {
  register   = signal(false);
  error      = signal('');
  submitting = signal(false);

  f = { name: '', email: '', password: '', role: 'user' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    if (this.auth.user()) { this.auth.home(); return; }
    this.route.data.subscribe(data => {
      this.register.set(data['mode'] === 'register');
      this.error.set('');
    });
  }

  toggleMode() {
    this.register.update(v => !v);
    this.error.set('');
    this.router.navigate([this.register() ? '/register' : '/login']);
  }

  demo(role: 'user' | 'org' | 'admin') {
    const email = role === 'user' ? 'user@demo.com' : role === 'org' ? 'org@demo.com' : 'admin@demo.com';
    this.f.email = email;
    this.f.password = 'demo123';
    this.submit();
  }

  submit() {
    this.error.set('');
    const email = this.f.email.trim();
    const pw = this.f.password;

    if (this.register()) {
      const name = this.f.name.trim();
      if (!name || !email.includes('@') || pw.length < 6) {
        this.error.set('Enter a name, valid email, and a password with 6+ characters.');
        return;
      }
      this.submitting.set(true);
      this.auth.register({ name, email, password: pw, role: this.f.role }).subscribe({
        next: () => this.auth.home(),
        error: (e: any) => {
          this.error.set(e.error?.error || 'Registration failed. Please try again.');
          this.submitting.set(false);
        }
      });
    } else {
      if (!email || !pw) { this.error.set('Please enter your email and password.'); return; }
      this.submitting.set(true);
      this.auth.login(email, pw).subscribe({
        next: () => this.auth.home(),
        error: (e: any) => {
          this.error.set(e.error?.error || 'Invalid email or password.');
          this.submitting.set(false);
        }
      });
    }
  }
}
