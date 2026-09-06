import type { MusicPlayer, PlayerState } from "./player";
import { requireElement } from "./dom";

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function bindPlayerView(options: {
  root: HTMLElement;
  controls: HTMLElement;
  player: MusicPlayer;
  onNowPlayingClick(): void;
}) {
  const { root, controls, player, onNowPlayingClick } = options;
  const events = new AbortController();
  const element = <T extends HTMLElement = HTMLElement>(selector: string) =>
    requireElement<T>(root, selector);
  const progress = element<HTMLInputElement>(".progress-bar");
  const currentTime = element(".time-current");
  const duration = element(".time-duration");
  const title = element(".track-title");
  const artist = element(".track-artist");
  const playButton = element(".play-pause-btn");
  const playIcon = element(".play-icon");
  const pauseIcon = element(".pause-icon");
  const error = element(".player-error");
  const audioToggle = requireElement<HTMLButtonElement>(controls, "#audio-toggle");
  const audioOn = requireElement<HTMLElement>(controls, "#audio-icon-on");
  const audioOff = requireElement<HTMLElement>(controls, "#audio-icon-off");
  const nowPlaying = requireElement<HTMLButtonElement>(controls, "#now-playing");
  const nowTitle = requireElement<HTMLElement>(nowPlaying, ".now-playing-title");
  const nowArtist = requireElement<HTMLElement>(nowPlaying, ".now-playing-artist");
  const list = element(".playlist-items");
  let seeking = false;
  let previousIndex = -1;
  const rows = player.playlist.map((track, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.tabIndex = 0;
    row.className = "playlist-item";
    const info = document.createElement("span");
    info.className = "playlist-item-info";
    for (const [className, value] of [
      ["title", track.title],
      ["artist", track.artist],
    ]) {
      const span = document.createElement("span");
      span.className = `playlist-item-${className}`;
      span.textContent = value;
      info.append(span);
    }
    const duration = document.createElement("span");
    duration.className = "playlist-item-duration";
    duration.textContent = track.duration;
    row.append(info, duration);
    row.addEventListener("click", () => player.selectTrack(index), { signal: events.signal });
    return row;
  });
  list.replaceChildren(...rows);
  function update(state: PlayerState) {
    const track = player.playlist[state.trackIndex];
    if (state.trackIndex !== previousIndex) {
      title.textContent = track.title;
      artist.textContent = track.artist;
      nowTitle.textContent = track.title;
      nowArtist.textContent =
        track.title.length < 12
          ? "by " + (track.artist.length > 10 ? track.artist.split(",")[0] : track.artist)
          : "";
      rows.forEach((row, index) => {
        row.classList.toggle("active", index === state.trackIndex);
        row.setAttribute("aria-current", String(index === state.trackIndex));
      });
      if (previousIndex !== -1 && root.getClientRects().length) scrollToActive();
      previousIndex = state.trackIndex;
    }
    duration.textContent = Number.isFinite(state.duration)
      ? formatTime(state.duration)
      : track.duration;
    currentTime.textContent = formatTime(state.currentTime);
    if (!seeking) progress.value = String((state.currentTime / state.duration) * 100 || 0);
    playIcon.style.display = state.playing ? "none" : "block";
    pauseIcon.style.display = state.playing ? "block" : "none";
    audioOn.style.display = state.playing ? "block" : "none";
    audioOff.style.display = state.playing ? "none" : "block";
    playButton.setAttribute("aria-label", state.playing ? "Pause" : "Play");
    audioToggle.setAttribute("aria-pressed", String(state.playing));
    nowPlaying.classList.toggle("visible", state.playing);
    nowPlaying.disabled = !state.playing;
    error.textContent = state.error;
    error.hidden = !state.error;
  }
  function scrollToActive() {
    rows[player.getState().trackIndex].scrollIntoView({ behavior: "smooth", block: "start" });
  }
  playButton.addEventListener("click", player.toggle, { signal: events.signal });
  audioToggle.addEventListener("click", player.toggle, { signal: events.signal });
  element(".next-btn").addEventListener("click", player.next, { signal: events.signal });
  element(".prev-btn").addEventListener("click", player.previous, { signal: events.signal });
  nowPlaying.addEventListener("click", onNowPlayingClick, { signal: events.signal });
  progress.addEventListener(
    "pointerdown",
    event => {
      seeking = true;
      progress.setPointerCapture(event.pointerId);
    },
    { signal: events.signal }
  );
  for (const type of ["pointerup", "pointercancel", "lostpointercapture", "blur"]) {
    progress.addEventListener(
      type,
      () => {
        seeking = false;
      },
      { signal: events.signal }
    );
  }
  progress.addEventListener("input", () => player.seek(Number(progress.value) / 100), {
    signal: events.signal,
  });
  const unsubscribe = player.subscribe(update);
  return {
    scrollToActive,
    dispose() {
      unsubscribe();
      events.abort();
    },
  };
}
