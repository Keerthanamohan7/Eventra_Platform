import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { EMOJI, img } from '../config';
import { EventCardComponent } from '../shared/event-card.component';

const CITIES: Record<string, [number, number]> = {
  Kochi: [9.93, 76.27],
  Bengaluru: [12.97, 77.59],
  Mumbai: [19.07, 72.88],
  Chennai: [13.08, 80.27],
  Thiruvananthapuram: [8.52, 76.94],
};

const ARTIST_EMOJIS: Record<string, string> = {
  'Aria Menon': '🎸',
  'The Midnight Raagas': '🥁',
  'DJ Kairo': '🎧',
  'Vikram Nair': '🎙',
  'Sufi Sangam': '🪕',
};

const VENUE_COLORS: Record<string, string> = {
  'Marine Arena': '#0ea5e9',
  'Skyline Auditorium': '#8b5cf6',
  'Harbour Dome': '#f97316',
  'Capital Hall': '#10b981',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EventCardComponent],
  template: `
    <!-- Hero Banner -->
    <div class="hero">
      <h1>Discover. Book. Experience.</h1>
      <p>Concerts, comedy, festivals and more – recommended just for you.</p>
      <div class="row">
        <input
          id="hq"
          placeholder="Search events, artists, venues…"
          [(ngModel)]="searchQuery"
          (keydown.enter)="search()"
        >
        <button id="hq-btn" (click)="search()" class="p" style="padding:12px 22px">🔍 Search</button>
      </div>
    </div>

    <!-- Events Near You -->
    <h2>📍 Events Near You <span class="mu" style="font-size:14px">({{ city }})</span></h2>
    <div class="row" style="margin-bottom:14px">
      <select id="city-pick" [(ngModel)]="city" (change)="onCityChange()">
        @for (c of cityList; track c) {
          <option [value]="c">{{ c }}</option>
        }
      </select>
      <button id="geo-btn" (click)="geo()">Use my location</button>
    </div>

    @if (loadingNear()) {
      <div class="state-banner"><div class="icon">⏳</div>Finding events near you…</div>
    } @else if (nearError()) {
      <div class="state-banner bad">{{ nearError() }}</div>
    } @else if (nearEvents().length === 0) {
      <div class="state-banner"><div class="icon">🗺</div>No events found near {{ city }}.</div>
    } @else {
      <div class="grid">
        @for (e of nearEvents(); track e.id) {
          <app-event-card [e]="e" />
        }
      </div>
    }

    <!-- Recommended for you -->
    <h2>✨ Recommended for you</h2>
    @if (loadingRecs()) {
      <div class="state-banner"><div class="icon">⏳</div>Personalizing recommendations…</div>
    } @else if (recsError()) {
      <div class="state-banner bad">{{ recsError() }}</div>
    } @else if (recs().length === 0) {
      <div class="state-banner"><div class="icon">🎯</div>No recommendations yet — explore some events!</div>
    } @else {
      <div class="grid">
        @for (e of recs(); track e.id) {
          <app-event-card [e]="e" />
        }
      </div>
    }

    <!-- Trending -->
    <h2>🔥 Trending</h2>
    @if (loadingTrending()) {
      <div class="state-banner"><div class="icon">⏳</div>Loading trending events…</div>
    } @else if (trendingError()) {
      <div class="state-banner bad">{{ trendingError() }}</div>
    } @else if (trending().length === 0) {
      <div class="state-banner"><div class="icon">📭</div>No trending events right now.</div>
    } @else {
      <div class="grid">
        @for (e of trending(); track e.id) {
          <app-event-card [e]="e" />
        }
      </div>
    }

    <!-- Upcoming events -->
    <h2>Upcoming events</h2>
    @if (loadingUpcoming()) {
      <div class="state-banner"><div class="icon">⏳</div>Loading upcoming events…</div>
    } @else if (upcomingError()) {
      <div class="state-banner bad">{{ upcomingError() }}</div>
    } @else if (upcoming().length === 0) {
      <div class="state-banner"><div class="icon">📅</div>No upcoming events scheduled.</div>
    } @else {
      <div class="grid">
        @for (e of upcoming(); track e.id) {
          <app-event-card [e]="e" />
        }
      </div>
    }

    <!-- Artists -->
    <h2>Artists</h2>
    @if (loadingArtists()) {
      <div class="state-banner"><div class="icon">⏳</div>Loading artists…</div>
    } @else if (artistsError()) {
      <div class="state-banner bad">{{ artistsError() }}</div>
    } @else if (artists().length === 0) {
      <div class="state-banner"><div class="icon">🎸</div>No artists found.</div>
    } @else {
      <div class="grid">
        @for (a of artists(); track a.id) {
          <a class="card ev" [routerLink]="['/artists', a.id]" style="text-align:center">
            <div style="font-size:48px;margin-bottom:8px">{{ artistEmoji(a.name) }}</div>
            <b>{{ a.name }}</b>
            <div class="mu">{{ a.genre }}</div>
          </a>
        }
      </div>
    }

    <!-- Venues -->
    <h2>Venues</h2>
    @if (loadingVenues()) {
      <div class="state-banner"><div class="icon">⏳</div>Loading venues…</div>
    } @else if (venuesError()) {
      <div class="state-banner bad">{{ venuesError() }}</div>
    } @else if (venues().length === 0) {
      <div class="state-banner"><div class="icon">🏛</div>No venues found.</div>
    } @else {
      <div class="grid">
        @for (v of venues(); track v.id) {
          <a class="card ev" [routerLink]="['/venues', v.id]" style="text-align:center">
            <div style="font-size:48px;margin-bottom:8px">🏟</div>
            <b>{{ v.name }}</b>
            <div class="mu">{{ v.city }}</div>
            @if (v.capacity) {
              <div class="mu">Capacity: {{ v.capacity }}</div>
            }
          </a>
        }
      </div>
    }
  `,
})
export class HomeComponent implements OnInit {
  searchQuery = '';
  city = 'Kochi';
  cityList = Object.keys(CITIES);

