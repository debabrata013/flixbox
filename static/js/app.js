/**
 * FLIXBOX APP - UI Controller
 * Dynamic Home Feeds, Search, Series Browser, Carousel Controls
 */

document.addEventListener("DOMContentLoaded", () => {
  const player = new FlixPlayer();
  window.appPlayer = player;

  // Elements
  const navbar = document.getElementById("navbar");
  const heroSection = document.getElementById("heroSection");
  const heroBackdrop = document.getElementById("heroBackdrop");
  const heroTitle = document.getElementById("heroTitle");
  const heroBadgeRes = document.getElementById("heroBadgeRes");
  const heroBadgeYear = document.getElementById("heroBadgeYear");
  const heroSynopsis = document.getElementById("heroSynopsis");
  const btnHeroPlay = document.getElementById("btnHeroPlay");
  
  const railContinueWatching = document.getElementById("railContinueWatching");
  const trackContinueWatching = document.getElementById("trackContinueWatching");
  
  const trackMovies = document.getElementById("trackMovies");
  const trackSeries = document.getElementById("trackSeries");
  const trackRecent = document.getElementById("trackRecent");
  
  const searchInput = document.getElementById("searchInput");
  const searchResultsSection = document.getElementById("searchResultsSection");
  const searchGrid = document.getElementById("searchGrid");
  const homeContent = document.getElementById("homeContent");
  
  const seriesModal = document.getElementById("seriesModal");
  const seriesModalTitle = document.getElementById("seriesModalTitle");
  const seriesSeasonSelect = document.getElementById("seriesSeasonSelect");
  const seriesEpisodesList = document.getElementById("seriesEpisodesList");
  const btnCloseSeriesModal = document.getElementById("btnCloseSeriesModal");
  
  const btnScan = document.getElementById("btnScan");

  // Navbar glass scroll
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // Load Home Data
  window.loadHomeData = async function() {
    try {
      const res = await fetch("/api/home");
      const data = await res.json();
      if (data.status !== "success") return;

      // 1. Hero Billboard
      const feat = data.featured;
      if (feat) {
        heroSection.style.display = "flex";
        heroTitle.textContent = feat.clean_title || feat.title;
        heroBadgeRes.textContent = feat.resolution || "1080p FHD";
        heroBadgeYear.textContent = feat.year || (feat.category === "series" ? "Web Series" : "Cinema");
        heroSynopsis.textContent = `${feat.category === "series" ? 'Exclusive Web Series' : 'Blockbuster Movie'} available in ultra-low latency streaming on your private FlixBox node.`;
        heroBackdrop.src = feat.thumbnail_file ? `/thumbnails/${feat.thumbnail_file}?v=2` : '';
        btnHeroPlay.onclick = () => player.open(feat);
      } else {
        heroSection.style.display = "none";
      }

      // 2. Continue Watching Rail
      if (data.continue_watching && data.continue_watching.length > 0) {
        railContinueWatching.style.display = "block";
        trackContinueWatching.innerHTML = data.continue_watching.map(item => renderCard(item, true)).join("");
      } else {
        railContinueWatching.style.display = "none";
      }

      // 3. Movies Rail
      if (data.movies && data.movies.length > 0) {
        trackMovies.innerHTML = data.movies.map(item => renderCard(item)).join("");
      } else {
        trackMovies.innerHTML = `<div style="color: var(--text-dim); padding: 16px;">No movies found. Add files to <code>/sdcard/FlixBox/Movies</code></div>`;
      }

      // 4. Series Rail
      if (data.series && data.series.length > 0) {
        trackSeries.innerHTML = data.series.map(s => renderSeriesCard(s)).join("");
      } else {
        trackSeries.innerHTML = `<div style="color: var(--text-dim); padding: 16px;">No series found. Add folders to <code>/sdcard/FlixBox/Series</code></div>`;
      }

      // 5. Recently Added Rail
      if (data.recently_added && data.recently_added.length > 0) {
        trackRecent.innerHTML = data.recently_added.map(item => renderCard(item)).join("");
      }

      attachCardListeners();
    } catch (e) {
      console.error("Failed to load home data:", e);
    }
  };

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function renderCard(item, isProgress = false) {
    const thumbUrl = item.thumbnail_file ? `/thumbnails/${item.thumbnail_file}?v=2` : '';
    const progressFill = isProgress && item.progress_percentage ? `
      <div class="card-progress-bar">
        <div class="card-progress-fill" style="width: ${item.progress_percentage}%"></div>
      </div>
    ` : '';
    const durStr = formatDuration(item.duration);
    const metaYear = item.year ? `${item.year}` : '';
    const midDot = metaYear && durStr ? ' • ' : '';
    
    return `
      <div class="media-card" data-id="${item.id}" data-type="media">
        <div class="card-poster-wrapper">
          <img class="card-poster" src="${thumbUrl}" alt="${item.clean_title}" loading="lazy" />
          ${progressFill}
        </div>
        <div class="card-info">
          <div class="card-title">${item.clean_title || item.title}</div>
          <div class="card-meta">
            <span>${metaYear}${midDot}${durStr}</span>
            <span class="card-tag">${item.resolution || 'HD'}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderSeriesCard(series) {
    const thumbUrl = series.thumbnail_file ? `/thumbnails/${series.thumbnail_file}?v=2` : '';
    const epCount = series.total_episodes || 1;
    return `
      <div class="media-card" data-series-name="${encodeURIComponent(series.series_name)}" data-type="series">
        <div class="card-poster-wrapper">
          <img class="card-poster" src="${thumbUrl}" alt="${series.series_name}" loading="lazy" />
        </div>
        <div class="card-info">
          <div class="card-title">${series.series_name}</div>
          <div class="card-meta">
            <span>${epCount} Episode${epCount > 1 ? 's' : ''}</span>
            <span class="card-tag" style="color: #a855f7; background: rgba(168,85,247,0.15);">${series.resolution || 'HD'}</span>
          </div>
        </div>
      </div>
    `;
  }

  function attachCardListeners() {
    // Single media items -> Play
    document.querySelectorAll('.media-card[data-type="media"]').forEach(card => {
      card.onclick = async () => {
        const id = card.getAttribute("data-id");
        try {
          const res = await fetch(`/api/media/${id}`);
          const data = await res.json();
          if (data.status === "success") {
            player.open(data.media);
          }
        } catch (e) {
          console.error(e);
        }
      };
    });

    // Series items -> Open episode modal
    document.querySelectorAll('.media-card[data-type="series"]').forEach(card => {
      card.onclick = async () => {
        const sName = decodeURIComponent(card.getAttribute("data-series-name"));
        openSeriesModal(sName);
      };
    });
  }

  // Series Episodes Modal
  async function openSeriesModal(seriesName) {
    try {
      const res = await fetch("/api/series");
      const data = await res.json();
      const series = data.series.find(s => s.series_name === seriesName);
      if (!series) return;

      seriesModalTitle.textContent = series.series_name;
      const seasonNums = Object.keys(series.seasons).sort((a,b) => a - b);
      
      // Populate season dropdown
      seriesSeasonSelect.innerHTML = seasonNums.map(n => `<option value="${n}">Season ${n}</option>`).join("");
      
      const renderEpisodes = (seasonNum) => {
        const eps = series.seasons[seasonNum] || [];
        seriesEpisodesList.innerHTML = eps.map((ep, idx) => `
          <div class="episode-item" data-id="${ep.id}">
            <div class="episode-num">${ep.episode || idx + 1}</div>
            <div class="episode-title">${ep.clean_title || ep.title}</div>
            <span class="card-tag">${ep.resolution || 'HD'}</span>
            <button class="btn-ctrl" style="background: rgba(229,9,20,0.2); color: #E50914;">▶</button>
          </div>
        `).join("");

        seriesEpisodesList.querySelectorAll(".episode-item").forEach(item => {
          item.onclick = async () => {
            const id = item.getAttribute("data-id");
            seriesModal.classList.remove("active");
            const mRes = await fetch(`/api/media/${id}`);
            const mData = await mRes.json();
            if (mData.status === "success") {
              player.open(mData.media);
            }
          };
        });
      };

      seriesSeasonSelect.onchange = (e) => renderEpisodes(e.target.value);
      renderEpisodes(seasonNums[0] || 1);
      seriesModal.classList.add("active");
    } catch (e) {
      console.error(e);
    }
  }

  btnCloseSeriesModal.onclick = () => seriesModal.classList.remove("active");

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
          searchGrid.innerHTML = data.results.map(item => renderCard(item)).join("");
          attachCardListeners();
        } else {
          searchGrid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-dim); padding: 40px; text-align: center;">No matches found for "${q}"</div>`;
        }
      } catch (err) {
        console.error(err);
      }
    }, 280);
  });

  // Scan library button
  btnScan.onclick = async () => {
    btnScan.disabled = true;
    btnScan.innerHTML = `<span style="animation: spin 1s linear infinite;">⏳</span> Scanning...`;
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      alert(data.message || "Library scanned!");
      window.loadHomeData();
    } catch (e) {
      alert("Scan failed: " + e.message);
    } finally {
      btnScan.disabled = false;
      btnScan.innerHTML = `🔄 Scan Library`;
    }
  };

  // Initial Load
  window.loadHomeData();

  // Handle direct watch link (e.g. ?watch=2)
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
