import * as THREE from "three";
import { config, dayConfig } from "../config/index.js";

// =============================================================================
// SHARED MUTABLE STATE
// =============================================================================

export function createState() {
  return {
    // Time tracking
    time: 0,
    cloudTimeOffset: 0,

    // Night mode
    isNightMode: false,
    nightTransition: 0,
    nightTransitionTarget: 0,

    // Particle speed
    particleSpeedMultiplier: dayConfig.particleSpeedMultiplier,
    particleSpeedBoost: 0,

    // Sun direction (computed from config)
    sunDirection: new THREE.Vector3(
      Math.sin(config.azimuth),
      Math.sin(config.elevation),
      -Math.cos(config.azimuth)
    ),
  };
}
