import math
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, func
from extensions import db
from models import Event, Artist, Venue, User, Booking, BookingSeat, Favorite, Follow
from utils import recommend, seat_tier, seat_price

bp = Blueprint("events", __name__, url_prefix="/api")


def upcoming():
    return Event.query.filter(Event.starts_at >= datetime.now())


def listing(q):
    return jsonify([e.to_dict() for e in q])


@bp.get("/events")
def list_events():
    a = request.args
    q = Event.query.join(Venue, Event.venue_id == Venue.id).outerjoin(Event.artists)
    if a.get("past") != "1":
        q = q.filter(Event.starts_at >= datetime.now())
    if a.get("q"):
        like = f"%{a['q']}%"
        q = q.filter(or_(Event.title.like(like), Artist.name.like(like), Venue.name.like(like)))
    if a.get("category"): q = q.filter(Event.category == a["category"])
    if a.get("city"): q = q.filter(Event.city == a["city"])
    if a.get("date"): q = q.filter(func.date(Event.starts_at) == a["date"])
    if a.get("max_price", "").isdigit(): q = q.filter(Event.base_price <= int(a["max_price"]))
    return listing(q.distinct().order_by(Event.starts_at))


@bp.get("/events/upcoming")
def upcoming_events():
    return listing(upcoming().order_by(Event.starts_at).limit(12))


@bp.get("/events/trending")
def trending():
    return listing(upcoming().filter(Event.trending.is_(True)).order_by(Event.starts_at).limit(12))


def haversine(lat1, lon1, lat2, lon2):
    r = math.radians
    a = math.sin(r(lat2 - lat1) / 2) ** 2 + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lon2 - lon1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


@bp.get("/events/near")
def near():
    lat, lng = float(request.args["lat"]), float(request.args["lng"])
    out = []
    for e in upcoming().all():
        if e.venue and e.venue.latitude is not None:
            d = e.to_dict(); d["distance_km"] = round(haversine(lat, lng, e.venue.latitude, e.venue.longitude), 1)
            out.append(d)
    return jsonify(sorted(out, key=lambda x: x["distance_km"])[:12])


from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

def get_optional_uid():
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        return int(uid) if uid else None
    except Exception:
        return None

@bp.get("/events/<int:eid>")
def event_detail(eid):
    e = db.get_or_404(Event, eid)
    d = e.to_dict()
    uid = get_optional_uid()
    d["saved"] = bool(uid and Favorite.query.filter_by(user_id=uid, kind="event", ref_id=eid).first())
    return jsonify(d)


@bp.get("/events/<int:eid>/seats")
def seats(eid):
    e = db.get_or_404(Event, eid)
    taken = {s.label for s in BookingSeat.query.filter_by(event_id=eid)}
    out = []
    for row in "ABCDEFGH":
        for n in range(1, 11):
            label = f"{row}{n}"
            out.append(dict(label=label, row=row, number=n, tier=seat_tier(label), price=seat_price(e, label),
                            booked=label in taken))
    return jsonify(out)


@bp.get("/artists")
def artists():
    return jsonify([a.to_dict() for a in Artist.query.order_by(Artist.name)])


@bp.get("/artists/<int:aid>")
def artist_detail(aid):
    a = db.get_or_404(Artist, aid)
    now, uid = datetime.now(), get_optional_uid()
    d = a.to_dict()
    d["upcoming"] = [e.to_dict() for e in sorted(a.events, key=lambda e: e.starts_at) if e.starts_at >= now]
    d["past"] = [e.to_dict() for e in sorted(a.events, key=lambda e: e.starts_at, reverse=True) if e.starts_at < now]
    d["followers"] = Follow.query.filter_by(artist_id=aid).count()
    d["following"] = bool(uid and Follow.query.filter_by(user_id=uid, artist_id=aid).first())
    d["saved"] = bool(uid and Favorite.query.filter_by(user_id=uid, kind="artist", ref_id=aid).first())
    return jsonify(d)


@bp.get("/venues")
def venues():
    return jsonify([v.to_dict() for v in Venue.query.order_by(Venue.name)])


@bp.get("/venues/<int:vid>")
def venue_detail(vid):
    v = db.get_or_404(Venue, vid)
    uid = get_optional_uid()
    d = v.to_dict()
    d["upcoming"] = [e.to_dict() for e in upcoming().filter_by(venue_id=vid).order_by(Event.starts_at)]
    d["saved"] = bool(uid and Favorite.query.filter_by(user_id=uid, kind="venue", ref_id=vid).first())
    return jsonify(d)


@bp.get("/recommendations")
def recommendations():
    uid = get_optional_uid()
    if not uid:
        return listing(upcoming().filter(Event.trending.is_(True)).limit(8))
    u = db.session.get(User, uid)
    if not u:
        return listing(upcoming().filter(Event.trending.is_(True)).limit(8))
    return jsonify([e.to_dict() for e in recommend(u)[:8]])
