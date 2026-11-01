import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { EventCardComponent } from '../shared/event-card.component';

const VENUE_COLORS: Record<string, string> = {
  'Marine Arena': '#0ea5e9', 'Skyline Auditorium': '#8b5cf6',
  'Harbour Dome': '#f97316', 'Capital Hall': '#10b981',
};

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [EventCardComponent],
  template: `
    @if (loading()) {
      <div class="state-banner" style="margin-top:20px"><div class="icon">⏳</div>Loading venue…</div>
    }
    @if (error()) {
      <div class="state-banner bad" style="margin-top:20px">{{ error() }}<br><button (click)="load()" style="margin-top:8px">Retry</button></div>
    }
    @if (v(); as venue) {
      <button id="ven-back" (click)="goBack()" style="margin-top:16px">← Back</button>

      <div class="card" style="margin-top:12px">
        <div class="poster" [style.background]="posterBg(venue.name)" style="height:180px;font-size:64px">🏟</div>
        <h1 style="margin-top:12px">{{ venue.name }}</h1>
        <div class="row" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <span>📍 {{ venue.address || venue.city }}</span>
          <a [href]="mapUrl(venue)" target="_blank" rel="noopener" style="font-size:13px">Open in Google Maps ↗</a>
        </div>
        <div class="row" style="margin-bottom:12px;flex-wrap:wrap;gap:6px">
          <span class="tag" style="font-size:13px">Capacity: {{ venue.capacity || 80 }}</span>
          @for (f of venue.facilities; track f) {
            <span class="tag">{{ f }}</span>
          }
        </div>
        <button id="ven-save" (click)="save()" [class.p]="venue.saved">
          {{ venue.saved ? '❤️ Saved' : '🤍 Save' }}
        </button>

        <h3 style="margin-top:20px">💺 Seating Layout</h3>
        <div style="text-align:center;padding:12px 0">
          <div class="tag" style="padding:6px 50px;margin:0 auto 14px;display:inline-block;
               background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;border-radius:8px;
               font-weight:700;letter-spacing:2px">▲ STAGE ▲</div>
          @for (r of rows; track r) {
            <div style="margin:4px 0;white-space:nowrap">
              <span style="display:inline-block;width:20px;font-weight:700;margin-right:8px;color:var(--mu)">{{ r }}</span>
              @for (n of [1,2,3,4,5,6,7,8,9,10]; track n) {
                <span class="seat" style="cursor:default;display:inline-flex;width:28px;height:28px">{{ n }}</span>
              }
              <small class="mu" style="margin-left:8px">{{ seatRow(r) }}</small>
            </div>
          }
        </div>
      </div>

      <h2>🗓 Upcoming Events</h2>
      @if (!venue.upcoming?.length) {
        <div class="state-banner"><div class="icon">📅</div>No upcoming events at this venue.</div>
      } @else {
        <div class="grid">
          @for (e of venue.upcoming; track e.id) { <app-event-card [e]="e" /> }
        </div>
      }
    }
  `,
})
export class VenueDetailComponent implements OnInit {
  v       = signal<any>(null);
  loading = signal(false);
  error   = signal('');
  rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  private venueId = 0;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.route.paramMap.subscribe(p => {
      this.venueId = +(p.get('id') ?? 0);
      this.load();
    });
  }

  load() {
    if (!this.venueId) return;
    this.loading.set(true);
    this.error.set('');
    this.api.get('/venues/' + this.venueId).subscribe({
      next: (v: any) => { this.v.set(v); this.loading.set(false); },
      error: () => { this.error.set('Failed to load venue. Please retry.'); this.loading.set(false); }
    });
  }

  goBack() { window.history.back(); }

  posterBg(name: string): string {
    const c = VENUE_COLORS[name] || '#10b981';
    return `linear-gradient(135deg, ${c}, #ec4899)`;
  }

  seatRow(r: string): string {
    return 'AB'.includes(r) ? 'VIP' : 'CD'.includes(r) ? 'Premium' : 'Regular';
  }

  mapUrl(v: any): string {
    return 'https://www.google.com/maps/search/' + encodeURIComponent(v.name + ' ' + (v.address || v.city));
  }

  save() {
    const venue = this.v();
    if (!venue) return;
    this.api.post('/favorites', { kind: 'venue', ref_id: venue.id }).subscribe((r: any) => {
      this.v.set({ ...venue, saved: r.saved });
    });
  }
}
