import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from models import Event, Venue
from utils import CATEGORIES

bp = Blueprint("assistant", __name__, url_prefix="/api")
SYNONYMS = {"Music": ["concert", "gig", "band", "live music"], "Comedy": ["stand-up", "standup", "laugh"]}


@bp.post("/assistant")
def assistant():
    """Natural-language event search using structured DB filtering. Swap parse() for an LLM later."""
    msg = ((request.get_json() or {}).get("message") or "").lower()
    q, notes = Event.query.filter(Event.starts_at >= datetime.now()), []

    cat = next((c for c in CATEGORIES if c.lower() in msg or any(s in msg for s in SYNONYMS.get(c, []))), None)
    if cat: q = q.filter(Event.category == cat); notes.append(cat)

    cities = [c for (c,) in Venue.query.with_entities(Venue.city).distinct()]
    city = next((c for c in cities if c.lower() in msg), None)
    if city: q = q.filter(Event.city == city); notes.append(city)

    m = re.search(r"(?:under|below|less than|within|upto|up to|max)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)", msg)
    if m:
        budget = int(m.group(1).replace(",", ""))
        q = q.filter(Event.base_price <= budget); notes.append(f"under ₹{budget:,}")

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    monday = today + timedelta(days=7 - today.weekday())
    if "weekend" in msg:
        start = today if today.weekday() >= 5 else monday - timedelta(days=2)
        q = q.filter(Event.starts_at >= start, Event.starts_at < monday); notes.append("this weekend")
    elif "today" in msg:
        q = q.filter(Event.starts_at >= today, Event.starts_at < today + timedelta(days=1)); notes.append("today")
    elif "tomorrow" in msg:
        q = q.filter(Event.starts_at >= today + timedelta(days=1), Event.starts_at < today + timedelta(days=2)); notes.append("tomorrow")
    elif "week" in msg:
        q = q.filter(Event.starts_at < monday); notes.append("this week")
    elif "month" in msg:
        q = q.filter(Event.starts_at < today + timedelta(days=31)); notes.append("this month")

    events = q.order_by(Event.starts_at).limit(6).all()
    reply = (f"I found {len(events)} event(s) ({', '.join(notes) or 'all upcoming'})." if events
             else "No matching events. Try a different budget, date or city.")
    return jsonify(reply=reply, events=[e.to_dict() for e in events])
