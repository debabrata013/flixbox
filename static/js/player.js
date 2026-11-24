/**
 * FLIXBOX PRO CINEMA PLAYER
 * HTTP 206 Streaming, Zero-buffering, Auto-Resume, Keyboard Shortcuts
 */

class FlixPlayer {
  constructor() {
    this.modal = document.getElementById("playerModal");
    this.video = document.getElementById("mainVideo");
    this.hud = document.getElementById("playerHud");
    
    // UI Elements
    this.btnPlay = document.getElementById("btnPlay");
    this.btnCenterPlay = document.getElementById("playerCenterPlay");
    this.btnSkipBack = document.getElementById("btnSkipBack");
    this.btnSkipForward = document.getElementById("btnSkipForward");
    this.btnMute = document.getElementById("btnMute");
    this.btnFullscreen = document.getElementById("btnFullscreen");
    this.btnPip = document.getElementById("btnPip");
    this.btnBack = document.getElementById("btnPlayerBack");
    
    this.timelineContainer = document.getElementById("timelineContainer");
    this.timelineProgress = document.getElementById("timelineProgress");
    this.timelineBuffered = document.getElementById("timelineBuffered");
    this.timelineThumb = document.getElementById("timelineThumb");
    
    this.timeCurrent = document.getElementById("timeCurrent");
    this.timeTotal = document.getElementById("timeTotal");
    this.playerTitle = document.getElementById("playerTitle");
    this.playerSubtitle = document.getElementById("playerSubtitle");
    this.speedSelect = document.getElementById("speedSelect");
    
    this.currentMedia = null;
    this.progressInterval = null;
    this.idleTimeout = null;
    this.isDragging = false;
    
    this.initEvents();
  }

  initEvents() {
    // Play / Pause
    this.btnPlay.addEventListener("click", () => this.togglePlay());
    this.btnCenterPlay.addEventListener("click", () => this.togglePlay());
    this.video.addEventListener("click", () => this.togglePlay());

    // Skip
    this.btnSkipBack.addEventListener("click", () => this.seekBy(-10));
    this.btnSkipForward.addEventListener("click", () => this.seekBy(10));

    // Mute
    this.btnMute.addEventListener("click", () => this.toggleMute());

    // Fullscreen & PiP
    this.btnFullscreen.addEventListener("click", () => this.toggleFullscreen());
    this.btnPip.addEventListener("click", () => this.togglePip());

    // Close Player
    this.btnBack.addEventListener("click", () => this.close());

    // Speed
    this.speedSelect.addEventListener("change", (e) => {
      this.video.playbackRate = parseFloat(e.target.value);
    });

    // Timeline updates
    this.video.addEventListener("timeupdate", () => this.onTimeUpdate());
    this.video.addEventListener("progress", () => this.onProgress());
    this.video.addEventListener("play", () => this.updatePlayIcon(true));
    this.video.addEventListener("pause", () => this.updatePlayIcon(false));
    this.video.addEventListener("ended", () => this.onEnded());

    // Scrubber interaction
    this.timelineContainer.addEventListener("mousedown", (e) => this.onTimelineSeek(e));
    this.timelineContainer.addEventListener("touchstart", (e) => this.onTimelineSeek(e), { passive: true });

    // Idle HUD fade
    window.addEventListener("mousemove", () => this.resetIdleTimer());
    window.addEventListener("touchstart", () => this.resetIdleTimer(), { passive: true });

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  open(media) {
    this.currentMedia = media;
    this.playerTitle.textContent = media.clean_title || media.title;
    this.playerSubtitle.textContent = media.series_name ? `${media.series_name} - S${media.season} E${media.episode}` : `${media.year || ''} • ${media.resolution || 'HD'}`;

    // Set stream source
    this.video.src = `/stream/${media.id}`;
    this.modal.classList.add("active");
    this.resetIdleTimer();

    // Resume from previous progress if exists
    const resumePos = media.progress_seconds || 0;
    this.video.addEventListener("loadedmetadata", () => {
      if (resumePos > 5 && resumePos < (this.video.duration - 15)) {
        this.video.currentTime = resumePos;
      }
      this.video.play().catch(() => {});
    }, { once: true });

    // Start progress sync interval (every 5 seconds)
    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => this.syncProgress(), 5000);
  }

  close() {
    this.syncProgress();
    clearInterval(this.progressInterval);
    clearTimeout(this.idleTimeout);
    this.video.pause();
    this.video.src = "";
    this.modal.classList.remove("active");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    // Refresh homepage continue watching
    if (window.loadHomeData) window.loadHomeData();
  }

  togglePlay() {
    if (this.video.paused) {
      this.video.play().catch(() => {});
    } else {
      this.video.pause();
    }
  }

  updatePlayIcon(isPlaying) {
    const playIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const pauseIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    this.btnPlay.innerHTML = isPlaying ? pauseIcon : playIcon;
  }

  seekBy(seconds) {
    this.video.currentTime = Math.max(0, Math.min(this.video.duration || 0, this.video.currentTime + seconds));
    this.resetIdleTimer();
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    const volIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    const muteIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    this.btnMute.innerHTML = this.video.muted ? muteIcon : volIcon;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.modal.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  togglePip() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (this.video.requestPictureInPicture) {
      this.video.requestPictureInPicture().catch(() => {});
    }
  }

  onTimeUpdate() {
    if (!this.video.duration) return;
    const current = this.video.currentTime;
    const total = this.video.duration;
    const pct = (current / total) * 100;

    this.timelineProgress.style.width = `${pct}%`;
    this.timelineThumb.style.left = `${pct}%`;

    this.timeCurrent.textContent = this.formatTime(current);
    this.timeTotal.textContent = this.formatTime(total);
  }

  onProgress() {
    if (!this.video.duration || this.video.buffered.length === 0) return;
    const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
    const pct = (bufferedEnd / this.video.duration) * 100;
    this.timelineBuffered.style.width = `${pct}%`;
  }

  onTimelineSeek(e) {
    const rect = this.timelineContainer.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekPct = clickX / rect.width;
    if (this.video.duration) {
      this.video.currentTime = seekPct * this.video.duration;
    }
    this.resetIdleTimer();
  }

  onEnded() {
    this.syncProgress();
  }

  resetIdleTimer() {
    this.hud.classList.remove("idle");
    clearTimeout(this.idleTimeout);
    if (!this.video.paused) {
      this.idleTimeout = setTimeout(() => {
        this.hud.classList.add("idle");
      }, 3500);
    }
  }

  syncProgress() {
    if (!this.currentMedia || !this.video.duration) return;
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_id: this.currentMedia.id,
        position: this.video.currentTime,
        duration: this.video.duration
      })
    }).catch(() => {});
  }

  formatTime(seconds) {
    const s = Math.floor(seconds || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
    }
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }

  onKeyDown(e) {
    if (!this.modal.classList.contains("active")) return;
    if (e.key === "Escape") this.close();
    if (e.key === " " || e.key === "k") { e.preventDefault(); this.togglePlay(); }
    if (e.key === "ArrowLeft" || e.key === "j") { e.preventDefault(); this.seekBy(-10); }
    if (e.key === "ArrowRight" || e.key === "l") { e.preventDefault(); this.seekBy(10); }
    if (e.key === "f") { e.preventDefault(); this.toggleFullscreen(); }
    if (e.key === "m") { e.preventDefault(); this.toggleMute(); }
  }
}

window.FlixPlayer = FlixPlayer;
