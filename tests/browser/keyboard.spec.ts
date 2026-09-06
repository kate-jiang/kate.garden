import { test, expect } from "@playwright/test";
import { useGarden } from "./fixtures";

test("garden Tab visits the four meshes without activating them and leaves for page controls", async ({
  page,
}) => {
  await useGarden(page);
  await page.goto("/");
  await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
  const canvas = page.locator("#webgl");
  for (const label of ["about", "music", "photo", "code"]) {
    await page.keyboard.press("Tab");
    await expect(canvas.getByText(label, { exact: true })).toBeFocused();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Toggle night mode" })).toBeFocused();
  for (const label of ["code", "photo", "music", "about"]) {
    await page.keyboard.press("Shift+Tab");
    await expect(canvas.getByText(label, { exact: true })).toBeFocused();
  }
  expect(page.context().pages()).toHaveLength(1);
  expect(await page.locator("audio").evaluate(audio => (audio as HTMLAudioElement).paused)).toBe(
    true
  );
});

test("lite Tab reaches every navigation item and skips disabled audio controls", async ({
  page,
}) => {
  await page.goto("/lite.html");
  const controls = [page.getByRole("button", { name: "Toggle music", exact: true })];
  for (const label of ["about", "music", "photo", "code"])
    controls.push(page.getByRole("navigation").getByText(label, { exact: true }));
  for (const control of controls) {
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
  }
  for (const control of controls.slice(0, -1).reverse()) {
    await page.keyboard.press("Shift+Tab");
    await expect(control).toBeFocused();
  }
});

for (const [label, key, title] of [
  ["about", "Enter", "About kate"],
  ["music", "Space", "Music"],
]) {
  test(`garden ${label} keyboard activation restores focus after Escape`, async ({ page }) => {
    await useGarden(page);
    await page.goto("/");
    await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
    const control = page.locator("#webgl").getByText(label, { exact: true });
    await control.focus();
    await page.keyboard.press(key);
    await expect(page.getByRole("dialog", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await expect(control).toHaveJSProperty("inert", true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(control).toBeFocused();
    await expect(control).toHaveJSProperty("inert", false);
    await page.keyboard.press("Tab");
    await expect(
      page.locator("#webgl").getByText(label === "about" ? "music" : "photo")
    ).toBeFocused();
  });
}

test("garden external links activate only on Enter", async ({ page, context }) => {
  await useGarden(page);
  await context.route(/https:\/\/(instagram\.com|github\.com)\//, route =>
    route.fulfill({ contentType: "text/html", body: "<title>Destination</title>" })
  );
  await page.goto("/");
  await expect(page.locator("#loading-overlay")).toHaveClass("fade-out");
  for (const [label, url] of [
    ["photo", "https://instagram.com/katejiang__"],
    ["code", "https://github.com/kate-jiang"],
  ]) {
    const control = page.locator("#webgl").getByText(label, { exact: true });
    await control.focus();
    expect(context.pages()).toHaveLength(1);
    const opened = page.waitForEvent("popup");
    await page.keyboard.press("Enter");
    const popup = await opened;
    await expect(popup).toHaveURL(url);
    await popup.close();
  }
});

test("native canvas focus drives the real text hover scale and clears on disable and disposal", async ({
  page,
}) => {
  await page.goto("/lite.html");
  const scene = await page.evaluateHandle(async () => {
    const textPath = "/src/scene/text.ts";
    const interactionPath = "/src/scene/interaction.ts";
    const threePath = "/node_modules/three/build/three.module.js";
    const fontPath = "/node_modules/three/examples/jsm/loaders/FontLoader.js";
    const { createText }: typeof import("../../src/scene/text") = await import(textPath);
    const { createInteraction }: typeof import("../../src/scene/interaction") = await import(
      interactionPath
    );
    const { PerspectiveCamera, Vector3 }: typeof import("three") = await import(threePath);
    const { FontLoader }: typeof import("three/examples/jsm/loaders/FontLoader.js") = await import(
      fontPath
    );
    const text = createText(new FontLoader().parse(await (await fetch("/helvetiker.json")).json()));
    const canvas = document.createElement("canvas");
    canvas.id = "focus-test";
    canvas.tabIndex = -1;
    canvas.width = 1280;
    canvas.height = 800;
    document.body.prepend(canvas);
    const camera = new PerspectiveCamera(45, 1280 / 800, 0.1, 1000);
    camera.position.set(0, 5, 55);
    camera.lookAt(0, 5, 0);
    camera.updateMatrixWorld();
    text.group.updateMatrixWorld(true);
    const interaction = createInteraction({
      canvas,
      camera,
      targets: text.targets,
      onHover: text.setHovered,
      onAction() {
        throw new Error("Focus must not activate an item");
      },
      onGesture() {
        throw new Error("Focus must not resume audio");
      },
    });
    return {
      interaction,
      scales() {
        for (let frame = 0; frame < 100; frame++) text.update(1 / 60, 0, camera);
        text.group.updateMatrixWorld(true);
        return text.targets.map(target => Math.round(target.visual.scale.x * 100) / 100);
      },
      point() {
        const point = text.targets[1].hitbox.getWorldPosition(new Vector3()).project(camera);
        const rect = canvas.getBoundingClientRect();
        return {
          clientX: rect.left + ((point.x + 1) / 2) * rect.width,
          clientY: rect.top + ((1 - point.y) / 2) * rect.height,
        };
      },
      dispose() {
        interaction.dispose();
        text.dispose();
        canvas.remove();
      },
    };
  });
  const canvas = page.locator("#focus-test");
  try {
    await canvas.dispatchEvent("pointermove", {
      pointerType: "mouse",
      ...(await scene.evaluate(scene => scene.point())),
    });
    await expect(canvas).toHaveCSS("cursor", "pointer");
    expect(await scene.evaluate(scene => scene.scales())).toEqual([1, 1.15, 1, 1, 1]);
    await canvas.focus();
    for (let index = 1; index <= 4; index++) {
      await page.keyboard.press("Tab");
      const expected = [1, 1, 1, 1, 1];
      expected[index] = 1.15;
      expect(await scene.evaluate(scene => scene.scales())).toEqual(expected);
    }
    await canvas.dispatchEvent("pointerleave", { pointerType: "mouse" });
    expect(await scene.evaluate(scene => scene.scales())).toEqual([1, 1, 1, 1, 1.15]);
    await page.keyboard.press("Tab");
    expect(await scene.evaluate(scene => scene.scales())).toEqual([1, 1, 1, 1, 1]);
    await page.keyboard.press("Shift+Tab");
    expect(await scene.evaluate(scene => scene.scales())).toEqual([1, 1, 1, 1, 1.15]);
    await scene.evaluate(scene => scene.interaction.setEnabled(false));
    expect(await scene.evaluate(scene => scene.scales())).toEqual([1, 1, 1, 1, 1]);
    await canvas.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Toggle music", exact: true })).toBeFocused();
    await scene.evaluate(scene => scene.interaction.setEnabled(true));
    await canvas.focus();
    await page.keyboard.press("Tab");
    expect(await scene.evaluate(scene => scene.scales())).toEqual([1, 1.15, 1, 1, 1]);
    await scene.evaluate(scene => scene.interaction.dispose());
    await expect(canvas.locator("button, a")).toHaveCount(0);
    await canvas.dispatchEvent("pointermove", {
      pointerType: "mouse",
      ...(await scene.evaluate(scene => scene.point())),
    });
    expect(await scene.evaluate(scene => scene.scales())).toEqual([1, 1, 1, 1, 1]);
  } finally {
    await scene.evaluate(scene => scene.dispose());
  }
});
