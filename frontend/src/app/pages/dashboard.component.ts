import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CATEGORIES } from '../config';
import { EventCardComponent } from '../shared/event-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, CurrencyPipe, NgTemplateOutlet, EventCardComponent],
  template: `
    <h1>My Dashboard</h1>

    @if (loading()) {
      <div class="state-banner" style="margin-top:20px"><div class="icon">⏳</div>Loading your dashboard…</div>
    } @else if (error()) {
      <div class="state-banner bad" style="margin-top:20px">
        <div class="icon">⚠️</div>
        {{ error() }}
        <br><button (click)="loadDashboard()" style="margin-top:10px">Retry</button>
      </div>
    } @else {
      @for (n of notes(); track n.event_id) {
        <div class="card" style="margin-bottom:8px;background:rgba(109,61,245,0.06);border-color:rgba(109,61,245,0.2)">
          🔔 {{ n.message }} · <a [routerLink]="['/events', n.event_id]">View event</a>
        </div>
      }

      <div class="row" style="margin-top:4px;margin-bottom:20px;flex-wrap:wrap">
        @for (t of tabs; track t) {
          <button [id]="'dash-tab-' + t.replace(' ', '-').toLowerCase()" [class.on]="tab() === t" (click)="tab.set(t)">{{ t }}</button>
        }
      </div>

      @switch (tab()) {
        @case ('Upcoming') {
          @if (upcoming().length === 0) {
            <div class="state-banner"><div class="icon">🎟</div>No upcoming bookings.</div>
          } @else {
            @for (b of upcoming(); track b.id) {
              <ng-container *ngTemplateOutlet="bookingRow; context: { b: b }"></ng-container>
            }
          }
        }
        @case ('Past events') {
          @if (past().length === 0) {
            <div class="state-banner"><div class="icon">📅</div>No past events.</div>
          } @else {
            <div class="grid">
              @for (b of past(); track b.id) {
                <app-event-card [e]="b.event" />
              }
            </div>
          }
        }
        @case ('Tickets') {
          @if (bookings().length === 0) {
            <div class="state-banner"><div class="icon">🎫</div>No tickets yet.</div>
          } @else {
            @for (b of bookings(); track b.id) {
              <ng-container *ngTemplateOutlet="bookingRow; context: { b: b }"></ng-container>
            }
          }
        }
        @case ('Favorites') {
          <h3>Saved Events</h3>
          @if (!fav().events?.length) {
            <p class="mu">No saved events.</p>
          } @else {
            <div class="grid">@for (e of fav().events; track e.id) { <app-event-card [e]="e" /> }</div>
          }
          <h3 style="margin-top:18px">Saved Artists</h3>
          <div class="row">
            @for (a of fav().artists; track a.id) {
              <a class="btn" [routerLink]="['/artists', a.id]">🎸 {{ a.name }}</a>
            }
            @if (!fav().artists?.length) { <span class="mu">None saved.</span> }
          </div>
          <h3 style="margin-top:18px">Saved Venues</h3>
          <div class="row">
            @for (v of fav().venues; track v.id) {
              <a class="btn" [routerLink]="['/venues', v.id]">🏟 {{ v.name }}</a>
            }
            @if (!fav().venues?.length) { <span class="mu">None saved.</span> }
          </div>
          <p class="mu" style="margin-top:12px;font-size:13px">Your saved preferences improve your event recommendations.</p>
        }
        @case ('Reviews') {
          @if (!reviews().length) {
            <div class="state-banner"><div class="icon">⭐</div>No reviews yet.</div>
          } @else {
            @for (r of reviews(); track r.id) {
              <div class="card" style="margin-bottom:10px">
                <div class="row" style="justify-content:space-between">
                  <b>{{ r.event }}</b>
                  <span class="tag">★ {{ r.overall }}</span>
                </div>
                <p style="margin:6px 0 0;color:var(--mu)">{{ r.comment }}</p>
              </div>
            }
          }
        }
        @case ('Profile') {
          <div class="card" style="max-width:440px">
            <div style="display:grid;gap:10px">
              <div>
                <label class="mu">Full Name</label>
                <input id="prof-name" [(ngModel)]="me().name" placeholder="Name" style="width:100%;margin-top:4px">
              </div>
              <div>
                <label class="mu">Home City</label>
                <input id="prof-city" [(ngModel)]="me().city" placeholder="Your city" style="width:100%;margin-top:4px">
              </div>
              <div>
                <label class="mu"><b>Interests</b></label>
                <div class="row" style="margin-top:6px;flex-wrap:wrap">
                  @for (c of cats; track c) {
                    <label style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
                           background:var(--card);border:1.5px solid var(--bd);border-radius:20px;font-size:13px"
                           [style.border-color]="me().interests.includes(c) ? 'var(--ac)' : 'var(--bd)'"
                           [style.background]="me().interests.includes(c) ? 'rgba(109,61,245,0.08)' : 'var(--card)'"
                           [style.color]="me().interests.includes(c) ? 'var(--ac)' : 'var(--tx)'">
                      <input type="checkbox" [checked]="me().interests.includes(c)"
                             (change)="toggleInterest(c)" style="width:auto;padding:0;border:none;background:transparent">
                      {{ c }}
                    </label>
                  }
                </div>
              </div>
              <button id="prof-save" class="p" (click)="saveProfile()">Save profile</button>
              @if (saved()) { <span class="ok">✓ {{ saved() }}</span> }
            </div>
          </div>
        }
        @case ('History') {
          <div class="scroll">
            <table>
              <tr>
                <th>ID</th><th>Event</th><th>Type</th><th>Seats</th>
                <th>Total</th><th>Date</th><th>Ticket</th>
              </tr>
              @for (b of bookings(); track b.id) {
                <tr>
                  <td>{{ b.code }}</td>
                  <td>{{ b.event.title }}</td>
                  <td>{{ b.category }} × {{ b.quantity }}</td>
                  <td>{{ b.seats.join(', ') || '—' }}</td>
                  <td>{{ b.total | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td>{{ b.created_at | date:'mediumDate' }}</td>
                  <td><a [routerLink]="['/tickets', b.ticket_code]">View QR</a></td>
                </tr>
              }
            </table>
          </div>
        }
      }
    }

    <!-- Booking row template -->
    <ng-template #bookingRow let-b="b">
      <div class="card" style="margin-bottom:10px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <b>{{ b.event.title }}</b>
          <div class="mu">{{ b.event.starts_at | date:'EEE, d MMM y · h:mm a' }}</div>
          <div class="mu">
            {{ b.category }} × {{ b.quantity }}
            @if (b.seats?.length) { · {{ b.seats.join(', ') }} }
            · <span [class.ok]="b.ticket_status === 'valid'" [class.bad]="b.ticket_status !== 'valid'">{{ b.ticket_status }}</span>
          </div>
        </div>
        <a class="btn p" [routerLink]="['/tickets', b.ticket_code]" style="white-space:nowrap">🎟 View Ticket</a>
      </div>
    </ng-template>
  `,
})
export class DashboardComponent implements OnInit {
  tabs = ['Upcoming', 'Past events', 'Tickets', 'Favorites', 'Reviews', 'Profile', 'History'];
  cats = CATEGORIES;

