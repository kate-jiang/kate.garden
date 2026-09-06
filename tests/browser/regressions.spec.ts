import { test, expect } from "@playwright/test";
import { useGarden, expectRenderedGarden, expectAudioPlaying } from "./fixtures";

test("garden panels leave theme and audio controls usable", async ({ page }) => {
  test.setTimeout(60000);
  await useGarden(page);
  await page.goto("/");
  await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
  await page.mouse.click(605, 430);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Toggle night mode" }).click();
  await expect(page.locator("body")).toHaveClass("night-mode");
  await expect(page.getByRole("dialog")).toBeVisible();
  const toggle = page.getByRole("button", { name: "Toggle music", exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog")).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.mouse.click(200, 200);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("Escape restores focus to the audio toggle after pausing disables the opener", async ({
  page,
}) => {
  await page.goto("/lite.html");
  const toggle = page.getByRole("button", { name: "Toggle music", exact: true });
  await toggle.click();
  await expectAudioPlaying(page);
  await page.getByRole("button", { name: "Open music player" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator("#now-playing")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(toggle).toBeFocused();
});

test("Next keeps the active track above the playlist fade on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/lite.html");
  await page.getByRole("button", { name: "music", exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Next track" }).click();
  }
  const active = page.locator(".playlist-item.active");
  await expect(active).toContainText("Daydreaming");
  await expect
    .poll(() =>
      active.evaluate(row => {
        const list = row.parentElement!;
        return Math.abs(row.getBoundingClientRect().top - list.getBoundingClientRect().top);
      })
    )
    .toBeLessThan(1);
});

test("normal mouse capture release preserves hover", async ({ page }) => {
  await useGarden(page);
  await page.goto("/");
  const canvas = page.locator("#webgl");
  await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
  await canvas.evaluate(element => {
    element.addEventListener(
      "lostpointercapture",
      () => {
        element.setAttribute("data-capture-released", "true");
      },
      { once: true }
    );
  });
  await page.mouse.move(635, 350);
  await expect(canvas).toHaveCSS("cursor", "pointer");
  await page.mouse.click(635, 350);
  await expect(canvas).toHaveAttribute("data-capture-released", "true");
  await expect(canvas).toHaveCSS("cursor", "pointer");
  await canvas.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await expect(canvas).toHaveCSS("cursor", "default");
});

test("a theme chosen during loading is settled when the garden opens", async ({ page }) => {
  await useGarden(page);
  let release!: () => void;
  let requested!: () => void;
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  const request = new Promise<void>(resolve => {
    requested = resolve;
  });
  await page.route("**/helvetiker.json", async route => {
    requested();
    await blocked;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await request;
    const toggle = page.getByRole("button", { name: "Toggle night mode" });
    await toggle.click();
    await expect(page.locator("body")).toHaveClass("night-mode");
    release();
    await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
    await toggle.click();
    await expect(page.locator("body")).not.toHaveClass("night-mode");
  } finally {
    release();
  }
});

test("WebGL context restoration keeps the garden and audio running", async ({ page }) => {
  await useGarden(page);
  await page.goto("/");
  await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
  const toggle = page.getByRole("button", { name: "Toggle music", exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.locator("#webgl").evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const extension = canvas.getContext("webgl2")!.getExtension("WEBGL_lose_context");
    if (!extension) throw new Error("WEBGL_lose_context is required for this check");
    canvas.addEventListener("webglcontextlost", () => (canvas.dataset.contextState = "lost"), {
      once: true,
    });
    canvas.addEventListener(
      "webglcontextrestored",
      () => (canvas.dataset.contextState = "restored"),
      { once: true }
    );
    canvas.addEventListener("restore-context", () => extension.restoreContext(), { once: true });
    extension.loseContext();
  });
  await expect(page.locator("#webgl")).toHaveAttribute("data-context-state", "lost");
  await expect(page).toHaveURL(/\/$/);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.locator("#webgl").dispatchEvent("restore-context");
  await expect(page.locator("#webgl")).toHaveAttribute("data-context-state", "restored");
  await expectAudioPlaying(page);
  await expectRenderedGarden(page);
  await page.mouse.click(505, 430);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("Play recovers after the track request fails", async ({ page }) => {
  let attempts = 0;
  await page.route("**/music/promises.mp3", route => {
    attempts++;
    return attempts === 1 ? route.fulfill({ status: 404, body: "Unavailable" }) : route.continue();
  });
  await page.goto("/lite.html");
  await page.getByRole("button", { name: "music", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".player-error")).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.locator(".player-error")).not.toBeVisible();
  await expectAudioPlaying(page);
});
