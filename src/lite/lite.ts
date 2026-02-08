// =============================================================================
// LITE PAGE - Lightweight fallback for low-tier devices
// =============================================================================

import { createMusicPlayer } from "@/player";
import { playlist } from "@/config";

const modal = document.getElementById("modal") as HTMLDialogElement;
const modalClose = document.getElementById("modal-close") as HTMLElement;
const aboutContent = document.getElementById("about-content") as HTMLElement;
const musicContent = document.getElementById("music-content") as HTMLElement;

function showModal(contentType: "about" | "music"): void {
  aboutContent.classList.toggle("active", contentType === "about");
  musicContent.classList.toggle("active", contentType === "music");
  modal.showModal();

  if (contentType === "music") {
    setTimeout(() => {
      document
        .querySelector(".playlist-items .playlist-item.active")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
}

modalClose.addEventListener("click", () => modal.close());

modal.addEventListener("click", e => {
  if (e.target === modal) modal.close();
});

document.querySelectorAll<HTMLAnchorElement>(".lite-links a[data-action]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const action = link.dataset.action;
    if (action === "showAbout") showModal("about");
    else if (action === "showMusic") showModal("music");
  });
});

createMusicPlayer({
  playlist,
  onNowPlayingClick: () => showModal("music"),
  loadTrackOnInit: false,
});
