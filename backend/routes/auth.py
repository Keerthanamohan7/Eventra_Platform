from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required
from extensions import db
from models import User
from utils import current_user

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def token_response(u, code=200):
    return jsonify(token=create_access_token(identity=str(u.id)), user=u.to_dict()), code


from sqlalchemy import or_, func

@bp.post("/register")
def register():
    d = request.get_json() or {}
    name = (d.get("name") or d.get("username") or "").strip()
    email = (d.get("email") or "").strip().lower()
    password = d.get("password", "")
    
    if not name or "@" not in email or len(password) < 6:
        return jsonify(error="Valid name/username, valid email, and a 6+ character password are required"), 400
        
    if User.query.filter(func.lower(User.email) == email).first():
        return jsonify(error="An account with this email already exists. Please sign in."), 409
        
    if User.query.filter(func.lower(User.name) == name.lower()).first():
        return jsonify(error="This username is already taken. Please choose another."), 409
        
    role = d.get("role") if d.get("role") in ("user", "organizer") else "user"
    u = User(name=name, email=email, role=role)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    return token_response(u, 201)


@bp.post("/login")
def login():
    d = request.get_json() or {}
    identifier = (d.get("email") or d.get("username") or "").strip()
    password = d.get("password", "")
    
    if not identifier or not password:
        return jsonify(error="Please provide your email or username, and password"), 400
        
    # Search by email or username (case-insensitive)
    u = User.query.filter(
        or_(func.lower(User.email) == identifier.lower(), func.lower(User.name) == identifier.lower())
    ).first()
    
    if not u or not u.check_password(password):
        return jsonify(error="Invalid email/username or password. Please check your credentials."), 401
        
    return token_response(u)


@bp.get("/me")
@jwt_required()
def me():
    return jsonify(current_user().to_dict())


@bp.put("/me")
@jwt_required()
def update_me():
    u, d = current_user(), request.get_json() or {}
    u.name = d.get("name", u.name)
    u.city = d.get("city", u.city)
    if "interests" in d: u.interests = ",".join(d["interests"])
    db.session.commit()
    return jsonify(u.to_dict())
