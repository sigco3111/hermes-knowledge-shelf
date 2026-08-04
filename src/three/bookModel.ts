import * as THREE from 'three'
import { BOOKS } from '../data/books'
import { computeBookPlacement } from './bookPlacement'
import type { ShelfMode } from './bookPlacement'
import {
  buildCoverMaterial,
  buildFoilMaterial,
  buildHeadbandMaterial,
  buildPageMaterial,
  buildWoodMaterial,
  FOIL_FORWARD_OFFSET,
} from './materials'

/**
 * Multi-part book geometry for a bound volume.
 *
 * The previous MVP rendered each book as a single box with a single map,
 * which read as a flat card under the angled neighbors. The complete shelf
 * silhouette needs the eye to find:
 *
 *   - the front board (the cloth cover, with foil motif + title)
 *   - the back board (slightly oversized, slight darker tone)
 *   - a segmented spine with three cloth panels and two hinge grooves
 *   - an inset paper block made from two stacked layers (cream + amber)
 *   - thin page-edge slats along the top, bottom, and fore-edge
 *   - headbands at the head and tail of the spine
 *   - an optional bookmark ribbon hanging from the head
 *
 * Every part is a primitive geometry. No external assets, no shaders —
 * the parts are stitched by parent transforms so they always sit in the
 * same coordinate system as the volume's pivot.
 */

export type BookPartMesh = {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  position: [number, number, number]
  castShadow: boolean
  receiveShadow: boolean
  /** parent slot this part belongs to — used for debugging/test introspection */
  slot: 'cover' | 'spine' | 'paper' | 'edge' | 'headband' | 'hinge' | 'ribbon' | 'foil' | 'wood'
}

export type BookPartSpec = BookPartMesh[]

export type BookModelInput = {
  index: number
  accent: string
  bookmark: boolean
}

export const BOOK_PART_SLOTS = [
  'cover',
  'spine',
  'paper',
  'edge',
  'headband',
  'hinge',
  'ribbon',
  'foil',
  'wood',
] as const

// Front cover geometry: the cloth board is the dominant silhouette piece.
// 1.72 × 2.62 × 0.48 matches the catalogue's BOOK_WIDTH/BOOK_HEIGHT/BOOK_DEPTH.
const COVER_GEOMETRY = new THREE.BoxGeometry(1.72, 2.62, 0.48)
const FOIL_GEOMETRY = new THREE.PlaneGeometry(1.0, 1.0, 1, 1)
const COVER_FRONT_Z = 0.24

/**
 * Front cover (cloth board + inset title texture + foil motif). The cover
 * board is the largest single part so it sets the silhouette.
 */
function frontBoard(accent: string, coverMaterial: THREE.Material): BookPartMesh {
  return {
    geometry: COVER_GEOMETRY,
    material: coverMaterial,
    position: [0, 0, 0],
    castShadow: true,
    receiveShadow: true,
    slot: 'cover',
  }
}

/**
 * Foil plane — a thin sheet sitting 0.003 in front of the cover that
 * carries the line motif. Distinct material (metalness 0.92 / roughness
 * 0.2) so only this surface picks up the specular highlights under
 * raking light, exactly like a real foil stamp.
 */
function foilBoard(index: number): BookPartMesh {
  // Different accent per book so each cover's foil reads independently
  const color = index === 3 || index === 4 ? '#191715' : '#e8c783'
  return {
    geometry: FOIL_GEOMETRY,
    material: buildFoilMaterial(color),
    position: [0, 0, COVER_FRONT_Z + FOIL_FORWARD_OFFSET],
    castShadow: false,
    receiveShadow: false,
    slot: 'foil',
  }
}

/**
 * Back board: slightly wider and taller than the cover so the binding lip
 * peeks past the cloth and gives the row a visible "thickness".
 */
function backBoard(): BookPartMesh {
  const geo = new THREE.BoxGeometry(1.755, 2.645, 0.045)
  return {
    geometry: geo,
    material: new THREE.MeshStandardMaterial({ color: '#241613', roughness: 0.84 }),
    position: [0, 0, -0.265],
    castShadow: true,
    receiveShadow: true,
    slot: 'spine',
  }
}

/**
 * Segmented spine — three narrow panels on the left edge so the binding
 * reads as three raised bands under raking light. Each panel has its own
 * cloth board geometry, with thin hinge grooves between them.
 */
