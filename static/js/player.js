/**
 * FLIXBOX PRO CINEMA PLAYER - ULTRA HD EXPERIENCE
 * Auto-Landscape Orientation Lock, Touch Seek Ripples, Netflix Cinema Vignette,
 * Multi-Language Audio Switching, Live Stream Remuxing, HTTP 206 Direct Play,
 * Zero-buffering, Auto-Resume, Keyboard Shortcuts & Touch Gestures
 */

class FlixPlayer {
  constructor() {
    this.modal = document.getElementById("playerModal");
    this.video = document.getElementById("mainVideo");
    this.hud = document.getElementById("playerHud");
    
    // Top Bar Elements
    this.btnBack = document.getElementById("btnPlayerBack");
    this.btnTopRotate = document.getElementById("btnTopRotate");
    this.playerTitle = document.getElementById("playerTitle");
    this.playerSubtitle = document.getElementById("playerSubtitle");
    
    // Center Controls Cluster (Netflix Trio)
    this.btnCenterPlayMain = document.getElementById("btnCenterPlayMain");
    this.btnCenterRewind = document.getElementById("btnCenterRewind");
    this.btnCenterForward = document.getElementById("btnCenterForward");
    
    // Bottom Bar Controls
    this.btnPlay = document.getElementById("btnPlay");
    this.btnSkipBack = document.getElementById("btnSkipBack");
    this.btnSkipForward = document.getElementById("btnSkipForward");
    this.btnMute = document.getElementById("btnMute");
    this.volumeSlider = document.getElementById("volumeSlider");
    this.btnFullscreen = document.getElementById("btnFullscreen");
    this.btnPip = document.getElementById("btnPip");
    this.btnRotate = document.getElementById("btnRotate");
    
    // Timeline Elements
    this.timelineContainer = document.getElementById("timelineContainer");
    this.timelineProgress = document.getElementById("timelineProgress");
    this.timelineBuffered = document.getElementById("timelineBuffered");
    this.timelineThumb = document.getElementById("timelineThumb");
    this.timelineTooltip = document.getElementById("timelineTooltip");
    this.timeCurrent = document.getElementById("timeCurrent");
    this.timeTotal = document.getElementById("timeTotal");
    
    // Spinners & Seek Ripples
    this.playerSpinner = document.getElementById("playerSpinner");
    this.seekRippleLeft = document.getElementById("seekRippleLeft");
    this.seekRippleRight = document.getElementById("seekRippleRight");
    
    // Audio Elements & Custom Drawer
    this.btnAudioPill = document.getElementById("btnAudioPill");
    this.audioPillText = document.getElementById("audioPillText");
    this.audioDrawerBackdrop = document.getElementById("audioDrawerBackdrop");
    this.audioDrawerList = document.getElementById("audioDrawerList");
    this.btnAudioDrawerClose = document.getElementById("btnAudioDrawerClose");
    
    // Speed Elements & Custom Drawer
    this.btnSpeedPill = document.getElementById("btnSpeedPill");
    this.speedPillText = document.getElementById("speedPillText");
    this.speedDrawerBackdrop = document.getElementById("speedDrawerBackdrop");
    this.speedDrawerList = document.getElementById("speedDrawerList");
    this.btnSpeedDrawerClose = document.getElementById("btnSpeedDrawerClose");
    
    // Center Notification Toast
    this.playerToast = document.getElementById("playerToast");
    
    // Internal Player State
    this.currentMedia = null;
    this.currentAudioTrack = null;
    this.streamOffset = 0;
    this.isRemuxing = false;
    this.progressInterval = null;
    this.idleTimeout = null;
    this.toastTimeout = null;
    this.rippleTimeout = null;
    this.isDraggingTimeline = false;
    
    this.initEvents();
  }

