// v0.46.0-beta.4 (Steve t19u, Q-AZ-1 = B): a grip above the A–Z strip; drag it sideways and the strip snaps to the nearest edge.
/** Minimum touch target for the grip (t19u: 44 px). */
export const GRIP_HIT_PX = 44
/** True when a drop at clientX should put the strip on the left edge of the list area. */
export function snapLeft(clientX: number, areaLeft: number, areaWidth: number): boolean {
  return clientX - areaLeft < areaWidth / 2
}
