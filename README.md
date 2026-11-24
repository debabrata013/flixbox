# FlixBox 🍿

**Your Private, Self-Hosted Cinema Streaming Platform.**
Built for edge servers and mobile Android devices (Termux/Ubuntu).

---

## ✨ Features
- **Pure Netflix Experience:** Hero billboard, horizontal carousels (Continue Watching, Movies, Web Series, Recently Added).
- **Pro Cinema Video Player:** 10s skip forward/backward, playback speed controls, resume watching timestamps, PiP, Fullscreen.
- **Ultra-Low Latency & Low Data:** HTTP 206 Partial Content (Range requests) streaming in 2MB chunks. Starts in < 0.3s.
- **Automatic Thumbnail & Poster Generator:** Uses FFmpeg to extract high-definition video frames and clean scene titles.
- **Organized Storage:**
  - `/sdcard/FlixBox/Movies`
  - `/sdcard/FlixBox/Series`

---

## 🚀 Running FlixBox
```bash
python3 app.py
```
Or as a background daemon:
```bash
python3 daemon.py
```
Default Port: `8090`
