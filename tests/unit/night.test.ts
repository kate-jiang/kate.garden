import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { createNightMode, type NightModeRefs } from "../../src/scene/night";
import { dayConfig, nightConfig } from "../../src/scene/config";
import { createBackgroundScene } from "../../src/scene/background";

function setup(initialNight: boolean) {
  const sun = new THREE.Vector3();
  const background = createBackgroundScene(
    { fogFade: 0.008, fov: 45 } as Parameters<typeof createBackgroundScene>[0],
    dayConfig,
    sun,
    { width: 1280, height: 800 } as HTMLCanvasElement
  );
  const refs: NightModeRefs = {
    backgroundMaterial: background.material,
    grassMaterial: new THREE.RawShaderMaterial({
      uniforms: { grassBrightness: { value: 1 } },
    }) as NightModeRefs["grassMaterial"],
    particleMaterial: new THREE.PointsMaterial(),
    textMaterialRef: new THREE.MeshPhongMaterial(),
    ambientLight: new THREE.AmbientLight(),
    dirLight: new THREE.DirectionalLight(),
    pointLight: new THREE.PointLight(),
    textLight: new THREE.PointLight(),
    rimLight: new THREE.PointLight(),
    renderer: { toneMappingExposure: 1 } as THREE.WebGLRenderer,
  };
  return { refs, theme: createNightMode(refs, sun, initialNight) };
}

function closeTo(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `Expected ${expected}, received ${actual}`);
}

test("startup and completed transitions apply the configured day and night palettes", () => {
  for (const night of [true, false]) {
    const initial = setup(night);
    const transition = setup(!night);
    transition.theme.setNightMode(night);
    for (let i = 0; i < 180; i++) transition.theme.update(1 / 60);
    const expected = night ? nightConfig : dayConfig;
    for (const { refs, theme } of [initial, transition]) {
      assert.equal(theme.transitioning, false);
      closeTo(refs.renderer.toneMappingExposure, expected.toneMappingExposure);
      assert.equal(refs.textMaterialRef.color.getHex(), expected.textColor);
      assert.equal(refs.particleMaterial.color.getHex(), expected.particleColor);
      closeTo(refs.backgroundMaterial.uniforms.skyColour.value.distanceTo(expected.skyColour), 0);
      closeTo(refs.grassMaterial.uniforms.grassBrightness.value, expected.grassBrightness);
      closeTo(refs.ambientLight.intensity, expected.ambientIntensity);
      closeTo(theme.particleSpeed, expected.particleSpeedMultiplier);
      assert.equal(refs.backgroundMaterial.uniforms.starIntensity.value, night ? 1 : 0);
    }
  }
});

test("a transition moves through intermediate values and can reverse", () => {
  const { refs, theme } = setup(false);
  theme.setNightMode(true);
  const { update } = theme;
  update(0.5);
  assert.equal(theme.transitioning, true);
  assert.ok(refs.renderer.toneMappingExposure < dayConfig.toneMappingExposure);
  assert.ok(refs.renderer.toneMappingExposure > nightConfig.toneMappingExposure);
  assert.ok(theme.cloudTimeOffset > 0);
  theme.setNightMode(false);
  for (let i = 0; i < 60; i++) theme.update(1 / 60);
  assert.equal(theme.transitioning, false);
  assert.equal(refs.renderer.toneMappingExposure, dayConfig.toneMappingExposure);
});
