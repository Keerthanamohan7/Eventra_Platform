import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from config import Config
from extensions import db, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    from routes import auth, events, bookings, social, organizer, admin, assistant
    for m in (auth, events, bookings, social, organizer, admin, assistant):
        app.register_blueprint(m.bp)

    @app.get("/uploads/<path:name>")
    def uploads(name):
        return send_from_directory(app.config["UPLOAD_FOLDER"], name)

    @app.errorhandler(404)
    def nf(e): return jsonify(error="Not found"), 404

    with app.app_context():
        import models  # noqa
        db.create_all()

    @app.cli.command("seed")
    def seed_cmd():
        from seed import run
        run()
        print("Database seeded.")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