  initEvents() {
    // Play / Pause
    if (this.btnPlay) this.btnPlay.addEventListener("click", () => this.togglePlay());
    if (this.btnCenterPlayMain) this.btnCenterPlayMain.addEventListener("click", () => this.togglePlay());
    this.video.addEventListener("click", () => this.onVideoClick());

    // Skip 10s (Center & Bottom)
    const onRewind = () => {
      this.seekBy(-10);
      this.showSeekRipple("left");
    };
    const onForward = () => {
      this.seekBy(10);
      this.showSeekRipple("right");
    };

    if (this.btnSkipBack) this.btnSkipBack.addEventListener("click", onRewind);
    if (this.btnCenterRewind) this.btnCenterRewind.addEventListener("click", onRewind);
    if (this.btnSkipForward) this.btnSkipForward.addEventListener("click", onForward);
    if (this.btnCenterForward) this.btnCenterForward.addEventListener("click", onForward);

    // Mute & Volume
    if (this.btnMute) this.btnMute.addEventListener("click", () => this.toggleMute());
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener("input", (e) => {
        this.video.volume = parseFloat(e.target.value);
        this.video.muted = this.video.volume === 0;
        this.updateVolumeIcon();
      });
    }

    // Fullscreen & PiP
    if (this.btnFullscreen) this.btnFullscreen.addEventListener("click", () => this.toggleFullscreen());
    if (this.btnPip) this.btnPip.addEventListener("click", () => this.togglePip());

    // Rotation / Orientation Lock
    if (this.btnRotate) this.btnRotate.addEventListener("click", () => this.toggleRotate());
    if (this.btnTopRotate) this.btnTopRotate.addEventListener("click", () => this.toggleRotate());

    // Close Player
    if (this.btnBack) this.btnBack.addEventListener("click", () => this.close());

    // Audio Drawer
    if (this.btnAudioPill) {
      this.btnAudioPill.addEventListener("click", () => this.openAudioDrawer());
    }
    if (this.btnAudioDrawerClose) {
      this.btnAudioDrawerClose.addEventListener("click", () => this.closeAudioDrawer());
    }
    if (this.audioDrawerBackdrop) {
      this.audioDrawerBackdrop.addEventListener("click", (e) => {
        if (e.target === this.audioDrawerBackdrop) this.closeAudioDrawer();
      });
    }

    // Speed Drawer
    if (this.btnSpeedPill) {
      this.btnSpeedPill.addEventListener("click", () => this.openSpeedDrawer());
    }
    if (this.btnSpeedDrawerClose) {
      this.btnSpeedDrawerClose.addEventListener("click", () => this.closeSpeedDrawer());
    }
    if (this.speedDrawerBackdrop) {
      this.speedDrawerBackdrop.addEventListener("click", (e) => {
        if (e.target === this.speedDrawerBackdrop) this.closeSpeedDrawer();
      });
    }
    if (this.speedDrawerList) {
      this.speedDrawerList.querySelectorAll(".drawer-item").forEach(item => {
        item.addEventListener("click", () => {
          const spd = parseFloat(item.getAttribute("data-speed"));
          this.setPlaybackSpeed(spd);
          this.closeSpeedDrawer();
        });
      });
    }

    // Timeline Updates
    this.video.addEventListener("timeupdate", () => this.onTimeUpdate());
    this.video.addEventListener("progress", () => this.onProgress());
    this.video.addEventListener("play", () => this.updatePlayIcon(true));
    this.video.addEventListener("pause", () => this.updatePlayIcon(false));
    this.video.addEventListener("ended", () => this.onEnded());

    // Buffering & Loading Spinners
    this.video.addEventListener("waiting", () => this.setBuffering(true));
    this.video.addEventListener("seeking", () => this.setBuffering(true));
    this.video.addEventListener("canplay", () => this.setBuffering(false));
    this.video.addEventListener("playing", () => this.setBuffering(false));

