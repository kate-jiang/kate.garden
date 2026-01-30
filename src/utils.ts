import type { Vector3 } from "three";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function lerpValue(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVector3(target: Vector3, a: Vector3, b: Vector3, t: number): void {
  target.x = lerpValue(a.x, b.x, t);
  target.y = lerpValue(a.y, b.y, t);
  target.z = lerpValue(a.z, b.z, t);
}
