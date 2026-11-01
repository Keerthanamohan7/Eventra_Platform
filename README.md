# Eventra – Event & Concert Platform (Angular + Flask + MySQL)

## 1. Database
```sql
CREATE DATABASE eventra CHARACTER SET utf8mb4;
```

## 2. Backend (Flask) – http://localhost:5000
```bash
cd backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # edit DATABASE_URL and JWT_SECRET_KEY
flask --app app seed                                  # creates tables + demo data
flask --app app run
```
Demo logins (password `demo123`): `user@demo.com`, `org@demo.com`, `admin@demo.com`

## 3. Frontend (Angular 17+) – http://localhost:4200
```bash
npm i -g @angular/cli
ng new eventra --routing=false --style=css --ssr=false   # answer "No" to SSR / zoneless prompts
cd eventra
# delete the generated src/ files, then copy this project's frontend/src/* into eventra/src/
ng serve
```
API address: `src/app/config.ts` (`HOST`).

## Feature map
| PDF module | Backend | Angular page |
|---|---|---|
| Event discovery, near you, filters | routes/events.py | home, explore, event/artist/venue detail |
| Recommendations (content-based) | utils.recommend, /api/recommendations | home |
| Booking, mock payment, booking ID | routes/bookings.py | event-detail |
| Seat selection | /api/events/:id/seats | shared/seat-map |
| QR ticket | models.Ticket, utils.qr_data_url | ticket |
| Artists / follow / notifications | events.py, social.py | artist-detail, dashboard |
| Venues | events.py | venue-detail |
| Reviews (completed bookings only) | social.py | event-detail |
| Wishlist / favorites | social.py | dashboard |
| User dashboard | bookings.py, social.py | dashboard |
| Admin | routes/admin.py | admin |
| Organizer + QR check-in + analytics | routes/organizer.py | organizer |
| AI assistant | routes/assistant.py | assistant |

## Production notes
Use HTTPS, a strong JWT secret, a real payment gateway (Razorpay/Stripe), and restrict CORS origins in `app.py`.