  // Signals for reactive data
  nearEvents  = signal<any[]>([]);
  recs        = signal<any[]>([]);
  trending    = signal<any[]>([]);
  upcoming    = signal<any[]>([]);
  artists     = signal<any[]>([]);
  venues      = signal<any[]>([]);

  // Loading / error signals
  loadingNear     = signal(true);
  loadingRecs     = signal(true);
  loadingTrending = signal(true);
  loadingUpcoming = signal(true);
  loadingArtists  = signal(true);
  loadingVenues   = signal(true);

  nearError       = signal('');
  recsError       = signal('');
  trendingError   = signal('');
  upcomingError   = signal('');
  artistsError    = signal('');
  venuesError     = signal('');

  emoji = EMOJI;
  img = img;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    const user = this.auth.user();
    if (user?.city && CITIES[user.city]) {
      this.city = user.city;
    }

    this.loadNearForCity(this.city);

    this.api.get('/recommendations').subscribe({
      next: (r: any) => {
        this.recs.set(Array.isArray(r) ? r : []);
        this.loadingRecs.set(false);
      },
      error: () => {
        this.recsError.set('Could not load recommendations');
        this.loadingRecs.set(false);
      }
    });

    this.api.get('/events/trending').subscribe({
      next: (r: any) => {
        this.trending.set(Array.isArray(r) ? r : []);
        this.loadingTrending.set(false);
        if (!this.recs().length && this.trending().length) {
          this.recs.set(this.trending().slice(0, 4));
        }
      },
      error: () => {
        this.trendingError.set('Could not load trending events');
        this.loadingTrending.set(false);
      }
    });

    this.api.get('/events/upcoming').subscribe({
      next: (r: any) => {
        this.upcoming.set(Array.isArray(r) ? r : []);
        this.loadingUpcoming.set(false);
      },
      error: () => {
        this.upcomingError.set('Could not load upcoming events');
        this.loadingUpcoming.set(false);
      }
    });

    this.api.get('/artists').subscribe({
      next: (r: any) => {
        this.artists.set(Array.isArray(r) ? r : []);
        this.loadingArtists.set(false);
      },
      error: () => {
        this.artistsError.set('Could not load artists');
        this.loadingArtists.set(false);
      }
    });

    this.api.get('/venues').subscribe({
      next: (r: any) => {
        this.venues.set(Array.isArray(r) ? r : []);
        this.loadingVenues.set(false);
      },
      error: () => {
        this.venuesError.set('Could not load venues');
        this.loadingVenues.set(false);
      }
    });
  }

  search() {
    const q = this.searchQuery.trim();
    if (q) this.router.navigate(['/explore'], { queryParams: { q } });
  }

  onCityChange() {
    this.loadNearForCity(this.city);
  }

  loadNearForCity(cityName: string) {
    const coords = CITIES[cityName] || CITIES['Kochi'];
    this.loadingNear.set(true);
    this.nearError.set('');
    this.api.get('/events/near', { lat: coords[0], lng: coords[1] }).subscribe({
      next: (r: any) => {
        this.nearEvents.set(Array.isArray(r) ? r.slice(0, 4) : []);
        this.loadingNear.set(false);
      },
      error: () => {
        this.computeNearFallback();
        this.loadingNear.set(false);
      }
    });
  }

  geo() {
    if (!navigator.geolocation) {
      alert('Location unavailable – pick a city instead.');
      return;
    }
    this.loadingNear.set(true);
    this.nearError.set('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const [lat, lng] = [pos.coords.latitude, pos.coords.longitude];
        let best = this.city, bestDist = Infinity;
        for (const [cityName, coords] of Object.entries(CITIES)) {
          const d = this.calcDist([lat, lng], coords);
          if (d < bestDist) { bestDist = d; best = cityName; }
        }
        this.city = best;
        this.api.get('/events/near', { lat, lng }).subscribe({
          next: (r: any) => {
            this.nearEvents.set(Array.isArray(r) ? r.slice(0, 4) : []);
            this.loadingNear.set(false);
          },
          error: () => {
            this.loadNearForCity(this.city);
          }
        });
      },
      () => {
        alert('Location unavailable – pick a city instead.');
        this.loadNearForCity(this.city);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  computeNearFallback() {
    const origin = CITIES[this.city] || CITIES['Kochi'];
    const pool = this.upcoming().length ? this.upcoming() : this.trending();
    const mapped = pool
      .map(e => {
        const dest = CITIES[e.city] || [9.93, 76.27] as [number, number];
        return { ...e, distance_km: Math.round(this.calcDist(origin, dest as [number, number])) };
      })
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 4);
    this.nearEvents.set(mapped);
  }

  calcDist(a: [number, number], b: [number, number]): number {
    const r = Math.PI / 180;
    const x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) * r) / 2);
    const y = (b[0] - a[0]) * r;
    return Math.hypot(x, y) * 6371;
  }

  artistEmoji(name: string): string {
    return ARTIST_EMOJIS[name] || '🎸';
  }
}
