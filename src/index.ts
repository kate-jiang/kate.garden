import { shouldUseGarden } from "./device";
import { createPreference } from "./services/preferences";
import { fetchViewCount } from "./services/views";
import { createSiteUI } from "./ui/site";
import { requireElement } from "./ui/dom";
import type { Garden } from "./scene/garden";

const lifetime = new AbortController();
let garden: Garden | undefined;
const ui = createSiteUI({
  autoResume: true,
  modal: false,
  onPanelChange: open => garden?.setPanelOpen(open),
});
const night = createPreference(
  "nightMode",
  window.matchMedia("(prefers-color-scheme: dark)").matches
);
const toggle = requireElement<HTMLButtonElement>(document, "#night-mode-toggle");
const sunIcon = requireElement<HTMLElement>(toggle, "#sun-icon");
const moonIcon = requireElement<HTMLElement>(toggle, "#moon-icon");
function renderTheme() {
  document.body.classList.toggle("night-mode", night.get());
  toggle.setAttribute("aria-pressed", String(night.get()));
  sunIcon.style.display = night.get() ? "none" : "block";
  moonIcon.style.display = night.get() ? "block" : "none";
}
renderTheme();
toggle.addEventListener(
  "click",
  () => {
    if (garden?.transitioning) return;
    night.set(!night.get());
    garden?.setNightMode(night.get());
    renderTheme();
    ui.resumeAudio();
  },
  { signal: lifetime.signal }
);

function dispose() {
  lifetime.abort();
  garden?.dispose();
  ui.dispose();
}
function fallback(error?: unknown) {
  if (error) console.warn("Garden unavailable; opening lite page", error);
  dispose();
  window.location.replace("/lite.html");
}
async function start() {
  try {
    if (!(await shouldUseGarden())) {
      fallback();
      return;
    }
    if (lifetime.signal.aborted) return;
    const { createGarden } = await import("./scene/garden");
    const canvas = requireElement<HTMLCanvasElement>(document, "#webgl");
    garden = await createGarden({
      canvas,
      getNightMode: night.get,
      signal: lifetime.signal,
      onAction: action => ui.handleAction(action, canvas),
      onGesture: ui.resumeAudio,
      onError: fallback,
    });
    garden.setPanelOpen(ui.panelOpen);
    requireElement(document, "#loading-overlay").classList.add("fade-out");
    const count = await fetchViewCount(lifetime.signal);
    if (count !== null && !lifetime.signal.aborted) {
      requireElement(document, "#view-count").textContent = count.toLocaleString();
      requireElement(document, "#view-counter").classList.add("loaded");
    }
  } catch (error) {
    if (!lifetime.signal.aborted) fallback(error);
  }
}
window.addEventListener(
  "pagehide",
  event => {
    if (!event.persisted) dispose();
  },
  { signal: lifetime.signal }
);
import.meta.hot?.dispose(dispose);
void start();
