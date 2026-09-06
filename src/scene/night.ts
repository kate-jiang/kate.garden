import * as THREE from "three";
import { dayConfig, nightConfig } from "./config";
import type { SkyUniforms, GrassUniforms } from "./uniforms";

interface NightModeState {
  nightTransition: number;
  nightTransitionTarget: number;
  particleSpeedMultiplier: number;
  particleSpeedBoost: number;
  cloudTimeOffset: number;
  sunDirection: THREE.Vector3;
}

export interface NightModeRefs {
  backgroundMaterial: THREE.ShaderMaterial & { uniforms: SkyUniforms };
  grassMaterial: THREE.RawShaderMaterial & { uniforms: GrassUniforms };
  particleMaterial: THREE.PointsMaterial;
  textMaterialRef: THREE.MeshPhongMaterial;
  ambientLight: THREE.AmbientLight;
  dirLight: THREE.DirectionalLight;
  pointLight: THREE.PointLight;
  textLight: THREE.PointLight;
  rimLight: THREE.PointLight;
  renderer: THREE.WebGLRenderer;
}

function lerpValue(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVector3(target: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, t: number): void {
  target.x = lerpValue(a.x, b.x, t);
  target.y = lerpValue(a.y, b.y, t);
  target.z = lerpValue(a.z, b.z, t);
}

export function createNightMode(
  refs: NightModeRefs,
  sunDirection: THREE.Vector3,
  initialNight: boolean
) {
  const state: NightModeState = {
    nightTransition: initialNight ? 1 : 0,
    nightTransitionTarget: initialNight ? 1 : 0,
    particleSpeedMultiplier: dayConfig.particleSpeedMultiplier,
    particleSpeedBoost: 0,
    cloudTimeOffset: 0,
    sunDirection,
  };
  const dayParticleColor = new THREE.Color(dayConfig.particleColor);
  const nightParticleColor = new THREE.Color(nightConfig.particleColor);
  const dayTextColor = new THREE.Color(dayConfig.textColor);
  const nightTextColor = new THREE.Color(nightConfig.textColor);
  const dayEmissive = new THREE.Color(dayConfig.textEmissive);
  const nightEmissive = new THREE.Color(nightConfig.textEmissive);
  function apply(easedT: number) {
    // Sun
    const elevation = lerpValue(dayConfig.elevation, nightConfig.elevation, easedT);
    const azimuth = lerpValue(dayConfig.azimuth, nightConfig.azimuth, easedT);
    state.sunDirection.set(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth));

    // Sky shader
    lerpVector3(
      refs.backgroundMaterial.uniforms.skyColour.value,
      dayConfig.skyColour,
      nightConfig.skyColour,
      easedT
    );
    lerpVector3(
      refs.backgroundMaterial.uniforms.fogColorA.value,
      dayConfig.fogColorA,
      nightConfig.fogColorA,
      easedT
    );
    lerpVector3(
      refs.backgroundMaterial.uniforms.fogColorB.value,
      dayConfig.fogColorB,
      nightConfig.fogColorB,
      easedT
    );
    lerpVector3(
      refs.backgroundMaterial.uniforms.cloudBaseColor.value,
      dayConfig.cloudBase,
      nightConfig.cloudBase,
      easedT
    );
    lerpVector3(
      refs.backgroundMaterial.uniforms.cloudShadowColor.value,
      dayConfig.cloudShadow,
      nightConfig.cloudShadow,
      easedT
    );
    lerpVector3(
      refs.backgroundMaterial.uniforms.sunGlowColor.value,
      dayConfig.sunGlow,
      nightConfig.sunGlow,
      easedT
    );
    refs.backgroundMaterial.uniforms.starIntensity.value = easedT;

    // Lighting
    refs.ambientLight.intensity = lerpValue(
      dayConfig.ambientIntensity,
      nightConfig.ambientIntensity,
      easedT
    );
    refs.dirLight.intensity = lerpValue(
      dayConfig.dirLightIntensity,
      nightConfig.dirLightIntensity,
      easedT
    );
    refs.pointLight.intensity = lerpValue(
      dayConfig.pointLightIntensity,
      nightConfig.pointLightIntensity,
      easedT
    );

    // Particles
    refs.particleMaterial.opacity = lerpValue(
      dayConfig.particleOpacity,
      nightConfig.particleOpacity,
      easedT
    );
    refs.particleMaterial.color.lerpColors(dayParticleColor, nightParticleColor, easedT);
    state.particleSpeedMultiplier = lerpValue(
      dayConfig.particleSpeedMultiplier,
      nightConfig.particleSpeedMultiplier,
      easedT
    );

    refs.renderer.toneMappingExposure = lerpValue(
      dayConfig.toneMappingExposure,
      nightConfig.toneMappingExposure,
      easedT
    );

    // Text
    if (refs.textMaterialRef) {
      refs.textMaterialRef.color.lerpColors(dayTextColor, nightTextColor, easedT);

      refs.textMaterialRef.emissive.lerpColors(dayEmissive, nightEmissive, easedT);

      refs.textMaterialRef.emissiveIntensity = lerpValue(
        dayConfig.textEmissiveIntensity,
        nightConfig.textEmissiveIntensity,
        easedT
      );
    }

    // Grass
    refs.grassMaterial.uniforms.grassBrightness.value = lerpValue(
      dayConfig.grassBrightness,
      nightConfig.grassBrightness,
      easedT
    );

    // Text lights
    refs.textLight.intensity = lerpValue(
      dayConfig.textLightIntensity,
      nightConfig.textLightIntensity,
      easedT
    );
    refs.rimLight.intensity = lerpValue(
      dayConfig.rimLightIntensity,
      nightConfig.rimLightIntensity,
      easedT
    );
  }
  apply(state.nightTransition);
  return {
    get transitioning() {
      return state.nightTransition !== state.nightTransitionTarget;
    },
    get cloudTimeOffset() {
      return state.cloudTimeOffset;
    },
    get particleSpeed() {
      return state.particleSpeedMultiplier + state.particleSpeedBoost;
    },
    setNightMode(night: boolean) {
      state.nightTransitionTarget = night ? 1 : 0;
    },
    update(dt: number) {
      if (state.nightTransition === state.nightTransitionTarget) return;
      const direction = state.nightTransitionTarget > state.nightTransition ? 1 : -1;
      state.nightTransition = Math.max(
        0,
        Math.min(1, state.nightTransition + direction * 0.6 * dt)
      );
      if (Math.abs(state.nightTransition - state.nightTransitionTarget) < 0.001) {
        state.nightTransition = state.nightTransitionTarget;
      }
      const t = state.nightTransition;
      const speedCurve = Math.sin(t * Math.PI) ** 2;
      state.cloudTimeOffset += dt * 100 * speedCurve;
      state.particleSpeedBoost = t === 0 || t === 1 ? 0 : 8 * speedCurve;
      apply(t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    },
  };
}
