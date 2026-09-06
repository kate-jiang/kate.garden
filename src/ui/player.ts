import type { Track } from "@/content/playlist";
import type { BooleanPreference } from "@/services/preferences";

export type MediaElement = Pick<
  HTMLAudioElement,
  | "src"
  | "currentTime"
  | "duration"
  | "paused"
  | "ended"
  | "play"
  | "pause"
  | "load"
  | "addEventListener"
  | "removeEventListener"
>;

export interface PlayerState {
  readonly trackIndex: number;
  readonly playing: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly error: string | null;
}

export function createMusicPlayer(options: {
  audio: MediaElement;
  playlist: readonly Track[];
  preference?: BooleanPreference;
  loadTrackOnInit?: boolean;
}) {
  const { audio, playlist, preference, loadTrackOnInit = true } = options;
  if (!playlist.length) throw new Error("The playlist must contain at least one track");
  const listeners = new Set<(state: PlayerState) => void>();
  let trackIndex = 0;
  let loaded = false;
  let wantsPlayback = false;
  let request = 0;
  let pendingRequest: number | null = null;
  let disposed = false;
  let error: string | null = null;
  function getState(): PlayerState {
    return {
      trackIndex,
      playing: !audio.paused && error === null,
      currentTime: audio.currentTime,
      duration: audio.duration,
      error,
    };
  }
  function notify() {
    if (!disposed) listeners.forEach(listener => listener(getState()));
  }
  function loadTrack() {
    audio.src = playlist[trackIndex].src;
    audio.currentTime = 0;
    loaded = true;
  }
  async function attemptPlayback() {
    if (disposed || !wantsPlayback) return;
    const currentRequest = ++request;
    pendingRequest = currentRequest;
    error = null;
    if (!loaded) loadTrack();
    notify();
    try {
      await audio.play();
      if (!wantsPlayback || disposed || error) audio.pause();
    } catch {
      if (!disposed && currentRequest === request && wantsPlayback) {
        error = "Couldn't play this track. Try again.";
        notify();
      }
    } finally {
      if (pendingRequest === currentRequest) {
        pendingRequest = null;
        notify();
      }
    }
  }
  function play() {
    if (disposed) return Promise.resolve();
    wantsPlayback = true;
    preference?.set(true);
    return attemptPlayback();
  }
  function pause() {
    if (disposed) return;
    wantsPlayback = false;
    request++;
    pendingRequest = null;
    audio.pause();
    preference?.set(false);
    notify();
  }
  function changeTrack(index: number) {
    request++;
    pendingRequest = null;
    audio.pause();
    trackIndex = index;
    loadTrack();
    void attemptPlayback();
  }
  function selectTrack(index: number) {
    if (disposed || !Number.isInteger(index) || index < 0 || index >= playlist.length) return;
    wantsPlayback = true;
    preference?.set(true);
    changeTrack(index);
  }
  function next() {
    selectTrack((trackIndex + 1) % playlist.length);
  }
  function previous() {
    selectTrack((trackIndex - 1 + playlist.length) % playlist.length);
  }
  function onError() {
    request++;
    pendingRequest = null;
    loaded = false;
    error = "Couldn't load this track. Try again.";
    notify();
  }
  function onEnded() {
    if (disposed || !wantsPlayback || error || !audio.ended) return;
    changeTrack((trackIndex + 1) % playlist.length);
  }
  const mediaEvents: [string, () => void][] = [
    ...["play", "pause", "timeupdate", "loadedmetadata"].map(
      type => [type, notify] as [string, () => void]
    ),
    ["ended", onEnded],
    ["error", onError],
  ];
  mediaEvents.forEach(([type, listener]) => audio.addEventListener(type, listener));
  if (loadTrackOnInit) loadTrack();
  return {
    playlist,
    getState,
    play,
    pause,
    next,
    previous,
    selectTrack,
    toggle() {
      if (pendingRequest !== null || getState().playing) pause();
      else void play();
    },
    seek(fraction: number) {
      if (
        !disposed &&
        Number.isFinite(fraction) &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
        notify();
      }
    },
    subscribe(listener: (state: PlayerState) => void) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      wantsPlayback = false;
      request++;
      pendingRequest = null;
      mediaEvents.forEach(([type, listener]) => audio.removeEventListener(type, listener));
      listeners.clear();
      audio.pause();
    },
  };
}

export type MusicPlayer = ReturnType<typeof createMusicPlayer>;
