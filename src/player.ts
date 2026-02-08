import type { Track } from "@/types";

export interface MusicPlayerOptions {
  playlist: Track[];
  onNowPlayingClick: () => void;
  storageKey?: string | null;
  loadTrackOnInit?: boolean;
}

export interface MusicPlayer {
  playAudio: () => void;
  pauseAudio: () => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  getPreference: () => string | null;
}

export function createMusicPlayer(options: MusicPlayerOptions): MusicPlayer {
  const {
    playlist,
    onNowPlayingClick,
    storageKey = null,
    loadTrackOnInit = true,
  } = options;

  // DOM elements
  function el<T extends HTMLElement>(selector: string, method: "id" | "qs" = "qs"): T {
    const found = method === "id"
      ? document.getElementById(selector)
      : document.querySelector(selector);
    if (!found) throw new Error(`Music player: element not found: ${selector}`);
    return found as T;
  }

  const audioPlayer = el<HTMLAudioElement>("audio-player", "id");
  const playPauseBtn = el(".play-pause-btn");
  const playIcon = el(".play-icon");
  const pauseIcon = el(".pause-icon");
  const prevBtn = el(".prev-btn");
  const nextBtn = el(".next-btn");
  const progressBar = el<HTMLInputElement>(".progress-bar");
  const timeCurrent = el(".time-current");
  const timeDuration = el(".time-duration");
  const trackTitle = el(".track-title");
  const trackArtist = el(".track-artist");
  const playlistItems = el(".playlist-items");
  const audioToggle = el("audio-toggle", "id");
  const audioIconOn = el("audio-icon-on", "id");
  const audioIconOff = el("audio-icon-off", "id");
  const nowPlaying = el("now-playing", "id");

  // State
  let isAudioPlaying = false;
  let currentTrackIndex = 0;
  let isUpdatingProgress = false;
  let isPlayerLoaded = false;
  let preference: string | null = storageKey ? (localStorage.getItem(storageKey) ?? "true") : null;

  // Internal functions
  function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

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

  function updatePlaylistUI(): void {
    playlistItems.innerHTML = "";
    playlist.forEach((track, index) => {
      const item = document.createElement("div");
      item.className = "playlist-item" + (index === currentTrackIndex ? " active" : "");
      const infoDiv = document.createElement("div");
      infoDiv.className = "playlist-item-info";
      const titleDiv = document.createElement("div");
      titleDiv.className = "playlist-item-title";
      titleDiv.textContent = track.title;
      const artistDiv = document.createElement("div");
      artistDiv.className = "playlist-item-artist";
      artistDiv.textContent = track.artist;
      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(artistDiv);
      const durationDiv = document.createElement("div");
      durationDiv.className = "playlist-item-duration";
      durationDiv.textContent = track.duration;
      item.appendChild(infoDiv);
      item.appendChild(durationDiv);
      item.addEventListener("click", e => {
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

  function lazyLoadPlayer(): void {
    if (isPlayerLoaded) return;
    isPlayerLoaded = true;
    loadTrack(currentTrackIndex);
  }

  function playAudio(): void {
    lazyLoadPlayer();
    audioPlayer.play().catch(error => {
      console.log("Audio playback failed:", error);
      setTimeout(() => audioPlayer.play(), 300);
    });
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
      preference = "true";
    }
  }

  function pauseAudio(): void {
    audioPlayer.pause();
    if (storageKey) {
      localStorage.setItem(storageKey, "false");
      preference = "false";
    }
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
  playPauseBtn.addEventListener("click", e => {
    e.preventDefault();
    togglePlayPause();
  });
  nextBtn.addEventListener("click", e => {
    e.preventDefault();
    nextTrack();
  });
  prevBtn.addEventListener("click", e => {
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

  // Top-left toggle button
  audioToggle.addEventListener("click", e => {
    e.preventDefault();
    togglePlayPause();
  });

  // Now playing click
  nowPlaying.addEventListener("click", e => {
    e.preventDefault();
    onNowPlayingClick();
  });
  nowPlaying.style.cursor = "pointer";

  // Initialize
  if (loadTrackOnInit) {
    loadTrack(currentTrackIndex);
  }
  updateTrackInfo(currentTrackIndex);
  updatePlaylistUI();

  return {
    playAudio,
    pauseAudio,
    togglePlayPause,
    nextTrack,
    prevTrack,
    getPreference: () => preference,
  };
}
