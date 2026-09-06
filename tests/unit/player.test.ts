import assert from "node:assert/strict";
import { test } from "node:test";
import { createMusicPlayer, type MediaElement } from "../../src/ui/player";

class AudioStub extends EventTarget implements MediaElement {
  private source = "";
  get src() {
    return this.source;
  }
  set src(value: string) {
    this.source = value;
    this.ended = false;
  }
  ended = false;
  currentTime = 0;
  duration = 120;
  paused = true;
  calls = 0;
  behavior: () => Promise<void> = async () => {};
  load() {}
  async play() {
    this.calls++;
    this.paused = false;
    this.dispatchEvent(new Event("play"));
    await this.behavior();
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
}
const playlist = ["first", "second"].map(title => ({
  title,
  artist: "kate",
  duration: "2:00",
  src: `/${title}.mp3`,
}));
function setup() {
  const audio = new AudioStub();
  const player = createMusicPlayer({ audio, playlist, loadTrackOnInit: false });
  return { audio, player };
}

test("failed play followed by pause never schedules a retry", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const { audio, player } = setup();
  audio.behavior = async () => {
    audio.pause();
    throw new DOMException("not allowed", "NotAllowedError");
  };
  await player.play();
  assert.match(player.getState().error!, /Couldn't play/);
  player.pause();
  context.mock.timers.tick(1000);
  assert.equal(audio.calls, 1);
  assert.equal(audio.paused, true);
  player.dispose();
});

test("cancelling pending playback does not report an interruption as a failure", async () => {
  for (const command of ["pause", "dispose"] as const) {
    const { audio, player } = setup();
    let reject!: (error: Error) => void;
    audio.behavior = () =>
      new Promise<void>((_, fail) => {
        reject = fail;
      });
    const playing = player.play();
    player[command]();
    reject(new DOMException("The play() request was interrupted", "AbortError"));
    await playing;
    assert.equal(audio.paused, true);
    assert.equal(player.getState().error, null);
    if (command === "pause") {
      audio.behavior = async () => {};
      player.toggle();
      assert.equal(audio.calls, 2);
    } else {
      await player.play();
      assert.equal(audio.calls, 1);
    }
    player.dispose();
  }
});

test("obsolete play rejection cannot overwrite a newer track", async () => {
  const { audio, player } = setup();
  let reject!: (error: Error) => void;
  audio.behavior = () =>
    new Promise<void>((_, fail) => {
      reject = fail;
    });
  const pending = player.play();
  audio.behavior = async () => {};
  player.next();
  reject(new Error("old request interrupted"));
  await pending;
  assert.equal(player.getState().trackIndex, 1);
  assert.equal(player.getState().error, null);
  assert.equal(audio.src, "/second.mp3");
  player.dispose();
});

test("track navigation wraps and seeking clamps to valid duration", () => {
  const { audio, player } = setup();
  assert.equal(audio.src, "");
  player.previous();
  assert.equal(player.getState().trackIndex, 1);
  player.next();
  assert.equal(player.getState().trackIndex, 0);
  player.seek(0.5);
  assert.equal(audio.currentTime, 60);
  player.seek(2);
  assert.equal(audio.currentTime, 120);
  audio.duration = NaN;
  player.seek(0.5);
  assert.equal(audio.currentTime, 120);
  player.dispose();
});

test("a rejected play can be retried with one toggle", async () => {
  const { audio, player } = setup();
  audio.behavior = async () => {
    audio.pause();
    throw new DOMException("autoplay blocked", "NotAllowedError");
  };
  await player.play();
  audio.behavior = async () => {};
  player.toggle();
  await Promise.resolve();
  assert.equal(audio.calls, 2);
  assert.equal(player.getState().playing, true);
  player.dispose();
});

test("automatic track changes preserve preference and queued ended cannot undo Pause", async () => {
  const audio = new AudioStub();
  const writes: boolean[] = [];
  const player = createMusicPlayer({
    audio,
    playlist,
    preference: {
      get: () => writes[writes.length - 1] ?? false,
      set: value => {
        writes.push(value);
      },
    },
  });
  await player.play();
  audio.ended = true;
  audio.paused = true;
  audio.dispatchEvent(new Event("ended"));
  await Promise.resolve();
  assert.equal(player.getState().trackIndex, 1);
  assert.deepEqual(writes, [true]);
  player.pause();
  const calls = audio.calls;
  audio.ended = true;
  audio.dispatchEvent(new Event("ended"));
  await Promise.resolve();
  assert.equal(player.getState().trackIndex, 1);
  assert.equal(audio.calls, calls);
  assert.equal(audio.paused, true);
  assert.deepEqual(writes, [true, false]);
  player.dispose();
});

test("media errors preserve preference and stale ended events do not skip a track", async () => {
  const audio = new AudioStub();
  const writes: boolean[] = [];
  const player = createMusicPlayer({
    audio,
    playlist,
    preference: {
      get: () => true,
      set: value => {
        writes.push(value);
      },
    },
  });
  await player.play();
  audio.dispatchEvent(new Event("error"));
  assert.deepEqual(writes, [true]);
  assert.equal(player.getState().playing, false);
  audio.ended = true;
  audio.dispatchEvent(new Event("ended"));
  assert.equal(player.getState().trackIndex, 0);
  await player.play();
  player.next();
  audio.dispatchEvent(new Event("ended"));
  assert.equal(player.getState().trackIndex, 1);
  player.dispose();
});
