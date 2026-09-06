import * as THREE from "three";
import type { SiteAction } from "@/content/site";

export interface InteractionTarget {
  hitbox: THREE.Mesh;
  visual: THREE.Mesh;
  action: SiteAction | { type: "animate" };
}

export function createPointerGesture(threshold = 5) {
  let start: { id: number; x: number; y: number } | undefined;
  let moved = false;
  return {
    get active() {
      return start !== undefined;
    },
    begin(id: number, x: number, y: number) {
      if (start) return false;
      start = { id, x, y };
      moved = false;
      return true;
    },
    move(id: number, x: number, y: number) {
      if (start?.id !== id) return false;
      moved ||= (x - start.x) ** 2 + (y - start.y) ** 2 > threshold ** 2;
      return moved;
    },
    end(id: number, x: number, y: number) {
      if (start?.id !== id) return false;
      this.move(id, x, y);
      const clicked = !moved;
      this.cancel();
      return clicked;
    },
    cancel() {
      start = undefined;
      moved = false;
    },
  };
}

export function createInteraction(options: {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  targets: readonly InteractionTarget[];
  onAction(action: InteractionTarget["action"], trigger: HTMLElement): void;
  onHover(targets: Set<InteractionTarget>): void;
  onGesture(): void;
}) {
  const { canvas, camera, targets, onAction, onHover, onGesture } = options;
  const events = new AbortController();
  const gesture = createPointerGesture();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const byHitbox = new Map(targets.map(target => [target.hitbox, target]));
  let pendingHover = 0;
  let enabled = true;
  let pointerTargets: InteractionTarget[] = [];
  const focusTargets = new Map<HTMLElement, InteractionTarget>();
  function updateHover() {
    const focused = focusTargets.get(document.activeElement as HTMLElement);
    onHover(new Set(enabled ? (focused ? [focused] : pointerTargets) : []));
  }
  // Canvas fallback controls provide native tab stops without visible DOM overlays.
  for (const target of targets) {
    if (target.action.type === "animate") continue;
    const control = document.createElement(target.action.type === "link" ? "a" : "button");
    control.textContent = target.visual.name;
    control.tabIndex = 0;
    if (control instanceof HTMLAnchorElement && target.action.type === "link") {
      control.href = target.action.url;
      control.target = "_blank";
      control.rel = "noopener noreferrer";
    } else if (control instanceof HTMLButtonElement) {
      control.type = "button";
      control.setAttribute("aria-haspopup", "dialog");
    }
    control.addEventListener("focus", updateHover, { signal: events.signal });
    control.addEventListener("blur", updateHover, { signal: events.signal });
    control.addEventListener(
      "click",
      event => {
        event.preventDefault();
        if (!enabled) return;
        onGesture();
        onAction(target.action, control);
      },
      { signal: events.signal }
    );
    focusTargets.set(control, target);
    canvas.append(control);
  }
  function hits() {
    raycaster.setFromCamera(pointer, camera);
    return raycaster
      .intersectObjects([...byHitbox.keys()], false)
      .map(hit => byHitbox.get(hit.object as THREE.Mesh)!);
  }
  function updatePointer(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }
  function reset() {
    cancelAnimationFrame(pendingHover);
    pendingHover = 0;
    pointerTargets = [];
    updateHover();
    canvas.style.cursor = "default";
  }
  canvas.addEventListener(
    "pointerdown",
    event => {
      if (!enabled || !gesture.begin(event.pointerId, event.clientX, event.clientY)) return;
      cancelAnimationFrame(pendingHover);
      pendingHover = 0;
      canvas.setPointerCapture(event.pointerId);
      onGesture();
      updatePointer(event);
      pointerTargets = hits();
      updateHover();
      canvas.style.cursor = pointerTargets.length ? "pointer" : "default";
    },
    { signal: events.signal }
  );
  canvas.addEventListener(
    "pointermove",
    event => {
      if (!enabled) return;
      updatePointer(event);
      if (gesture.active) {
        if (gesture.move(event.pointerId, event.clientX, event.clientY)) reset();
      } else if (event.pointerType !== "touch" && !pendingHover) {
        pendingHover = requestAnimationFrame(() => {
          pendingHover = 0;
          if (!enabled || gesture.active) return;
          pointerTargets = hits();
          updateHover();
          canvas.style.cursor = pointerTargets.length ? "pointer" : "default";
        });
      }
    },
    { signal: events.signal }
  );
  canvas.addEventListener(
    "pointerup",
    event => {
      if (enabled && gesture.end(event.pointerId, event.clientX, event.clientY)) {
        updatePointer(event);
        const target = hits()[0];
        if (target) onAction(target.action, canvas);
      }
      if (event.pointerType === "touch") reset();
    },
    { signal: events.signal }
  );
  canvas.addEventListener(
    "pointercancel",
    () => {
      gesture.cancel();
      reset();
    },
    { signal: events.signal }
  );
  canvas.addEventListener(
    "lostpointercapture",
    () => {
      if (gesture.active) {
        gesture.cancel();
        reset();
      }
    },
    { signal: events.signal }
  );
  canvas.addEventListener(
    "pointerleave",
    () => {
      if (!gesture.active) reset();
    },
    { signal: events.signal }
  );
  return {
    setEnabled(value: boolean) {
      enabled = value;
      for (const control of focusTargets.keys()) control.inert = !enabled;
      gesture.cancel();
      reset();
    },
    dispose() {
      events.abort();
      for (const control of focusTargets.keys()) control.remove();
      focusTargets.clear();
      reset();
    },
  };
}
