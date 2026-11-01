import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <h1>Admin Dashboard</h1>

    @if (stats(); as s) {
      <!-- Stat Cards -->
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin-bottom:24px">
        <div class="stat-card" style="background:linear-gradient(135deg,#6d3df5,#8b5cf6)">
          <div class="stat-label">Users</div>
          <h2>{{ s.users }}</h2>
        </div>
        <div class="stat-card" style="background:linear-gradient(135deg,#ec4899,#f97316)">
          <div class="stat-label">Events</div>
          <h2>{{ s.events }}</h2>
        </div>
        <div class="stat-card" style="background:linear-gradient(135deg,#0ea5e9,#6d3df5)">
          <div class="stat-label">Bookings</div>
          <h2>{{ s.bookings }}</h2>
        </div>
        <div class="stat-card" style="background:linear-gradient(135deg,#10b981,#0ea5e9)">
          <div class="stat-label">Revenue</div>
          <h2 style="font-size:22px">{{ s.revenue | currency:'INR':'symbol':'1.0-0' }}</h2>
        </div>
      </div>

      <!-- Popular breakdowns -->
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));margin-bottom:24px">
        <div class="card">
          <b>🔥 Popular Events</b>
          <div style="margin-top:8px">
            @for (p of s.popular_events; track p.name) {
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd)">
                <span style="font-size:13px">{{ p.name }}</span>
                <span class="tag">{{ p.tickets }}</span>
              </div>
            }
          </div>
        </div>
        <div class="card">
          <b>🏙 Popular Cities</b>
          <div style="margin-top:8px">
            @for (p of s.popular_cities; track p.name) {
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd)">
                <span style="font-size:13px">{{ p.name }}</span>
                <span class="tag">{{ p.tickets }}</span>
              </div>
            }
          </div>
        </div>
        <div class="card">
          <b>🏷 Popular Categories</b>
          <div style="margin-top:8px">
            @for (p of s.popular_categories; track p.name) {
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd)">
                <span style="font-size:13px">{{ p.name }}</span>
                <span class="tag">{{ p.tickets }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- Tab navigation -->
    <div class="row" style="flex-wrap:wrap;margin-bottom:16px">
      @for (t of tabs; track t) {
        <button [id]="'adm-' + t" [class.on]="tab() === t" (click)="open(t)">{{ t }}</button>
      }
    </div>

    @if (error()) {
      <p class="bad">{{ error() }}</p>
    }

    @if (loading()) {
      <div class="state-banner"><div class="icon">⏳</div>Loading…</div>
    } @else if (!rows().length) {
      <div class="state-banner"><div class="icon">📋</div>No records found.</div>
    } @else {
      <div class="scroll">
        <table>
          <tr>@for (c of cols(); track c) { <th>{{ c }}</th> }<th></th></tr>
          @for (r of rows(); track r.id) {
            <tr>
              @for (c of cols(); track c) { <td>{{ r[c] }}</td> }
              <td><button class="d" [id]="'del-' + r.id" (click)="remove(r)">Delete</button></td>
            </tr>
          }
        </table>
      </div>
      <p class="mu" style="margin-top:8px;font-size:12px">{{ rows().length }} records</p>
    }
  `,
})
export class AdminComponent implements OnInit {
  tabs = ['users', 'events', 'artists', 'venues', 'bookings', 'tickets', 'reviews'];

  stats   = signal<any>(null);
  tab     = signal('users');
  rows    = signal<any[]>([]);
  cols    = signal<string[]>([]);
  error   = signal('');
  loading = signal(false);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.get('/admin/stats').subscribe({
      next: (r: any) => this.stats.set(r),
      error: () => {}
    });
    this.open('users');
  }

  open(t: string) {
    this.tab.set(t);
    this.error.set('');
    this.loading.set(true);
    this.rows.set([]);
    this.api.get<any[]>('/admin/' + t).subscribe({
      next: (r: any) => {
        const list = Array.isArray(r) ? r : [];
        this.rows.set(list);
        this.cols.set(list.length
          ? Object.keys(list[0]).filter(k => typeof list[0][k] !== 'object')
          : []);
        this.loading.set(false);
      },
      error: (e: any) => {
        this.error.set(e.error?.error || 'Failed to load records');
        this.loading.set(false);
      }
    });
  }

  remove(r: any) {
    if (!confirm('Delete this record? This action cannot be undone.')) return;
    this.api.delete(`/admin/${this.tab()}/${r.id}`).subscribe({
      next: () => {
        this.open(this.tab());
        this.api.get('/admin/stats').subscribe({
          next: (s: any) => this.stats.set(s),
          error: () => {}
        });
      },
      error: (e: any) => this.error.set(e.error?.error || 'Delete failed')
    });
  }
}
