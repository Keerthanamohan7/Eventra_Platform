import { Component, OnInit, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink],
  template: `
    @if (loading()) {
      <div class="state-banner" style="margin-top:20px"><div class="icon">⏳</div>Loading your ticket…</div>
    }
    @if (error()) {
      <div class="state-banner bad" style="margin-top:20px">{{ error() }}</div>
    }
    @if (t(); as ticket) {
      <div class="card" style="margin-top:20px;max-width:600px;margin-left:auto;margin-right:auto">
        <h1 class="ok">✅ Booking confirmed</h1>
        <p>Your unique booking ID is <b>{{ ticket.booking_code }}</b></p>

        <div class="tk">
          <div style="width:120px;background:#fff;padding:6px;border-radius:8px;text-align:center">
            <img [src]="ticket.qr" alt="QR code" style="width:108px;height:108px;display:block;margin:0 auto">
          </div>
          <div style="flex:1;min-width:200px">
            <b>{{ ticket.event.title }}</b>
            <div>
              {{ ticket.event.starts_at | date:'EEE d MMM y' }} · {{ ticket.event.venue?.name }}, {{ ticket.event.city }}
            </div>
            <div class="mu">
              Ticket ID: {{ ticket.code }} · Booking ID: {{ ticket.booking_code }}
            </div>
            <div>
              {{ ticket.category }} × {{ ticket.quantity }}
              @if (ticket.seats?.length) {
                · Seats {{ ticket.seats.join(', ') }}
              }
              · {{ ticket.total | currency:'INR':'symbol':'1.0-0' }}
            </div>
            <b [class.ok]="ticket.status === 'valid'" [class.bad]="ticket.status !== 'valid'">
              {{ ticket.status === 'valid' ? 'Valid' : ticket.status === 'used' ? 'Used / Checked-in' : 'Expired' }}
            </b>
          </div>
        </div>

        <div class="row" style="margin-top:16px">
          <button id="tk-dash" class="p" routerLink="/dashboard">Go to dashboard</button>
          <button id="tk-print" (click)="print()">Print</button>
        </div>
      </div>
    }
  `,
})
export class TicketComponent implements OnInit {
  t = signal<any>(null);
  loading = signal(true);
  error = signal('');

  constructor(private route: ActivatedRoute, private api: ApiService) { }

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code');
    if (!code) { this.error.set('No ticket code provided.'); this.loading.set(false); return; }

    this.api.get('/tickets/' + code).subscribe({
      next: (t: any) => { this.t.set(t); this.loading.set(false); },
      error: (er: any) => {
        this.error.set(er.error?.error || 'Ticket not found or access denied.');
        this.loading.set(false);
      }
    });
  }

  print() { window.print(); }
}
