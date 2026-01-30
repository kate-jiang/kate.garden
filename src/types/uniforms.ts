import * as THREE from "three";
import type { IUniform } from "three";

export interface SkyUniforms extends Record<string, IUniform<unknown>> {
  sunDirection: IUniform<THREE.Vector3>;
  resolution: IUniform<THREE.Vector2>;
  fogFade: IUniform<number>;
  fov: IUniform<number>;
  time: IUniform<number>;
  cloudSpeed: IUniform<number>;
  skyColour: IUniform<THREE.Vector3>;
  fogColorA: IUniform<THREE.Vector3>;
  fogColorB: IUniform<THREE.Vector3>;
  cloudBaseColor: IUniform<THREE.Vector3>;
  cloudShadowColor: IUniform<THREE.Vector3>;
  sunGlowColor: IUniform<THREE.Vector3>;
  starIntensity: IUniform<number>;
}

export interface GrassUniforms extends Record<string, IUniform<unknown>> {
  time: IUniform<number>;
  delta: IUniform<number>;
  posX: IUniform<number>;
  posZ: IUniform<number>;
  radius: IUniform<number>;
  width: IUniform<number>;
  map: IUniform<THREE.Texture>;
  alphaMap: IUniform<THREE.Texture>;
  noiseTexture: IUniform<THREE.Texture>;
  sunDirection: IUniform<THREE.Vector3>;
  cameraPosition: IUniform<THREE.Vector3>;
  ambientStrength: IUniform<number>;
  translucencyStrength: IUniform<number>;
  diffuseStrength: IUniform<number>;
  specularStrength: IUniform<number>;
  lightColour: IUniform<THREE.Vector3>;
  specularColour: IUniform<THREE.Vector3>;
  grassBrightness: IUniform<number>;
}

export interface GroundUniforms extends Record<string, IUniform<unknown>> {
  delta: IUniform<number>;
  posX: IUniform<number>;
  posZ: IUniform<number>;
  radius: IUniform<number>;
  width: IUniform<number>;
  noiseTexture: IUniform<THREE.Texture>;
}
