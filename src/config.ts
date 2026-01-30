import * as THREE from "three";
import type {
  Config,
  ModeConfig,
  LinkDataItem,
  QualityPresets,
  DeviceTier,
} from "@/types";

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

// =============================================================================
// QUALITY PRESETS & DEVICE DETECTION
// =============================================================================

export const qualityPresets: QualityPresets = {
  high: {
    instances: 90000,
    particleCount: 5000,
    grassCenter: { x: 0, z: 10 },
  },
  medium: {
    instances: 40000,
    particleCount: 2000,
    grassCenter: { x: -10, z: 10 },
  },
  low: {
    instances: 15000,
    particleCount: 500,
    grassCenter: { x: -10, z: 10 },
  },
};

// Devices verified to handle high quality well
const HIGH_TIER_ANDROID: RegExp[] = [
  // Samsung flagship (2022+)
  /SM-S9[0-4]/i, // Galaxy S22-S24 series
  /SM-F9[3-6]/i, // Galaxy Z Fold/Flip 4-6

  // OnePlus
  /OnePlus.*(1[0-3]|Nord\s*[34])/i, // OnePlus 10-13, Nord 3/4

  // Xiaomi / Redmi / POCO
  /Xiaomi\s*(1[2-5]|14)/i, // Xiaomi 12-15 series
  /Redmi\s*(K[56]0|Note\s*1[23])/i, // Redmi K50/K60, Note 12/13 Pro
  /POCO\s*F[456]/i, // POCO F4/F5/F6

  // Oppo / Realme
  /OPPO\s*Find\s*X[5-7]/i, // Find X5-X7
  /Realme\s*GT\s*[2-6]/i, // Realme GT 2-6

  // Vivo / iQOO
  /vivo\s*X[89]\d|vivo\s*X1\d\d/i, // Vivo X80-X100 series
  /iQOO\s*(1[12]|Neo\s*[89])/i, // iQOO 11/12, Neo 8/9

  // Honor
  /Honor\s*(Magic\s*[5-7]|[89]0)/i, // Honor Magic 5-7, 80/90 series

  // Motorola
  /moto\s*(edge|razr)\s*(40|50|2024)/i, // Edge 40/50, Razr 2024

  // Sony
  /Xperia\s*[15]\s*(IV|V)/i, // Xperia 1/5 IV/V

  // Asus
  /ASUS.*ROG.*Phone\s*[78]/i, // ROG Phone 7/8
  /ASUS.*Zenfone\s*(10|11)/i, // Zenfone 10/11

  // Nothing
  /Nothing\s*Phone/i, // Nothing Phone 1/2
];

// Devices known to have WebGL issues (force medium)
const MEDIUM_TIER_ANDROID: RegExp[] = [
  // Older Google Pixels (5-7) - Tensor G1/G2 have WebGL quirks
  // Pixel 8/9 with Tensor G3/G4 handle high quality well
  /Pixel\s*[5-7]([^0-9]|$)/i,

  // Older Samsung (pre-2022)
  /SM-[GAN]9\d\d/i, // Galaxy S/Note/A 9xx series

  // Budget lines from any brand
  /Redmi\s*[0-9][^0-9]/i, // Redmi single-digit (budget)
  /Galaxy\s*A[0-3]\d/i, // Galaxy A00-A39 (budget)
  /Realme\s*[0-9][^0-9]/i, // Realme single-digit
];

export function getGPURenderer(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return null;

    const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return null;

    return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
  } catch {
    return null;
  }
}

export function getDeviceTier(): DeviceTier {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const gpu = getGPURenderer();

  let tier: DeviceTier = "high";

  // Desktop → high
  if (!isIOS && !isAndroid) {
    tier = "high";
  }
  // iOS: check for older devices
  else if (isIOS) {
    // Extract iOS version from UA (e.g., "CPU iPhone OS 15_0" or "CPU OS 15_0")
    const iosVersionMatch = ua.match(/OS (\d+)[_\.]/);
    const iosVersion = iosVersionMatch ? parseInt(iosVersionMatch[1], 10) : 99;

    // iOS 14 and below = older devices (iPhone X and earlier can't go past iOS 16,
    // iPhone 6s/7 stuck on iOS 15, iPhone 6 and earlier on iOS 12)
    if (iosVersion <= 14) {
      tier = "medium";
    }
    // Older iPads: check GPU for A8X/A9X/A10X chips
    // Note: iPad model identifiers (iPad4,x etc.) are NOT present in UA strings,
    // so we rely on GPU detection instead
    else if (/iPad/.test(ua) && gpu && /Apple A(8|9|10)X?/i.test(gpu)) {
      tier = "medium";
    }
    // Check GPU for older iPhones (A9/A10 = iPhone 6s/7 era)
    else if (gpu && /Apple A(9|10)/i.test(gpu)) {
      tier = "medium";
    } else {
      tier = "high";
    }
  }
  // Android
  else if (isAndroid) {
    // Check for known problematic devices first
    if (MEDIUM_TIER_ANDROID.some(re => re.test(ua))) {
      tier = "medium";
    }
    // Check for verified high-tier devices
    else if (HIGH_TIER_ANDROID.some(re => re.test(ua))) {
      tier = "high";
    }
    // Fallback: GPU detection
    else if (gpu) {
      // Older Tensor GPUs have WebGL quirks - force medium
      // Tensor G1 (Pixel 6): Mali-G78, Tensor G2 (Pixel 7): Mali-G710
      // Tensor G3/G4 (Pixel 8/9): Mali-G715 handles high quality well
      if (/Mali-G(78|710)($|[^0-9])/i.test(gpu)) {
        tier = "medium";
      }
      // Latest flagship GPUs - Adreno 7xx/8xx, Mali-G7xx/8xx/9xx
      else if (/Adreno\s*\(TM\)\s*[789]\d\d|Mali-G[789]\d\d/i.test(gpu)) {
        tier = "high";
      } else {
        tier = "medium"; // Default Android: medium (conservative)
      }
    } else {
      tier = "medium"; // Default Android: medium (conservative)
    }
  }

  if (import.meta.env?.DEV) {
    console.debug("[quality]", { tier, ua, gpu });
  }

  return tier;
}
