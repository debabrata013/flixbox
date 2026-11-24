import os
import re
import mimetypes
from flask import Flask, render_template, request, Response, jsonify, send_from_directory, abort, make_response
from config import Config
from db import (
    init_db, get_media_by_id, get_all_movies, get_all_series_grouped,
    get_continue_watching, get_recently_added, update_watch_progress, search_media
)
from scanner import run_library_scan

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database on startup
init_db()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/home")
def api_home():
    continue_watching = get_continue_watching()
    movies = get_all_movies()
    series = get_all_series_grouped()
    recent = get_recently_added(15)
    
    # Pick a hero featured item (prefer 4K or 1080p movie/series)
    featured = None
    for m in movies:
        if "1080" in (m.get("resolution") or "") or "4K" in (m.get("resolution") or ""):
            featured = m
            break
    if not featured and movies:
        featured = movies[0]
    elif not featured and recent:
        featured = recent[0]
        
    return jsonify({
        "status": "success",
        "featured": featured,
        "continue_watching": continue_watching,
        "movies": movies[:18],
        "series": series[:18],
        "recently_added": recent
    })

@app.route("/api/movies")
def api_movies():
    return jsonify({
        "status": "success",
        "movies": get_all_movies()
    })

@app.route("/api/series")
def api_series():
    return jsonify({
        "status": "success",
        "series": get_all_series_grouped()
    })

@app.route("/api/media/<int:media_id>")
def api_media(media_id):
    media = get_media_by_id(media_id)
    if not media:
        return jsonify({"status": "error", "message": "Media not found"}), 404
    return jsonify({"status": "success", "media": media})

@app.route("/api/search")
def api_search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"status": "success", "results": []})
    results = search_media(query)
    return jsonify({"status": "success", "results": results})

@app.route("/api/progress", methods=["POST"])
def api_progress():
    data = request.get_json(silent=True) or {}
    media_id = data.get("media_id")
    pos = data.get("position", 0)
    dur = data.get("duration", 0)
    if media_id and dur > 0:
        update_watch_progress(media_id, float(pos), float(dur))
        return jsonify({"status": "success"})
    return jsonify({"status": "error", "message": "Invalid parameters"}), 400

@app.route("/api/scan", methods=["POST"])
def api_scan():
    count = run_library_scan()
    return jsonify({"status": "success", "message": f"Scanned {count} videos into library"})

@app.route("/thumbnails/<path:filename>")
def serve_thumbnail(filename):
    resp = make_response(send_from_directory(Config.THUMBNAIL_DIR, filename))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp

@app.route("/stream/<int:media_id>")
def stream_media(media_id):
    """
    HTTP 206 Partial Content video streaming engine.
    Allows instant start, zero buffering, and ultra-low data consumption.
    """
    item = get_media_by_id(media_id)
    if not item or not os.path.exists(item["file_path"]):
        abort(404)
        
    path = item["file_path"]
    size = os.path.getsize(path)
    
    # Guess mime type
    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        mime_type = "video/mp4" if path.endswith((".mp4", ".m4v")) else "video/webm"
        if path.endswith(".mkv"):
            # Most modern browsers play mkv with x264/x265 inside video/mp4 container or webm
            mime_type = "video/mp4"

    range_header = request.headers.get("Range", None)
    
    if not range_header:
        # Full content response
        def generate():
            with open(path, "rb") as f:
                while chunk := f.read(Config.STREAM_CHUNK_SIZE):
                    yield chunk
        return Response(generate(), mimetype=mime_type, headers={
            "Content-Length": str(size),
            "Accept-Ranges": "bytes",
        })

    # Parse Range: bytes=start-end
    match = re.search(r"bytes=(\d+)-(\d*)", range_header)
    if not match:
        abort(416)
        
    byte_start = int(match.group(1))
    byte_end = int(match.group(2)) if match.group(2) else size - 1
    
    if byte_start >= size:
        abort(416)
        
    byte_end = min(byte_end, size - 1)
    content_length = (byte_end - byte_start) + 1

    def generate_range():
        with open(path, "rb") as f:
            f.seek(byte_start)
            bytes_left = content_length
            while bytes_left > 0:
                chunk_to_read = min(Config.STREAM_CHUNK_SIZE, bytes_left)
                data = f.read(chunk_to_read)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    resp = Response(
        generate_range(),
        status=206,
        mimetype=mime_type,
        direct_passthrough=True
    )
    resp.headers.add("Content-Range", f"bytes {byte_start}-{byte_end}/{size}")
    resp.headers.add("Accept-Ranges", "bytes")
    resp.headers.add("Content-Length", str(content_length))
    resp.headers.add("Cache-Control", "no-cache")
    return resp

if __name__ == "__main__":
    import threading
    print("Starting FlixBox background scanner...")
    threading.Thread(target=run_library_scan, daemon=True).start()
    print(f"FlixBox starting on http://0.0.0.0:{Config.PORT}", flush=True)
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
