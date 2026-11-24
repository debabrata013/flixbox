/**
 * FLIXBOX - Award-Winning Cinema UI Controller
 * Fluid Netflix Carousels, Vertical Movie Posters, Detail Drawers, Mobile Sync
 */

document.addEventListener("DOMContentLoaded", () => {
  const player = new FlixPlayer();
  window.appPlayer = player;

  // DOM Elements
  const navbar = document.getElementById("navbar");
  const heroSection = document.getElementById("heroSection");
  const heroBackdrop = document.getElementById("heroBackdrop");
  const heroTitle = document.getElementById("heroTitle");
  const heroBadgeRes = document.getElementById("heroBadgeRes");
  const heroDuration = document.getElementById("heroDuration");
  const heroYear = document.getElementById("heroYear");
  const heroSynopsis = document.getElementById("heroSynopsis");
  const btnHeroPlay = document.getElementById("btnHeroPlay");
  const btnHeroDetails = document.getElementById("btnHeroDetails");
  
  const railContinueWatching = document.getElementById("railContinueWatching");
  const trackContinueWatching = document.getElementById("trackContinueWatching");
  
  const railMovies = document.getElementById("railMovies");
  const trackMovies = document.getElementById("trackMovies");
  
  const railSeries = document.getElementById("railSeries");
  const trackSeries = document.getElementById("trackSeries");
  
  const railRecent = document.getElementById("railRecent");
  const trackRecent = document.getElementById("trackRecent");
  
  const searchInput = document.getElementById("searchInput");
  const searchResultsSection = document.getElementById("searchResultsSection");
  const searchGrid = document.getElementById("searchGrid");
  const homeContent = document.getElementById("homeContent");
  
  // Detail Modal Elements
  const detailModal = document.getElementById("detailModal");
  const detailImg = document.getElementById("detailImg");
  const detailTitle = document.getElementById("detailTitle");
  const detailRes = document.getElementById("detailRes");
  const detailYear = document.getElementById("detailYear");
  const detailDuration = document.getElementById("detailDuration");
  const detailFileSize = document.getElementById("detailFileSize");
  const detailSynopsis = document.getElementById("detailSynopsis");
  const btnDetailPlay = document.getElementById("btnDetailPlay");
  const detailPlayText = document.getElementById("detailPlayText");
  const btnCloseDetail = document.getElementById("btnCloseDetail");
  
  const detailEpisodesSection = document.getElementById("detailEpisodesSection");
  const detailSeasonSelect = document.getElementById("detailSeasonSelect");
  const detailEpisodeList = document.getElementById("detailEpisodeList");
  
  const btnScan = document.getElementById("btnScan");
  let activeFeaturedItem = null;

  // Navbar glass scroll effect
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Load Home Feed
  window.loadHomeData = async function() {
    try {
      const res = await fetch("/api/home");
      const data = await res.json();
      if (data.status !== "success") return;

      // 1. HERO BILLBOARD
      const feat = data.featured;
      activeFeaturedItem = feat;
      if (feat) {
        heroSection.style.display = "flex";
        heroTitle.textContent = feat.clean_title || feat.title;
        heroBadgeRes.textContent = feat.resolution || "1080p FHD";
        heroYear.textContent = feat.year || (feat.category === "series" ? "Series" : "Cinema");
        heroDuration.textContent = formatDuration(feat.duration);
        heroSynopsis.textContent = feat.category === "series" 
          ? `Binge the entire season of ${feat.series_name || feat.clean_title} in uncompressed studio clarity.`
          : `Stream ${feat.clean_title} directly from private storage with instantaneous start time and zero data lag.`;
        heroBackdrop.src = feat.thumbnail_file ? `/thumbnails/${feat.thumbnail_file}?v=3` : '';
        btnHeroPlay.onclick = () => player.open(feat);
        btnHeroDetails.onclick = () => openDetailModal(feat);
      } else {
        heroSection.style.display = "none";
      }

      // 2. CONTINUE WATCHING (16:9 Landscape)
      if (data.continue_watching && data.continue_watching.length > 0) {
        railContinueWatching.style.display = "block";
        trackContinueWatching.innerHTML = data.continue_watching.map(item => renderWideCard(item)).join("");
      } else {
        railContinueWatching.style.display = "none";
      }

      // 3. MOVIES (2:3 Vertical Posters)
      if (data.movies && data.movies.length > 0) {
        trackMovies.innerHTML = data.movies.map(item => renderVerticalPoster(item)).join("");
      } else {
        trackMovies.innerHTML = `<div style="color: var(--text-muted); padding: 16px;">No movies found in <code>/sdcard/FlixBox/Movies</code></div>`;
      }

      // 4. WEB SERIES (2:3 Vertical Posters)
      if (data.series && data.series.length > 0) {
        trackSeries.innerHTML = data.series.map(s => renderSeriesPoster(s)).join("");
      } else {
        trackSeries.innerHTML = `<div style="color: var(--text-muted); padding: 16px;">No web series found in <code>/sdcard/FlixBox/Series</code></div>`;
      }

      // 5. RECENTLY ADDED
      if (data.recently_added && data.recently_added.length > 0) {
        trackRecent.innerHTML = data.recently_added.map(item => renderVerticalPoster(item)).join("");
      }

      attachCardListeners();
    } catch (e) {
      console.error("Failed to load home data:", e);
    }
  };

  // Render 2:3 Vertical Movie Poster Card
  function renderVerticalPoster(item) {
    const thumbUrl = item.thumbnail_file ? `/thumbnails/${item.thumbnail_file}?v=3` : '';
    const durStr = formatDuration(item.duration);
    const metaYear = item.year ? `${item.year}` : '';
    const midDot = metaYear && durStr ? ' • ' : '';

    return `
      <div class="poster-card" data-id="${item.id}" data-type="media">
        <div class="poster-image-box">
          <img class="poster-image" src="${thumbUrl}" alt="${item.clean_title}" loading="lazy" />
          <div class="poster-hover-overlay">
            <div class="poster-play-btn">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
        <div class="poster-info">
          <div class="poster-title">${item.clean_title || item.title}</div>
          <div class="poster-meta">
            <span>${metaYear}${midDot}${durStr}</span>
            <span class="tag-badge tag-fhd">${item.resolution || 'HD'}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Render 2:3 Vertical Series Poster Card
  function renderSeriesPoster(series) {
    const thumbUrl = series.thumbnail_file ? `/thumbnails/${series.thumbnail_file}?v=3` : '';
    const epCount = series.total_episodes || 1;
    const seasonCount = Object.keys(series.seasons || {}).length || 1;

    return `
      <div class="poster-card" data-series-name="${encodeURIComponent(series.series_name)}" data-type="series">
        <div class="poster-image-box">
          <img class="poster-image" src="${thumbUrl}" alt="${series.series_name}" loading="lazy" />
          <div class="poster-hover-overlay">
            <div class="poster-play-btn">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
        <div class="poster-info">
          <div class="poster-title">${series.series_name}</div>
          <div class="poster-meta">
            <span>${seasonCount}S • ${epCount} Ep</span>
            <span class="tag-badge tag-series">SERIES</span>
          </div>
        </div>
      </div>
    `;
  }

  // Render 16:9 Wide Card (Continue Watching)
  function renderWideCard(item) {
    const thumbUrl = item.thumbnail_file ? `/thumbnails/${item.thumbnail_file}?v=3` : '';
    const durStr = formatDuration(item.duration);
    const pct = item.progress_percentage || 0;
    const remainingSecs = Math.max(0, (item.total_seconds || item.duration) - (item.progress_seconds || 0));
    const remainingMins = Math.round(remainingSecs / 60);

    return `
      <div class="wide-card" data-id="${item.id}" data-type="media">
        <div class="wide-image-box">
          <img class="wide-image" src="${thumbUrl}" alt="${item.clean_title}" loading="lazy" />
          <div class="wide-progress-rail">
            <div class="wide-progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
        <div class="wide-info">
          <div class="wide-title">${item.clean_title || item.title}</div>
          <div class="wide-meta">
            <span>${remainingMins}m remaining</span>
            <span class="tag-badge tag-fhd">${item.resolution || 'HD'}</span>
          </div>
        </div>
      </div>
    `;
  }

  function attachCardListeners() {
    // Single Media items -> Open Detail Modal
    document.querySelectorAll('.poster-card[data-type="media"], .wide-card[data-type="media"]').forEach(card => {
      card.onclick = async () => {
        const id = card.getAttribute("data-id");
        try {
          const res = await fetch(`/api/media/${id}`);
          const data = await res.json();
          if (data.status === "success") {
            openDetailModal(data.media);
          }
        } catch (e) {
          console.error(e);
        }
      };
    });

    // Series items -> Open Series Modal in Detail Modal
    document.querySelectorAll('.poster-card[data-type="series"]').forEach(card => {
      card.onclick = async () => {
        const sName = decodeURIComponent(card.getAttribute("data-series-name"));
        openSeriesDetail(sName);
      };
    });
  }

  // Open Movie Preview Modal
  function openDetailModal(media) {
    detailImg.src = media.thumbnail_file ? `/thumbnails/${media.thumbnail_file}?v=3` : '';
    detailTitle.textContent = media.clean_title || media.title;
    detailRes.textContent = media.resolution || '1080p FHD';
    detailYear.textContent = media.year || '2025';
    detailDuration.textContent = formatDuration(media.duration);
    detailFileSize.textContent = formatBytes(media.file_size);

    const detailAudioBadge = document.getElementById("detailAudioBadge");
    const tracks = media.audio_tracks || [];
    if (detailAudioBadge) {
      if (tracks && tracks.length > 1) {
        const langs = tracks.map(t => t.language_label).join(", ");
        detailAudioBadge.textContent = `${tracks.length} Audios (${langs})`;
        detailAudioBadge.style.display = "inline-block";
      } else if (tracks && tracks.length === 1) {
        detailAudioBadge.textContent = tracks[0].language_label;
        detailAudioBadge.style.display = "inline-block";
      } else {
        detailAudioBadge.style.display = "none";
      }
    }

    detailSynopsis.textContent = media.category === 'series'
      ? `Web Series episode: ${media.series_name} (Season ${media.season}, Episode ${media.episode}).`
      : `Complete feature film. Stream directly with low data consumption and zero buffering.`;

    detailEpisodesSection.style.display = "none";

    const hasProgress = media.progress_seconds && media.progress_seconds > 10;
    if (hasProgress) {
      detailPlayText.textContent = `Resume from ${formatDuration(media.progress_seconds)}`;
    } else {
      detailPlayText.textContent = "Play Now";
    }

    btnDetailPlay.onclick = () => {
      detailModal.classList.remove("active");
      player.open(media);
    };

    detailModal.classList.add("active");
  }

  // Open Series in Detail Modal with Episodes List
  async function openSeriesDetail(seriesName) {
    try {
      const res = await fetch("/api/series");
      const data = await res.json();
      const series = data.series.find(s => s.series_name === seriesName);
      if (!series) return;

      detailImg.src = series.thumbnail_file ? `/thumbnails/${series.thumbnail_file}?v=3` : '';
      detailTitle.textContent = series.series_name;
      detailRes.textContent = series.resolution || '1080p FHD';
      detailYear.textContent = series.year || 'Series';
      detailDuration.textContent = `${series.total_episodes} Episodes`;
      detailFileSize.textContent = 'Multi-Episode';
      detailSynopsis.textContent = `Complete season package for ${series.series_name}. Select an episode below to start watching.`;

      const seasons = series.seasons || {};
      const seasonKeys = Object.keys(seasons).sort((a,b) => a - b);
      
      detailSeasonSelect.innerHTML = seasonKeys.map(k => `<option value="${k}">Season ${k}</option>`).join("");
      
      const renderEpisodes = (sNum) => {
        const eps = seasons[sNum] || [];
        detailEpisodeList.innerHTML = eps.map((ep, i) => `
          <div class="episode-card" data-id="${ep.id}">
            <div class="ep-num">${ep.episode || i + 1}</div>
            <div class="ep-preview">
              <img src="${ep.thumbnail_file ? `/thumbnails/${ep.thumbnail_file}?v=3` : ''}" alt="Ep preview" />
            </div>
            <div class="ep-details">
              <div class="ep-name">${ep.clean_title || ep.title}</div>
              <div class="ep-runtime">${formatDuration(ep.duration) || 'Episode'}</div>
            </div>
            <button class="btn-ctrl" style="background: rgba(229,9,20,0.15); color: #E50914;">▶</button>
          </div>
        `).join("");

        detailEpisodeList.querySelectorAll(".episode-card").forEach(c => {
          c.onclick = async () => {
            const epId = c.getAttribute("data-id");
            detailModal.classList.remove("active");
            const mRes = await fetch(`/api/media/${epId}`);
            const mData = await mRes.json();
            if (mData.status === "success") {
              player.open(mData.media);
            }
          };
        });
      };

      detailSeasonSelect.onchange = (e) => renderEpisodes(e.target.value);
      renderEpisodes(seasonKeys[0] || 1);

      // Play First Episode on Header CTA
      const firstEp = seasons[seasonKeys[0]][0];
      detailPlayText.textContent = `Play Episode 1`;
      btnDetailPlay.onclick = () => {
        detailModal.classList.remove("active");
        player.open(firstEp);
      };

      detailEpisodesSection.style.display = "block";
      detailModal.classList.add("active");
    } catch (e) {
      console.error(e);
    }
  }

  btnCloseDetail.onclick = () => detailModal.classList.remove("active");

  // Filter Nav Tabs (All / Movies / Series)
  document.querySelectorAll(".nav-link[data-filter]").forEach(link => {
    link.onclick = () => {
      document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      const f = link.getAttribute("data-filter");
      applyFilter(f);
    };
  });

  // Mobile Bottom Nav Sync
  document.querySelectorAll(".mobile-nav-item").forEach(item => {
    item.onclick = () => {
      document.querySelectorAll(".mobile-nav-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      const tab = item.getAttribute("data-tab");
      if (tab === "home") applyFilter("all");
      else if (tab === "movies") applyFilter("movies");
      else if (tab === "series") applyFilter("series");
      else if (tab === "search") {
        searchInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
  });

  function applyFilter(filter) {
    if (filter === "all") {
      heroSection.style.display = "flex";
      railContinueWatching.style.display = trackContinueWatching.children.length > 0 ? "block" : "none";
      railMovies.style.display = "block";
      railSeries.style.display = "block";
      railRecent.style.display = "block";
    } else if (filter === "movies") {
      heroSection.style.display = "none";
      railContinueWatching.style.display = "none";
      railMovies.style.display = "block";
      railSeries.style.display = "none";
      railRecent.style.display = "none";
    } else if (filter === "series") {
      heroSection.style.display = "none";
      railContinueWatching.style.display = "none";
      railMovies.style.display = "none";
      railSeries.style.display = "block";
      railRecent.style.display = "none";
    }
  }

  // Live Search with Debounce
  let searchTimeout = null;
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearTimeout(searchTimeout);
    if (!q) {
      searchResultsSection.style.display = "none";
      homeContent.style.display = "block";
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        homeContent.style.display = "none";
        searchResultsSection.style.display = "block";
        if (data.results && data.results.length > 0) {
          searchGrid.innerHTML = data.results.map(item => renderVerticalPoster(item)).join("");
          attachCardListeners();
        } else {
          searchGrid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); padding: 40px; text-align: center;">No titles matching "${q}"</div>`;
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
  });

  // Library Scan button
  btnScan.onclick = async () => {
    btnScan.disabled = true;
    btnScan.innerHTML = `⏳ Scanning...`;
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      window.loadHomeData();
    } catch (e) {
      console.error(e);
    } finally {
      btnScan.disabled = false;
      btnScan.innerHTML = `🔄 Scan`;
    }
  };

  // Initial Load
  window.loadHomeData();

  // Direct watch URL handler
  const urlParams = new URLSearchParams(window.location.search);
  const watchId = urlParams.get('watch');
  if (watchId) {
    fetch(`/api/media/${watchId}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') player.open(d.media);
      })
      .catch(console.error);
  }
});
