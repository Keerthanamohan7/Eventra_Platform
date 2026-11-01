import io, base64, qrcode
from datetime import datetime
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from extensions import db
from models import User, Event, Favorite, Follow

MULT = {"Regular": 1, "Premium": 1.8, "VIP": 3}
CATEGORIES = ["Music", "Comedy", "Theatre", "Festival", "Sports", "Workshop"]


def current_user():
    return db.session.get(User, int(get_jwt_identity()))


def roles_required(*roles):
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **k):
            verify_jwt_in_request()
            u = current_user()
            if not u or u.role not in roles:
                return jsonify(error="Forbidden"), 403
            return fn(*a, **k)
        return wrapper
    return deco


def seat_tier(label):  # rows A-B VIP, C-D Premium, E-H Regular
    return "VIP" if label[0] in "AB" else "Premium" if label[0] in "CD" else "Regular"


def seat_price(event, label):
    return round(float(event.base_price) * MULT[seat_tier(label)])


def qr_data_url(text):
    buf = io.BytesIO()
    qrcode.make(text).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def recommend(u):
    """Content-based recommendation: scores upcoming events by the user's interests, history, favorites and city."""
    favs = Favorite.query.filter_by(user_id=u.id).all()
    ids = lambda kind: {f.ref_id for f in favs if f.kind == kind}
    fav_events = Event.query.filter(Event.id.in_(ids("event"))).all() if ids("event") else []
    fav_cats = {e.category for e in fav_events}
    booked_cats = {b.event.category for b in u.bookings}
    interests = {i for i in (u.interests or "").split(",") if i}
    follows = {f.artist_id for f in Follow.query.filter_by(user_id=u.id)}
    fav_artists, fav_venues = ids("artist") | follows, ids("venue")
    scored = []
    for e in Event.query.filter(Event.starts_at >= datetime.now()):
        s = ((3 if e.category in interests else 0) + (2 if e.category in booked_cats else 0)
             + (1 if e.category in fav_cats else 0) + (3 if any(a.id in follows for a in e.artists) else 0)
             + (2 if any(a.id in fav_artists for a in e.artists) else 0) + (1 if e.venue_id in fav_venues else 0)
             + (2 if e.city == u.city else 0) + (1 if e.trending else 0))
        scored.append((s, e))
    scored.sort(key=lambda x: (-x[0], x[1].starts_at))
    return [e for _, e in scored]
