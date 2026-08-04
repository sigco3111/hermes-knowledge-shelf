import { describe, expect, it } from 'vitest'
import {
  buildFoilMaterial,
  buildCoverMaterial,
  buildPageMaterial,
  buildWoodMaterial,
  buildHeadbandMaterial,
  clothNormalWeights,
  normalMapCellCount,
} from '../src/three/materials'

describe('cover material (cloth)', () => {
  it('uses the cloth-roughness band 0.65–0.80', () => {
    const mat = buildCoverMaterial('#354767', null)
    const r = (mat as any).roughness as number
    expect(r).toBeGreaterThanOrEqual(0.65)
    expect(r).toBeLessThanOrEqual(0.8)
  })

  it('is non-metallic (metalness <= 0.05) so only foil picks up specular', () => {
    const mat = buildCoverMaterial('#354767', null)
    expect((mat as any).metalness as number).toBeLessThanOrEqual(0.05)
  })
})

describe('foil material', () => {
  it('uses the metallic band 0.8–1.0 with low roughness 0.2', () => {
    const mat = buildFoilMaterial('#e8c783')
    const m = (mat as any).metalness as number
    const r = (mat as any).roughness as number
    expect(m).toBeGreaterThanOrEqual(0.8)
    expect(m).toBeLessThanOrEqual(1.0)
    expect(r).toBeLessThanOrEqual(0.25)
  })

  it('emits a separate material instance per call (no global cache leak)', () => {
    const a = buildFoilMaterial('#e8c783')
    const b = buildFoilMaterial('#e8c783')
    expect(a).not.toBe(b)
  })
})

describe('page material', () => {
  it('is matte with high roughness to read as paper, not glossy board', () => {
    const mat = buildPageMaterial('#ddd4c3')
    const r = (mat as any).roughness as number
    expect(r).toBeGreaterThanOrEqual(0.9)
  })
})

describe('wood material', () => {
  it('is mid-roughness, non-metallic', () => {
    const mat = buildWoodMaterial('#3b2118')
    expect((mat as any).metalness as number).toBeLessThanOrEqual(0.05)
    const r = (mat as any).roughness as number
    expect(r).toBeGreaterThanOrEqual(0.4)
    expect(r).toBeLessThanOrEqual(0.85)
  })
})

describe('headband material', () => {
  it('has lower roughness than the cover so the band stays distinct', () => {
    const cover = buildCoverMaterial('#354767', null)
    const band = buildHeadbandMaterial('#765f8e')
    expect((band as any).roughness as number).toBeLessThan((cover as any).roughness as number)
  })
})

describe('cloth normal map builder (RED — fibers)', () => {
  it('emits weights that bias fine detail over broad strokes', () => {
    const weights = clothNormalWeights()
    // 70%+ of the weight budget should land on sub-pixel fibers
    const fine = weights.fiber + weights.microSpeckle
    const coarse = weights.broadWeave
    expect(fine).toBeGreaterThan(coarse)
  })

  it('limits the per-cell fiber count so the result reads as fabric, not screen-door', () => {
    expect(normalMapCellCount()).toBeLessThan(64)
    expect(normalMapCellCount()).toBeGreaterThan(8)
  })
})