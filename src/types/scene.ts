import * as THREE from "three";
import type { SkyUniforms, GrassUniforms } from "@/types/uniforms";

export interface BackgroundSceneResult {
  scene: THREE.Scene;
  material: THREE.ShaderMaterial & { uniforms: SkyUniforms };
  mesh: THREE.Mesh;
}

export interface GroundResult {
  mesh: THREE.Mesh;
  material: THREE.MeshPhongMaterial;
  getShader: () => THREE.WebGLProgramParametersWithUniforms | null;
}

export interface GrassResult {
  mesh: THREE.Mesh;
  material: THREE.RawShaderMaterial & { uniforms: GrassUniforms };
}

export interface ParticlesResult {
  mesh: THREE.Points;
  material: THREE.PointsMaterial;
  velocities: Float32Array;
  geometry: THREE.BufferGeometry;
}

export interface GrassTextures {
  grassTexture: THREE.Texture;
  alphaMap: THREE.Texture;
  noiseTexture: THREE.Texture;
}
