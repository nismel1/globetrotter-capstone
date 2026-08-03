"""
app/__init__.py

Flask application factory.
"""
import os
from flask import Flask, request, render_template, send_from_directory

# Origin allowed to call the API from the Flutter web dev server.
# The built Flutter app is served by this same Flask server (same origin),
# but during development `flutter run -d chrome` uses its own origin.
FLUTTER_WEB_DEV_ORIGIN = os.environ.get("FLUTTER_WEB_ORIGIN", "http://localhost:8080")

# Directory containing the built Flutter web app (flutter build web).
FLUTTER_BUILD_DIR = os.environ.get(
    "FLUTTER_BUILD_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "flutter_web", "build", "web"),
)


def create_app():
    """Create and configure the Flask application."""
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
        static_url_path="/static",
    )

    # Secret key used for JWT signing.  Set the SECRET_KEY environment variable
    # in production.  The fallback is intentionally weak and must never be used
    # outside of local development.
    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", "globetrotter-secret-change-in-prod"
    )

    # ------------------------------------------------------------------
    # CORS for the Flutter web frontend (dev server + same-origin build)
    # ------------------------------------------------------------------
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin", "")
        allowed = {FLUTTER_WEB_DEV_ORIGIN, f"http://localhost:{FLUTTER_WEB_DEV_ORIGIN.rsplit(':', 1)[-1]}"}
        if origin and (origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1")):
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            return ("", 204)

    # Register all route blueprints
    from app.auth import auth_bp
    from app.destinations import destinations_bp
    from app.recommendations import recommendations_bp
    from app.itineraries import itineraries_bp
    from app.reviews import bp as reviews_bp
    from app.proposals import bp as proposals_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(destinations_bp)
    app.register_blueprint(recommendations_bp)
    app.register_blueprint(itineraries_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(proposals_bp)

    @app.route("/", methods=["GET"])
    def home():
        """Render the GlobeTrotter web experience.

        If a Flutter web build is present, serve that instead of the
        Jinja template.  This allows the production deployment to use
        the single Flutter-built artifact.
        """
        flutter_index = os.path.join(FLUTTER_BUILD_DIR, "index.html")
        if os.path.isfile(flutter_index):
            return send_from_directory(FLUTTER_BUILD_DIR, "index.html")
        return render_template("index.html")

    # Catch-all route for the built Flutter web app static assets.
    # Registered AFTER all blueprints so the API routes keep priority.
    # Serves flutter_bootstrap.js, main.dart.js, canvaskit/, icons/,
    # manifest.json, etc. directly from FLUTTER_BUILD_DIR.
    @app.route("/<path:filename>", methods=["GET"])
    def flutter_assets(filename):
        """Serve static assets from the Flutter web build directory."""
        # Build a safe absolute path and prevent path traversal.
        build_dir = os.path.abspath(FLUTTER_BUILD_DIR)
        requested = os.path.abspath(os.path.join(build_dir, filename))
        if requested.startswith(build_dir + os.sep) and os.path.isfile(requested):
            return send_from_directory(build_dir, filename)
        return ("", 404)

    @app.route("/assets/<path:filename>", methods=["GET"])
    def assets(filename):
        """Serve Flutter build assets first, then project images in img."""
        flutter_assets_dir = os.path.join(FLUTTER_BUILD_DIR, "assets")
        requested_flutter = os.path.abspath(os.path.join(flutter_assets_dir, filename))
        if requested_flutter.startswith(os.path.abspath(flutter_assets_dir) + os.sep) and os.path.isfile(requested_flutter):
            return send_from_directory(flutter_assets_dir, filename)
        assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "img")
        return send_from_directory(assets_dir, filename)

    return app
