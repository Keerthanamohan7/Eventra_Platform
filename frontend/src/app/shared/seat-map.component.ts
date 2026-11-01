import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="theater-container">
      <!-- Stage Section -->
      <div class="stage-wrapper">
        <div class="stage-lights">
          <span class="light"></span>
          <span class="light"></span>
          <span class="light"></span>
        </div>
        <div class="stage-platform">
          <span class="stage-icon">⚡</span>
          <span class="stage-text">MAIN CONCERT STAGE</span>
          <span class="stage-icon">⚡</span>
        </div>
        <div class="stage-direction">⬇ Audience Faces Stage ⬇</div>
      </div>

      <!-- Seating Rows -->
      <div class="auditorium">
        @for (r of rows; track r.row) {
          <div class="seat-row-group" [attr.data-tier]="r.tier">
            <!-- Row Label Left -->
            <div class="row-indicator left">
              <span class="row-letter">{{ r.row }}</span>
              <span class="tier-pill" [class]="r.tier.toLowerCase()">{{ r.tier }}</span>
            </div>

            <!-- Left Aisle (Seats 1 to 5) -->
            <div class="seat-block left-block">
              @for (s of r.leftSeats; track s.label) {
                <button
                  type="button"
                  class="seat-btn"
                  [class]="s.tier.toLowerCase()"
                  [class.booked]="s.booked"
                  [class.selected]="selected.includes(s.label)"
                  [disabled]="s.booked || readonly"
                  (click)="toggle.emit(s.label)"
                  [attr.aria-label]="'Seat ' + s.label + ', ' + s.tier + ', Rs.' + s.price"
                >
                  <span class="seat-num">{{ s.number }}</span>
                  <span class="tooltip">
                    <b>Seat {{ s.label }}</b><br>
                    <span>{{ s.tier }} Tier</span><br>
                    <span>₹{{ s.price }}</span>
                    @if (s.booked) { <br><span class="bad-text">Already Booked</span> }
                  </span>
                </button>
              }
            </div>

            <!-- Center Walkway Aisle -->
            <div class="aisle-spacer">
              <span>AISLE</span>
            </div>

            <!-- Right Aisle (Seats 6 to 10) -->
            <div class="seat-block right-block">
              @for (s of r.rightSeats; track s.label) {
                <button
                  type="button"
                  class="seat-btn"
                  [class]="s.tier.toLowerCase()"
                  [class.booked]="s.booked"
                  [class.selected]="selected.includes(s.label)"
                  [disabled]="s.booked || readonly"
                  (click)="toggle.emit(s.label)"
                  [attr.aria-label]="'Seat ' + s.label + ', ' + s.tier + ', Rs.' + s.price"
                >
                  <span class="seat-num">{{ s.number }}</span>
                  <span class="tooltip">
                    <b>Seat {{ s.label }}</b><br>
                    <span>{{ s.tier }} Tier</span><br>
                    <span>₹{{ s.price }}</span>
                    @if (s.booked) { <br><span class="bad-text">Already Booked</span> }
                  </span>
                </button>
              }
            </div>

            <!-- Row Label Right -->
            <div class="row-indicator right">
              <span class="row-letter">{{ r.row }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Legend -->
      <div class="seat-legend">
        <div class="legend-item">
          <span class="legend-box vip"></span>
          <span>VIP (Rows A–B)</span>
        </div>
        <div class="legend-item">
          <span class="legend-box premium"></span>
          <span>Premium (Rows C–D)</span>
        </div>
        <div class="legend-item">
          <span class="legend-box regular"></span>
          <span>Regular (Rows E–H)</span>
        </div>
        <div class="legend-item">
          <span class="legend-box selected"></span>
          <span>Selected</span>
        </div>
        <div class="legend-item">
          <span class="legend-box booked"></span>
          <span>Booked</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .theater-container {
      background: rgba(15, 12, 30, 0.04);
      border: 1px solid var(--bd);
      border-radius: 18px;
      padding: 24px 16px;
      margin: 16px 0;
      overflow-x: auto;
    }
    :host-context([data-theme='dark']) .theater-container {
      background: rgba(0, 0, 0, 0.25);
    }

    /* Stage */
    .stage-wrapper {
      text-align: center;
      margin-bottom: 28px;
      position: relative;
    }
    .stage-platform {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(180deg, #374151 0%, #111827 100%);
      color: #f3f4f6;
      border: 2px solid #6d3df5;
      box-shadow: 0 0 25px rgba(109, 61, 245, 0.45);
      border-radius: 0 0 50px 50px;
      padding: 10px 48px;
      font-weight: 800;
      letter-spacing: 2px;
      font-size: 13.5px;
    }
    .stage-icon {
      color: #fbbf24;
      font-size: 16px;
    }
    .stage-direction {
      font-size: 11px;
      color: var(--mu);
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-top: 6px;
      text-transform: uppercase;
    }

    /* Auditorium Rows */
    .auditorium {
      display: flex;
      flex-direction: column;
      gap: 9px;
      align-items: center;
      min-width: 580px;
    }
    .seat-row-group {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      justify-content: center;
    }
    .row-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 80px;
    }
    .row-indicator.right {
      width: 25px;
      justify-content: flex-start;
    }
    .row-indicator.left {
      justify-content: flex-end;
    }
    .row-letter {
      font-weight: 800;
      font-size: 13px;
      color: var(--tx);
      width: 16px;
      text-align: center;
    }
    .tier-pill {
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .tier-pill.vip {
      background: rgba(245, 158, 11, 0.15);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .tier-pill.premium {
      background: rgba(59, 130, 246, 0.15);
      color: #2563eb;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .tier-pill.regular {
      background: rgba(16, 185, 129, 0.15);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    /* Seat blocks */
    .seat-block {
      display: flex;
      gap: 6px;
    }
    .aisle-spacer {
      width: 36px;
      text-align: center;
      font-size: 9px;
      letter-spacing: 1px;
      color: var(--mu);
      font-weight: 700;
      opacity: 0.6;
    }

    /* Individual Seat Button */
    .seat-btn {
      width: 34px;
      height: 32px;
      border-radius: 7px 7px 4px 4px;
      border: 1px solid transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      font-weight: 700;
      font-size: 11px;
      transition: all 0.15s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .seat-btn:hover:not(:disabled) {
      transform: scale(1.18);
      z-index: 10;
    }

    /* Tiers colors */
    .seat-btn.vip {
      background: #fef3c7;
      border-color: #f59e0b;
      color: #92400e;
    }
    .seat-btn.vip:hover:not(:disabled) {
      background: #fde68a;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
    }

    .seat-btn.premium {
      background: #e0f2fe;
      border-color: #38bdf8;
      color: #0369a1;
    }
    .seat-btn.premium:hover:not(:disabled) {
      background: #bae6fd;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
    }

    .seat-btn.regular {
      background: #d1fae5;
      border-color: #34d399;
      color: #065f46;
    }
    .seat-btn.regular:hover:not(:disabled) {
      background: #a7f3d0;
      box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
    }

    /* Selected state */
    .seat-btn.selected {
      background: #6d3df5 !important;
      border-color: #4f1fc0 !important;
      color: #ffffff !important;
      transform: scale(1.12);
      box-shadow: 0 0 12px rgba(109, 61, 245, 0.7) !important;
    }

    /* Booked state */
    .seat-btn.booked {
      background: #94a3b8 !important;
      border-color: #64748b !important;
      color: #e2e8f0 !important;
      cursor: not-allowed;
      opacity: 0.55;
      box-shadow: none;
    }

    /* Tooltip */
    .tooltip {
      visibility: hidden;
      position: absolute;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      background: #111827;
      color: #f9fafb;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      white-space: nowrap;
      z-index: 30;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      line-height: 1.3;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .seat-btn:hover .tooltip {
      visibility: visible;
      opacity: 1;
    }
    .bad-text {
      color: #f87171;
      font-weight: 600;
    }

    /* Legend */
    .seat-legend {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px dashed var(--bd);
      font-size: 12px;
      color: var(--tx);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-box {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
    .legend-box.vip { background: #fef3c7; border: 1px solid #f59e0b; }
    .legend-box.premium { background: #e0f2fe; border: 1px solid #38bdf8; }
    .legend-box.regular { background: #d1fae5; border: 1px solid #34d399; }
    .legend-box.selected { background: #6d3df5; border: 1px solid #4f1fc0; }
    .legend-box.booked { background: #94a3b8; border: 1px solid #64748b; }
  `]
})
export class SeatMapComponent {
  @Input() seats: any[] = [];
  @Input() selected: string[] = [];
  @Input() readonly = false;
  @Output() toggle = new EventEmitter<string>();

  get rows() {
    const m = new Map<string, any[]>();
    for (const s of this.seats) {
      if (!m.has(s.row)) m.set(s.row, []);
      m.get(s.row)!.push(s);
    }

    return [...m].map(([row, seatList]) => {
      // Sort seats by number
      const sorted = [...seatList].sort((a, b) => a.number - b.number);
      const leftSeats = sorted.filter(s => s.number <= 5);
      const rightSeats = sorted.filter(s => s.number > 5);
      const tier = sorted[0]?.tier || 'Regular';
      return {
        row,
        tier,
        seats: sorted,
        leftSeats,
        rightSeats
      };
    });
  }
}
