import * as THREE from "three";
import type { Config, ModeConfig, LinkDataItem, Track } from "@/types";

export const config: Config = {
  // Grass
  joints: 2,
  bladeWidth: 0.067,
  bladeHeight: 0.5,
  instances: 90000,

  // Terrain
  width: 100,
  resolution: 8,
  radius: 240,

  // Lighting
  elevation: 0.2,
  azimuth: 0.4,
  fogFade: 0.008,
  ambientStrength: 0.7,
  translucencyStrength: 1.5,
  specularStrength: 0.5,
  diffuseStrength: 1.5,
  sunColour: new THREE.Vector3(1.0, 1.0, 1.0),
  specularColour: new THREE.Vector3(1.0, 1.0, 1.0),

  // Camera
  fov: 45,
  cameraPosition: { x: -18, y: -1, z: 55 },
  cameraTarget: { x: 0, y: 5, z: 10 },
  minDistance: 50,
  maxDistance: 50,
  minPolarAngle: 1.66,
  maxPolarAngle: 1.7,
  autoRotateSpeed: -0.06,

  // Interaction
  hoverScale: 1.15,
  hoverEase: 0.15,

  // Particle
  particleCount: 5000,
  particleColor: 0xd4c5a0,
  particleSize: 0.12,

  // Text
  mainTextSize: 5,
  linkTextSize: 1.1,
  linkGap: 1,
  textYPosition: 4.6,
  textZPosition: 10,
  textBobAmplitude: 0.25,
  textBobSpeed: 1.5,
  textRotationDamping: 0.03,

  // Responsive
  responsive: {
    mobileBreakpoint: 480,
    mobileTextScale: 0.75,
  },
};

export const dayConfig: ModeConfig = {
  skyColour: new THREE.Vector3(0.012, 0.12, 0.54),
  fogColorA: new THREE.Vector3(0.35, 0.5, 0.9),
  fogColorB: new THREE.Vector3(1.0, 1.0, 0.75),
  cloudBase: new THREE.Vector3(1.0, 0.98, 0.95),
  cloudShadow: new THREE.Vector3(0.65, 0.7, 0.8),
  sunGlow: new THREE.Vector3(1.0, 1.0, 0.8),
  elevation: 0.2,
  azimuth: 0.4,
  ambientIntensity: 0.9,
  dirLightIntensity: 0.8,
  pointLightIntensity: 1.5,
  particleOpacity: 0.6,
  particleSpeedMultiplier: 1.3,
  toneMappingExposure: 1.3,
  textColor: 0xdd61c0,
  textEmissive: 0xa0ac60,
  textEmissiveIntensity: 0.25,
  grassBrightness: 1.0,
  textLightIntensity: 2.0,
  rimLightIntensity: 1.5,
  particleColor: 0xd4c5a0,
};

export const nightConfig: ModeConfig = {
  skyColour: new THREE.Vector3(0.005, 0.012, 0.07),
  fogColorA: new THREE.Vector3(0.04, 0.04, 0.1),
  fogColorB: new THREE.Vector3(0.09, 0.06, 0.14),
  cloudBase: new THREE.Vector3(0.11, 0.09, 0.15),
  cloudShadow: new THREE.Vector3(0.04, 0.035, 0.07),
  sunGlow: new THREE.Vector3(0.95, 0.9, 0.7),
  elevation: -0.3,
  azimuth: 0.7,
  ambientIntensity: 0.3,
  dirLightIntensity: 0.2,
  pointLightIntensity: 0.5,
  particleColor: 0xff6d1c,
  particleOpacity: 1,
  particleSpeedMultiplier: 0.85,
  toneMappingExposure: 0.7,
  textColor: 0xffccaa,
  textEmissive: 0x4715bd,
  textEmissiveIntensity: 0.4,
  grassBrightness: 0.45,
  textLightIntensity: 3.0,
  rimLightIntensity: 2.0,
};

export const linkData: LinkDataItem[] = [
  { label: "about", action: "showAbout" },
  { label: "music", action: "showMusic" },
  { label: "photo", url: "https://instagram.com/katejiang__" },
  { label: "code", url: "https://github.com/kate-jiang" },
];

export const playlist: Track[] = [
  {
    title: "promises",
    artist: "kate",
    src: "/music/promises.mp3",
    duration: "4:07",
  },
  {
    title: "Arabesque No. 1",
    artist: "Claude Debussy, kate",
    src: "/music/arabesque.mp3",
    duration: "5:02",
  },
  {
    title: "offsets",
    artist: "kate",
    src: "/music/offset.mp3",
    duration: "3:58",
  },
  {
    title: "Intermezzo, Op. 118 No. 2",
    artist: "Johannes Brahms, kate",
    src: "/music/intermezzo.mp3",
    duration: "5:38",
  },
  {
    title: "Daydreaming",
    artist: "Radiohead, kate",
    src: "/music/daydreaming.mp3",
    duration: "2:19",
  },
  {
    title: "august",
    artist: "kate, with orchestra",
    src: "/music/august.mp3",
    duration: "5:58",
  },
  {
    title: "a lot can change in a year",
    artist: "Johannes Brahms, kate",
    src: "/music/alot.mp3",
    duration: "3:44",
  },
  {
    title: "Children's Corner, L. 113: I",
    artist: "Claude Debussy, kate",
    src: "/music/childrens_corner.mp3",
    duration: "2:38",
  },
];

