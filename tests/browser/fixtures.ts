import { expect, type Page } from "@playwright/test";

export async function expectAudioPlaying(page: Page) {
  const audio = page.locator("audio");
  const before = await audio.evaluate(element => (element as HTMLAudioElement).currentTime);
  await expect
    .poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime))
    .toBeGreaterThan(before);
}

export async function expectRenderedGarden(page: Page) {
  await expect
    .poll(() =>
      page.locator("#webgl").evaluate(
        element =>
          new Promise<number>(resolve => {
            requestAnimationFrame(() => {
              const gl = (element as HTMLCanvasElement).getContext("webgl2")!;
              const pixel = new Uint8Array(4);
              gl.readPixels(
                gl.drawingBufferWidth / 2,
                gl.drawingBufferHeight * 0.75,
                1,
                1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pixel
              );
              resolve(pixel[0] + pixel[1] + pixel[2]);
            });
          })
      )
    )
    .toBeGreaterThan(0);
}

export async function useGarden(page: Page, enabled = true) {
  await page.route(/\/src\/device\.ts(?:\?.*)?$/, route =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export async function shouldUseGarden() { return ${enabled}; }`,
    })
  );
  // Interaction checks use fewer instances; full-density screenshots are reviewed separately.
  await page.route(/\/src\/scene\/config\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    const source = await response.text();
    const body = source + "\nconfig.instances = 900; config.particleCount = 50;";
    await route.fulfill({ response, body });
  });
  await page.route("**/api/views", route => route.fulfill({ json: { count: 3387 } }));
  await page.addInitScript(() => localStorage.setItem("audioEnabled", "false"));
}
