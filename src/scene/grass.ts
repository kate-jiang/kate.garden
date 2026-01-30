import * as THREE from "three";
import { createGrassVertexShader, grassFragmentShader } from "@/shaders";
import type { Config, ModeConfig, GrassResult, GrassTextures, GrassUniforms } from "@/types";

// =============================================================================
// GRASS GEOMETRY
// =============================================================================

export function createGrassBaseGeometry(config: Config): THREE.PlaneGeometry {
  const grassBaseGeometry = new THREE.PlaneGeometry(
    config.bladeWidth,
    config.bladeHeight,
    1,
    config.joints
  );
  grassBaseGeometry.translate(0, config.bladeHeight / 2, 0);

  // Apply blade curvature
  const vertex = new THREE.Vector3();
  const quaternion0 = new THREE.Quaternion();
  const quaternion1 = new THREE.Quaternion();
  const quaternion2 = new THREE.Quaternion();

  let angle = 0.05;
  let sinAngle = Math.sin(angle / 2.0);
  let rotationAxis = new THREE.Vector3(0, 1, 0);
  quaternion0.set(
    rotationAxis.x * sinAngle,
    rotationAxis.y * sinAngle,
    rotationAxis.z * sinAngle,
    Math.cos(angle / 2.0)
  );

  angle = 0.3;
  sinAngle = Math.sin(angle / 2.0);
  rotationAxis.set(1, 0, 0);
  quaternion1.set(
    rotationAxis.x * sinAngle,
    rotationAxis.y * sinAngle,
    rotationAxis.z * sinAngle,
    Math.cos(angle / 2.0)
  );
  quaternion0.multiply(quaternion1);

  angle = 0.1;
  sinAngle = Math.sin(angle / 2.0);
  rotationAxis.set(0, 0, 1);
  quaternion1.set(
    rotationAxis.x * sinAngle,
    rotationAxis.y * sinAngle,
    rotationAxis.z * sinAngle,
    Math.cos(angle / 2.0)
  );
  quaternion0.multiply(quaternion1);

  const positionArray = grassBaseGeometry.attributes.position.array as Float32Array;
  for (let v = 0; v < positionArray.length; v += 3) {
    quaternion2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    vertex.x = positionArray[v];
    vertex.y = positionArray[v + 1];
    vertex.z = positionArray[v + 2];
    const frac = vertex.y / config.bladeHeight;
    quaternion2.slerp(quaternion0, frac);
    vertex.applyQuaternion(quaternion2);
    positionArray[v] = vertex.x;
    positionArray[v + 1] = vertex.y;
    positionArray[v + 2] = vertex.z;
  }
  grassBaseGeometry.computeVertexNormals();

  return grassBaseGeometry;
}

// =============================================================================
// GRASS INSTANCING
// =============================================================================

export function createGrassInstances(
  config: Config,
  grassBaseGeometry: THREE.PlaneGeometry
): THREE.InstancedBufferGeometry {
  const instancedGeometry = new THREE.InstancedBufferGeometry();
  instancedGeometry.index = grassBaseGeometry.index;
  instancedGeometry.attributes.position = grassBaseGeometry.attributes.position;
  instancedGeometry.attributes.uv = grassBaseGeometry.attributes.uv;
  instancedGeometry.attributes.normal = grassBaseGeometry.attributes.normal;

  const indices: number[] = [];
  const offsets: number[] = [];
  const scales: number[] = [];
  const halfRootAngles: number[] = [];

  const maxRadius = config.width / 2;

  for (let i = 0; i < config.instances; i++) {
    indices.push(i / config.instances);

    // Radial center-weighted distribution
    const angle = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.7) * maxRadius; // bias toward center
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    offsets.push(x, 0, z);
    const bladeAngle = Math.PI - Math.random() * (2 * Math.PI);
    halfRootAngles.push(Math.sin(0.5 * bladeAngle), Math.cos(0.5 * bladeAngle));
    scales.push(i % 3 !== 0 ? 2.0 + Math.random() * 1.25 : 2.0 + Math.random());
  }

  instancedGeometry.setAttribute(
    "offset",
    new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
  );
  instancedGeometry.setAttribute(
    "scale",
    new THREE.InstancedBufferAttribute(new Float32Array(scales), 1)
  );
  instancedGeometry.setAttribute(
    "halfRootAngle",
    new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngles), 2)
  );
  instancedGeometry.setAttribute(
    "index",
    new THREE.InstancedBufferAttribute(new Float32Array(indices), 1)
  );

  return instancedGeometry;
}

// =============================================================================
// GRASS MATERIAL & MESH
// =============================================================================

export function createGrass(
  config: Config,
  dayConfig: ModeConfig,
  textures: GrassTextures,
  camera: THREE.PerspectiveCamera,
  sunDirection: THREE.Vector3,
  delta: number,
  pos: THREE.Vector2
): GrassResult {
  const { grassTexture, alphaMap, noiseTexture } = textures;

  const grassBaseGeometry = createGrassBaseGeometry(config);
  const instancedGeometry = createGrassInstances(config, grassBaseGeometry);

  const uniforms: GrassUniforms = {
    time: { value: 0 },
    delta: { value: delta },
    posX: { value: pos.x },
    posZ: { value: pos.y },
    radius: { value: config.radius },
    width: { value: config.width },
    map: { value: grassTexture },
    alphaMap: { value: alphaMap },
    noiseTexture: { value: noiseTexture },
    sunDirection: { value: sunDirection },
    cameraPosition: { value: camera.position },
    ambientStrength: { value: config.ambientStrength },
    translucencyStrength: { value: config.translucencyStrength },
    diffuseStrength: { value: config.diffuseStrength },
    specularStrength: { value: config.specularStrength },
    lightColour: { value: config.sunColour },
    specularColour: { value: config.specularColour },
    grassBrightness: { value: dayConfig.grassBrightness },
  };

  const material = new THREE.RawShaderMaterial({
    uniforms,
    vertexShader: createGrassVertexShader(config.bladeHeight),
    fragmentShader: grassFragmentShader,
    side: THREE.DoubleSide,
  }) as THREE.RawShaderMaterial & { uniforms: GrassUniforms };

  const mesh = new THREE.Mesh(instancedGeometry, material);

  return { mesh, material };
}
