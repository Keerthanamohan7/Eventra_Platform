from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

event_artists = db.Table(
    "event_artists",
    db.Column("event_id", db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    db.Column("artist_id", db.Integer, db.ForeignKey("artists.id", ondelete="CASCADE"), primary_key=True),
)


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user")  # user | organizer | admin
    city = db.Column(db.String(60), default="Kochi")
    interests = db.Column(db.String(255), default="")  # comma separated categories
    created_at = db.Column(db.DateTime, default=datetime.now)
    bookings = db.relationship("Booking", backref="user", cascade="all, delete-orphan")

    def set_password(self, p): self.password_hash = generate_password_hash(p)
    def check_password(self, p): return check_password_hash(self.password_hash, p)

    def to_dict(self):
        return dict(id=self.id, name=self.name, email=self.email, role=self.role, city=self.city,
                    interests=[i for i in (self.interests or "").split(",") if i])


class Artist(db.Model):
    __tablename__ = "artists"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    genre = db.Column(db.String(80))
    bio = db.Column(db.Text)
    image_url = db.Column(db.String(255))
    popular_songs = db.Column(db.Text, default="")  # comma separated

    def to_dict(self):
        return dict(id=self.id, name=self.name, genre=self.genre, bio=self.bio, image_url=self.image_url,
                    songs=[s for s in (self.popular_songs or "").split(",") if s])


class Venue(db.Model):
    __tablename__ = "venues"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    city = db.Column(db.String(60), nullable=False)
    address = db.Column(db.String(255))
    capacity = db.Column(db.Integer, default=80)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    facilities = db.Column(db.String(255), default="")  # comma separated
    image_url = db.Column(db.String(255))

    def to_dict(self):
        return dict(id=self.id, name=self.name, city=self.city, address=self.address, capacity=self.capacity,
                    latitude=self.latitude, longitude=self.longitude, image_url=self.image_url,
                    facilities=[f for f in (self.facilities or "").split(",") if f])


class Event(db.Model):
    __tablename__ = "events"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(40), nullable=False)
    description = db.Column(db.Text)
    poster_url = db.Column(db.String(255))
    city = db.Column(db.String(60))
    starts_at = db.Column(db.DateTime, nullable=False)
    base_price = db.Column(db.Numeric(10, 2), nullable=False)
    capacity = db.Column(db.Integer, default=80)
    trending = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    venue_id = db.Column(db.Integer, db.ForeignKey("venues.id"))
    organizer_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    venue = db.relationship("Venue")
    artists = db.relationship("Artist", secondary=event_artists, backref="events")
    bookings = db.relationship("Booking", backref="event", cascade="all, delete-orphan")
    reviews = db.relationship("Review", backref="event", cascade="all, delete-orphan")

    def sold(self):
        return sum(b.quantity for b in self.bookings if b.status == "confirmed")

    def rating(self):
        if not self.reviews: return None
        return round(sum((r.organisation + r.venue_rating + r.sound) / 3 for r in self.reviews) / len(self.reviews), 1)

    def to_dict(self):
        return dict(id=self.id, title=self.title, category=self.category, description=self.description,
                    poster_url=self.poster_url, city=self.city, starts_at=self.starts_at.isoformat(),
                    base_price=float(self.base_price), capacity=self.capacity, trending=bool(self.trending),
                    rating=self.rating(), organizer_id=self.organizer_id, sold=self.sold(),
                    venue=self.venue.to_dict() if self.venue else None,
                    artists=[a.to_dict() for a in self.artists])


class Booking(db.Model):
    __tablename__ = "bookings"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)  # unique booking ID
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    category = db.Column(db.String(40))
    quantity = db.Column(db.Integer, default=1)
    total = db.Column(db.Numeric(10, 2))
    status = db.Column(db.String(20), default="confirmed")
    payment_ref = db.Column(db.String(40))
    created_at = db.Column(db.DateTime, default=datetime.now)
    seats = db.relationship("BookingSeat", backref="booking", cascade="all, delete-orphan")
    ticket = db.relationship("Ticket", backref="booking", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return dict(id=self.id, code=self.code, category=self.category, quantity=self.quantity,
                    total=float(self.total), status=self.status, created_at=self.created_at.isoformat(),
                    seats=[s.label for s in self.seats], user=self.user.name, event=self.event.to_dict(),
                    ticket_code=self.ticket.code if self.ticket else None,
                    ticket_status=self.ticket.state() if self.ticket else None)


class BookingSeat(db.Model):
    __tablename__ = "booking_seats"
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    label = db.Column(db.String(5), nullable=False)
    price = db.Column(db.Numeric(10, 2))
    __table_args__ = (db.UniqueConstraint("event_id", "label", name="uq_event_seat"),)


class Ticket(db.Model):
    __tablename__ = "tickets"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    status = db.Column(db.String(20), default="valid")  # valid | used | cancelled
    checked_in_at = db.Column(db.DateTime)

    def state(self):
        if self.status != "valid": return self.status
        from datetime import timedelta
        return "expired" if self.booking.event.starts_at + timedelta(days=1) < datetime.now() else "valid"

    def to_dict(self, qr=False):
        from utils import qr_data_url
        b = self.booking
        d = dict(id=self.id, code=self.code, status=self.state(), booking_code=b.code, category=b.category,
                 quantity=b.quantity, seats=[s.label for s in b.seats], total=float(b.total),
                 event=b.event.to_dict(), holder=b.user.name,
                 checked_in_at=self.checked_in_at.isoformat() if self.checked_in_at else None)
        if qr: d["qr"] = qr_data_url(self.code)
        return d


class Review(db.Model):
    __tablename__ = "reviews"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    organisation = db.Column(db.Integer, default=5)
    venue_rating = db.Column(db.Integer, default=5)
    sound = db.Column(db.Integer, default=5)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    user = db.relationship("User")
    __table_args__ = (db.UniqueConstraint("user_id", "event_id", name="uq_user_event_review"),)

    def to_dict(self):
        return dict(id=self.id, user=self.user.name, event_id=self.event_id, event=self.event.title,
                    organisation=self.organisation, venue_rating=self.venue_rating, sound=self.sound,
                    overall=round((self.organisation + self.venue_rating + self.sound) / 3, 1),
                    comment=self.comment, created_at=self.created_at.isoformat())


class Favorite(db.Model):
    __tablename__ = "favorites"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind = db.Column(db.String(10), nullable=False)  # event | artist | venue
    ref_id = db.Column(db.Integer, nullable=False)
    __table_args__ = (db.UniqueConstraint("user_id", "kind", "ref_id", name="uq_fav"),)


class Follow(db.Model):
    __tablename__ = "follows"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    artist_id = db.Column(db.Integer, db.ForeignKey("artists.id", ondelete="CASCADE"), nullable=False)
    __table_args__ = (db.UniqueConstraint("user_id", "artist_id", name="uq_follow"),)
