import * as THREE from "three";

// =============================================================================
// WIND PARTICLES
// =============================================================================

export function createParticles(config, dayConfig, qualityPreset) {
  const particleCount = qualityPreset?.particleCount ?? config.particleCount;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3] = Math.random() * 120 - 60;
    positions[i3 + 1] = Math.random() * 15 - 3;
    positions[i3 + 2] = Math.random() * 140 - 70;

    velocities[i3] = Math.random() * 0.5 + 0.3;
    velocities[i3 + 1] = Math.random() * 0.2 - 0.1;
    velocities[i3 + 2] = Math.random() * 0.4 - 0.15;

    sizes[i] = Math.random() * 0.15 + 0.5;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  // Create circular particle texture
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
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

  return { mesh, material, velocities, geometry };
}
