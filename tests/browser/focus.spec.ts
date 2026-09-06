import { test, expect, type Locator } from "@playwright/test";
import { useGarden } from "./fixtures";

async function expectNeutralFocus(control: Locator, offset = "4px") {
  await control.focus();
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
  await expect(control).toHaveCSS("outline-width", "2px");
  await expect(control).toHaveCSS("outline-color", "rgba(255, 255, 255, 0.7)");
  await expect(control).toHaveCSS("outline-offset", offset);
}

for (const path of ["/", "/lite.html"]) {
  test(`${path} uses the close button's neutral focus color for navigation and player controls`, async ({
    page,
  }) => {
    if (path === "/") await useGarden(page);
    await page.goto(path);
    if (path === "/") await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
    await page.keyboard.press("Tab");
    await expectNeutralFocus(page.getByRole("button", { name: "Toggle music", exact: true }));
    const navigation = path === "/" ? page.locator("#webgl") : page.getByRole("navigation");
    await navigation.getByText("about", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    const close = page.getByRole("button", { name: "Close", exact: true });
    await expectNeutralFocus(close, "2px");
    await expectNeutralFocus(page.locator("#about-content a").first());
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await navigation.getByText("music", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNeutralFocus(page.getByRole("slider"));
    await expectNeutralFocus(page.getByRole("button", { name: "Play", exact: true }));
    await expectNeutralFocus(page.getByRole("button", { name: "Next track" }));
    await expectNeutralFocus(page.locator(".playlist-item").first());
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    if (path === "/") {
      const theme = page.getByRole("button", { name: "Toggle night mode" });
      await expectNeutralFocus(theme);
      await page.keyboard.press("Enter");
      await expect(page.locator("body")).toHaveClass("night-mode");
      await expectNeutralFocus(theme);
      await expectNeutralFocus(page.getByRole("button", { name: "Toggle music", exact: true }));
    } else {
      for (const label of ["about", "music", "photo", "code"])
        await expectNeutralFocus(navigation.getByText(label, { exact: true }));
    }
  });
}
