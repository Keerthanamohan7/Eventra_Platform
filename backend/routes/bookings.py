import re, secrets
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import Event, Booking, BookingSeat, Ticket
from utils import current_user, MULT, seat_tier, seat_price

bp = Blueprint("bookings", __name__, url_prefix="/api")
SEAT_RE = re.compile(r"^[A-H](10|[1-9])$")


@bp.post("/bookings")
@jwt_required()
def create_booking():
    u, d = current_user(), request.get_json() or {}
    e = db.session.get(Event, d.get("event_id") or 0)
    if not e or e.starts_at < datetime.now():
        return jsonify(error="Event not available for booking"), 400
    # mock payment: any card number with 12+ digits succeeds
    if len(str((d.get("payment") or {}).get("card", "")).replace(" ", "")) < 12:
        return jsonify(error="Payment failed (mock): invalid card number"), 402

    seats, lines = d.get("seats") or [], []
    if seats:
        if len(set(seats)) != len(seats) or len(seats) > 10 or not all(SEAT_RE.match(s) for s in seats):
            return jsonify(error="Invalid seat selection"), 400
        if BookingSeat.query.filter(BookingSeat.event_id == e.id, BookingSeat.label.in_(seats)).first():
            return jsonify(error="Some seats were just booked. Please choose again."), 409
        lines = [(s, seat_price(e, s)) for s in seats]
        total, qty = sum(p for _, p in lines), len(seats)
        category = "/".join(sorted({seat_tier(s) for s in seats}))
    else:
        category = d.get("category")
        try: qty = int(d.get("quantity", 1))
        except (TypeError, ValueError): qty = 0
        if category not in MULT or not 1 <= qty <= 10:
            return jsonify(error="Choose a ticket category and a quantity of 1-10"), 400
        if e.sold() + qty > e.capacity:
            return jsonify(error="Not enough tickets left"), 409
        total = round(float(e.base_price) * MULT[category] * qty)

    b = Booking(code="EV-" + secrets.token_hex(3).upper(), user_id=u.id, event_id=e.id, category=category,
                quantity=qty, total=total, payment_ref="MOCK-" + secrets.token_hex(4).upper())
    db.session.add(b); db.session.flush()
    for label, price in lines:
        db.session.add(BookingSeat(booking_id=b.id, event_id=e.id, label=label, price=price))
    db.session.add(Ticket(code=b.code + "-T", booking_id=b.id))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="Seat conflict. Please try again."), 409
    return jsonify(booking=b.to_dict(), ticket_code=b.code + "-T"), 201


@bp.get("/bookings/mine")
@jwt_required()
def my_bookings():
    u = current_user()
    q = Booking.query.filter_by(user_id=u.id).order_by(Booking.created_at.desc())
    return jsonify([b.to_dict() for b in q])


@bp.get("/tickets/<code>")
@jwt_required()
def ticket(code):
    u, t = current_user(), Ticket.query.filter_by(code=code).first_or_404()
    ev = t.booking.event
    if not (t.booking.user_id == u.id or u.role == "admin" or ev.organizer_id == u.id):
        return jsonify(error="Forbidden"), 403
    return jsonify(t.to_dict(qr=True))
