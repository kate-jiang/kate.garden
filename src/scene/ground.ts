import * as THREE from "three";
import { groundVertexPrefix } from "@/shaders";
import type { Config, GroundResult } from "@/types";

// =============================================================================
// GROUND MESH
// =============================================================================

export function createGround(
  config: Config,
  noiseTexture: THREE.Texture,
  delta: number,
  pos: THREE.Vector2
): GroundResult {
  const groundBaseGeometry = new THREE.PlaneGeometry(
    config.width,
    config.width,
    config.resolution,
    config.resolution
  );
  groundBaseGeometry.lookAt(new THREE.Vector3(0, 1, 0));

  const groundGeometry = new THREE.PlaneGeometry(
    config.width,
    config.width,
    config.resolution,
    config.resolution
  );
  groundGeometry.setAttribute("basePosition", groundBaseGeometry.getAttribute("position"));
  groundGeometry.lookAt(new THREE.Vector3(0, 1, 0));

  const groundMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color("rgb(10%, 25%, 2%)"),
    shininess: 10,
  });

  // Shader reference to be captured
  let groundShader: THREE.WebGLProgramParametersWithUniforms | null = null;

  groundMaterial.onBeforeCompile = function (shader) {
    shader.uniforms.delta = { value: delta };
    shader.uniforms.posX = { value: pos.x };
    shader.uniforms.posZ = { value: pos.y };
    shader.uniforms.radius = { value: config.radius };
    shader.uniforms.width = { value: config.width };
    shader.uniforms.noiseTexture = { value: noiseTexture };
    shader.vertexShader = groundVertexPrefix + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      `vec3 pos = vec3(0);
  pos.x = basePosition.x - mod(mod((delta * posX), delta) + delta, delta);
  pos.z = basePosition.z - mod(mod((delta * posZ), delta) + delta, delta);
  pos.y = max(0.0, placeOnSphere(pos)) - radius;
  pos.y += getYPosition(vec2(basePosition.x + delta * floor(posX), basePosition.z + delta * floor(posZ)));
  vec3 objectNormal = getNormal(pos);
  #ifdef USE_TANGENT
  vec3 objectTangent = vec3(tangent.xyz);
  #endif`
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `vec3 transformed = vec3(pos);`
    );
    groundShader = shader;
  };

  const mesh = new THREE.Mesh(groundGeometry, groundMaterial);
  mesh.receiveShadow = true;
  mesh.geometry.computeVertexNormals();

  // Return a getter for the shader since it's captured async in onBeforeCompile
  return {
    mesh,
    material: groundMaterial,
    getShader: () => groundShader,
  };
}
