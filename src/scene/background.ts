import * as THREE from "three";
import { skyVertexShader, skyFragmentShader } from "@/shaders";
import type { Config, ModeConfig, BackgroundSceneResult, SkyUniforms } from "@/types";

// =============================================================================
// BACKGROUND SCENE (SKY)
// =============================================================================

export function createBackgroundScene(
  config: Config,
  dayConfig: ModeConfig,
  sunDirection: THREE.Vector3,
  canvas: HTMLCanvasElement
): BackgroundSceneResult {
  const scene = new THREE.Scene();

  const uniforms: SkyUniforms = {
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
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
  }) as THREE.ShaderMaterial & { uniforms: SkyUniforms };
  material.depthWrite = false;

  const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  return { scene, material, mesh };
}
