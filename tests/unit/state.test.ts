import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldUseGarden } from "../../src/device";
import { createPreference } from "../../src/services/preferences";
import { createPointerGesture } from "../../src/scene/interaction";
import { fetchViewCount } from "../../src/services/views";

const safari =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.2 Safari/605.1.15";

for (const userAgent of ["", safari]) {
  test(`only high benchmark tiers enter the garden (${userAgent ? "Safari" : "other"})`, async () => {
    for (const [tier, expected] of [
      [0, false],
      [1, false],
      [2, false],
      [3, true],
    ] as const)
      assert.equal(
        await shouldUseGarden(async () => ({ tier, type: "BENCHMARK" }), 100, userAgent),
        expected
      );
    for (const type of ["WEBGL_UNSUPPORTED", "BLOCKLISTED", "SSR"] as const)
      assert.equal(await shouldUseGarden(async () => ({ tier: 0, type }), 100, userAgent), false);
  });
}

test("unknown GPU detection defaults only Apple Safari to the garden", async () => {
  for (const [userAgent, expected] of [
    [safari, true],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      true,
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      true,
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      false,
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
      false,
    ],
    [
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36",
      false,
    ],
    ["", false],
  ] as const) {
    assert.equal(
      await shouldUseGarden(
        async () => ({ tier: 1, type: "FALLBACK", gpu: "apple gpu (Apple GPU)" }),
        100,
        userAgent
      ),
      expected,
      userAgent
    );
    assert.equal(
      await shouldUseGarden(
        async () => {
          throw new Error("GPU unavailable");
        },
        100,
        userAgent
      ),
      expected,
      userAgent
    );
    assert.equal(
      await shouldUseGarden(() => new Promise(() => {}), 1, userAgent),
      expected,
      userAgent
    );
  }
});

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
