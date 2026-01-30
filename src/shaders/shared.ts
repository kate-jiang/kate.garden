// =============================================================================
// SHARED SHADER CODE
// =============================================================================

export const sharedPrefix: string = `
uniform sampler2D noiseTexture;
float getYPosition(vec2 p) {
return 8.0 * (2.0 * texture2D(noiseTexture, p / 800.0).r - 1.0);
}
`;
