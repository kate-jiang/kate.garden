// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function lerpValue(a, b, t) {
  return a + (b - a) * t;
}

export function lerpVector3(target, a, b, t) {
  target.x = lerpValue(a.x, b.x, t);
  target.y = lerpValue(a.y, b.y, t);
  target.z = lerpValue(a.z, b.z, t);
}
