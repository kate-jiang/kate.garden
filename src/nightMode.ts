import * as THREE from "three";
import { lerpValue, lerpVector3 } from "@/utils";
import type { ModeConfig, NightModeState, NightModeRefs } from "@/types";

// =============================================================================
// NIGHT MODE TRANSITION
// =============================================================================

export function updateNightMode(
  dt: number,
  state: NightModeState,
  refs: NightModeRefs,
  dayConfig: ModeConfig,
  nightConfig: ModeConfig
): void {
  // Check if transition is needed
  if (Math.abs(state.nightTransition - state.nightTransitionTarget) < 0.001) {
    state.nightTransition = state.nightTransitionTarget;
    state.particleSpeedBoost = 0;
    return;
  }

  // Animate transition
  const direction = state.nightTransitionTarget > state.nightTransition ? 1 : -1;
  state.nightTransition = Math.max(0, Math.min(1, state.nightTransition + direction * 0.6 * dt));

  // Ease in-out cubic for smooth feel
  const t = state.nightTransition;
  const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Dramatically accelerate clouds and particles during transition - peaks in the middle, eases at edges
  const speedCurve = Math.pow(Math.sin(t * Math.PI), 2); // gentler bell curve
  state.cloudTimeOffset += dt * 100 * speedCurve;
  state.particleSpeedBoost = 8 * speedCurve; // 8x speed boost at peak

  // Interpolate sun
  const elevation = lerpValue(dayConfig.elevation, nightConfig.elevation, easedT);
  const azimuth = lerpValue(dayConfig.azimuth, nightConfig.azimuth, easedT);
  state.sunDirection.set(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth));

  // Interpolate sky shader uniforms
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

  // Interpolate lighting
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

  // Interpolate particle opacity, color, and speed (sweep away at night)
  refs.particleMaterial.opacity = lerpValue(
    dayConfig.particleOpacity,
    nightConfig.particleOpacity,
    easedT
  );
  const dayParticleColor = new THREE.Color(dayConfig.particleColor);
  const nightParticleColor = new THREE.Color(nightConfig.particleColor);
  refs.particleMaterial.color.lerpColors(dayParticleColor, nightParticleColor, easedT);
  state.particleSpeedMultiplier = lerpValue(
    dayConfig.particleSpeedMultiplier,
    nightConfig.particleSpeedMultiplier,
    easedT
  );

  // Interpolate tone mapping exposure
  refs.renderer.toneMappingExposure = lerpValue(
    dayConfig.toneMappingExposure,
    nightConfig.toneMappingExposure,
    easedT
  );

  // Interpolate text material (warm glow at night)
  if (refs.textMaterialRef) {
    const dayTextColor = new THREE.Color(dayConfig.textColor);
    const nightTextColor = new THREE.Color(nightConfig.textColor);
    refs.textMaterialRef.color.lerpColors(dayTextColor, nightTextColor, easedT);

    const dayEmissive = new THREE.Color(dayConfig.textEmissive);
    const nightEmissive = new THREE.Color(nightConfig.textEmissive);
    refs.textMaterialRef.emissive.lerpColors(dayEmissive, nightEmissive, easedT);

    refs.textMaterialRef.emissiveIntensity = lerpValue(
      dayConfig.textEmissiveIntensity,
      nightConfig.textEmissiveIntensity,
      easedT
    );
  }

  // Interpolate grass brightness
  refs.grassMaterial.uniforms.grassBrightness.value = lerpValue(
    dayConfig.grassBrightness,
    nightConfig.grassBrightness,
    easedT
  );

  // Interpolate text-specific lighting for night readability
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

// Apply initial night mode state if loaded from localStorage
export function applyInitialNightMode(
  state: NightModeState,
  refs: NightModeRefs,
  dayConfig: ModeConfig,
  nightConfig: ModeConfig
): void {
  if (state.isNightMode) {
    state.sunDirection.set(
      Math.sin(nightConfig.azimuth),
      Math.sin(nightConfig.elevation),
      -Math.cos(nightConfig.azimuth)
    );

    refs.backgroundMaterial.uniforms.skyColour.value.copy(nightConfig.skyColour);
    refs.backgroundMaterial.uniforms.fogColorA.value.copy(nightConfig.fogColorA);
    refs.backgroundMaterial.uniforms.fogColorB.value.copy(nightConfig.fogColorB);
    refs.backgroundMaterial.uniforms.cloudBaseColor.value.copy(nightConfig.cloudBase);
    refs.backgroundMaterial.uniforms.cloudShadowColor.value.copy(nightConfig.cloudShadow);
    refs.backgroundMaterial.uniforms.sunGlowColor.value.copy(nightConfig.sunGlow);
    refs.backgroundMaterial.uniforms.starIntensity.value = 1;

    refs.ambientLight.intensity = nightConfig.ambientIntensity;
    refs.dirLight.intensity = nightConfig.dirLightIntensity;
    refs.pointLight.intensity = nightConfig.pointLightIntensity;

    refs.particleMaterial.opacity = nightConfig.particleOpacity;
    refs.particleMaterial.color.set(nightConfig.particleColor);
    state.particleSpeedMultiplier = nightConfig.particleSpeedMultiplier;
    refs.renderer.toneMappingExposure = nightConfig.toneMappingExposure;
    refs.grassMaterial.uniforms.grassBrightness.value = nightConfig.grassBrightness;

    // Set text material (if already loaded)
    if (refs.textMaterialRef) {
      refs.textMaterialRef.color.set(nightConfig.textColor);
      refs.textMaterialRef.emissive.set(nightConfig.textEmissive);
      refs.textMaterialRef.emissiveIntensity = nightConfig.textEmissiveIntensity;
    }

    // Set text-specific lighting for night readability
    refs.textLight.intensity = nightConfig.textLightIntensity;
    refs.rimLight.intensity = nightConfig.rimLightIntensity;
  }
}
