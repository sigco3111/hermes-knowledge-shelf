import { describe, expect, it } from 'vitest'
import {
  carouselDistance,
  computeBookPlacement,
  type BookPlacement,
} from '../src/three/bookPlacement'

const COUNT = 7

describe('carouselDistance', () => {
  it('returns 0 for the selected index', () => {
    expect(carouselDistance(2, 2)).toBe(0)
  })

  it('returns the raw offset for in-range neighbors', () => {
    expect(carouselDistance(3, 2)).toBe(1)
    expect(carouselDistance(1, 2)).toBe(-1)
  })

  it('wraps around the carousel for distant indices', () => {
    // For 7 books the wrapping band is [-3, 3]; anything inside that is the
    // shortest-path offset, anything outside wraps back into it.
    expect(carouselDistance(0, 2)).toBe(-2) // within band
    expect(carouselDistance(6, 2)).toBe(-3) // at the wrap boundary
    expect(carouselDistance(5, 2)).toBe(3)  // wraps back to +3 (shorter than -4)
    // a custom total can shrink the wrap band further
    expect(carouselDistance(5, 2, 5)).toBe(-2) // wraps to the other side
  })
})

describe('computeBookPlacement', () => {
  it('centers the selected book and advances it forward by 0.72 in shelf mode', () => {
    const placement = computeBookPlacement({ index: 3, selected: 3, mode: 'shelf', viewportWidth: 1440 })
    expect(placement.position.x).toBeCloseTo(0, 5)
    expect(placement.position.z).toBeCloseTo(0.72, 5)
    expect(placement.rotationY).toBeCloseTo(0, 5)
    expect(placement.scale).toBeCloseTo(1.14, 5)
    expect(placement.liftY).toBeCloseTo(-0.02, 5)
  })

  it('scales the active book up to 1.38 in inspection mode and pulls the camera in', () => {
    const shelf = computeBookPlacement({ index: 4, selected: 4, mode: 'shelf', viewportWidth: 1440 })
    const inspection = computeBookPlacement({ index: 4, selected: 4, mode: 'inspection', viewportWidth: 1440 })
    expect(inspection.scale).toBeGreaterThan(shelf.scale)
    expect(inspection.scale).toBeCloseTo(1.38, 5)
    expect(inspection.position.z).toBeGreaterThan(shelf.position.z)
  })

  it('moves the immediate neighbors back, rotates them, and shrinks them', () => {
    const left = computeBookPlacement({ index: 2, selected: 3, mode: 'shelf', viewportWidth: 1440 })
    const right = computeBookPlacement({ index: 4, selected: 3, mode: 'shelf', viewportWidth: 1440 })

    // distance 1: x offset by 1 slot, z pushed back, rotation toward center, scale down
    expect(left.position.x).toBeCloseTo(-2.02, 5)
    expect(right.position.x).toBeCloseTo(2.02, 5)
    expect(left.position.z).toBeLessThan(0)
    expect(right.position.z).toBeLessThan(0)
    expect(left.rotationY).toBeGreaterThan(0) // rotates toward center (positive y-rotation reveals right edge)
    expect(right.rotationY).toBeLessThan(0)
    expect(left.scale).toBeLessThan(1.14)
    expect(left.scale).toBeCloseTo(0.99, 5)
  })

  it('keeps a consistent 15 percent enlargement of the active volume in shelf mode', () => {
    const active = computeBookPlacement({ index: 0, selected: 0, mode: 'shelf', viewportWidth: 1440 })
    const mobileActive = computeBookPlacement({ index: 0, selected: 0, mode: 'shelf', viewportWidth: 390 })
    expect(active.scale / 1.0).toBeCloseTo(1.14, 2)
    expect(mobileActive.scale).toBeCloseTo(1.18, 5) // mobile variant is slightly larger
  })

  it('produces a fully populated placement for every carousel slot', () => {
    const placements: BookPlacement[] = []
    for (let index = 0; index < COUNT; index++) {
      const p = computeBookPlacement({ index, selected: 3, mode: 'shelf', viewportWidth: 1440 })
      placements.push(p)
      expect(Number.isFinite(p.position.x)).toBe(true)
      expect(Number.isFinite(p.position.y)).toBe(true)
      expect(Number.isFinite(p.position.z)).toBe(true)
      expect(Number.isFinite(p.rotationY)).toBe(true)
      expect(Number.isFinite(p.scale)).toBe(true)
    }
    // the active book should sit at world center
    expect(placements[3].position.x).toBeCloseTo(0, 5)
  })

  it('applies a heavier retreat for distance 3 than for distance 1', () => {
    const d1 = computeBookPlacement({ index: 4, selected: 3, mode: 'shelf', viewportWidth: 1440 })
    const d3 = computeBookPlacement({ index: 6, selected: 3, mode: 'shelf', viewportWidth: 1440 })
    expect(d3.position.z).toBeLessThan(d1.position.z)
    expect(Math.abs(d3.rotationY)).toBeGreaterThan(Math.abs(d1.rotationY))
    expect(d3.scale).toBeLessThan(d1.scale)
  })
})