function spinePanels(accent: string, spineMaterial: THREE.Material): BookPartMesh[] {
  const panelWidth = 0.18
  const totalWidth = panelWidth * 3 + 0.02 * 2
  const startX = -0.86 + (0.18 - totalWidth) / 2 + panelWidth / 2
  const panels: BookPartMesh[] = []
  for (let i = 0; i < 3; i++) {
    panels.push({
      geometry: new THREE.BoxGeometry(panelWidth, 2.5, 0.04),
      material: spineMaterial,
      position: [startX + i * (panelWidth + 0.02), 0, 0.21],
      castShadow: true,
      receiveShadow: true,
      slot: 'spine',
    })
  }
  // Hinge grooves: thin dark channels between spine panels
  for (let i = 0; i < 2; i++) {
    panels.push({
      geometry: new THREE.BoxGeometry(0.022, 2.46, 0.02),
      material: new THREE.MeshStandardMaterial({ color: '#0e0908', roughness: 0.92 }),
      position: [startX + panelWidth + i * (panelWidth + 0.02), 0, 0.213],
      castShadow: false,
      receiveShadow: true,
      slot: 'hinge',
    })
  }
  return panels
}

/**
 * Inset paper block — a cream-colored slab slightly narrower than the cover
 * so it disappears behind the cover when viewed head-on but exposes the
 * page edge when the row rotates a neighbor. A second, slightly recessed
 * amber layer sits behind it for depth.
 */
function paperBlock(): BookPartMesh[] {
  return [
    {
      geometry: new THREE.BoxGeometry(0.24, 2.41, 0.42),
      material: buildPageMaterial('#ddd4c3'),
      position: [0.86 - 0.12, 0, -0.02],
      castShadow: true,
      receiveShadow: true,
      slot: 'paper',
    },
    {
      geometry: new THREE.BoxGeometry(0.18, 2.39, 0.4),
      material: buildPageMaterial('#c9b994'),
      position: [0.86 - 0.09, 0, -0.05],
      castShadow: false,
      receiveShadow: true,
      slot: 'paper',
    },
  ]
}

/**
 * Page-edge layers: three thin slabs along the fore-edge to give the eye a
 * stack of pages instead of a single slab.
 */
function pageEdgeLayers(): BookPartMesh[] {
  return [
    {
      geometry: new THREE.BoxGeometry(0.085, 2.41, 0.024),
      material: buildPageMaterial('#e9e1d2'),
      position: [0.86 - 0.04, 0, 0.225],
      castShadow: true,
      receiveShadow: true,
      slot: 'edge',
    },
    {
      geometry: new THREE.BoxGeometry(0.05, 2.41, 0.018),
      material: buildPageMaterial('#cdbfa6'),
      position: [0.86 - 0.024, 0, 0.225],
      castShadow: false,
      receiveShadow: true,
      slot: 'edge',
    },
    {
      geometry: new THREE.BoxGeometry(0.018, 2.41, 0.014),
      material: buildPageMaterial('#9b8d75'),
      position: [0.86 - 0.01, 0, 0.225],
      castShadow: false,
      receiveShadow: true,
      slot: 'edge',
    },
  ]
}

/**
 * Headbands: narrow colored stripes at the head and tail of the spine.
 * They are placed flush with the page block so they peek out as a tiny
 * band of contrasting color.
 */
function headbands(accent: string): BookPartMesh[] {
  const accentA = new THREE.Color(accent)
  const tail = new THREE.Color('#7a6448')
  const mix = accentA.clone().lerp(tail, 0.55)
  const color = `#${mix.getHexString()}`
  return [
    {
      geometry: new THREE.BoxGeometry(0.2, 0.05, 0.46),
      material: buildHeadbandMaterial(color),
      position: [0.78, 1.2, -0.02],
      castShadow: false,
      receiveShadow: true,
      slot: 'headband',
    },
    {
      geometry: new THREE.BoxGeometry(0.2, 0.05, 0.46),
      material: buildHeadbandMaterial(color),
      position: [0.78, -1.2, -0.02],
      castShadow: false,
      receiveShadow: true,
      slot: 'headband',
    },
  ]
}

/**
 * Optional bookmark ribbon: a thin strip that hangs from the head and
 * curves downward. Only attached for half the catalogue so the shelf
 * still reads as a series rather than a uniform set.
 */
function bookmarkRibbon(accent: string): BookPartMesh {
  const accentA = new THREE.Color(accent)
  const mixed = accentA.clone().lerp(new THREE.Color('#f1d99a'), 0.35)
  return {
    geometry: new THREE.BoxGeometry(0.04, 1.5, 0.008),
    material: new THREE.MeshStandardMaterial({
      color: `#${mixed.getHexString()}`,
      roughness: 0.7,
      metalness: 0.05,
    }),
    position: [0.4, -1.85, 0.16],
    castShadow: false,
    receiveShadow: false,
    slot: 'ribbon',
  }
}

