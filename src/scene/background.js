import * as THREE from "three";
import { skyVertexShader, skyFragmentShader } from "../shaders/index.js";

// =============================================================================
// BACKGROUND SCENE (SKY)
// =============================================================================

export function createBackgroundScene(config, dayConfig, sunDirection, canvas, qualityPreset) {
  const scene = new THREE.Scene();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection },
      resolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
      fogFade: { value: config.fogFade },
      fov: { value: config.fov },
      time: { value: 0 },
      cloudSpeed: { value: 0.12 },
      skyColour: { value: dayConfig.skyColour.clone() },
      fogColorA: { value: dayConfig.fogColorA.clone() },
      fogColorB: { value: dayConfig.fogColorB.clone() },
      cloudBaseColor: { value: dayConfig.cloudBase.clone() },
      cloudShadowColor: { value: dayConfig.cloudShadow.clone() },
      sunGlowColor: { value: dayConfig.sunGlow.clone() },
      starIntensity: { value: 0 },
      fbmIterations: { value: qualityPreset.skyFbmIterations },
      cloudLayerCount: { value: qualityPreset.cloudLayers },
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
  });
  material.depthWrite = false;

  const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  return { scene, material, mesh };
}
