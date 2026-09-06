import * as THREE from "three";
import type { Config, ModeConfig } from "./config";

export function createParticles(config: Config, dayConfig: ModeConfig) {
  const particleCount = config.particleCount;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3] = Math.random() * 120 - 60;
    positions[i3 + 1] = Math.random() * 15 - 3;
    positions[i3 + 2] = Math.random() * 140 - 70;

    velocities[i3] = Math.random() * 0.5 + 0.3;
    velocities[i3 + 1] = Math.random() * 0.2 - 0.1;
    velocities[i3 + 2] = Math.random() * 0.4 - 0.15;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Create circular particle texture
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    color: config.particleColor,
    size: config.particleSize,
    map: texture,
    transparent: true,
    opacity: dayConfig.particleOpacity,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const mesh = new THREE.Points(geometry, material);

  function update(dt: number, time: number, totalSpeedMultiplier: number): void {
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < config.particleCount; i++) {
      const i3 = i * 3;

      const windStrength = (1.67 + 0.3 * Math.sin(time * 0.5 + i * 0.1)) * totalSpeedMultiplier;
      positions[i3] += velocities[i3] * dt * windStrength;
      positions[i3 + 1] +=
        velocities[i3 + 1] * dt * totalSpeedMultiplier + Math.sin(time * 2 + i * 0.5) * dt * 0.2;
      positions[i3 + 2] += velocities[i3 + 2] * dt * totalSpeedMultiplier;

      // Wrap particles around boundaries
      if (positions[i3] > 60) positions[i3] = -60;
      if (positions[i3] < -60) positions[i3] = 60;
      if (positions[i3 + 1] > 20) positions[i3 + 1] = -2;
      if (positions[i3 + 1] < -3) positions[i3 + 1] = 16;
      if (positions[i3 + 2] > 80) positions[i3 + 2] = -80;
      if (positions[i3 + 2] < -80) positions[i3 + 2] = 80;
    }

    geometry.attributes.position.needsUpdate = true;
  }
  return {
    mesh,
    material,
    update,
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
      mesh.removeFromParent();
    },
  };
}
