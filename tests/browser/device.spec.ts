import { test, expect } from "@playwright/test";
import { useGarden, expectRenderedGarden } from "./fixtures";

for (const [browser, userAgent] of [
  [
    "iOS Safari",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ],
  [
    "iOS Chrome",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
  ],
]) {
  test.describe(browser, () => {
    test.use({
      userAgent,
      viewport: { width: 402, height: 874 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

    test("starts the garden without GPU detection or benchmark requests", async ({ page }) => {
      const requests: string[] = [];
      const errors: string[] = [];
      page.on("request", request => requests.push(request.url()));
      page.on("pageerror", error => errors.push(error.message));
      await useGarden(page);
      await page.route("https://unpkg.com/**", route => route.abort());
      await page.goto("/");
      await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
      await expect(page).toHaveURL(/\/$/);
      await expectRenderedGarden(page);
      expect(requests.filter(url => /detect-gpu|\/benchmarks\//.test(url))).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

test("unavailable WebGL falls back to usable lite", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await useGarden(page);
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(target, canvas, args) {
        return args[0] === "webgl2" ? null : Reflect.apply(target, canvas, args);
      },
    });
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/lite.html$/);
  await page.getByRole("button", { name: "about", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(errors).toEqual([]);
});
