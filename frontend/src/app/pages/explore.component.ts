import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CATEGORIES } from '../config';
import { EventCardComponent } from '../shared/event-card.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [FormsModule, EventCardComponent],
  template: `
    <h1>Explore events</h1>

    <div class="row card" style="margin-bottom:20px;gap:8px">
      <input
        id="fq"
        placeholder="Search"
        [(ngModel)]="f.q"
        (input)="onTextInput()"
        (keydown.enter)="applyImmediate()"
        (blur)="applyImmediate()"
        style="flex:1;min-width:180px"
      >
      <select id="ex-cat" [(ngModel)]="f.category" (change)="applyImmediate()">
        <option value="">All categories</option>
        @for (c of cats; track c) { <option [value]="c">{{ c }}</option> }
      </select>
      <select id="ex-city" [(ngModel)]="f.city" (change)="applyImmediate()">
        <option value="">All cities</option>
        @for (c of cities(); track c) { <option [value]="c">{{ c }}</option> }
      </select>
      <input
        id="ex-date"
        type="date"
        [(ngModel)]="f.date"
        (change)="applyImmediate()"
        style="width:160px"
      >
      <input
        id="fmax"
        inputmode="numeric"
        placeholder="Max price ₹ (e.g. 5000)"
        [(ngModel)]="f.max_price"
        (input)="onPriceInput()"
        (keydown.enter)="applyImmediate()"
        (blur)="applyImmediate()"
        style="width:180px"
      >
      <button id="ex-clear" (click)="clear()">Clear</button>
    </div>

    @if (activeFilters().length) {
      <div class="row" style="margin-bottom:16px;gap:6px">
        <span class="mu" style="font-size:13px">Active filters:</span>
        @for (filter of activeFilters(); track filter) {
          <span class="tag">{{ filter }}</span>
        }
      </div>
    }

    @if (loading()) {
      <div class="state-banner"><div class="icon">⏳</div>Searching events…</div>
    } @else if (error()) {
      <div class="state-banner bad">
        <div class="icon">⚠️</div>
        {{ error() }}
        <br><button (click)="load()" style="margin-top:10px">Retry</button>
      </div>
    } @else if (events().length === 0) {
      <p class="mu">No events match.</p>
    } @else {
      <div class="grid">
        @for (e of events(); track e.id) {
          <app-event-card [e]="e" />
        }
      </div>
    }
  `,
})
export class ExploreComponent implements OnInit, OnDestroy {
  cats = CATEGORIES;
  cities = signal<string[]>([]);
  events = signal<any[]>([]);
  loading = signal(false);
  error = signal('');

  f: any = { q: '', category: '', city: '', date: '', max_price: '' };

  private typingTimer: any;

  constructor(private api: ApiService, private route: ActivatedRoute) { }

  ngOnInit() {
    this.f.q = this.route.snapshot.queryParamMap.get('q') || '';

    this.api.get('/venues').subscribe({
      next: (v: any) => {
        const cs = [...new Set<string>((v || []).map((x: any) => x.city))];
        this.cities.set(cs);
      },
      error: () => { }
    });

    this.load();
  }

  ngOnDestroy() {
    clearTimeout(this.typingTimer);
  }

  onTextInput() {
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.load(), 400);
  }

  onPriceInput() {
    // Accept only digits, strip commas and all non-digits
    this.f.max_price = String(this.f.max_price || '').replace(/[^\d]/g, '');
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.load(), 700);
  }

  applyImmediate() {
    clearTimeout(this.typingTimer);
    this.f.max_price = String(this.f.max_price || '').replace(/[^\d]/g, '');
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.get('/events', this.f).subscribe({
      next: (r: any) => {
        this.events.set(Array.isArray(r) ? r : []);
        this.loading.set(false);
      },
      error: (e: any) => {
        this.error.set(e.error?.error || 'Failed to load events. Please try again.');
        this.loading.set(false);
      }
    });
  }

  clear() {
    clearTimeout(this.typingTimer);
    this.f = { q: '', category: '', city: '', date: '', max_price: '' };
    this.load();
  }

  activeFilters(): string[] {
    const out: string[] = [];
    if (this.f.q) out.push(`"${this.f.q}"`);
    if (this.f.category) out.push(this.f.category);
    if (this.f.city) out.push(this.f.city);
    if (this.f.date) out.push(this.f.date);
    if (this.f.max_price) out.push(`≤ ₹${Number(this.f.max_price).toLocaleString('en-IN')}`);
    return out;
  }
}
