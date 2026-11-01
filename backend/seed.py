from datetime import datetime, timedelta
from extensions import db
from models import User, Artist, Venue, Event, Booking, Ticket, Review


def run():
    if User.query.first():
        print("Already seeded."); return
    users = {}
    for name, email, role in [("Admin", "admin@demo.com", "admin"), ("Org Studio", "org@demo.com", "organizer"), ("Anjali", "user@demo.com", "user")]:
        u = User(name=name, email=email, role=role, interests="Music"); u.set_password("demo123")
        db.session.add(u); users[role] = u
    db.session.flush()

    A = [Artist(name=n, genre=g, bio=b, popular_songs=s) for n, g, b, s in [
        ("Aria Menon", "Indie Pop", "Kochi-born singer-songwriter blending Malayalam and English lyrics.", "Monsoon Mirror,Backwater Nights,Paper Boats"),
        ("The Midnight Raagas", "Fusion Rock", "Six-piece band mixing Carnatic roots with electric rock.", "Raga Rewind,Neon Temple,Sundown Sutra"),
        ("DJ Kairo", "Electronic", "Festival headliner known for high-energy house sets.", "Pulse,Bass Garden,Afterglow"),
        ("Vikram Nair", "Stand-up", "Observational comedian with sold-out tours across India.", "Traffic Yoga,Auto Fare"),
        ("Sufi Sangam", "Sufi / Folk", "Collective reviving qawwali and folk traditions.", "Dama Dam,Chaand Raat,Saaqi")]]
    V = [Venue(name=n, city=c, address=a, latitude=la, longitude=lo, capacity=80, facilities=f) for n, c, a, la, lo, f in [
        ("Marine Arena", "Kochi", "Marine Drive, Ernakulam", 9.98, 76.28, "Parking,Food court,Wheelchair access,AC"),
        ("Skyline Auditorium", "Bengaluru", "MG Road, Bengaluru", 12.97, 77.59, "Parking,Cloakroom,Bar,AC"),
        ("Harbour Dome", "Mumbai", "Bandra Kurla Complex, Mumbai", 19.07, 72.88, "Metro nearby,Food court,VIP lounge"),
        ("Capital Hall", "Thiruvananthapuram", "Kowdiar, Thiruvananthapuram", 8.52, 76.94, "Parking,AC,Wheelchair access")]]
    db.session.add_all(A + V); db.session.flush()

    day = lambda n, h=19: (datetime.now() + timedelta(days=n)).replace(hour=h, minute=0, second=0, microsecond=0)
    org = users["organizer"].id
    rows = [("Monsoon Mirror Live", "Music", 0, 1200, [0, 4], 0, True), ("Raga Rewind Tour", "Music", 1, 1800, [1, 0], 0, False),
            ("Bass Garden Festival", "Festival", 6, 2500, [2, 1, 4], 1, True), ("Traffic Yoga: Stand-up Night", "Comedy", 2, 700, [3], 0, False),
            ("Sufi Evenings", "Music", 9, 900, [4, 0], 3, False), ("Neon Temple Reloaded", "Music", 14, 3000, [1, 2], 2, True),
            ("Indie Sunset Sessions", "Music", 3, 1500, [0, 1, 4], 1, False), ("Folk Fusion Night", "Music", -12, 800, [4, 0], 0, False)]
    events = []
    for title, cat, off, price, arts, vi, tr in rows:
        e = Event(title=title, category=cat, starts_at=day(off), base_price=price, venue_id=V[vi].id, city=V[vi].city,
                  organizer_id=org, trending=tr, description=f"{title} - an unforgettable live experience.")
        e.artists = [A[i] for i in arts]; db.session.add(e); events.append(e)
    db.session.flush()

    past = events[-1]
    b = Booking(code="EV-1001", user_id=users["user"].id, event_id=past.id, category="Regular", quantity=1, total=800, payment_ref="MOCK-SEED")
    db.session.add(b); db.session.flush()
    db.session.add(Ticket(code="EV-1001-T", booking_id=b.id, status="used", checked_in_at=past.starts_at))
    db.session.add(Review(user_id=users["user"].id, event_id=past.id, organisation=5, venue_rating=4, sound=5, comment="Brilliant energy all night."))
    db.session.commit()
