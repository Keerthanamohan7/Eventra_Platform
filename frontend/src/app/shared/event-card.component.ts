import { Component, Input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EMOJI, img } from '../config';

const VENUE_COLORS: Record<string, string> = {
  'Marine Arena': '#0ea5e9',
  'Skyline Auditorium': '#8b5cf6',
  'Harbour Dome': '#f97316',
  'Capital Hall': '#10b981',
};

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  template: `
    <a class="card ev" [routerLink]="['/events', e.id]">
      <!-- Poster -->
      <div
        class="poster"
        [style.background]="posterBg"
        [style.background-image]="e.poster_url ? 'url(' + imgUrl(e.poster_url) + ')' : null"
      >
        @if (!e.poster_url) { <span style="position:relative;z-index:1">{{ emoji[e.category] || '🎫' }}</span> }
      </div>

      <!-- Title -->
      <b style="display:block;margin-bottom:4px;line-height:1.3">{{ e.title }}</b>

      <!-- Date · City -->
      <div class="mu">{{ e.starts_at | date:'EEE, d MMM' }} · {{ e.city }}</div>

      <!-- Artists · Venue -->
      <div class="mu" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        {{ names }} · {{ e.venue?.name || 'Venue TBA' }}
      </div>

      <!-- Price · Rating -->
      <div class="row" style="justify-content:space-between;margin-top:8px">
        <b style="color:var(--ac)">from {{ e.base_price | currency:'INR':'symbol':'1.0-0' }}</b>
        @if (e.rating) { <span class="mu">⭐ {{ e.rating }}</span> }
      </div>

      <!-- Tags -->
      <div style="margin-top:8px">
        <span class="tag">{{ e.category }}</span>
        @if (e.trending) { <span class="tag" style="background:rgba(245,158,11,0.15);color:#d97706">🔥 Trending</span> }
        @if (e.distance_km != null) { <span class="tag">📍 {{ e.distance_km }} km</span> }
      </div>
    </a>
  `,
})
export class EventCardComponent {
  @Input({ required: true }) e: any;
  emoji = EMOJI;

  get names(): string {
    return (this.e.artists || []).map((a: any) => a.name).join(', ') || 'Artists TBA';
  }

  get posterBg(): string {
    const c = VENUE_COLORS[this.e.venue?.name] || '#6d3df5';
    return `linear-gradient(135deg, ${c}, #ec4899)`;
  }

  imgUrl(u: string): string { return img(u); }
}
