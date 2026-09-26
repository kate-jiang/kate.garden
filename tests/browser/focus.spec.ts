import { test, expect, type Locator } from "@playwright/test";
import { useGarden } from "./fixtures";

async function expectNeutralFocus(control: Locator) {
  await control.focus();
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-color", "rgba(255, 255, 255, 0.7)");
}

for (const path of ["/", "/lite.html"]) {
  test(`${path} uses the neutral focus outline for page and dialog controls`, async ({ page }) => {
    if (path === "/") await useGarden(page);
    await page.goto(path);
    if (path === "/") await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
    await page.keyboard.press("Tab");
    await expectNeutralFocus(page.getByRole("button", { name: "Toggle music", exact: true }));
    const navigation = path === "/" ? page.locator("#webgl") : page.getByRole("navigation");
    await navigation.getByText("music", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNeutralFocus(page.getByRole("button", { name: "Close", exact: true }));
    await expectNeutralFocus(page.getByRole("slider"));
  });
}
