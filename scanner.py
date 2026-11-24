import os
import re
import hashlib
import subprocess
import json
import random
from config import Config
from db import init_db, upsert_media, get_db

LANG_MAP = {
    "hin": "Hindi", "hindi": "Hindi",
    "eng": "English", "english": "English",
    "spa": "Spanish", "spanish": "Spanish",
    "tam": "Tamil", "tamil": "Tamil",
    "tel": "Telugu", "telugu": "Telugu",
    "mal": "Malayalam", "kan": "Kannada",
    "ben": "Bengali", "pan": "Punjabi",
    "mar": "Marathi", "guj": "Gujarati",
    "kor": "Korean", "jpn": "Japanese",
    "fre": "French", "fra": "French",
    "ger": "German", "deu": "German",
    "ita": "Italian", "rus": "Russian",
    "por": "Portuguese", "chi": "Chinese",
    "zho": "Chinese", "ara": "Arabic",
    "und": "Default", "": "Audio Track"
}

def clean_media_title(filename):
    name, ext = os.path.splitext(filename)
    
    # Extract resolution
    resolution = "HD"
    res_match = re.search(r'\b(2160p|4k|1080p|720p|480p|uhd|fhd)\b', name, re.IGNORECASE)
    if res_match:
        r = res_match.group(1).upper()
        resolution = "4K UHD" if "4K" in r or "2160" in r else ("1080p FHD" if "1080" in r else "720p HD")
    
    # Extract year
    year = None
    year_match = re.search(r'\b(19\d{2}|20\d{2})\b', name)
    if year_match:
        year = int(year_match.group(1))
    
    # Detect Season & Episode (e.g. S01E02, S1E3, Season 2 Episode 4, 2x03)
    season = 1
    episode = 1
    is_series = False
    
    se_match = re.search(r's(\d{1,2})[\.\-_ ]?e(\d{1,2})', name, re.IGNORECASE)
    if not se_match:
        se_match = re.search(r'season[\.\-_ ]?(\d{1,2})[\.\-_ ]?episode[\.\-_ ]?(\d{1,2})', name, re.IGNORECASE)
    if not se_match:
        se_match = re.search(r'\b(\d{1,2})x(\d{1,2})\b', name, re.IGNORECASE)
        
    if se_match:
        is_series = True
        season = int(se_match.group(1))
        episode = int(se_match.group(2))
    else:
        s_only = re.search(r'\bs(\d{1,2})\b', name, re.IGNORECASE)
        if s_only:
            is_series = True
            season = int(s_only.group(1))
        e_only = re.search(r'\be(\d{1,2})\b', name, re.IGNORECASE)
        if e_only:
            is_series = True
            episode = int(e_only.group(1))
            
    # Clean common scene / torrent garbage keywords
    junk_patterns = [
        r'\b(1080p|720p|480p|2160p|4k|uhd|fhd|hd)\b',
        r'\b(bluray|web-dl|webrip|brrip|dvdrip|hdrip|hdcam|telesync|camrip)\b',
        r'\b(x264|x265|hevc|h264|h\.264|h\.265|avc|10bit|8bit)\b',
        r'\b(ddp5\.1|dd5\.1|ac3|aac|dts|mp3|5\.1|7\.1)\b',
        r'\b(esub|esubs|sub|multi|hindi|english|dual audio|org)\b',
        r'\b(hdhub4u|4khdhub|filmyzilla|bolly4u|katmoviehd|yify|rarbg|psa)\b',
        r'\b(ms|com|net|org|site|xyz|ws|in)\b',
        r'\[.*?\]|\(.*?\)',
        r's\d{1,2}e\d{1,2}|s\d{1,2}|e\d{1,2}',
    ]
    
    clean_str = name
    for pattern in junk_patterns:
        clean_str = re.sub(pattern, ' ', clean_str, flags=re.IGNORECASE)
        
    clean_str = re.sub(r'[\.\-_+]', ' ', clean_str)
    clean_str = re.sub(r'\s+', ' ', clean_str).strip()
    clean_title = clean_str.title() if clean_str else name
    
    return {
        "clean_title": clean_title,
        "is_series": is_series,
        "season": season,
        "episode": episode,
        "resolution": resolution,
        "year": year
    }

def get_video_duration(video_path):
    """Uses ffprobe to quickly extract the total duration of the video in seconds"""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, timeout=5)
        if res.returncode == 0 and res.stdout.strip():
            return float(res.stdout.strip())
    except Exception:
        pass
    return 0.0

