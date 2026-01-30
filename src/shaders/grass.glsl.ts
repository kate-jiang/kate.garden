import { sharedPrefix } from "./shared";

// =============================================================================
// GRASS SHADERS
// =============================================================================

export function createGrassVertexShader(bladeHeight: number): string {
  return (
    sharedPrefix +
    `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
attribute vec3 offset;
attribute vec2 uv;
attribute vec2 halfRootAngle;
attribute float scale;
attribute float index;
uniform float time;

uniform float delta;
uniform float posX;
uniform float posZ;
uniform float radius;
uniform float width;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float frc;
varying float idx;

const float PI = 3.1415;
const float TWO_PI = 2.0 * PI;

vec3 rotateVectorByQuaternion(vec3 v, vec4 q) {
return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
}

float placeOnSphere(vec3 v) {
  // Quadratic approximation of spherical y-coordinate
  // From y = sqrt(r² - x² - z²) ≈ r - (x² + z²)/(2r) for small displacements
  return radius - (v.x * v.x + v.z * v.z) / (2.0 * radius);
}

void main() {
frc = position.y / float(${bladeHeight});
vec3 localPosition = position;
localPosition.y *= scale;
vNormal = normal;
vNormal.y /= scale;
vec4 direction = vec4(0.0, halfRootAngle.x, 0.0, halfRootAngle.y);
localPosition = rotateVectorByQuaternion(localPosition, direction);
vNormal = rotateVectorByQuaternion(vNormal, direction);
vUv = uv;

vec3 pos;
vec3 globalPos;
vec3 tile;

globalPos.x = offset.x - posX * delta;
globalPos.z = offset.z - posZ * delta;

tile.x = floor((globalPos.x + 0.5 * width) / width);
tile.z = floor((globalPos.z + 0.5 * width) / width);

pos.x = globalPos.x - tile.x * width;
pos.z = globalPos.z - tile.z * width;

pos.y = max(0.0, placeOnSphere(pos)) - radius;
pos.y += getYPosition(vec2(pos.x + delta * posX, pos.z + delta * posZ));

vec2 fractionalPos = 0.5 + offset.xz / width;
fractionalPos *= TWO_PI;

// Per-blade variation using index for phase offset and speed variation
float bladePhase = index * TWO_PI * 17.0; // pseudo-random phase per blade
float speedVar = 0.95 + 0.1 * fract(index * 127.1); // speed varies 0.95-1.05x

// Single wind wave (simplified from dual-wave)
float noise = 0.5 + 0.5 * sin(fractionalPos.x + fractionalPos.y * 0.5 + time * 2.5 * speedVar + bladePhase);
float halfAngle = -noise * 0.12;

direction = normalize(vec4(sin(halfAngle), 0.0, -sin(halfAngle), cos(halfAngle)));

localPosition = rotateVectorByQuaternion(localPosition, direction);
vNormal = rotateVectorByQuaternion(vNormal, direction);
localPosition += pos;

idx = index;
vPosition = localPosition;
gl_Position = projectionMatrix * modelViewMatrix * vec4(localPosition, 1.0);
}`
  );
}

export const grassFragmentShader: string = `
precision mediump float;
uniform vec3 cameraPosition;
uniform float ambientStrength;
uniform float diffuseStrength;
uniform float specularStrength;
uniform float translucencyStrength;
uniform vec3 lightColour;
uniform vec3 sunDirection;
uniform sampler2D map;
uniform sampler2D alphaMap;
uniform vec3 specularColour;
uniform float grassBrightness;

varying float frc;
varying float idx;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

vec3 ACESFilm(vec3 x) {
float a = 2.51;
float b = 0.03;
float c = 2.43;
float d = 0.59;
float e = 0.14;
return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Fast power functions using iterative squaring
// More efficient than pow() on mobile GPUs
float pow16(float x) {
  x *= x; x *= x; x *= x; x *= x;  // 4 multiplies
  return x;
}

float pow64(float x) {
  x *= x; x *= x; x *= x; x *= x; x *= x; x *= x;  // 6 multiplies
  return x;
}

void main() {
if (texture2D(alphaMap, vUv).r < 0.15) discard;

vec3 normal;
if (gl_FrontFacing) normal = normalize(vNormal);
else normal = normalize(-vNormal);

// Gamma linearization: pow(x, 2.2) -> x * x (gamma 2.0 approximation)
vec3 textureColour = texture2D(map, vUv).rgb;
textureColour *= textureColour;

vec3 mixColour = idx > 0.75 ? vec3(0.2, 0.8, 0.06) : vec3(0.5, 0.8, 0.08);
textureColour = mix(0.1 * mixColour, textureColour, 0.75);

vec3 lightTimesTexture = lightColour * textureColour;
vec3 ambient = textureColour;
vec3 lightDir = normalize(sunDirection);

float dotNormalLight = dot(normal, lightDir);
float diff = max(dotNormalLight, 0.0);
vec3 diffuse = diff * lightTimesTexture;

float sky = max(dot(normal, vec3(0, 1, 0)), 0.0);
vec3 skyLight = sky * vec3(0.12, 0.29, 0.55);

vec3 viewDirection = normalize(cameraPosition - vPosition);
vec3 halfwayDir = normalize(lightDir + viewDirection);

float spec = pow64(max(dot(normal, halfwayDir), 0.0));
vec3 specular = spec * specularColour * lightColour;

vec3 diffuseTranslucency = vec3(0);
vec3 forwardTranslucency = vec3(0);
float dotViewLight = dot(-lightDir, viewDirection);
if (dotNormalLight <= 0.0) {
  diffuseTranslucency = lightTimesTexture * translucencyStrength * -dotNormalLight;
  if (dotViewLight > 0.0) {
    forwardTranslucency = lightTimesTexture * translucencyStrength * pow16(dotViewLight);
  }
}

vec3 col = 0.3 * skyLight * textureColour + ambientStrength * ambient + diffuseStrength * diffuse + specularStrength * specular + diffuseTranslucency + forwardTranslucency;
col = mix(0.35 * vec3(0.1, 0.25, 0.02), col, frc);
col *= grassBrightness;
col = ACESFilm(col);

// Gamma correction: pow(x, 0.4545) -> sqrt (gamma 2.0 approximation)
col = sqrt(col);

gl_FragColor = vec4(col, 1.0);
}`;
