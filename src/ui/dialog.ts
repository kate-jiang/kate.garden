import type { Panel } from "@/content/site";
import { requireElement } from "./dom";

export function createDialog(
  element: HTMLDialogElement,
  options: {
    modal?: boolean;
    persistentControls: readonly HTMLElement[];
    fallbackFocus: HTMLElement;
    onChange(panel: Panel | null): void;
  }
) {
  const { modal = true, persistentControls, fallbackFocus, onChange } = options;
  const events = new AbortController();
  const about = requireElement<HTMLElement>(element, "#about-content");
  const music = requireElement<HTMLElement>(element, "#music-content");
  let returnFocus: HTMLElement | null = null;
  let current: Panel | null = null;
  let notification = 0;
  function close() {
    if (element.open) element.close();
  }
  requireElement(element, "#modal-close").addEventListener("click", close, {
    signal: events.signal,
  });
  element.addEventListener(
    "click",
    event => {
      if (event.target === element) close();
    },
    { signal: events.signal }
  );
  document.addEventListener(
    "pointerdown",
    event => {
      if (modal || !element.open || !(event.target instanceof Node)) return;
      const target = event.target;
      if (
        !element.contains(target) &&
        !persistentControls.some(control => control.contains(target))
      )
        close();
    },
    { capture: true, signal: events.signal }
  );
  document.addEventListener(
    "keydown",
    event => {
      if (!modal && element.open && event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        close();
      }
    },
    { signal: events.signal }
  );
  element.addEventListener(
    "close",
    () => {
      if (element.open) return;
      current = null;
      cancelAnimationFrame(notification);
      onChange(null);
      const target =
        returnFocus?.isConnected && !returnFocus.matches(":disabled") ? returnFocus : fallbackFocus;
      target.focus({ preventScroll: true });
      if (document.activeElement !== target) fallbackFocus.focus({ preventScroll: true });
    },
    { signal: events.signal }
  );
  return {
    get current() {
      return current;
    },
    open(panel: Panel, trigger?: HTMLElement) {
      if (!element.open)
        returnFocus =
          trigger ??
          (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      about.hidden = panel !== "about";
      music.hidden = panel !== "music";
      element.setAttribute("aria-label", panel === "about" ? "About kate" : "Music");
      current = panel;
      if (!element.open) {
        if (modal) element.showModal();
        else element.show();
      }
      cancelAnimationFrame(notification);
      notification = requestAnimationFrame(() => onChange(panel));
    },
    close,
    dispose() {
      cancelAnimationFrame(notification);
      events.abort();
      close();
    },
  };
}
