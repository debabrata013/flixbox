import sqlite3
import os
import json
from config import Config

def get_db():
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(Config.DB_PATH), exist_ok=True)
    os.makedirs(Config.THUMBNAIL_DIR, exist_ok=True)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Media Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                clean_title TEXT NOT NULL,
                category TEXT NOT NULL, /* 'movie' or 'series' */
                series_name TEXT,
                season INTEGER DEFAULT 1,
                episode INTEGER DEFAULT 1,
                file_size INTEGER DEFAULT 0,
                duration REAL DEFAULT 0,
                resolution TEXT DEFAULT 'HD',
                year INTEGER,
                genre TEXT DEFAULT 'Cinema',
                thumbnail_file TEXT,
                backdrop_file TEXT,
                audio_tracks TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Ensure audio_tracks column exists for existing databases
        try:
            cursor.execute("ALTER TABLE media ADD COLUMN audio_tracks TEXT DEFAULT '[]'")
        except sqlite3.OperationalError:
            pass
        
        # Watch History Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS watch_history (
                media_id INTEGER PRIMARY KEY,
                progress_seconds REAL NOT NULL DEFAULT 0,
                total_seconds REAL NOT NULL DEFAULT 0,
                percentage REAL NOT NULL DEFAULT 0,
                last_watched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
            )
        """)
        
        # Favorites Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                media_id INTEGER PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
            )
        """)
        
        conn.commit()

def _format_media_row(row):
    if not row:
        return None
    d = dict(row)
    raw_tracks = d.get("audio_tracks")
    if raw_tracks:
        if isinstance(raw_tracks, str):
            try:
                d["audio_tracks"] = json.loads(raw_tracks)
            except Exception:
                d["audio_tracks"] = []
        elif not isinstance(raw_tracks, list):
            d["audio_tracks"] = []
    else:
        d["audio_tracks"] = []
    return d

def upsert_media(item):
    with get_db() as conn:
        cursor = conn.cursor()
        
        audio_json = item.get('audio_tracks')
        if isinstance(audio_json, list):
            audio_json = json.dumps(audio_json)
        elif not audio_json:
            audio_json = '[]'
            
        cursor.execute("""
            INSERT INTO media (
                file_path, title, clean_title, category, series_name,
                season, episode, file_size, duration, resolution,
                year, genre, thumbnail_file, backdrop_file, audio_tracks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(file_path) DO UPDATE SET
                title=excluded.title,
                clean_title=excluded.clean_title,
                category=excluded.category,
                series_name=excluded.series_name,
                season=excluded.season,
                episode=excluded.episode,
                file_size=excluded.file_size,
                duration=excluded.duration,
                resolution=excluded.resolution,
                year=excluded.year,
                genre=excluded.genre,
                thumbnail_file=COALESCE(excluded.thumbnail_file, media.thumbnail_file),
                backdrop_file=COALESCE(excluded.backdrop_file, media.backdrop_file),
                audio_tracks=COALESCE(excluded.audio_tracks, media.audio_tracks)
        """, (
            item['file_path'],
            item['title'],
            item['clean_title'],
            item['category'],
            item.get('series_name'),
            item.get('season', 1),
            item.get('episode', 1),
            item.get('file_size', 0),
            item.get('duration', 0),
            item.get('resolution', 'HD'),
            item.get('year'),
            item.get('genre', 'Cinema'),
            item.get('thumbnail_file'),
            item.get('backdrop_file'),
            audio_json
        ))
        conn.commit()
        return cursor.lastrowid

