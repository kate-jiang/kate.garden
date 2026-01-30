// =============================================================================
// SKY SHADERS
// =============================================================================

export const skyVertexShader: string = `
varying vec2 vUv;
void main() {
vUv = uv;
gl_Position = vec4(position, 1.0);
}
`;

export const skyFragmentShader: string = `
precision highp float;

varying vec2 vUv;
uniform vec2 resolution;
uniform vec3 sunDirection;
uniform float fogFade;
uniform float fov;
uniform float time;
uniform float cloudSpeed;

// Night mode uniforms
uniform vec3 skyColour;
uniform vec3 fogColorA;
uniform vec3 fogColorB;
uniform vec3 cloudBaseColor;
uniform vec3 cloudShadowColor;
uniform vec3 sunGlowColor;
uniform float starIntensity;

vec3 getSkyColour(vec3 rayDir) {
return mix(0.35 * skyColour, skyColour, pow(1.0 - rayDir.y, 4.0));
}

// Star field function for night sky
float stars(vec3 rayDir, float time) {
if (starIntensity < 0.01) return 0.0;
if (rayDir.y < 0.1) return 0.0; // No stars near horizon

vec3 p = rayDir * 300.0;
vec3 id = floor(p);
vec3 fp = fract(p) - 0.5;

float h = fract(sin(dot(id, vec3(127.1, 311.7, 74.7))) * 43758.5453);
float size = h * 0.5 + 0.5;
float brightness = step(0.965, h); // Only ~3% of cells have stars
float star = brightness * smoothstep(0.2 * size, 0.0, length(fp));

// Fade stars near horizon
float horizonFade = smoothstep(0.1, 0.3, rayDir.y);

return star * starIntensity * horizonFade;
}

vec3 applyFog(vec3 rgb, vec3 rayOri, vec3 rayDir, vec3 sunDir) {
float dist = 4000.0;
if (abs(rayDir.y) < 0.0001) rayDir.y = 0.0001;
float fogAmount = 1.0 * exp(-rayOri.y * fogFade) * (1.0 - exp(-dist * rayDir.y * fogFade)) / (rayDir.y * fogFade);
float sunAmount = max(dot(rayDir, sunDir), 0.0);
vec3 fogColor = mix(fogColorA, fogColorB, pow(sunAmount, 16.0));
return mix(rgb, fogColor, clamp(fogAmount, 0.0, 1.0));
}

vec3 ACESFilm(vec3 x) {
float a = 2.51;
float b = 0.03;
float c = 2.43;
float d = 0.59;
float e = 0.14;
return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
vec2 xy = fragCoord - resolution.xy / 2.0;
float z = (0.5 * resolution.y) / tan(radians(fieldOfView) / 2.0);
return normalize(vec3(xy, -z));
}

mat3 lookAt(vec3 camera, vec3 at, vec3 up) {
vec3 zaxis = normalize(at - camera);
vec3 xaxis = normalize(cross(zaxis, up));
vec3 yaxis = cross(xaxis, zaxis);
return mat3(xaxis, yaxis, -zaxis);
}

float getGlow(float dist, float radius, float intensity) {
dist = max(dist, 1e-6);
return pow(radius / dist, intensity);
}

float hash(vec2 p, float seed) {
// Mobile-friendly hash - avoids sin() with large multipliers which cause precision issues
vec3 p3 = fract(vec3(p.xyx + seed) * 0.1031);
p3 += dot(p3, p3.yzx + 33.33);
return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p, float seed) {
vec2 i = floor(p);
vec2 f = fract(p);
f = f * f * (3.0 - 2.0 * f);
float a = hash(i, seed);
float b = hash(i + vec2(1.0, 0.0), seed);
float c = hash(i + vec2(0.0, 1.0), seed);
float d = hash(i + vec2(1.0, 1.0), seed);
return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, float seed) {
float sum = 0.0;
float amp = 0.5;
float freq = 1.0;
for (int i = 0; i < 4; i++) {
  sum += noise(p * freq, seed + float(i) * 7.3) * amp;
  amp *= 0.5;
  freq *= 2.0;
}
return sum;
}

float cloudNoise(vec2 p, float time, float seed) {
  vec2 offset = vec2(time * cloudSpeed + seed, seed * 23.7);
  float n = fbm(p * 1.2 + offset, seed);
  n += fbm(p * 2.5 + offset * 1.2, seed + 100.0) * 0.35;
  return n;
}

float getCloudLayer(vec3 rayDir, float time, float seed, float height) {
if (rayDir.y < 0.15) return 0.0;
float heightFactor = smoothstep(0.15, height, rayDir.y) * (1.0 - smoothstep(height, 0.6, rayDir.y));
vec2 cloudPos = vec2(rayDir.x, rayDir.z) / max(rayDir.y, 0.15) * (height * 4.0);
float density = cloudNoise(cloudPos, time, seed);
density = smoothstep(0.6, 0.9, density);
return density * heightFactor;
}

float getCloudDensity(vec3 rayDir, float time) {
float layer1 = getCloudLayer(rayDir, time, 0.0, 0.25);
float layer2 = getCloudLayer(rayDir, time, 42.0, 0.4) * 0.5;
return min(layer1 + layer2, 1.0);
}

void main() {
vec3 target = vec3(0.0, 0.0, 0.0);
vec3 up = vec3(0.0, 1.0, 0.0);
vec3 rayDir = rayDirection(fov, gl_FragCoord.xy);
mat3 viewMatrix_ = lookAt(cameraPosition, target, up);
rayDir = viewMatrix_ * rayDir;
vec3 col = getSkyColour(rayDir);

col += vec3(stars(rayDir, time));

vec3 sunDir = normalize(sunDirection);
float mu = dot(sunDir, rayDir);

float cloudDensity = getCloudDensity(rayDir, time);
float sunAmount = max(mu, 0.0);
vec3 cloudColor = mix(cloudShadowColor, cloudBaseColor, 0.4 + sunAmount * 0.6);

float edgeFade = smoothstep(0.0, 0.3, rayDir.y);
col = mix(col, cloudColor, cloudDensity * 0.6 * edgeFade);

col += sunGlowColor * getGlow(1.0 - mu, 0.00005, 0.9);
col += applyFog(col, vec3(0, 1000, 0), rayDir, sunDir);
col = ACESFilm(col);
col = pow(col, vec3(0.4545));
gl_FragColor = vec4(col, 1.0);
}
`;