    // Scrubber Interaction & Dragging
    this.timelineContainer.addEventListener("mousedown", (e) => this.startTimelineDrag(e));
    this.timelineContainer.addEventListener("touchstart", (e) => this.startTimelineDrag(e), { passive: true });
    
    window.addEventListener("mousemove", (e) => this.onTimelineMouseMove(e));
    window.addEventListener("touchmove", (e) => this.onTimelineMouseMove(e), { passive: true });
    
    window.addEventListener("mouseup", () => this.stopTimelineDrag());
    window.addEventListener("touchend", () => this.stopTimelineDrag());

    // Idle HUD Fade
    window.addEventListener("mousemove", () => this.resetIdleTimer());
    window.addEventListener("touchstart", () => this.resetIdleTimer(), { passive: true });

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => this.onKeyDown(e));

    // Double-tap on mobile touch screen for Netflix-style ripples
    let lastTapTime = 0;
    this.video.addEventListener("touchend", (e) => {
      const now = new Date().getTime();
      const diff = now - lastTapTime;
      if (diff < 320 && diff > 50 && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const half = window.innerWidth / 2;
        if (touch.clientX < half) {
          this.seekBy(-10);
          this.showSeekRipple("left");
        } else {
          this.seekBy(10);
          this.showSeekRipple("right");
        }
        e.preventDefault();
        lastTapTime = 0;
        return;
      }
      lastTapTime = now;
    });
  }

  onVideoClick() {
    if (this.hud.classList.contains("idle")) {
      this.resetIdleTimer();
    } else {
      this.togglePlay();
    }
  }

  async enterLandscape() {
    try {
      if (!document.fullscreenElement) {
        if (this.modal.requestFullscreen) {
          await this.modal.requestFullscreen().catch(() => {});
        } else if (this.video.webkitEnterFullscreen) {
          this.video.webkitEnterFullscreen();
          return;
        }
      }

      if (window.screen && screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape").catch(() => {
          if (window.innerWidth < window.innerHeight) {
            this.modal.classList.add("force-landscape");
          }
        });
      } else if (window.innerWidth < window.innerHeight) {
        this.modal.classList.add("force-landscape");
      }
    } catch (e) {
      if (window.innerWidth < window.innerHeight) {
        this.modal.classList.add("force-landscape");
      }
    }
  }

  exitLandscape() {
    this.modal.classList.remove("force-landscape");
    try {
      if (window.screen && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  }

  async toggleRotate() {
    const isCurrentlyForced = this.modal.classList.contains("force-landscape");
    const isPortrait = window.innerHeight > window.innerWidth;

    if (isCurrentlyForced) {
      this.modal.classList.remove("force-landscape");
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
      this.showToast("Orientation: Portrait");
    } else if (isPortrait) {
      let locked = false;
      if (screen.orientation && screen.orientation.lock) {
        try {
          await screen.orientation.lock("landscape");
          locked = true;
          this.showToast("Orientation: Landscape");
        } catch (err) {
          locked = false;
        }
      }
      if (!locked) {
        this.modal.classList.add("force-landscape");
        this.showToast("Orientation: Landscape (Cinema)");
      }
    } else {
      if (screen.orientation && screen.orientation.lock) {
        try {
          await screen.orientation.lock("portrait");
          this.showToast("Orientation: Portrait");
        } catch (err) {
          if (screen.orientation.unlock) screen.orientation.unlock();
        }
      } else {
        this.modal.classList.toggle("force-landscape");
      }
    }
  }

  setBuffering(isBuffering) {
    if (!this.playerSpinner) return;
    if (isBuffering) {
      this.playerSpinner.classList.add("active");
    } else {
      this.playerSpinner.classList.remove("active");
    }
  }

  showSeekRipple(direction) {
    const ripple = direction === "left" ? this.seekRippleLeft : this.seekRippleRight;
    if (!ripple) return;
    ripple.classList.add("active");
    clearTimeout(this.rippleTimeout);
    this.rippleTimeout = setTimeout(() => {
      ripple.classList.remove("active");
    }, 650);
  }

  open(media) {
    this.currentMedia = media;
    this.playerTitle.textContent = media.clean_title || media.title;
    this.playerSubtitle.textContent = media.series_name 
      ? `${media.series_name} • S${media.season} E${media.episode}` 
      : `${media.year || 'Cinema'} • ${media.resolution || '1080p FHD'}`;

    this.streamOffset = 0;
    const resumePos = media.progress_seconds || 0;
    const tracks = media.audio_tracks || [];

    // Setup Multi-Audio Track Controls
    if (tracks && tracks.length > 1) {
      this.btnAudioPill.style.display = "inline-flex";
      this.currentAudioTrack = tracks[0].track_index;
      this.audioPillText.textContent = tracks[0].language_label;
      this.renderAudioDrawerOptions(tracks);
      
      // Start stream
      this.isRemuxing = true;
      this.streamOffset = (resumePos > 5 && resumePos < (media.duration - 15)) ? resumePos : 0;
      this.video.src = `/stream/${media.id}?audio=${this.currentAudioTrack}&start=${this.streamOffset.toFixed(2)}`;
    } else if (tracks && tracks.length === 1) {
      const firstCodec = (tracks[0].codec || "").toLowerCase();
      if (firstCodec === "eac3" || firstCodec === "dts" || firstCodec === "ac3") {
        this.isRemuxing = true;
        this.currentAudioTrack = 0;
        this.streamOffset = (resumePos > 5 && resumePos < (media.duration - 15)) ? resumePos : 0;
        this.video.src = `/stream/${media.id}?audio=0&start=${this.streamOffset.toFixed(2)}`;
      } else {
        this.isRemuxing = false;
        this.currentAudioTrack = null;
        this.video.src = `/stream/${media.id}`;
      }
      this.btnAudioPill.style.display = "none";
    } else {
      this.btnAudioPill.style.display = "none";
      this.isRemuxing = false;
      this.currentAudioTrack = null;
      this.video.src = `/stream/${media.id}`;
    }

    this.modal.classList.add("active");
    this.resetIdleTimer();

    // Auto-enter Landscape on phones
    this.enterLandscape();

    // Auto-resume for direct stream mode
    if (!this.isRemuxing) {
      this.video.addEventListener("loadedmetadata", () => {
        if (resumePos > 5 && resumePos < (this.video.duration - 15)) {
          this.video.currentTime = resumePos;
        }
        this.video.play().catch(() => {});
      }, { once: true });
    } else {
      this.video.play().catch(() => {});
    }

    // Reset speed pill to 1.0x
    this.setPlaybackSpeed(1.0);

    // Start progress sync interval (every 5 seconds)
    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => this.syncProgress(), 5000);
  }

  renderAudioDrawerOptions(tracks) {
    if (!this.audioDrawerList) return;
    this.audioDrawerList.innerHTML = tracks.map(t => {
      const isActive = t.track_index === this.currentAudioTrack;
      return `
        <div class="drawer-item ${isActive ? 'active' : ''}" data-idx="${t.track_index}">
          <span>${t.label}</span>
          ${isActive ? '<span class="drawer-check">✓</span>' : ''}
        </div>
      `;
    }).join("");

    this.audioDrawerList.querySelectorAll(".drawer-item").forEach(item => {
      item.onclick = () => {
        const idx = parseInt(item.getAttribute("data-idx"));
        this.switchAudioTrack(idx);
        this.closeAudioDrawer();
      };
    });
  }

  openAudioDrawer() {
    if (this.audioDrawerBackdrop) {
      this.audioDrawerBackdrop.classList.add("active");
    }
  }

  closeAudioDrawer() {
    if (this.audioDrawerBackdrop) {
      this.audioDrawerBackdrop.classList.remove("active");
    }
  }

  switchAudioTrack(newTrackIdx) {
    if (isNaN(newTrackIdx)) return;
    const tracks = this.currentMedia?.audio_tracks || [];
    const target = tracks.find(t => t.track_index === newTrackIdx);
    if (!target) return;

    const currentPos = this.getCurrentTime();
    this.currentAudioTrack = newTrackIdx;
    this.streamOffset = currentPos;
    this.isRemuxing = true;

    // Update pill text
    this.audioPillText.textContent = target.language_label;
    this.renderAudioDrawerOptions(tracks);
    this.showToast(`Audio: ${target.label}`);

    // Switch video stream source seamlessly at current position
    const wasPaused = this.video.paused;
    this.video.src = `/stream/${this.currentMedia.id}?audio=${newTrackIdx}&start=${currentPos.toFixed(2)}`;
    this.video.addEventListener("loadedmetadata", () => {
      if (!wasPaused) {
        this.video.play().catch(() => {});
      }
    }, { once: true });
  }

  openSpeedDrawer() {
    if (this.speedDrawerBackdrop) {
      this.speedDrawerBackdrop.classList.add("active");
    }
  }

  closeSpeedDrawer() {
    if (this.speedDrawerBackdrop) {
      this.speedDrawerBackdrop.classList.remove("active");
    }
  }

  setPlaybackSpeed(speed) {
    this.video.playbackRate = speed;
    if (this.speedPillText) {
      this.speedPillText.textContent = `${speed}x`;
    }
    if (this.speedDrawerList) {
      this.speedDrawerList.querySelectorAll(".drawer-item").forEach(item => {
        const itemSpeed = parseFloat(item.getAttribute("data-speed"));
        if (Math.abs(itemSpeed - speed) < 0.05) {
          item.classList.add("active");
          if (!item.querySelector(".drawer-check")) {
            item.innerHTML += `<span class="drawer-check">✓</span>`;
          }
        } else {
          item.classList.remove("active");
          const chk = item.querySelector(".drawer-check");
          if (chk) chk.remove();
        }
      });
    }
    this.showToast(`Speed: ${speed}x`);
  }

  showToast(message) {
    if (!this.playerToast) return;
    this.playerToast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#E50914">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
      <span>${message}</span>
    `;
    this.playerToast.classList.add("show");
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.playerToast.classList.remove("show");
    }, 2200);
  }

  getCurrentTime() {
    if (this.isRemuxing) {
      return Math.min(this.getTotalDuration(), this.streamOffset + (this.video.currentTime || 0));
    }
    return this.video.currentTime || 0;
  }

  getTotalDuration() {
    return this.currentMedia?.duration || this.video.duration || 0;
  }

  close() {
    this.syncProgress();
    clearInterval(this.progressInterval);
    clearTimeout(this.idleTimeout);
    clearTimeout(this.toastTimeout);
    clearTimeout(this.rippleTimeout);
    
    this.closeAudioDrawer();
    this.closeSpeedDrawer();
    this.exitLandscape();
    
    this.video.pause();
    this.video.src = "";
    this.modal.classList.remove("active");

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
    
    const centerPlayIcon = `<svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const centerPauseIcon = `<svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    
    if (this.btnPlay) {
      this.btnPlay.innerHTML = isPlaying ? pauseIcon : playIcon;
    }
    if (this.btnCenterPlayMain) {
      this.btnCenterPlayMain.innerHTML = isPlaying ? centerPauseIcon : centerPlayIcon;
    }
  }

  seekBy(seconds) {
    const target = Math.max(0, Math.min(this.getTotalDuration(), this.getCurrentTime() + seconds));
    this.seekTo(target);
  }

  startTimelineDrag(e) {
    this.isDraggingTimeline = true;
    this.timelineContainer.classList.add("dragging");
    this.onTimelineSeek(e);
  }

  stopTimelineDrag() {
    if (this.isDraggingTimeline) {
      this.isDraggingTimeline = false;
      this.timelineContainer.classList.remove("dragging");
      this.resetIdleTimer();
    }
  }

  onTimelineMouseMove(e) {
    if (!this.timelineContainer) return;
    const rect = this.timelineContainer.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    if (clientX === undefined) return;

    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekPct = clickX / rect.width;
    const hoverSeconds = seekPct * this.getTotalDuration();

    if (this.timelineTooltip) {
      this.timelineTooltip.textContent = this.formatTime(hoverSeconds);
      this.timelineTooltip.style.left = `${clickX}px`;
    }

    if (this.isDraggingTimeline) {
      this.onTimelineSeek(e);
    }
  }

  onTimelineSeek(e) {
    const rect = this.timelineContainer.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    if (clientX === undefined) return;

    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekPct = clickX / rect.width;
    const target = seekPct * this.getTotalDuration();
    this.seekTo(target);
    this.resetIdleTimer();
  }

  seekTo(targetSeconds) {
    const total = this.getTotalDuration();
    const clamped = Math.max(0, Math.min(total, targetSeconds));

    if (this.isRemuxing) {
      const localTarget = clamped - this.streamOffset;
      if (localTarget >= 0 && this.video.duration && localTarget < this.video.duration) {
        this.video.currentTime = localTarget;
      } else {
        this.streamOffset = clamped;
        const wasPaused = this.video.paused;
        const audioParam = this.currentAudioTrack !== null ? `&audio=${this.currentAudioTrack}` : '';
        this.video.src = `/stream/${this.currentMedia.id}?start=${clamped.toFixed(2)}${audioParam}`;
        this.video.addEventListener("loadedmetadata", () => {
          if (!wasPaused) {
            this.video.play().catch(() => {});
          }
        }, { once: true });
      }
    } else {
      this.video.currentTime = clamped;
    }
    this.resetIdleTimer();
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    if (this.volumeSlider) {
      this.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
    }
    this.updateVolumeIcon();
    this.showToast(this.video.muted ? "Muted" : "Unmuted");
  }

  updateVolumeIcon() {
    const volIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    const muteIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    if (this.btnMute) {
      this.btnMute.innerHTML = this.video.muted || this.video.volume === 0 ? muteIcon : volIcon;
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (this.modal.requestFullscreen) {
        this.modal.requestFullscreen().catch(() => {});
      }
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
    const total = this.getTotalDuration();
    if (!total) return;
    const current = this.getCurrentTime();
    const pct = Math.min(100, Math.max(0, (current / total) * 100));

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
    if (!this.currentMedia || !this.getTotalDuration()) return;
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_id: this.currentMedia.id,
        position: this.getCurrentTime(),
        duration: this.getTotalDuration()
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
    if (e.key === "Escape") {
      if (this.audioDrawerBackdrop && this.audioDrawerBackdrop.classList.contains("active")) {
        this.closeAudioDrawer();
        return;
      }
      if (this.speedDrawerBackdrop && this.speedDrawerBackdrop.classList.contains("active")) {
        this.closeSpeedDrawer();
        return;
      }
      this.close();
    }
    if (e.key === " " || e.key === "k") { e.preventDefault(); this.togglePlay(); }
    if (e.key === "ArrowLeft" || e.key === "j") { 
      e.preventDefault(); 
      this.seekBy(-10); 
      this.showSeekRipple("left");
    }
    if (e.key === "ArrowRight" || e.key === "l") { 
      e.preventDefault(); 
      this.seekBy(10); 
      this.showSeekRipple("right");
    }
    if (e.key === "f") { e.preventDefault(); this.toggleFullscreen(); }
    if (e.key === "m") { e.preventDefault(); this.toggleMute(); }
    if (e.key === "r") { e.preventDefault(); this.toggleRotate(); }
  }
}

window.FlixPlayer = FlixPlayer;
