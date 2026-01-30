import * as THREE from "three";

export interface Position2D {
  x: number;
  z: number;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface ResponsiveConfig {
  mobileBreakpoint: number;
  mobileTextScale: number;
}

export interface Config {
  // Grass
  joints: number;
  bladeWidth: number;
  bladeHeight: number;
  instances: number;

  // Terrain
  width: number;
  resolution: number;
  radius: number;

  // Lighting
  elevation: number;
  azimuth: number;
  fogFade: number;
  ambientStrength: number;
  translucencyStrength: number;
  specularStrength: number;
  diffuseStrength: number;
  sunColour: THREE.Vector3;
  specularColour: THREE.Vector3;

  // Camera
  fov: number;
  cameraPosition: Position3D;
  cameraTarget: Position3D;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  autoRotateSpeed: number;

  // Interaction
  hoverScale: number;
  hoverEase: number;

  // Particle
  particleCount: number;
  particleColor: number;
  particleSize: number;

  // Text
  mainTextSize: number;
  linkTextSize: number;
  linkGap: number;
  textYPosition: number;
  textZPosition: number;
  textBobAmplitude: number;
  textBobSpeed: number;
  textRotationDamping: number;

  // Responsive
  responsive: ResponsiveConfig;
}

export interface ModeConfig {
  skyColour: THREE.Vector3;
  fogColorA: THREE.Vector3;
  fogColorB: THREE.Vector3;
  cloudBase: THREE.Vector3;
  cloudShadow: THREE.Vector3;
  sunGlow: THREE.Vector3;
  elevation: number;
  azimuth: number;
  ambientIntensity: number;
  dirLightIntensity: number;
  pointLightIntensity: number;
  particleOpacity: number;
  particleSpeedMultiplier: number;
  toneMappingExposure: number;
  textColor: number;
  textEmissive: number;
  textEmissiveIntensity: number;
  grassBrightness: number;
  textLightIntensity: number;
  rimLightIntensity: number;
  particleColor: number;
}

export interface LinkDataItem {
  label: string;
  url?: string;
  action?: string;
  // Runtime properties (populated during mesh creation)
  geometry?: THREE.BufferGeometry;
  width?: number;
  light?: THREE.PointLight;
}

export interface QualityPreset {
  instances: number;
  particleCount: number;
  grassCenter: Position2D;
}

export type DeviceTier = "high" | "medium" | "low";

export type QualityPresets = Record<DeviceTier, QualityPreset>;
