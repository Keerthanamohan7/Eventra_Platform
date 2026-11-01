from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Event, Artist, Venue, Review, Favorite, Follow, Booking
from utils import current_user

bp = Blueprint("social", __name__, url_prefix="/api")


def eligible(uid, e):
    """Only users with a completed booking (event finished or ticket checked-in) may review."""
    for b in Booking.query.filter_by(user_id=uid, event_id=e.id):
        if e.starts_at < datetime.now() or (b.ticket and b.ticket.status == "used"):
            return True
    return False


from flask_jwt_extended import verify_jwt_in_request

@bp.get("/events/<int:eid>/reviews")
def event_reviews(eid):
    e = db.get_or_404(Event, eid)
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
    except Exception:
        uid = None
    can = bool(uid) and eligible(int(uid), e) and not Review.query.filter_by(user_id=int(uid), event_id=eid).first()
    return jsonify(reviews=[r.to_dict() for r in e.reviews], can_review=can)


@bp.post("/events/<int:eid>/reviews")
@jwt_required()
def add_review(eid):
    u, e, d = current_user(), db.get_or_404(Event, eid), request.get_json() or {}
    if not eligible(u.id, e): return jsonify(error="Only users with a completed booking can review"), 403
    if Review.query.filter_by(user_id=u.id, event_id=eid).first(): return jsonify(error="Already reviewed"), 409
    clamp = lambda v: max(1, min(5, int(v or 5)))
    r = Review(user_id=u.id, event_id=eid, organisation=clamp(d.get("organisation")),
               venue_rating=clamp(d.get("venue_rating")), sound=clamp(d.get("sound")), comment=d.get("comment", ""))
    db.session.add(r); db.session.commit()
    return jsonify(r.to_dict()), 201


@bp.get("/reviews/mine")
@jwt_required()
def my_reviews():
    return jsonify([r.to_dict() for r in Review.query.filter_by(user_id=current_user().id)])


@bp.get("/favorites")
@jwt_required()
def favorites():
    uid = current_user().id
    favs = Favorite.query.filter_by(user_id=uid).all()
    ids = lambda k: [f.ref_id for f in favs if f.kind == k]
    following = [f.artist_id for f in Follow.query.filter_by(user_id=uid)]
    artist_ids = set(ids("artist")) | set(following)
    return jsonify(events=[e.to_dict() for e in Event.query.filter(Event.id.in_(ids("event")))],
                   artists=[a.to_dict() for a in Artist.query.filter(Artist.id.in_(artist_ids))],
                   venues=[v.to_dict() for v in Venue.query.filter(Venue.id.in_(ids("venue")))],
                   following=following)


@bp.post("/favorites")
@jwt_required()
def toggle_favorite():
    uid, d = current_user().id, request.get_json() or {}
    if d.get("kind") not in ("event", "artist", "venue"): return jsonify(error="Invalid kind"), 400
    f = Favorite.query.filter_by(user_id=uid, kind=d["kind"], ref_id=d.get("ref_id")).first()
    if f: db.session.delete(f)
    else: db.session.add(Favorite(user_id=uid, kind=d["kind"], ref_id=d["ref_id"]))
    db.session.commit()
    return jsonify(saved=not f)


@bp.post("/artists/<int:aid>/follow")
@jwt_required()
def follow(aid):
    uid = current_user().id
    db.get_or_404(Artist, aid)
    f = Follow.query.filter_by(user_id=uid, artist_id=aid).first()
    if f: db.session.delete(f)
    else: db.session.add(Follow(user_id=uid, artist_id=aid))
    db.session.commit()
    return jsonify(following=not f)


@bp.get("/notifications")
@jwt_required()
def notifications():
    """New events (last 14 days) featuring artists the user follows."""
    ids = [f.artist_id for f in Follow.query.filter_by(user_id=current_user().id)]
    since = datetime.now() - timedelta(days=14)
    evs = Event.query.filter(Event.created_at >= since, Event.starts_at >= datetime.now()).all()
    out = [dict(message=f"{a.name} is performing at {e.title}", event_id=e.id)
           for e in evs for a in e.artists if a.id in ids]
    return jsonify(out)
