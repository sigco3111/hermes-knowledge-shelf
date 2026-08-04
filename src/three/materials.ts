import * as THREE from 'three'

/**
 * Pure material factories for the knowledge shelf.
 *
 * These are intentionally side-effect free: no shared cache, no global
 * singletons. Every volume gets its own material instance so the per-book
 * accent color and roughness band stays correct under HMR and test.
 *
 * Material bands follow the brief:
 *   - cover:   roughness 0.65–0.80, metalness ≈ 0 (matte cloth)
 *   - foil:    metalness 0.8–1.0, roughness ≤ 0.25 (only this picks up specular)
 *   - page:    roughness ≥ 0.9 (matte paper)
 *   - wood:    roughness 0.4–0.85, metalness ≈ 0 (matte walnut)
 *   - headband: roughness < cover.roughness (subtle highlight)
 */

export type ClothNormalWeights = {
  broadWeave: number
  fiber: number
  microSpeckle: number
}

/**
 * The cloth normal map is intentionally built from a higher proportion of
 * fine fiber cells than broad weave strokes. This keeps the surface
 * reading as fabric and not as a screen-door pattern when the cover is
 * viewed at distance.
 */
export function clothNormalWeights(): ClothNormalWeights {
  return {
    broadWeave: 0.16,
    fiber: 0.54,
    microSpeckle: 0.3,
  }
}

export function normalMapCellCount(): number {
  // 16×16 grid → 256 sub-cells of fiber detail. Restrained enough that
  // the result still tessellates without producing visible repetition.
  return 16
}

const TARGET_COVER_ROUGHNESS = 0.74
const TARGET_FOIL_METALNESS = 0.92
const TARGET_FOIL_ROUGHNESS = 0.2

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

export function buildCoverMaterial(
  accent: string,
  clothTexture: THREE.Texture | null,
): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: clothTexture ?? undefined,
    bumpMap: clothTexture ?? undefined,
    bumpScale: 0.012,
    roughness: clamp(TARGET_COVER_ROUGHNESS, 0.65, 0.8),
    metalness: 0.02,
  })
}

export function buildFoilMaterial(color: string): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: clamp(TARGET_FOIL_ROUGHNESS, 0.05, 0.25),
    metalness: clamp(TARGET_FOIL_METALNESS, 0.8, 1.0),
    emissive: new THREE.Color(color).multiplyScalar(0.06),
  })
}

export function buildPageMaterial(color: string): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.94,
    metalness: 0.0,
  })
}

export function buildWoodMaterial(color: string): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.66,
    metalness: 0.0,
  })
}

export function buildHeadbandMaterial(color: string): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.04,
  })
}

/**
 * Computes the foil forward offset (in scene units) so the foil mesh sits
 * exactly 0.003 in front of the cover front face. Exported as a function
 * for symmetry with the other pure helpers.
 */
export const FOIL_FORWARD_OFFSET = 0.003