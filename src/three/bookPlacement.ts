/**
 * Pure geometry placement helpers for the 3D knowledge shelf.
 *
 * Every value here is derived from the carousel distance between a book and
 * the selected book. The module is intentionally side-effect free: it does
 * not import three.js, react, or any DOM API so it can be unit tested under
 * Node + Vitest, and so that the result remains stable across server and
 * client renders (no hydration drift).
 */

export const SLOT_GAP = 2.02
export const BOOK_WIDTH = 1.72
export const BOOK_HEIGHT = 2.62
export const BOOK_DEPTH = 0.48

export const SHELF_SCALE = 1.14
export const MOBILE_SCALE = 1.18
export const INSPECTION_SCALE = 1.38

export const SHELF_FORWARD_Z = 0.72
export const INSPECTION_FORWARD_Z = 2.45

export const SHELF_LIFT_Y = -0.02
export const SHELF_REST_Y = -0.17

export type ShelfMode = 'shelf' | 'inspection'

export type BookPlacementInput = {
  index: number
  selected: number
  mode: ShelfMode
  viewportWidth: number
}

export type BookPlacement = {
  position: { x: number; y: number; z: number }
  rotationY: number
  scale: number
  liftY: number
  /** distance from selected, wrapped into [-floor(N/2), floor(N/2)] */
  distance: number
}

const clampViewport = (viewportWidth: number): 'mobile' | 'desktop' =>
  viewportWidth <= 700 ? 'mobile' : 'desktop'

/**
 * Wraps the integer offset between two indices into the shortest path around
 * the carousel. For a 7-book row this keeps neighbors at offsets in [-3, 3].
 */
export function carouselDistance(index: number, selected: number, total = 7): number {
  const raw = index - selected
  const half = Math.floor(total / 2)
  if (raw > half) return raw - total
  if (raw < -half) return raw + total
  return raw
}

/**
 * Returns the active scale for the selected book. Inspection mode lifts the
 * cover by another 21% relative to the shelf-mode baseline so the open-book
 * spread reads as the dominant element.
 */
export function activeScale(mode: ShelfMode, viewportWidth: number): number {
  if (mode === 'inspection') return INSPECTION_SCALE
  return clampViewport(viewportWidth) === 'mobile' ? MOBILE_SCALE : SHELF_SCALE
}

export function activeForwardZ(mode: ShelfMode): number {
  return mode === 'inspection' ? INSPECTION_FORWARD_Z : SHELF_FORWARD_Z
}

/**
 * Computes the local XYZ transform for one volume relative to the carousel
 * origin. The function is pure: identical inputs always produce identical
 * outputs, with no mutable caches or animation state.
 */
export function computeBookPlacement(input: BookPlacementInput): BookPlacement {
  const { index, selected, mode, viewportWidth } = input
  const distance = carouselDistance(index, selected)
  const absoluteDistance = Math.abs(distance)
  const capped = Math.min(absoluteDistance, 3)

  const position = {
    x: distance * SLOT_GAP,
    y: distance === 0 ? SHELF_LIFT_Y : SHELF_REST_Y - capped * 0.026,
    z:
      distance === 0
        ? activeForwardZ(mode)
        : -capped * 0.1,
  }

  const rotationY =
    distance === 0
      ? 0
      : -Math.sign(distance) * (Math.min(10, 3 + absoluteDistance * 2.5) * Math.PI) / 180

  const scale =
    distance === 0
      ? activeScale(mode, viewportWidth)
      : absoluteDistance === 1
        ? 0.99
        : absoluteDistance === 2
          ? 0.92
          : 0.86

  return {
    position,
    rotationY,
    scale,
    liftY: position.y,
    distance,
  }
}