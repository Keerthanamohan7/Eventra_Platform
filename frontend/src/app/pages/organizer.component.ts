import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { CATEGORIES } from '../config';

@Component({
  selector: 'app-organizer',
  standalone: true,
  imports: [FormsModule, DatePipe, CurrencyPipe],
  template: `
    <h1>Organizer Dashboard</h1>

    <!-- Create Event -->
    <h2>Create event</h2>
    <div class="card">
      <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
        <div>
          <label class="mu" for="nt">Event Title</label>
          <input id="nt" placeholder="Title" [(ngModel)]="f.title" style="width:100%;margin-top:4px">
        </div>
        <div>
          <label class="mu" for="nc">Category</label>
          <select id="nc" [(ngModel)]="f.category" style="width:100%;margin-top:4px">
            @for (c of cats; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>
        <div>
          <label class="mu" for="nv">Venue</label>
          <select id="nv" [(ngModel)]="f.venue_id" style="width:100%;margin-top:4px">
            <option [ngValue]="null">Select a venue…</option>
            @for (v of venues(); track v.id) { <option [ngValue]="v.id">{{ v.name }} ({{ v.city }})</option> }
          </select>
        </div>
        <div>
          <label class="mu" for="na">Artists (Hold Ctrl/Cmd to select 2+)</label>
          <select id="na" multiple size="4" [(ngModel)]="f.artist_ids" style="width:100%;margin-top:4px">
            @for (a of artists(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
          </select>
        </div>
        <div>
          <label class="mu" for="nd">Date &amp; Time</label>
          <input id="nd" type="datetime-local" [(ngModel)]="f.starts_at" style="width:100%;margin-top:4px">
        </div>
        <div>
          <label class="mu" for="np">Base price ₹</label>
          <input id="np" type="number" placeholder="Base price ₹" [(ngModel)]="f.base_price" style="width:100%;margin-top:4px">
        </div>
        <div>
          <label class="mu" for="ncap">Capacity</label>
          <input id="ncap" type="number" placeholder="Capacity" [(ngModel)]="f.capacity" style="width:100%;margin-top:4px">
        </div>
        <div>
          <label class="mu" for="nimg">Poster image</label>
          <input id="nimg" type="file" accept="image/*" (change)="file = $any($event.target).files[0]" style="margin-top:4px;width:100%">
        </div>
      </div>
      <div class="row" style="margin-top:14px">
        <button id="org-create" class="p" (click)="create()">Create Event</button>
        @if (createError()) { <span class="bad">{{ createError() }}</span> }
        @if (createOk()) { <span class="ok">{{ createOk() }}</span> }
      </div>
    </div>

    <!-- Add Artist / Venue -->
    <h2>🎸 Add Artist / Venue</h2>
    <div class="row" style="align-items:flex-start;flex-wrap:wrap;gap:14px">
      <div class="card" style="flex:1;min-width:260px">
        <b>Add Artist</b>
        <div style="display:grid;gap:8px;margin-top:10px">
          <input id="art-name" placeholder="Artist name" [(ngModel)]="na.name">
          <input id="art-genre" placeholder="Genre (e.g. Indie Pop)" [(ngModel)]="na.genre">
          <input id="art-bio" placeholder="Short bio" [(ngModel)]="na.bio">
          <button (click)="addArtist()">Add artist</button>
        </div>
      </div>
      <div class="card" style="flex:1;min-width:260px">
        <b>Add Venue</b>
        <div style="display:grid;gap:8px;margin-top:10px">
          <input id="ven-name" placeholder="Venue name" [(ngModel)]="nv.name">
          <input id="ven-city" placeholder="City" [(ngModel)]="nv.city">
          <input id="ven-addr" placeholder="Address" [(ngModel)]="nv.address">
          <div class="row">
            <input type="number" placeholder="Latitude" [(ngModel)]="nv.latitude" style="width:100px">
            <input type="number" placeholder="Longitude" [(ngModel)]="nv.longitude" style="width:100px">
          </div>
          <button (click)="addVenue()">Add venue</button>
        </div>
      </div>
    </div>

    <!-- Events Table -->
    <h2>📊 My Events & Analytics</h2>
    @if (loading()) {
      <div class="state-banner"><div class="icon">⏳</div>Loading events…</div>
    } @else if (!events().length) {
      <div class="state-banner"><div class="icon">📋</div>No events yet. Create your first event above!</div>
    } @else {
      <div class="scroll">
        <table>
          <tr>
            <th>Event</th><th>Date</th><th>Bookings</th><th>Tickets</th>
            <th>Checked in</th><th>Revenue</th><th>Actions</th>
          </tr>
          @for (ev of events(); track ev.id) {
            <tr>
              <td><b>{{ ev.title }}</b></td>
              <td>{{ ev.starts_at | date:'d MMM y' }}</td>
              <td>{{ ev.stats.bookings }}</td>
              <td>{{ ev.stats.tickets_sold }} / {{ ev.capacity }}</td>
              <td>{{ ev.stats.checked_in }}</td>
              <td>
                <div class="bar" [style.width.px]="barWidth(ev)" style="min-width:4px"></div>
                {{ ev.stats.revenue | currency:'INR':'symbol':'1.0-0' }}
              </td>
              <td>
                <div class="row" style="flex-wrap:nowrap;gap:4px">
                  <button (click)="showAttendees(ev)" style="font-size:12px">👥 Attendees</button>
                  <button class="d" (click)="remove(ev)" style="font-size:12px">Delete</button>
                </div>
              </td>
            </tr>
          }
        </table>
      </div>
    }

    <!-- Attendees -->
    @if (attendees(); as list) {
      <h2>👥 Attendees · {{ list.length }} total</h2>
      <div class="scroll">
        <table>
          <tr><th>Booking</th><th>Name</th><th>Email</th><th>Type</th><th>Seats</th><th>Ticket</th><th>Status</th></tr>
          @for (a of list; track a.booking) {
            <tr>
              <td>{{ a.booking }}</td>
              <td>{{ a.name }}</td>
              <td class="mu">{{ a.email }}</td>
              <td>{{ a.category }} × {{ a.quantity }}</td>
              <td>{{ a.seats.join(', ') || '—' }}</td>
              <td><code>{{ a.ticket }}</code></td>
              <td [class.ok]="a.status === 'valid'" [class.bad]="a.status === 'used'">{{ a.status }}</td>
            </tr>
          }
        </table>
      </div>
    }

    <!-- QR Check-in -->
    <h2>📷 Scan QR ticket</h2>
    <div class="card">
      <p class="mu" style="margin-top:0">Scan or type the ticket code to check in an attendee.</p>
      <div class="row">
        <input id="sc" placeholder="Enter ticket ID e.g. EV-1001-T"
               [(ngModel)]="code" (keyup.enter)="scan()" style="flex:1">
        <button id="checkin-btn" class="p" (click)="scan()">Check in</button>
      </div>
      @if (scanMsg()) {
        <p id="sr" style="margin-top:10px;font-weight:600" [class.ok]="scanOk()" [class.bad]="!scanOk()">
          {{ scanMsg() }}
        </p>
      }
      <p class="mu" style="margin-top:8px;font-size:12px">
        Connect a USB/Bluetooth QR scanner — it types the code like a keyboard and triggers Enter.
      </p>
    </div>
  `,
})
export class OrganizerComponent implements OnInit {
  cats = CATEGORIES;

