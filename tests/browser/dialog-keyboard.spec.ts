import { test, expect } from "@playwright/test";
import { useGarden } from "./fixtures";

for (const path of ["/", "/lite.html"]) {
  for (const panel of ["about", "music"]) {
    test(`${path} ${panel} dialog traverses its controls with Tab and Shift+Tab`, async ({
      page,
    }) => {
      if (path === "/") await useGarden(page);
      await page.goto(path);
      if (path === "/") {
        await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
        await page.mouse.click(panel === "about" ? 505 : 605, 430);
      } else {
        await page.getByRole("button", { name: panel, exact: true }).click();
      }
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const controls = [page.getByRole("button", { name: "Close", exact: true })];
      if (panel === "about") {
        controls.push(page.getByRole("link", { name: "harmony cloud" }));
        if (path === "/lite.html")
          controls.push(page.getByRole("link", { name: "look at my resume" }));
      } else {
        controls.push(
          page.getByRole("slider", { name: "Playback position" }),
          page.getByRole("button", { name: "Previous track" }),
          page.getByRole("button", { name: "Play", exact: true }),
          page.getByRole("button", { name: "Next track" }),
          ...(await page.locator(".playlist-item").all())
        );
      }
      await expect(controls[0]).toBeFocused();
      for (const control of controls.slice(1)) {
        await page.keyboard.press("Tab");
        await expect(control).toBeFocused();
      }
      for (const control of controls.slice(0, -1).reverse()) {
        await page.keyboard.press("Shift+Tab");
        await expect(control).toBeFocused();
      }
      if (path === "/") {
        await page.keyboard.press("Shift+Tab");
        // WebKit includes the non-modal dialog itself in the native tab order.
        if (await dialog.evaluate(element => element === document.activeElement))
          await page.keyboard.press("Shift+Tab");
        await expect(page.getByRole("button", { name: "Toggle music", exact: true })).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(page.getByRole("button", { name: "Toggle night mode" })).toBeFocused();
        await expect(dialog).toBeVisible();
      }
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });
  }
}
