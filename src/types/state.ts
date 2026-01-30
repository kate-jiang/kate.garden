import * as THREE from "three";
import type { SkyUniforms, GrassUniforms } from "@/types/uniforms";

export interface NightModeState {
  isNightMode: boolean;
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
  textMaterialRef: THREE.MeshPhongMaterial | null;
  ambientLight: THREE.AmbientLight;
  dirLight: THREE.DirectionalLight;
  pointLight: THREE.PointLight;
  textLight: THREE.PointLight;
  rimLight: THREE.PointLight;
  renderer: THREE.WebGLRenderer;
}

export interface HoverState {
  target: number;
  current: number;
}

export interface Track {
  title: string;
  artist: string;
  src: string;
  duration: string;
}