def get_media_audio_tracks(video_path):
    """
    Extracts all audio tracks and metadata (index, language, title, channels, codec)
    using ffprobe.
    """
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "stream=index,codec_name,channels:stream_tags=language,title",
            "-select_streams", "a",
            "-of", "json",
            video_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, timeout=8)
        if res.returncode == 0 and res.stdout.strip():
            info = json.loads(res.stdout)
            streams = info.get("streams", [])
            tracks = []
            
            for idx, s in enumerate(streams):
                tags = s.get("tags") or {}
                raw_lang = (tags.get("language") or "").lower().strip()
                lang_name = LANG_MAP.get(raw_lang, raw_lang.title() if raw_lang else f"Track {idx + 1}")
                
                title = tags.get("title") or ""
                channels = s.get("channels") or 2
                codec = s.get("codec_name") or ""
                
                # Channel label: 6 -> 5.1, 8 -> 7.1, 2 -> Stereo
                ch_label = "5.1" if channels == 6 else ("7.1" if channels == 8 else ("Stereo" if channels == 2 else f"{channels}ch"))
                
                label_parts = [lang_name]
                if title and title.lower() != lang_name.lower():
                    label_parts.append(f"({title})")
                label_parts.append(f"[{ch_label}]")
                display_label = " ".join(label_parts)
                
                tracks.append({
                    "stream_index": s.get("index"),
                    "track_index": idx,
                    "codec": codec,
                    "channels": channels,
                    "language": raw_lang or "und",
                    "language_label": lang_name,
                    "title": title,
                    "label": display_label
                })
            return tracks
    except Exception as e:
        print(f"Error probing audio tracks for {video_path}: {e}")
    return []

def generate_svg_thumbnail(title, resolution, year, output_path):
    colors = [
        ("#1a102f", "#4f46e5"),
        ("#1f1018", "#e11d48"),
        ("#0f172a", "#0284c7"),
        ("#18181b", "#71717a"),
        ("#141029", "#9333ea")
    ]
    h = int(hashlib.md5(title.encode()).hexdigest(), 16)
    bg1, bg2 = colors[h % len(colors)]
    
    display_title = title if len(title) <= 24 else title[:22] + "..."
    year_str = str(year) if year else "Cinema"
    
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="{bg1}"/>
          <stop offset="100%" stop-color="{bg2}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="600" height="340" fill="url(#g)"/>
      <rect width="600" height="340" fill="url(#glow)"/>
      <circle cx="300" cy="140" r="42" fill="#E50914" opacity="0.9"/>
      <polygon points="292,124 316,140 292,156" fill="#ffffff"/>
      <rect x="30" y="28" width="80" height="24" rx="4" fill="#000000" opacity="0.6"/>
      <text x="70" y="44" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-size="11" font-weight="700" fill="#E50914" text-anchor="middle">FLIXBOX</text>
      <rect x="500" y="28" width="70" height="24" rx="4" fill="#000000" opacity="0.6"/>
      <text x="535" y="44" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-size="11" font-weight="700" fill="#38bdf8" text-anchor="middle">{resolution}</text>
      <text x="300" y="240" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">{display_title}</text>
      <text x="300" y="270" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-size="13" font-weight="500" fill="#94a3b8" text-anchor="middle">{year_str}</text>
    </svg>"""
    
    with open(output_path, "w") as f:
        f.write(svg)

def extract_thumbnail(video_path, output_name, title, resolution, year, duration=0.0, force=False):
    """
    Extracts high-definition thumbnail from the MIDDLE (halfway point) of the video,
    avoiding black intro screens, studio logos, and opening credits.
    """
    os.makedirs(Config.THUMBNAIL_DIR, exist_ok=True)
    thumb_path = os.path.join(Config.THUMBNAIL_DIR, output_name)
    
    if not force and os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 1000:
        return output_name
        
    if duration <= 0:
        duration = get_video_duration(video_path)
        
    # Calculate target timestamp: randomly between 40% and 60% (middle half) of the video
    if duration > 10:
        target_sec = duration * random.uniform(0.42, 0.58)
    elif duration > 0:
        target_sec = duration * 0.5
    else:
        target_sec = 600.0  # fallback 10 mins in
        
    seek_str = f"{target_sec:.2f}"
    
    try:
        cmd = [
            "ffmpeg", "-y",
            "-ss", seek_str,
            "-i", video_path,
            "-frames:v", "1",
            "-update", "1",
            "-q:v", "2",
            "-vf", "scale=640:-1",
            thumb_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=12)
        if res.returncode == 0 and os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 500:
            return output_name
            
        # If middle seek failed, try at 25% of the video
        if duration > 10:
            cmd[3] = f"{duration * 0.25:.2f}"
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8)
            if res.returncode == 0 and os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 500:
                return output_name
    except Exception:
        pass
        
    svg_name = output_name.replace(".jpg", ".svg")
    svg_path = os.path.join(Config.THUMBNAIL_DIR, svg_name)
    generate_svg_thumbnail(title, resolution, year, svg_path)
    return svg_name

def scan_folder(folder_path, default_category=None, force_refresh=False):
    if not os.path.exists(folder_path):
        return []
        
    scanned_items = []
    
    for root, dirs, files in os.walk(folder_path):
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext in Config.VIDEO_EXTENSIONS:
                full_path = os.path.join(root, f)
                try:
                    size = os.path.getsize(full_path)
                except OSError:
                    continue
                    
                # Skip tiny video files (< 1MB)
                if size < 1024 * 1024:
                    continue
                    
                meta = clean_media_title(f)
                duration = get_video_duration(full_path)
                audio_tracks = get_media_audio_tracks(full_path)
                
                # Determine category
                if default_category:
                    cat = default_category
                elif "series" in folder_path.lower() or meta["is_series"]:
                    cat = "series"
                else:
                    cat = "movie"
                    
                series_name = None
                if cat == "series":
                    rel = os.path.relpath(full_path, folder_path)
                    parts = rel.split(os.sep)
                    if len(parts) > 1 and parts[0]:
                        series_name = parts[0].replace(".", " ").replace("_", " ").title()
                    else:
                        series_name = meta["clean_title"]
                
                h = hashlib.md5(full_path.encode()).hexdigest()[:12]
                thumb_file = f"thumb_{h}_v2.jpg"
                actual_thumb = extract_thumbnail(
                    full_path, thumb_file, meta["clean_title"],
                    meta["resolution"], meta["year"],
                    duration=duration, force=force_refresh
                )
                
                item = {
                    "file_path": full_path,
                    "title": f,
                    "clean_title": meta["clean_title"],
                    "category": cat,
                    "series_name": series_name,
                    "season": meta["season"],
                    "episode": meta["episode"],
                    "file_size": size,
                    "duration": duration,
                    "resolution": meta["resolution"],
                    "year": meta["year"],
                    "genre": "Web Series" if cat == "series" else "Feature Film",
                    "thumbnail_file": actual_thumb,
                    "backdrop_file": actual_thumb,
                    "audio_tracks": audio_tracks
                }
                
                upsert_media(item)
                scanned_items.append(item)
                
    return scanned_items

def backfill_audio_tracks():
    """Checks existing media items in DB and extracts audio tracks if missing or empty"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, file_path, audio_tracks FROM media")
        rows = cursor.fetchall()
        for r in rows:
            needs_fill = False
            raw = r["audio_tracks"]
            if not raw or raw == "[]" or raw is None:
                needs_fill = True
            if needs_fill and os.path.exists(r["file_path"]):
                tracks = get_media_audio_tracks(r["file_path"])
                if tracks:
                    cursor.execute("UPDATE media SET audio_tracks = ? WHERE id = ?", (json.dumps(tracks), r["id"]))
        conn.commit()

