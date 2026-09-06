import { test, expect } from "@playwright/test";
import { useGarden, expectRenderedGarden } from "./fixtures";

test.use({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.2 Safari/605.1.15",
});

test.beforeEach(async ({ page }) => {
  await useGarden(page);
  // Exercise the real device gate; mock only the detector's external result.
  await page.unroute(/\/src\/device\.ts(?:\?.*)?$/);
});

for (const type of ["FALLBACK", "BENCHMARK", "WEBGL_UNSUPPORTED", "BLOCKLISTED"] as const) {
  test(`Safari handles GPU detection result ${type}`, async ({ page }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", request => requests.push(request.url()));
    page.on("pageerror", error => errors.push(error.message));
    await page.route(/\/detect-gpu\.js(?:\?.*)?$/, route =>
      route.fulfill({
        contentType: "text/javascript",
        body: `export async function getGPUTier() { return ${JSON.stringify({ tier: type === "FALLBACK" || type === "BENCHMARK" ? 1 : 0, type })}; }`,
      })
    );
    await page.goto("/");
    if (type === "FALLBACK") {
      await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
      await expect(page).toHaveURL(/\/$/);
      await expectRenderedGarden(page);
    } else {
      await expect(page).toHaveURL(/\/lite.html$/);
      await expect(page.getByRole("button", { name: "music", exact: true })).toBeVisible();
      expect(requests.filter(url => /three|\/scene\//.test(url))).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test("Safari still falls back if the garden cannot start after unknown detection", async ({
  page,
}) => {
  await page.route(/\/detect-gpu\.js(?:\?.*)?$/, route =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'export async function getGPUTier() { return { tier: 1, type: "FALLBACK" }; }',
    })
  );
  await page.route("**/helvetiker.json", route =>
    route.fulfill({ status: 404, body: "Not found" })
  );
  await page.goto("/");
  await expect(page).toHaveURL(/\/lite.html$/);
  await page.getByRole("button", { name: "about", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
