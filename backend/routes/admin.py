from flask import Blueprint, request, jsonify
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import User, Event, Artist, Venue, Booking, Ticket, Review
from utils import roles_required

bp = Blueprint("admin", __name__, url_prefix="/api")

RESOURCES = {
    "users": (User, lambda x: x.to_dict()),
    "events": (Event, lambda x: dict(id=x.id, title=x.title, category=x.category, city=x.city,
                                      starts_at=x.starts_at.isoformat(), base_price=float(x.base_price), sold=x.sold())),
    "artists": (Artist, lambda x: dict(id=x.id, name=x.name, genre=x.genre)),
    "venues": (Venue, lambda x: dict(id=x.id, name=x.name, city=x.city, capacity=x.capacity)),
    "bookings": (Booking, lambda x: dict(id=x.id, code=x.code, user=x.user.name, event=x.event.title,
                                          category=x.category, quantity=x.quantity, total=float(x.total), status=x.status)),
    "tickets": (Ticket, lambda x: dict(id=x.id, code=x.code, event=x.booking.event.title, status=x.status)),
    "reviews": (Review, lambda x: dict(id=x.id, user=x.user.name, event=x.event.title, overall=round((x.organisation + x.venue_rating + x.sound) / 3, 1), comment=x.comment)),
}


@bp.get("/admin/stats")
@roles_required("admin")
def stats():
    top = lambda col: [dict(name=n, tickets=int(t or 0)) for n, t in
                       db.session.query(col, func.sum(Booking.quantity)).select_from(Event)
                       .join(Booking, Booking.event_id == Event.id).group_by(col)
                       .order_by(func.sum(Booking.quantity).desc()).limit(5)]
    revenue = db.session.query(func.coalesce(func.sum(Booking.total), 0)).scalar()
    return jsonify(users=User.query.count(), events=Event.query.count(), bookings=Booking.query.count(),
                   revenue=float(revenue), popular_events=top(Event.title), popular_cities=top(Event.city),
                   popular_categories=top(Event.category))


@bp.get("/admin/<res>")
@roles_required("admin")
def list_res(res):
    if res not in RESOURCES: return jsonify(error="Unknown resource"), 404
    model, ser = RESOURCES[res]
    return jsonify([ser(x) for x in model.query.order_by(model.id.desc())])


@bp.delete("/admin/<res>/<int:rid>")
@roles_required("admin")
def delete_res(res, rid):
    if res not in RESOURCES: return jsonify(error="Unknown resource"), 404
    obj = db.get_or_404(RESOURCES[res][0], rid)
    try:
        db.session.delete(obj); db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="Cannot delete: other records depend on it"), 409
    return jsonify(ok=True)


# Organizers and admins can add artists and venues
@bp.post("/artists")
@roles_required("organizer", "admin")
def add_artist():
    d = request.get_json() or {}
    if not d.get("name"): return jsonify(error="Name required"), 400
    a = Artist(name=d["name"], genre=d.get("genre"), bio=d.get("bio"), popular_songs=d.get("songs", ""))
    db.session.add(a); db.session.commit()
    return jsonify(a.to_dict()), 201


@bp.post("/venues")
@roles_required("organizer", "admin")
def add_venue():
    d = request.get_json() or {}
    if not d.get("name") or not d.get("city"): return jsonify(error="Name and city required"), 400
    v = Venue(name=d["name"], city=d["city"], address=d.get("address"), capacity=d.get("capacity", 80),
              latitude=d.get("latitude"), longitude=d.get("longitude"), facilities=d.get("facilities", ""))
    db.session.add(v); db.session.commit()
    return jsonify(v.to_dict()), 201