def cleanup_orphaned_media():
    """Removes any media records that are not in /sdcard/FlixBox or no longer exist on disk"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, file_path, thumbnail_file FROM media")
        rows = cursor.fetchall()
        for r in rows:
            path = r["file_path"]
            thumb = r["thumbnail_file"]
            # Strict isolation: ONLY files under /sdcard/FlixBox/ are allowed
            is_valid = path.startswith("/sdcard/FlixBox/") and os.path.exists(path)
            if not is_valid:
                cursor.execute("DELETE FROM media WHERE id = ?", (r["id"],))
                cursor.execute("DELETE FROM watch_history WHERE media_id = ?", (r["id"],))
                cursor.execute("DELETE FROM favorites WHERE media_id = ?", (r["id"],))
                if thumb:
                    thumb_path = os.path.join(Config.THUMBNAIL_DIR, thumb)
                    if os.path.exists(thumb_path):
                        try:
                            os.remove(thumb_path)
                        except OSError:
                            pass
        conn.commit()

def run_library_scan(force_refresh=False):
    """Scans ONLY the dedicated /sdcard/FlixBox/Movies and /sdcard/FlixBox/Series folders"""
    init_db()
    cleanup_orphaned_media()
    backfill_audio_tracks()
    total = 0
    
    # 1. Primary Movies folder ONLY
    if os.path.exists(Config.MOVIES_DIR):
        total += len(scan_folder(Config.MOVIES_DIR, default_category="movie", force_refresh=force_refresh))
        
    # 2. Primary Series folder ONLY
    if os.path.exists(Config.SERIES_DIR):
        total += len(scan_folder(Config.SERIES_DIR, default_category="series", force_refresh=force_refresh))
        
    return total