def get_media_by_id(media_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.*, 
                   COALESCE(w.progress_seconds, 0) as progress_seconds,
                   COALESCE(w.percentage, 0) as progress_percentage,
                   CASE WHEN f.media_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
            FROM media m
            LEFT JOIN watch_history w ON m.id = w.media_id
            LEFT JOIN favorites f ON m.id = f.media_id
            WHERE m.id = ?
        """, (media_id,))
        row = cursor.fetchone()
        return _format_media_row(row)

def get_all_movies():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.*, 
                   COALESCE(w.progress_seconds, 0) as progress_seconds,
                   COALESCE(w.percentage, 0) as progress_percentage
            FROM media m
            LEFT JOIN watch_history w ON m.id = w.media_id
            WHERE m.category = 'movie'
            ORDER BY m.created_at DESC
        """)
        return [_format_media_row(r) for r in cursor.fetchall()]

def get_all_series_grouped():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.*, 
                   COALESCE(w.progress_seconds, 0) as progress_seconds,
                   COALESCE(w.percentage, 0) as progress_percentage
            FROM media m
            LEFT JOIN watch_history w ON m.id = w.media_id
            WHERE m.category = 'series'
            ORDER BY m.series_name ASC, m.season ASC, m.episode ASC
        """)
        rows = [_format_media_row(r) for r in cursor.fetchall()]
        
        # Group by series_name
        grouped = {}
        for r in rows:
            s_name = r['series_name'] or r['clean_title']
            if s_name not in grouped:
                grouped[s_name] = {
                    "series_name": s_name,
                    "thumbnail_file": r['thumbnail_file'],
                    "backdrop_file": r['backdrop_file'],
                    "resolution": r['resolution'],
                    "year": r['year'],
                    "total_episodes": 0,
                    "seasons": {}
                }
            grouped[s_name]["total_episodes"] += 1
            if not grouped[s_name]["thumbnail_file"] and r["thumbnail_file"]:
                grouped[s_name]["thumbnail_file"] = r["thumbnail_file"]
                
            season_num = r['season'] or 1
            if season_num not in grouped[s_name]["seasons"]:
                grouped[s_name]["seasons"][season_num] = []
            grouped[s_name]["seasons"][season_num].append(r)
            
        return list(grouped.values())

def get_continue_watching():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.*, w.progress_seconds, w.total_seconds, w.percentage as progress_percentage
            FROM watch_history w
            JOIN media m ON w.media_id = m.id
            WHERE w.percentage > 2 AND w.percentage < 95
            ORDER BY w.last_watched DESC
            LIMIT 12
        """)
        return [_format_media_row(r) for r in cursor.fetchall()]

def get_recently_added(limit=15):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.*, 
                   COALESCE(w.progress_seconds, 0) as progress_seconds,
                   COALESCE(w.percentage, 0) as progress_percentage
            FROM media m
            LEFT JOIN watch_history w ON m.id = w.media_id
            ORDER BY m.id DESC
            LIMIT ?
        """, (limit,))
        return [_format_media_row(r) for r in cursor.fetchall()]

def update_watch_progress(media_id, progress_seconds, total_seconds):
    if total_seconds <= 0:
        return
    pct = round((progress_seconds / total_seconds) * 100, 1)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO watch_history (media_id, progress_seconds, total_seconds, percentage, last_watched)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(media_id) DO UPDATE SET
                progress_seconds=excluded.progress_seconds,
                total_seconds=excluded.total_seconds,
                percentage=excluded.percentage,
                last_watched=CURRENT_TIMESTAMP
        """, (media_id, progress_seconds, total_seconds, pct))
        conn.commit()

def search_media(query):
    q = f"%{query.strip()}%"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.*, 
                   COALESCE(w.progress_seconds, 0) as progress_seconds,
                   COALESCE(w.percentage, 0) as progress_percentage
            FROM media m
            LEFT JOIN watch_history w ON m.id = w.media_id
            WHERE m.clean_title LIKE ? 
               OR m.title LIKE ? 
               OR m.series_name LIKE ?
               OR m.genre LIKE ?
            ORDER BY m.id DESC
            LIMIT 30
        """, (q, q, q, q))
        return [_format_media_row(r) for r in cursor.fetchall()]
