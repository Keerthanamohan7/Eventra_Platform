import os, uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from sqlalchemy import func
from extensions import db
from models import Event, Artist, Venue, Booking, Ticket, BookingSeat
from utils import current_user, roles_required

bp = Blueprint("organizer", __name__, url_prefix="/api/organizer")
ALLOWED = {"png", "jpg", "jpeg", "webp", "gif"}


def owned(eid):
    u, e = current_user(), db.get_or_404(Event, eid)
    return (e, None) if (u.role == "admin" or e.organizer_id == u.id) else (None, (jsonify(error="Not your event"), 403))


def apply(e, d):
    for k in ("title", "category", "description", "base_price", "capacity", "venue_id", "trending"):
        if k in d: setattr(e, k, d[k])
    if d.get("starts_at"): e.starts_at = datetime.fromisoformat(d["starts_at"])
    if "artist_ids" in d: e.artists = Artist.query.filter(Artist.id.in_(d["artist_ids"])).all()
    v = db.session.get(Venue, e.venue_id)
    if v: e.city = v.city


def stats(e):
    bks = [b for b in e.bookings if b.status == "confirmed"]
    used = sum(b.quantity for b in bks if b.ticket and b.ticket.status == "used")
    by_cat = {}
    for b in bks:
        c = by_cat.setdefault(b.category, dict(tickets=0, revenue=0)); c["tickets"] += b.quantity; c["revenue"] += float(b.total)
    return dict(bookings=len(bks), tickets_sold=sum(b.quantity for b in bks), checked_in=used,
                revenue=sum(float(b.total) for b in bks), capacity=e.capacity, by_category=by_cat)


@bp.get("/events")
@roles_required("organizer", "admin")
def my_events():
    u = current_user()
    q = Event.query if u.role == "admin" else Event.query.filter_by(organizer_id=u.id)
    return jsonify([dict(e.to_dict(), stats=stats(e)) for e in q.order_by(Event.starts_at.desc())])


@bp.post("/events")
@roles_required("organizer", "admin")
def create_event():
    d = request.get_json() or {}
    if not all(d.get(k) for k in ("title", "category", "venue_id", "starts_at", "base_price")):
        return jsonify(error="title, category, venue_id, starts_at and base_price are required"), 400
    e = Event(organizer_id=current_user().id, title=d["title"], category=d["category"],
              venue_id=d["venue_id"], base_price=d["base_price"], starts_at=datetime.fromisoformat(d["starts_at"]))
    db.session.add(e)
    apply(e, d)
    db.session.commit()
    return jsonify(e.to_dict()), 201


@bp.put("/events/<int:eid>")
@roles_required("organizer", "admin")
def update_event(eid):
    e, err = owned(eid)
    if err: return err
    apply(e, request.get_json() or {}); db.session.commit()
    return jsonify(e.to_dict())


@bp.delete("/events/<int:eid>")
@roles_required("organizer", "admin")
def delete_event(eid):
    e, err = owned(eid)
    if err: return err
    db.session.delete(e); db.session.commit()
    return jsonify(ok=True)


@bp.post("/events/<int:eid>/poster")
@roles_required("organizer", "admin")
def upload_poster(eid):
    e, err = owned(eid)
    if err: return err
    f = request.files.get("file")
    ext = f.filename.rsplit(".", 1)[-1].lower() if f and "." in f.filename else ""
    if ext not in ALLOWED: return jsonify(error="Upload a png, jpg, webp or gif image"), 400
    name = f"{uuid.uuid4().hex}_{secure_filename(f.filename)}"
    f.save(os.path.join(current_app.config["UPLOAD_FOLDER"], name))
    e.poster_url = "/uploads/" + name; db.session.commit()
    return jsonify(poster_url=e.poster_url)


@bp.get("/events/<int:eid>/attendees")
@roles_required("organizer", "admin")
def attendees(eid):
    e, err = owned(eid)
    if err: return err
    return jsonify([dict(booking=b.code, name=b.user.name, email=b.user.email, category=b.category,
                         quantity=b.quantity, seats=[s.label for s in b.seats],
                         ticket=b.ticket.code, status=b.ticket.status) for b in e.bookings])


@bp.post("/checkin")
@roles_required("organizer", "admin")
def checkin():
    """Scan / verify a QR ticket (the QR encodes the ticket code)."""
    u, code = current_user(), (request.get_json() or {}).get("ticket_code", "").strip()
    t = Ticket.query.filter_by(code=code).first()
    if not t: return jsonify(valid=False, message="Invalid ticket"), 404
    ev = t.booking.event
    if u.role != "admin" and ev.organizer_id != u.id: return jsonify(valid=False, message="Ticket is for another organizer's event"), 403
    if t.status == "used": return jsonify(valid=False, message="Ticket already used"), 409
    if t.status == "cancelled": return jsonify(valid=False, message="Ticket cancelled"), 409
    t.status, t.checked_in_at = "used", datetime.now(); db.session.commit()
    return jsonify(valid=True, message=f"Valid - {ev.title}, {t.booking.quantity} entry", holder=t.booking.user.name)
