import { test, expect } from "@playwright/test";
import { useGarden } from "./fixtures";

for (const path of ["/", "/lite.html"]) {
  for (const panel of ["about", "music"]) {
    test(`${path} ${panel} dialog moves focus with Tab and closes on Escape`, async ({ page }) => {
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
      const close = page.getByRole("button", { name: "Close", exact: true });
      await expect(close).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        panel === "about" ? dialog.getByRole("link").first() : dialog.getByRole("slider")
      ).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });
  }
}
