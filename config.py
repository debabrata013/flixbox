import os

class Config:
    PORT = int(os.environ.get("FLIXBOX_PORT", 8090))
    HOST = "0.0.0.0"
    DEBUG = False
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "flixbox.db")
    STATIC_DIR = os.path.join(BASE_DIR, "static")
    THUMBNAIL_DIR = os.path.join(STATIC_DIR, "thumbnails")
    
    # STRICT DEDICATED FOLDERS ONLY:
    # Only files placed inside these folders will be scanned & shown in FlixBox.
    # No personal photos, DCIM, or Downloads are ever accessed.
    MOVIES_DIR = "/sdcard/FlixBox/Movies"
    SERIES_DIR = "/sdcard/FlixBox/Series"
    
    # Supported video formats
    VIDEO_EXTENSIONS = {".mp4", ".mkv", ".webm", ".avi", ".mov", ".m4v"}
    
    # Streaming chunk size: 2MB for ultra-low latency & low data usage
    STREAM_CHUNK_SIZE = 1024 * 1024 * 2
