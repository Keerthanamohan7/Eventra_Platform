import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { EMOJI, MULT, img } from '../config';

const ARTIST_EMOJIS: Record<string, string> = {
  'Aria Menon': '🎸', 'The Midnight Raagas': '🥁', 'DJ Kairo': '🎧',
  'Vikram Nair': '🎙', 'Sufi Sangam': '🪕',
};
const VENUE_COLORS: Record<string, string> = {
  'Marine Arena': '#0ea5e9', 'Skyline Auditorium': '#8b5cf6',
  'Harbour Dome': '#f97316', 'Capital Hall': '#10b981',
};

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  template: `
    @if (loading()) {
      <div class="state-banner" style="margin-top:20px"><div class="icon">⏳</div>Loading event details…</div>
    }

    @if (loadError()) {
      <div class="state-banner bad" style="margin-top:20px">
        <div class="icon">❌</div>
        {{ loadError() }}
        <br><button (click)="retry()" style="margin-top:10px">Retry</button>
      </div>
    }

    @if (e(); as ev) {
      <button id="ev-back" (click)="goBack()" style="margin-top:16px">← Back</button>

      <!-- Header Card -->
      <div class="card" style="margin-top:12px">
        <div class="poster" style="height:200px;border-radius:14px;font-size:64px"
             [style.background]="posterBg(ev)">
          @if (!ev.poster_url) { {{ emoji[ev.category] || '🎫' }} }
          @if (ev.poster_url) {
            <img [src]="imgUrl(ev.poster_url)" alt="poster"
                 style="width:100%;height:100%;object-fit:cover;border-radius:14px;position:absolute;top:0;left:0">
          }
        </div>
        <h1 style="margin-top:14px">{{ ev.title }}</h1>
        <div class="row" style="flex-wrap:wrap;gap:10px;margin:10px 0">
          <span class="tag">{{ ev.category }}</span>
          @if (ev.trending) { <span class="tag" style="background:rgba(245,158,11,0.15);color:#d97706">🔥 Trending</span> }
          <span>📅 {{ ev.starts_at | date: 'EEE, d MMM y · h:mm a' }}</span>
          <span>📍 <a [routerLink]="['/venues', ev.venue?.id]">{{ ev.venue?.name }}</a>, {{ ev.city }}</span>
          @if (ev.rating) { <span>⭐ {{ ev.rating }}</span> }
          <button id="ev-fav" (click)="toggleFav()" [class.p]="ev.saved">
            {{ ev.saved ? '❤️ Saved' : '🤍 Save' }}
          </button>
        </div>
        @if (ev.description) {
          <p style="color:var(--mu);margin-top:8px">{{ ev.description }}</p>
        }
      </div>

      <!-- Line-up -->
      <h2>🎶 Line-up · {{ ev.artists?.length || 0 }} artist{{ ev.artists?.length === 1 ? '' : 's' }}</h2>
      @if (!ev.artists?.length) {
        <p class="mu">Line-up to be announced.</p>
      } @else {
        <div class="grid">
          @for (a of ev.artists; track a.id) {
            <a class="card ev" [routerLink]="['/artists', a.id]" style="text-align:center">
              <div style="font-size:36px;margin-bottom:6px">{{ artistEmoji(a.name) }}</div>
              <b>{{ a.name }}</b>
              <div class="mu">{{ a.genre }}</div>
              @if (isFollowing(a.id)) {
                <span class="tag" style="margin-top:6px">Following</span>
              }
            </a>
          }
        </div>
      }

      <!-- Venue & Map -->
      @if (ev.venue) {
        <h2>📍 Venue</h2>
        <div class="card">
          <div class="row" style="justify-content:space-between;margin-bottom:8px">
            <b>{{ ev.venue.name }} · {{ ev.venue.city }}</b>
            <a [href]="mapDirectionsUrl(ev)" target="_blank" rel="noopener">Open in Google Maps ↗</a>
          </div>
          <div class="mu" style="margin-bottom:10px">
            📍 {{ ev.venue.address || ev.venue.city }}
            @if (ev.venue.capacity) { · Capacity: {{ ev.venue.capacity }} }
            @if (ev.venue.facilities?.length) {
              ·
              @for (f of ev.venue.facilities; track f) { <span class="tag">{{ f }}</span> }
            }
          </div>
          @if (mapEmbedUrl(ev); as url) {
            <iframe [src]="url" style="width:100%;height:220px;border:1.5px solid var(--bd);border-radius:12px"
                    loading="lazy" title="Venue map"></iframe>
          }
        </div>
      }

      <!-- Booking Section -->
      @if (isPast(ev)) {
        <div class="card mu" style="margin-top:20px;text-align:center;padding:24px">
          🎟 This event has ended.
        </div>
      } @else {
        <h2>🎫 Book Tickets</h2>
        <div class="card">
          <!-- Mode tabs -->
          <div class="row" style="margin-bottom:16px">
            <button id="mode-quick" [class.on]="mode() === 'quick'" (click)="setMode('quick')">⚡ Quick book</button>
            <button id="mode-seat" [class.on]="mode() === 'seat'" (click)="setMode('seat')">💺 Pick seats</button>
          </div>

          @if (mode() === 'quick') {
            <div class="row">
              <select id="cat" [(ngModel)]="category">
                @for (c of tiers; track c) {
                  <option [value]="c">{{ c }} – {{ price(c, ev) | currency:'INR':'symbol':'1.0-0' }}</option>
                }
              </select>
              <input id="qty" type="number" min="1" max="10" [(ngModel)]="qty" style="width:70px">
            </div>
          } @else {
            <p class="mu" style="margin-bottom:10px">
              Stage this side ▼ · VIP rows A–B, Premium C–D, Regular E–H · <span class="ok">green</span> available, grey booked, purple selected
            </p>

            <div class="scroll" style="text-align:center;padding:12px 0">
              <div class="tag" style="padding:4px 40px;margin-bottom:12px;font-weight:700">STAGE</div>
              @for (r of rows; track r) {
                <div style="white-space:nowrap;margin:4px 0">
                  <span style="display:inline-block;width:24px;font-weight:700;margin-right:6px">{{ r }}</span>
                  @for (n of seatNumbers; track n) {
                    <button
                      type="button"
                      class="seat"
                      [class.b]="isBooked(r + n)"
                      [class.s]="sel().includes(r + n)"
                      [disabled]="isBooked(r + n)"
                      (click)="pick(r + n)"
                      [title]="'Seat ' + r + n + ' (' + seatRow(r) + ') · ₹' + price(seatRow(r), ev)"
                    >{{ n }}</button>
                  }
                  <span class="mu" style="margin-left:8px;font-size:12px">{{ seatRow(r) }}</span>
                </div>
              }
            </div>
          }

          <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--bd)">
            <h3 id="sum" style="color:var(--ac);margin-bottom:12px">{{ summaryText(ev) }}</h3>
            <button id="bk-proceed" class="p" [disabled]="!canProceed()" (click)="checkout()">
              Proceed to payment
            </button>
          </div>
        </div>
      }

      <!-- Reviews -->
      <h2>⭐ Reviews {{ ev.rating ? '· ' + ev.rating + ' avg' : '' }}</h2>
      @if (loadingReviews()) {
        <p class="mu">Loading reviews…</p>
      } @else {
        @for (r of reviews(); track r.id) {
          <div class="card" style="margin-bottom:10px">
            <div class="row" style="justify-content:space-between">
              <b>{{ r.user }}</b>
              <span class="tag">★ {{ r.overall }}</span>
            </div>
            <div class="mu" style="margin:4px 0">
              Organisation {{ r.organisation }}/5 · Venue {{ r.venue_rating }}/5 · Sound {{ r.sound }}/5
            </div>
            <p style="margin:6px 0 0">{{ r.comment }}</p>
          </div>
        }
        @if (!reviews().length) {
          <p class="mu">No reviews yet.</p>
        }

        @if (canReview()) {
          <div class="card" style="margin-top:14px">
            <b>Write a review</b>
            <p class="mu">You attended this event — share your experience.</p>
            <div class="row" style="margin:10px 0;flex-wrap:wrap;gap:12px">
              <label>Organisation <input id="rv-org" type="number" min="1" max="5" [(ngModel)]="rv.organisation" style="width:64px"></label>
              <label>Venue <input id="rv-venue" type="number" min="1" max="5" [(ngModel)]="rv.venue_rating" style="width:64px"></label>
              <label>Sound <input id="rv-sound" type="number" min="1" max="5" [(ngModel)]="rv.sound" style="width:64px"></label>
            </div>
            <textarea id="rv-comment" rows="3" style="width:100%;margin-bottom:8px"
                      placeholder="What did you think?" [(ngModel)]="rv.comment"></textarea>
            <button id="rv-submit" class="p" (click)="addReview()">Submit review</button>
          </div>
        } @else {
          <p class="mu" style="font-size:13px">Only users with a completed booking can review this event.</p>
        }
      }

      <!-- Payment Modal -->
      @if (showPay()) {
        <div class="modal">
          <div class="card" style="width:min(400px,100%)">
            <h3>💳 Complete Booking</h3>
            <div style="background:rgba(109,61,245,0.06);border-radius:10px;padding:12px;margin-bottom:14px">
              <b>{{ ev.title }}</b><br>
              <span class="mu">{{ ev.starts_at | date: 'EEE, d MMM y' }} · {{ ev.venue?.name }}</span><br>
              <b style="color:var(--ac)">{{ summaryText(ev) }}</b>
            </div>
            <b>Mock payment details</b>
            <input id="pay-card" placeholder="Card number (any 12+ digits)" [(ngModel)]="card.card"
                   style="width:100%;margin:8px 0">
            <div class="row" style="margin-bottom:10px">
              <input id="pay-exp" placeholder="MM/YY" [(ngModel)]="card.exp" style="width:90px">
              <input id="pay-cvv" placeholder="CVV" [(ngModel)]="card.cvv" style="width:75px">
            </div>
            @if (payError()) {
              <p class="bad" style="margin:6px 0">❌ {{ payError() }}</p>
            }
            <div class="row" style="margin-top:10px">
              <button id="pay-confirm" class="p" (click)="pay(ev)" style="flex:1">
                Pay {{ totalPay(ev) | currency:'INR':'symbol':'1.0-0' }}
              </button>
              <button id="pay-cancel" (click)="setShowPay(false)">Cancel</button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class EventDetailComponent implements OnInit {
  e          = signal<any>(null);
  seats      = signal<any[]>([]);
  sel        = signal<string[]>([]);
  reviews    = signal<any[]>([]);
  canReview  = signal(false);
  followingIds = signal<number[]>([]);
  loading    = signal(false);
  loadError  = signal('');
  loadingReviews = signal(true);
  showPay    = signal(false);
  payError   = signal('');

  mode       = signal<'quick' | 'seat'>('quick');
  category   = 'Regular';
  qty        = 1;
  eventId    = 0;

  tiers = Object.keys(MULT);
  emoji = EMOJI;
  img = img;
  rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  seatNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  card = { card: '4242 4242 4242 4242', exp: '12/30', cvv: '123' };
  rv = { organisation: 5, venue_rating: 5, sound: 5, comment: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(p => {
      const id = +(p.get('id') ?? 0);
      if (id) { this.eventId = id; this.load(id); }
    });
  }

  load(id: number) {
    this.loading.set(true);
    this.loadError.set('');
    this.e.set(null);

    this.api.get('/events/' + id).subscribe({
      next: (ev: any) => { this.e.set(ev); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Failed to load event. Please check your connection and retry.');
      }
    });

    this.loadSeats(id);

    this.loadingReviews.set(true);
    this.api.get('/events/' + id + '/reviews').subscribe({
      next: (r: any) => {
        this.reviews.set(r.reviews || []);
        this.canReview.set(r.can_review ?? false);
        this.loadingReviews.set(false);
      },
      error: () => { this.reviews.set([]); this.canReview.set(false); this.loadingReviews.set(false); }
    });

    this.api.get('/favorites').subscribe({
      next: (r: any) => this.followingIds.set(r.following || []),
      error: () => {}
    });
  }

  isFollowing(aid: number): boolean {
    return this.followingIds().includes(aid);
  }

  retry() { if (this.eventId) this.load(this.eventId); }

  loadSeats(id: number) {
    this.api.get('/events/' + id + '/seats').subscribe({
      next: (s: any) => this.seats.set(Array.isArray(s) ? s : []),
      error: () => this.seats.set([])
    });
  }

  goBack() { window.history.back(); }

  isPast(ev: any): boolean { return new Date(ev.starts_at) < new Date(); }

  setMode(m: 'quick' | 'seat') { this.mode.set(m); this.sel.set([]); }
  setShowPay(v: boolean) { this.showPay.set(v); }

  price(c: string, ev: any): number {
    return Math.round((ev?.base_price || 0) * (MULT[c] ?? 1));
  }

  seatRow(r: string): string {
    return 'AB'.includes(r) ? 'VIP' : 'CD'.includes(r) ? 'Premium' : 'Regular';
  }

  isBooked(label: string): boolean {
    return this.seats().find(x => x.label === label)?.booked ?? false;
  }

  pick(label: string) {
    if (this.isBooked(label)) return;
    const cur = this.sel();
    const idx = cur.indexOf(label);
    if (idx >= 0) {
      this.sel.set(cur.filter(s => s !== label));
    } else {
      if (cur.length >= 10) {
        alert('You can select a maximum of 10 seats.');
        return;
      }
      this.sel.set([...cur, label]);
    }
  }

  clearSel() { this.sel.set([]); }

  totalPay(ev: any): number {
    if (this.mode() === 'quick') return this.price(this.category, ev) * this.qty;
    return this.sel().reduce((acc, s) => acc + this.price(this.seatRow(s[0]), ev), 0);
  }

  summaryText(ev: any): string {
    if (this.mode() === 'quick') {
      const t = this.totalPay(ev);
      return `${this.qty} × ${this.category} · Total ₹${t.toLocaleString('en-IN')}`;
    }
    return this.sel().length
      ? `${this.sel().join(', ')} · Total ₹${this.totalPay(ev).toLocaleString('en-IN')}`
      : 'Select seats';
  }

  canProceed(): boolean {
    return this.mode() === 'quick' ? this.qty >= 1 : this.sel().length > 0;
  }

  checkout() {
    if (!this.canProceed()) return;
    if (!this.auth.user()) { this.router.navigate(['/login']); return; }
    this.payError.set('');
    this.showPay.set(true);
  }

  pay(ev: any) {
    this.payError.set('');
    const body: any = { event_id: ev.id, payment: this.card };
    if (this.mode() === 'seat') {
      body.seats = this.sel();
    } else {
      body.category = this.category;
      body.quantity = this.qty;
    }
    this.api.post('/bookings', body).subscribe({
      next: (r: any) => {
        this.showPay.set(false);
        this.sel.set([]);
        this.router.navigate(['/tickets', r.ticket_code]);
      },
      error: (er: any) => {
        this.payError.set(er.error?.error || 'Booking failed. Please try again.');
        if (this.eventId) this.loadSeats(this.eventId);
      }
    });
  }

  toggleFav() {
    const ev = this.e();
    if (!ev) return;
    if (!this.auth.user()) { this.router.navigate(['/login']); return; }
    this.api.post('/favorites', { kind: 'event', ref_id: ev.id }).subscribe((r: any) => {
      this.e.set({ ...ev, saved: r.saved });
    });
  }

  addReview() {
    const ev = this.e();
    if (!ev || !this.auth.user()) { this.router.navigate(['/login']); return; }
    this.api.post(`/events/${ev.id}/reviews`, this.rv).subscribe({
      next: () => this.load(ev.id),
      error: (er: any) => alert(er.error?.error || 'Failed to submit review')
    });
  }

  posterBg(ev: any): string {
    const c = VENUE_COLORS[ev.venue?.name] || '#6d3df5';
    return `linear-gradient(135deg, ${c}, #ec4899)`;
  }

  imgUrl(u: string): string { return img(u); }

  artistEmoji(name: string): string { return ARTIST_EMOJIS[name] || '🎸'; }

  mapEmbedUrl(ev: any): SafeResourceUrl | null {
    const v = ev?.venue;
    if (!v?.latitude || !v?.longitude) return null;
    const bbox = `${v.longitude - 0.015}%2C${v.latitude - 0.015}%2C${v.longitude + 0.015}%2C${v.latitude + 0.015}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${v.latitude}%2C${v.longitude}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  mapDirectionsUrl(ev: any): string {
    if (!ev?.venue) return '#';
    const v = ev.venue;
    return `https://www.google.com/maps/search/${encodeURIComponent(v.name + ' ' + (v.address || v.city))}`;
  }
}