/**
 * Compose all parts for a single volume. Order in the returned array is
 * draw order; back-to-front: back board, spine, paper, edges, headbands,
 * ribbon (optional), then cover, then the foil plane that sits 0.003 in
 * front of the cover.
 */
export function buildBookParts(input: BookModelInput, materials: BookMaterials): BookPartSpec {
  const parts: BookPartSpec = [
    backBoard(),
    ...spinePanels(input.accent, materials.spineMaterial),
    ...paperBlock(),
    ...pageEdgeLayers(),
    ...headbands(input.accent),
  ]
  if (input.bookmark) parts.push(bookmarkRibbon(input.accent))
  // cover on top so the title texture is the last thing drawn
  parts.push(frontBoard(input.accent, materials.coverMaterial))
  // foil stamp sits 0.003 in front of the cover, separate material so
  // only this surface reacts to specular highlights
  parts.push(foilBoard(input.index))
  return parts
}

export type BookMaterials = {
  coverMaterial: THREE.Material
  spineMaterial: THREE.Material
}

/**
 * Per-cover material factory. Cover materials are now sourced from
 * ./materials.ts (buildCoverMaterial) so all four material bands — cover,
 * foil, page, wood — live in a single place with the same roughness /
 * metalness discipline.
 */
export type CoverMaterialFactory = (accent: string) => THREE.Material

export function defaultSpineMaterial(texture: THREE.Texture | null): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color: '#3a2a23',
    map: texture ?? undefined,
    roughness: 0.78,
    metalness: 0.02,
    bumpMap: texture ?? undefined,
    bumpScale: 0.006,
  })
}

/**
 * Convenience: derives the full part list for every volume in the public
 * catalogue using the materials resolved by the caller.
 */
export function buildAllParts(
  materialsForBook: (index: number, accent: string) => BookMaterials,
  bookmarkFor: (index: number) => boolean,
): BookPartSpec[] {
  return BOOKS.map((book, index) => {
    const materials = materialsForBook(index, book.accent)
    return buildBookParts(
      { index, accent: book.accent, bookmark: bookmarkFor(index) },
      materials,
    )
  })
}

/**
 * A simple per-index predicate that places a bookmark on every other book.
 * Pure function — exported so tests can assert the deterministic pattern.
 */
export function defaultBookmarkFor(index: number): boolean {
  return index % 2 === 0
}

/**
 * Cinematic camera keyframes for the 3D knowledge shelf. Both the position
 * and FOV are returned as data so the renderer can interpolate.
 */
export type CameraKeyframe = {
  position: [number, number, number]
  fov: number
  lookY: number
}

export function cameraKeyframeFor(mode: ShelfMode, viewportWidth: number): CameraKeyframe {
  const mobile = viewportWidth <= 700
  if (mode === 'inspection') {
    return {
      position: [0, 0.22, 7.4],
      fov: 38,
      lookY: 0.05,
    }
  }
  return {
    position: [0, mobile ? 0.16 : 0.34, mobile ? 14.4 : 11.6],
    fov: mobile ? 28 : 32,
    lookY: mobile ? -0.12 : -0.18,
  }
}

/**
 * Lighting rig for the shelf. Three-point (warm key, cool fill, warm rim)
 * plus a tight amber point light to bring the gold foil alive without
 * pushing the rest of the row into oversaturation.
 */
export type LightRig = {
  key: { position: [number, number, number]; color: string; intensity: number; castShadow: boolean }
  fill: { position: [number, number, number]; color: string; intensity: number }
  rim: { position: [number, number, number]; color: string; intensity: number }
  ambient: { skyColor: string; groundColor: string; intensity: number }
  foilPop: { position: [number, number, number]; color: string; intensity: number; distance: number }
}

export function lightingRig(): LightRig {
  return {
    key: { position: [2.6, 6.8, 7.4], color: '#fff0d5', intensity: 3.1, castShadow: true },
    fill: { position: [-6.4, 2.6, 4.4], color: '#9eb4d6', intensity: 1.2 },
    rim: { position: [-1.2, 1.4, -5.2], color: '#f6cda2', intensity: 1.6 },
    ambient: { skyColor: '#f3e4cf', groundColor: '#0a090b', intensity: 0.66 },
    foilPop: { position: [0, 1.6, 5.6], color: '#f1d99a', intensity: 9.5, distance: 10 },
  }
}

/**
 * Compute a single volume's world transform using the pure placement
 * helper. Used by the renderer to keep useFrame bodies tiny.
 */
export function resolvePlacement(index: number, selected: number, mode: ShelfMode, viewportWidth: number) {
  return computeBookPlacement({ index, selected, mode, viewportWidth })
}