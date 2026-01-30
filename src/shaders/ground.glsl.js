import { sharedPrefix } from "./shared.js";

// =============================================================================
// GROUND SHADER
// =============================================================================

export const groundVertexPrefix =
  sharedPrefix +
  `
attribute vec3 basePosition;
uniform float delta;
uniform float posX;
uniform float posZ;
uniform float radius;
uniform float width;

float placeOnSphere(vec3 v) {
float theta = acos(clamp(v.z / radius, -1.0, 1.0));
float sinTheta = sin(theta);
if (abs(sinTheta) < 0.0001) {
  return v.y;
}
float phi = acos(clamp(v.x / (radius * sinTheta), -1.0, 1.0));
float sV = radius * sinTheta * sin(phi);
return sV;
}

vec3 getPosition(vec3 pos, float epsX, float epsZ) {
vec3 temp;
temp.x = pos.x + epsX;
temp.z = pos.z + epsZ;
temp.y = max(0.0, placeOnSphere(temp)) - radius;
temp.y += getYPosition(vec2(basePosition.x + epsX + delta * floor(posX), basePosition.z + epsZ + delta * floor(posZ)));
return temp;
}

vec3 getNormal(vec3 pos) {
float eps = 1e-1;
vec3 tempP = getPosition(pos, eps, 0.0);
vec3 tempN = getPosition(pos, -eps, 0.0);
vec3 slopeX = tempP - tempN;
tempP = getPosition(pos, 0.0, eps);
tempN = getPosition(pos, 0.0, -eps);
vec3 slopeZ = tempP - tempN;
vec3 norm = normalize(cross(slopeZ, slopeX));
return norm;
}
`;
