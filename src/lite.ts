// =============================================================================
// LITE PAGE - Lightweight fallback for low-tier devices
// =============================================================================

interface Track {
  title: string;
  artist: string;
  src: string;
  duration: string;
}

// =============================================================================
// CONTENT OVERLAY (ABOUT & MUSIC)
// =============================================================================

const contentOverlay = document.getElementById("content-overlay") as HTMLElement;
const contentClose = document.getElementById("content-close") as HTMLElement;
const aboutContent = document.getElementById("about-content") as HTMLElement;
const musicContent = document.getElementById("music-content") as HTMLElement;

function showOverlay(contentType: "about" | "music"): void {
  aboutContent.style.display = "none";
  musicContent.style.display = "none";

  if (contentType === "about") {
    aboutContent.style.display = "block";
  } else if (contentType === "music") {
    musicContent.style.display = "block";
    setTimeout(() => {
      const activeItem = playlistItems.querySelector(".playlist-item.active");
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }

  contentOverlay.classList.add("visible");
  document.body.classList.add("modal-open");
}

function hideOverlay(): void {
  contentOverlay.classList.remove("visible");
  document.body.classList.remove("modal-open");
}

contentClose.addEventListener("click", (e) => {
  e.preventDefault();
  hideOverlay();
});

contentOverlay.addEventListener("click", (e) => {
  if (e.target === contentOverlay) {
    e.preventDefault();
    hideOverlay();
  }
});

// =============================================================================
// LINK CLICK HANDLERS
// =============================================================================

document.querySelectorAll(".lite-links a").forEach((link) => {
  link.addEventListener("click", (e) => {
    const action = (link as HTMLElement).dataset.action;
    if (action === "showAbout") {
      e.preventDefault();
      showOverlay("about");
    } else if (action === "showMusic") {
      e.preventDefault();
      showOverlay("music");
    }
    // External links (photo, code) will work normally
  });
});

// =============================================================================
// AUDIO PLAYER
// =============================================================================

const audioPlayer = document.getElementById("audio-player") as HTMLAudioElement;
const playPauseBtn = document.querySelector(".play-pause-btn") as HTMLElement;
const playIcon = document.querySelector(".play-icon") as HTMLElement;
const pauseIcon = document.querySelector(".pause-icon") as HTMLElement;
const prevBtn = document.querySelector(".prev-btn") as HTMLElement;
const nextBtn = document.querySelector(".next-btn") as HTMLElement;
const progressBar = document.querySelector(".progress-bar") as HTMLInputElement;
const timeCurrent = document.querySelector(".time-current") as HTMLElement;
const timeDuration = document.querySelector(".time-duration") as HTMLElement;
const trackTitle = document.querySelector(".track-title") as HTMLElement;
const trackArtist = document.querySelector(".track-artist") as HTMLElement;
const playlistItems = document.querySelector(".playlist-items") as HTMLElement;

let isAudioPlaying = false;
let currentTrackIndex = 0;
let isUpdatingProgress = false;
let isPlayerLoaded = false;

const playlist: Track[] = [
  {
    title: "promises",
    artist: "kate",
    src: "/music/promises.mp3",
    duration: "4:07",
  },
  {
    title: "Arabesque No. 1",
    artist: "Claude Debussy, kate",
    src: "/music/arabesque.mp3",
    duration: "5:02",
  },
  {
    title: "offsets",
    artist: "kate",
    src: "/music/offset.mp3",
    duration: "3:58",
  },
  {
    title: "Intermezzo, Op. 118 No. 2",
    artist: "Johannes Brahms, kate",
    src: "/music/intermezzo.mp3",
    duration: "5:38",
  },
  {
    title: "Daydreaming",
    artist: "Radiohead, kate",
    src: "/music/daydreaming.mp3",
    duration: "2:19",
  },
  {
    title: "august",
    artist: "kate, with orchestra",
    src: "/music/august.mp3",
    duration: "5:58",
  },
  {
    title: "a lot can change in a year",
    artist: "Johannes Brahms, kate",
    src: "/music/alot.mp3",
    duration: "3:44",
  },
  {
    title: "Children's Corner, L. 113: I",
    artist: "Claude Debussy, kate",
    src: "/music/childrens.mp3",
    duration: "2:38",
  },
];

function initPlayer(): void {
  updateTrackInfo(currentTrackIndex);
  updatePlaylistUI();
}

function lazyLoadPlayer(): void {
  if (isPlayerLoaded) return;
  isPlayerLoaded = true;
  loadTrack(currentTrackIndex);
}

function updateTrackInfo(index: number): void {
  const track = playlist[index];
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  updateNowPlayingText(track);
}

function loadTrack(index: number): void {
  const track = playlist[index];
  audioPlayer.src = track.src;
  audioPlayer.currentTime = 0;
  timeCurrent.textContent = "0:00";
  timeDuration.textContent = track.duration;
  progressBar.value = "0";
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  updateNowPlayingText(track);
  updatePlaylistUI();
}

function updatePlaylistUI(): void {
  playlistItems.innerHTML = "";
  playlist.forEach((track, index) => {
    const item = document.createElement("div");
    item.className = "playlist-item" + (index === currentTrackIndex ? " active" : "");
    item.innerHTML = `
      <div class="playlist-item-info">
        <div class="playlist-item-title">${track.title}</div>
        <div class="playlist-item-artist">${track.artist}</div>
      </div>
      <div class="playlist-item-duration">${track.duration}</div>
    `;
    item.addEventListener("click", (e) => {
      e.preventDefault();
      currentTrackIndex = index;
      loadTrack(index);
      setTimeout(playAudio, 300);
    });
    playlistItems.appendChild(item);

    if (index === currentTrackIndex) {
      setTimeout(() => {
        item.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  });
}

function playAudio(): void {
  lazyLoadPlayer();
  audioPlayer.play().catch((error) => {
    console.log("Audio playback failed:", error);
    setTimeout(() => audioPlayer.play(), 300);
  });
}

function pauseAudio(): void {
  audioPlayer.pause();
}

function togglePlayPause(): void {
  if (isAudioPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function nextTrack(): void {
  lazyLoadPlayer();
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
  loadTrack(currentTrackIndex);
  setTimeout(playAudio, 300);
}

function prevTrack(): void {
  lazyLoadPlayer();
  currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrackIndex);
  setTimeout(playAudio, 300);
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// UI Elements
const audioToggle = document.getElementById("audio-toggle") as HTMLElement;
const audioIconOn = document.getElementById("audio-icon-on") as HTMLElement;
const audioIconOff = document.getElementById("audio-icon-off") as HTMLElement;
const nowPlaying = document.getElementById("now-playing") as HTMLElement;

function updateNowPlayingText(track: Track): void {
  const titleSpan = nowPlaying.querySelector(".now-playing-title");
  const artistSpan = nowPlaying.querySelector(".now-playing-artist");

  if (titleSpan) {
    titleSpan.textContent = track.title;
  }
  if (artistSpan) {
    if (track.title.length < 12) {
      const displayArtist = track.artist.length > 10 ? track.artist.split(",")[0] : track.artist;
      artistSpan.textContent = "by " + displayArtist;
    } else {
      artistSpan.textContent = "";
    }
  }
}

// Audio player event listeners
audioPlayer.addEventListener("play", () => {
  isAudioPlaying = true;
  playIcon.style.display = "none";
  pauseIcon.style.display = "block";
  audioIconOn.style.display = "block";
  audioIconOff.style.display = "none";
  nowPlaying.classList.add("visible");
});

audioPlayer.addEventListener("pause", () => {
  isAudioPlaying = false;
  playIcon.style.display = "block";
  pauseIcon.style.display = "none";
  audioIconOn.style.display = "none";
  audioIconOff.style.display = "block";
  nowPlaying.classList.remove("visible");
});

audioPlayer.addEventListener("timeupdate", () => {
  if (!isUpdatingProgress) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBar.value = String(progress || 0);
    timeCurrent.textContent = formatTime(audioPlayer.currentTime);
  }
});

audioPlayer.addEventListener("loadedmetadata", () => {
  timeDuration.textContent = formatTime(audioPlayer.duration);
  progressBar.value = "0";
});

audioPlayer.addEventListener("ended", () => {
  nextTrack();
});

audioPlayer.addEventListener("error", () => {
  console.log("Audio loading failed:", audioPlayer.error);
});

// Control button listeners
playPauseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  togglePlayPause();
});

nextBtn.addEventListener("click", (e) => {
  e.preventDefault();
  nextTrack();
});

prevBtn.addEventListener("click", (e) => {
  e.preventDefault();
  prevTrack();
});

// Progress bar
progressBar.addEventListener("mousedown", () => {
  isUpdatingProgress = true;
});

progressBar.addEventListener("input", () => {
  const seekTime = (parseFloat(progressBar.value) / 100) * audioPlayer.duration;
  audioPlayer.currentTime = seekTime;
  timeCurrent.textContent = formatTime(seekTime);
});

progressBar.addEventListener("mouseup", () => {
  isUpdatingProgress = false;
});

progressBar.addEventListener("touchstart", () => {
  isUpdatingProgress = true;
});

progressBar.addEventListener("touchend", () => {
  isUpdatingProgress = false;
});

progressBar.addEventListener("touchcancel", () => {
  isUpdatingProgress = false;
});

// Audio toggle button (top-left corner)
audioToggle.addEventListener("click", (e) => {
  e.preventDefault();
  togglePlayPause();
});

// Now playing click opens music panel
nowPlaying.addEventListener("click", (e) => {
  e.preventDefault();
  showOverlay("music");
});

// Initialize
initPlayer();
