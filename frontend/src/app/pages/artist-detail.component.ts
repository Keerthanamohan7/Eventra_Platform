import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { EventCardComponent } from '../shared/event-card.component';

const ARTIST_EMOJIS: Record<string, string> = {
  'Aria Menon': '🎸', 'The Midnight Raagas': '🥁', 'DJ Kairo': '🎧',
  'Vikram Nair': '🎙', 'Sufi Sangam': '🪕',
};

@Component({
  selector: 'app-artist-detail',
  standalone: true,
  imports: [EventCardComponent],
  template: `
    @if (loading()) {
      <div class="state-banner" style="margin-top:20px"><div class="icon">⏳</div>Loading artist…</div>
    }
    @if (error()) {
      <div class="state-banner bad" style="margin-top:20px">{{ error() }}<br><button (click)="load()" style="margin-top:8px">Retry</button></div>
    }
    @if (a(); as art) {
      <button id="art-back" (click)="goBack()" style="margin-top:16px">← Back</button>

      <div class="card" style="margin-top:12px">
        <div style="font-size:72px;text-align:center;margin-bottom:10px">{{ emoji(art.name) }}</div>
        <h1 style="text-align:center">{{ art.name }}</h1>
        <div style="text-align:center;margin-bottom:12px">
          <span class="tag" style="font-size:13px">{{ art.genre }}</span>
          <span class="mu" style="margin-left:10px">{{ art.followers || 0 }} followers</span>
        </div>

        @if (art.bio) { <p style="color:var(--mu);text-align:center">{{ art.bio }}</p> }

        <div class="row" style="justify-content:center;margin-top:12px">
          <button id="art-follow" [class.on]="art.following" (click)="follow()">
            {{ art.following ? '✓ Following' : '+ Follow' }}
          </button>
          <button id="art-save" (click)="save()" [class.p]="art.saved">
            {{ art.saved ? '❤️ Saved' : '🤍 Save' }}
          </button>
        </div>

        @if (art.following) {
          <p class="mu" style="text-align:center;margin-top:8px;font-size:13px">🔔 You'll be notified about new events.</p>
        }

        @if (art.songs?.length) {
          <h3 style="margin-top:18px">🎵 Popular songs</h3>
          <ol style="margin:0;padding-left:20px;color:var(--mu)">
            @for (s of art.songs; track s) { <li>{{ s }}</li> }
          </ol>
        }
      </div>

      <h2>🗓 Upcoming Events</h2>
      @if (!art.upcoming?.length) {
        <div class="state-banner"><div class="icon">📅</div>No upcoming events scheduled.</div>
      } @else {
        <div class="grid">
          @for (e of art.upcoming; track e.id) { <app-event-card [e]="e" /> }
        </div>
      }

      <h2>📖 Past Events</h2>
      @if (!art.past?.length) {
        <div class="state-banner"><div class="icon">📚</div>No past events.</div>
      } @else {
        <div class="grid">
          @for (e of art.past; track e.id) { <app-event-card [e]="e" /> }
        </div>
      }
    }
  `,
})
export class ArtistDetailComponent implements OnInit {
  a = signal<any>(null);
  loading = signal(false);
  error = signal('');
  private artistId = 0;

  constructor(private route: ActivatedRoute, private api: ApiService) { }

  ngOnInit() {
    this.route.paramMap.subscribe(p => {
      this.artistId = +(p.get('id') ?? 0);
      this.load();
    });
  }

  load() {
    if (!this.artistId) return;
    this.loading.set(true);
    this.error.set('');
    this.api.get('/artists/' + this.artistId).subscribe({
      next: (a: any) => { this.a.set(a); this.loading.set(false); },
      error: () => { this.error.set('Failed to load artist. Please retry.'); this.loading.set(false); }
    });
  }

  goBack() { window.history.back(); }

  emoji(name: string): string { return ARTIST_EMOJIS[name] || '🎸'; }

  follow() {
    const art = this.a();
    if (!art) return;
    this.api.post(`/artists/${art.id}/follow`).subscribe((r: any) => {
      this.a.set({ ...art, following: r.following, followers: (art.followers || 0) + (r.following ? 1 : -1) });
    });
  }

  save() {
    const art = this.a();
    if (!art) return;
    this.api.post('/favorites', { kind: 'artist', ref_id: art.id }).subscribe((r: any) => {
      this.a.set({ ...art, saved: r.saved });
    });
  }
}