  tab      = signal('Upcoming');
  bookings = signal<any[]>([]);
  reviews  = signal<any[]>([]);
  notes    = signal<any[]>([]);
  fav      = signal<any>({ events: [], artists: [], venues: [] });
  me       = signal<any>({ name: '', city: '', interests: [] });
  saved    = signal('');
  loading  = signal(true);
  error    = signal('');

  upcoming = signal<any[]>([]);
  past     = signal<any[]>([]);

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set('');

    this.api.get('/bookings/mine').subscribe({
      next: (r: any) => {
        const all = Array.isArray(r) ? r : [];
        this.bookings.set(all);
        const now = new Date();
        this.upcoming.set(all.filter(b => new Date(b.event.starts_at) >= now));
        this.past.set(all.filter(b => new Date(b.event.starts_at) < now));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load bookings. Please check connection and retry.');
        this.loading.set(false);
      }
    });

    this.api.get('/reviews/mine').subscribe({
      next: (r: any) => this.reviews.set(Array.isArray(r) ? r : []),
      error: () => {}
    });
    this.api.get('/favorites').subscribe({
      next: (r: any) => this.fav.set(r || { events: [], artists: [], venues: [] }),
      error: () => {}
    });
    this.api.get('/notifications').subscribe({
      next: (r: any) => this.notes.set(Array.isArray(r) ? r : []),
      error: () => {}
    });
    this.api.get('/auth/me').subscribe({
      next: (r: any) => this.me.set({ ...r, interests: Array.isArray(r.interests) ? r.interests : [] }),
      error: () => {}
    });
  }

  toggleInterest(c: string) {
    const cur = this.me();
    const interests = cur.interests.includes(c)
      ? cur.interests.filter((x: string) => x !== c)
      : [...cur.interests, c];
    this.me.set({ ...cur, interests });
  }

  saveProfile() {
    this.api.put('/auth/me', this.me()).subscribe({
      next: (r: any) => {
        this.me.set({ ...r, interests: Array.isArray(r.interests) ? r.interests : [] });
        this.auth.user.set(r);
        localStorage.setItem('user', JSON.stringify(r));
        this.saved.set('Profile updated ✓');
        setTimeout(() => this.saved.set(''), 3000);
      },
      error: () => {}
    });
  }
}
