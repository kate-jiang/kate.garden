import { test, expect } from "@playwright/test";
import { useGarden, expectRenderedGarden, expectAudioPlaying } from "./fixtures";

test("lite supports keyboard dialogs and real audio playback", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/lite.html");
  await expect(page.getByRole("heading", { name: "kate", exact: true })).toBeVisible();
  const about = page.getByRole("button", { name: "about", exact: true });
  await about.focus();
  await about.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: "look at my resume" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(about).toBeFocused();
  await page.getByRole("button", { name: "music", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expectAudioPlaying(page);
  await page.getByRole("button", { name: "Next track" }).click();
  await expect(page.locator(".track-title")).toHaveText("Arabesque No. 1");
  await expect
    .poll(() => page.locator("audio").evaluate(audio => (audio as HTMLAudioElement).duration))
    .toBeGreaterThan(0);
  await page.getByRole("slider").fill("50");
  await expect
    .poll(() => page.locator("audio").evaluate(audio => (audio as HTMLAudioElement).currentTime))
    .toBeGreaterThan(100);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect
    .poll(() => page.locator("audio").evaluate(audio => (audio as HTMLAudioElement).paused))
    .toBe(true);
  expect(errors).toEqual([]);
});

test("garden renders, routes pointer input, and persists theme choice", async ({ page }) => {
  test.setTimeout(60000);
  await useGarden(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
  await expect(page.locator("#view-count")).toHaveText("3,387");
  await expectRenderedGarden(page);
  // The fixed desktop viewport places the 3D about hitbox near this point.
  await page.mouse.move(505, 430);
  await expect(page.locator("#webgl")).toHaveCSS("cursor", "pointer");
  await page.mouse.down();
  await page.mouse.move(530, 430, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.mouse.click(505, 430);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#resume-link")).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#webgl")).toBeFocused();
  await page.mouse.click(505, 430);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator("#webgl")).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Toggle night mode" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("body")).toHaveClass("night-mode");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("nightMode"))).toBe("true");
  await page.reload();
  await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
  await expect(page.locator("body")).toHaveClass("night-mode");
  expect(errors).toEqual([]);
});

test("rejected devices reach lite without requesting garden code", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await useGarden(page, false);
  await page.goto("/");
  await expect(page).toHaveURL(/\/lite.html$/);
  await expect(page.getByRole("button", { name: "music", exact: true })).toBeVisible();
  expect(requests.filter(url => /three|\/scene\//.test(url))).toEqual([]);
});

for (const asset of ["helvetiker.json", "textures/blade_diffuse.jpg"]) {
  test(`missing ${asset} falls back to usable lite`, async ({ page }) => {
    await useGarden(page);
    await page.route(`**/${asset}`, route => route.fulfill({ status: 404, body: "Not found" }));
    await page.goto("/");
    await expect(page).toHaveURL(/\/lite.html$/);
    await page.getByRole("button", { name: "about", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}

test("mobile dialog fits and playlist scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/lite.html");
  await page.getByRole("button", { name: "music", exact: true }).click();
  const dialog = await page.getByRole("dialog").boundingBox();
  expect(dialog!.width).toBeLessThanOrEqual(390);
  expect(dialog!.y).toBeGreaterThanOrEqual(0);
  expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(700);
  const list = page.locator(".playlist-items");
  await list.hover();
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Children's Corner", exact: false })
  ).toBeInViewport();
  await page.getByRole("button", { name: "Children's Corner", exact: false }).click();
  await expect(page.locator(".track-title")).toContainText("Children's Corner");
});

test("garden disposal cancels frames and allows a fresh instance", async ({ page }) => {
  await useGarden(page);
  await page.goto("/lite.html");
  const result = await page.evaluate(async () => {
    const pending = new Set<number>();
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      const id = request(time => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = id => {
      pending.delete(id);
      cancel(id);
    };
    const modulePath = "/src/scene/garden.ts";
    const { createGarden } = await import(modulePath);
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const options = {
      canvas,
      getNightMode: () => false,
      signal: new AbortController().signal,
      onAction() {},
      onGesture() {},
      onError(error: unknown) {
        throw error;
      },
    };
    const first = await createGarden(options);
    await new Promise(request);
    const active = pending.size;
    first.dispose();
    await new Promise(request);
    const stopped = pending.size;
    const second = await createGarden(options);
    await new Promise(request);
    second.dispose();
    await new Promise(request);
    canvas.remove();
    return { active, stopped, final: pending.size };
  });
  expect(result.active).toBeGreaterThan(0);
  expect(result.stopped).toBe(0);
  expect(result.final).toBe(0);
});