  events    = signal<any[]>([]);
  venues    = signal<any[]>([]);
  artists   = signal<any[]>([]);
  attendees = signal<any[] | null>(null);
  loading   = signal(true);
  createError = signal('');
  createOk    = signal('');
  scanMsg     = signal('');
  scanOk      = signal(false);

  f: any = { title: '', category: 'Music', venue_id: null, artist_ids: [], starts_at: '', base_price: null, capacity: 80 };
  na: any = {}; nv: any = {};
  file?: File;
  code = '';

  constructor(private api: ApiService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.api.get('/organizer/events').subscribe({
      next: (r: any) => { this.events.set(Array.isArray(r) ? r : []); this.loading.set(false); },
      error: () => { this.events.set([]); this.loading.set(false); }
    });
    this.api.get('/venues').subscribe({
      next: (r: any) => this.venues.set(Array.isArray(r) ? r : []),
      error: () => {}
    });
    this.api.get('/artists').subscribe({
      next: (r: any) => this.artists.set(Array.isArray(r) ? r : []),
      error: () => {}
    });
  }

  barWidth(ev: any): number {
    const max = Math.max(1, ...this.events().map(x => x.stats.revenue));
    return (ev.stats.revenue / max) * 120;
  }

  create() {
    this.createError.set('');
    this.createOk.set('');
    if (!this.f.title || !this.f.venue_id || !this.f.base_price) {
      this.createError.set('Title, venue, and base price are required.');
      return;
    }
    if (!this.f.artist_ids || this.f.artist_ids.length === 0) {
      this.createError.set('Please select at least one artist.');
      return;
    }
    if (!this.f.starts_at) {
      const d = new Date(Date.now() + 7 * 864e5);
      d.setHours(19, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, '0');
      this.f.starts_at = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    this.api.post('/organizer/events', this.f).subscribe({
      next: (ev: any) => {
        const done = () => {
          this.f = { title: '', category: 'Music', venue_id: null, artist_ids: [], starts_at: '', base_price: null, capacity: 80 };
          this.file = undefined;
          this.createOk.set('Event created successfully! ✓');
          setTimeout(() => this.createOk.set(''), 4000);
          this.reload();
        };
        if (!this.file) { done(); return; }
        const fd = new FormData(); fd.append('file', this.file);
        this.api.post(`/organizer/events/${ev.id}/poster`, fd).subscribe({ next: done, error: done });
      },
      error: (e: any) => this.createError.set(e.error?.error || 'Could not create event')
    });
  }

  addArtist() {
    if (!this.na.name) return;
    this.api.post('/artists', this.na).subscribe({
      next: () => { this.na = {}; this.reload(); },
      error: () => {}
    });
  }

  addVenue() {
    if (!this.nv.name || !this.nv.city) return;
    this.api.post('/venues', this.nv).subscribe({
      next: () => { this.nv = {}; this.reload(); },
      error: () => {}
    });
  }

  remove(ev: any) {
    if (!confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    this.api.delete('/organizer/events/' + ev.id).subscribe({ next: () => this.reload(), error: () => {} });
  }

  showAttendees(ev: any) {
    this.api.get(`/organizer/events/${ev.id}/attendees`).subscribe({
      next: (r: any) => this.attendees.set(Array.isArray(r) ? r : []),
      error: () => {}
    });
  }

  scan() {
    const c = this.code.trim();
    if (!c) return;
    this.api.post('/organizer/checkin', { ticket_code: c }).subscribe({
      next: (r: any) => { this.scanOk.set(true); this.scanMsg.set('✅ ' + r.message); this.reload(); },
      error: (e: any) => {
        if (!c.endsWith('-T')) {
          this.api.post('/organizer/checkin', { ticket_code: c + '-T' }).subscribe({
            next: (r2: any) => { this.scanOk.set(true); this.scanMsg.set('✅ ' + r2.message); this.reload(); },
            error: (e2: any) => { this.scanOk.set(false); this.scanMsg.set('❌ ' + (e2.error?.message || e.error?.message || 'Check-in failed')); }
          });
          return;
        }
        this.scanOk.set(false);
        this.scanMsg.set('❌ ' + (e.error?.message || 'Check-in failed'));
      }
    });
  }
}
