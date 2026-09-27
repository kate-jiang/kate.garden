import assert from "node:assert/strict";
import { test } from "node:test";
import { createPreference } from "../../src/services/preferences";
import { createPointerGesture } from "../../src/scene/interaction";
import { fetchViewCount } from "../../src/services/views";

test("preferences validate saved values and survive unavailable storage", context => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  context.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  });
  let saved: string | null = null;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: () => {
        throw new Error("blocked");
      },
    },
  });
  for (const [stored, fallback, expected] of [
    [null, true, true],
    ["false", true, false],
    ["true", false, true],
    ["invalid", true, true],
    ["invalid", false, false],
  ] as const) {
    saved = stored;
    assert.equal(createPreference("audioEnabled", fallback).get(), expected);
  }
  saved = "false";
  const preference = createPreference("audioEnabled", true);
  assert.equal(preference.get(), false);
  preference.set(true);
  assert.equal(preference.get(), true);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("blocked");
    },
  });
  assert.equal(createPreference("nightMode", false).get(), false);
});

test("pointer input distinguishes taps, drags, cancellation and another pointer", () => {
  const gesture = createPointerGesture();
  assert.equal(gesture.begin(1, 0, 0), true);
  assert.equal(gesture.begin(2, 0, 0), false);
  assert.equal(gesture.end(2, 0, 0), false);
  assert.equal(gesture.end(1, 3, 4), true);
  gesture.begin(1, 0, 0);
  gesture.move(1, 10, 0);
  assert.equal(gesture.end(1, 0, 0), false);
  gesture.begin(1, 0, 0);
  gesture.cancel();
  assert.equal(gesture.end(1, 0, 0), false);
  gesture.begin(1, 0, 0);
  assert.equal(gesture.end(1, 10, 0), false);
});

test("view count accepts zero and rejects malformed responses", async context => {
  for (const [body, expected] of [
    [{ count: 0 }, 0],
    [{ count: 3387 }, 3387],
    [{ count: -1 }, null],
    [{ count: "123" }, null],
    [{ count: 1.5 }, null],
    [{ count: 9007199254740992 }, null],
    [{}, null],
    [null, null],
  ] as const) {
    context.mock.method(globalThis, "fetch", async () => Response.json(body));
    assert.equal(await fetchViewCount(), expected);
    context.mock.restoreAll();
  }
  context.mock.method(globalThis, "fetch", async () =>
    Response.json({ count: 123 }, { status: 500 })
  );
  assert.equal(await fetchViewCount(), null);
  context.mock.restoreAll();
  context.mock.method(globalThis, "fetch", async () => {
    throw new Error("offline");
  });
  assert.equal(await fetchViewCount(), null);
});
