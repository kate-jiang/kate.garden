import type { Panel, SiteAction } from "@/content/site";
import { playlist } from "@/content/playlist";
import { createPreference } from "@/services/preferences";
import { createMusicPlayer } from "./player";
import { bindPlayerView } from "./player-view";
import { createDialog } from "./dialog";
import { requireElement } from "./dom";

export function createSiteUI(
  options: {
    autoResume?: boolean;
    modal?: boolean;
    onPanelChange?(open: boolean): void;
  } = {}
) {
  const events = new AbortController();
  const root = requireElement<HTMLElement>(document, "#music-content");
  const audio = requireElement<HTMLAudioElement>(root, "audio");
  const preference = options.autoResume ? createPreference("audioEnabled", true) : undefined;
  const player = createMusicPlayer({
    audio,
    playlist,
    preference,
    loadTrackOnInit: !!options.autoResume,
  });
  const audioControls = requireElement<HTMLElement>(document, "#audio-container");
  const themeControls = document.getElementById("night-mode-container");
  const dialog = createDialog(requireElement<HTMLDialogElement>(document, "#modal"), {
    modal: options.modal,
    persistentControls: themeControls ? [audioControls, themeControls] : [audioControls],
    fallbackFocus: requireElement<HTMLButtonElement>(audioControls, "#audio-toggle"),
    onChange(panel) {
      options.onPanelChange?.(panel !== null);
      if (panel === "music") view.scrollToActive();
    },
  });
  const view = bindPlayerView({
    root,
    controls: audioControls,
    player,
    onNowPlayingClick: () => dialog.open("music"),
  });
  for (const trigger of document.querySelectorAll<HTMLElement>("[data-panel]")) {
    trigger.addEventListener("click", () => dialog.open(trigger.dataset.panel as Panel, trigger), {
      signal: events.signal,
    });
  }
  let resumed = false;
  return {
    get panelOpen() {
      return dialog.current !== null;
    },
    handleAction(action: SiteAction, trigger?: HTMLElement) {
      if (action.type === "link") window.open(action.url, "_blank", "noopener,noreferrer");
      else {
        dialog.open(action.panel, trigger);
      }
    },
    resumeAudio() {
      if (!resumed && preference?.get()) {
        resumed = true;
        void player.play();
      }
    },
    dispose() {
      events.abort();
      view.dispose();
      dialog.dispose();
      player.dispose();
    },
  };
}
