import type * as THREE from "three";
import type { SkyUniforms, GrassUniforms } from "./uniforms";

export interface BackgroundSceneResult {
  dispose(): void;
  scene: THREE.Scene;
  material: THREE.ShaderMaterial & { uniforms: SkyUniforms };
  mesh: THREE.Mesh;
}

export interface GroundResult {
  dispose(): void;
  mesh: THREE.Mesh;
  material: THREE.MeshPhongMaterial;
}

export interface GrassResult {
  dispose(): void;
  mesh: THREE.Mesh;
  material: THREE.RawShaderMaterial & { uniforms: GrassUniforms };
}

export interface GrassTextures {
  grassTexture: THREE.Texture;
  alphaMap: THREE.Texture;
  noiseTexture: THREE.Texture;
}
