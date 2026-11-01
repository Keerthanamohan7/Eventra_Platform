import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { EventCardComponent } from '../shared/event-card.component';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [FormsModule, EventCardComponent],
  template: `
    <h1>🤖 AI Event Assistant</h1>
    <p class="mu" style="margin-bottom:16px">
      Ask in plain English — I'll find events by category, city, budget or date.
    </p>

    <div class="card" style="min-height:400px;display:flex;flex-direction:column">
      <!-- Messages -->
      <div style="flex:1;overflow-y:auto;max-height:480px;padding-bottom:8px" id="chat-scroll">
        @for (m of chat(); track $index) {
          <div class="msg" [class.me]="m.me">{{ m.text }}</div>
          @if (m.events?.length) {
            <div class="grid" style="margin:8px 0 12px">
              @for (e of m.events; track e.id) { <app-event-card [e]="e" /> }
            </div>
          }
        }
        @if (thinking()) {
          <div class="msg" style="opacity:0.6">🤔 Thinking…</div>
        }
      </div>

      <!-- Input bar -->
      <div class="row" style="margin-top:12px;border-top:1px solid var(--bd);padding-top:12px">
        <input
          id="chat-input"
          style="flex:1"
          [(ngModel)]="text"
          (keyup.enter)="send()"
          placeholder="Find a music event in Kochi under ₹2,000 this weekend…"
          [disabled]="thinking()"
        >
        <button id="chat-send" class="p" (click)="send()" [disabled]="thinking()">Send →</button>
      </div>

      <!-- Suggestions -->
      <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:6px">
        @for (s of suggestions; track s) {
          <button (click)="text = s" style="font-size:12px;padding:4px 10px">{{ s }}</button>
        }
      </div>
    </div>
  `,
})
export class AssistantComponent {
  chat     = signal<any[]>([{ text: '👋 Hi! Ask me to find events by category, city, date or budget.' }]);
  thinking = signal(false);
  text = '';

  suggestions = [
    'Music events in Kochi this weekend',
    'Comedy shows under ₹1,000',
    'Events in Bengaluru next week',
    'Festival events under ₹3,000',
  ];

  constructor(private api: ApiService) {}

  send() {
    const t = this.text.trim();
    if (!t || this.thinking()) return;
    this.chat.update(c => [...c, { me: true, text: t }]);
    this.text = '';
    this.thinking.set(true);

    this.api.post('/assistant', { message: t }).subscribe({
      next: (r: any) => {
        this.chat.update(c => [...c, { text: r.reply, events: r.events || [] }]);
        this.thinking.set(false);
      },
      error: () => {
        this.chat.update(c => [...c, { text: '⚠️ Sorry, I encountered an error. Please try again.' }]);
        this.thinking.set(false);
      }
    });
  }
}
