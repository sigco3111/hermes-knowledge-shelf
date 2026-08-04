import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import * as THREE from 'three'
import { BOOKS } from '../data/books'
import { useShelfStore } from '../store/shelfStore'
import { getClothTexture } from './clothTexture'
import { getCoverTitleTexture } from './coverTexture'
import {
  buildAllParts,
  cameraKeyframeFor,
  defaultBookmarkFor,
  defaultSpineMaterial,
  lightingRig,
  resolvePlacement,
} from '../three/bookModel'
import { buildCoverMaterial, buildWoodMaterial } from '../three/materials'

const COVER_WIDTH = 1.72
const COVER_HEIGHT = 2.62

/**
 * Render one volume by walking the part list emitted by buildAllParts.
 * Pure helper data drives every transform — see bookModel.ts.
 *
 * Note: the foil stamp is now part of buildAllParts (foilBoard in bookModel),
 * rendered as a separate mesh that sits 0.003 in front of the cover with its
 * own metallic material. The legacy FoilMotif lineLoop has been removed so
 * the shelf no longer renders two competing foil surfaces.
 */
function Volume({ index }: { index: number }) {
  const book = BOOKS[index]
  const selected = useShelfStore((state) => state.selectedIndex)
  const mode = useShelfStore((state) => state.mode)
  const select = useShelfStore((state) => state.select)
  const open = useShelfStore((state) => state.open)
  const ref = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)

  // Build all parts for this volume once. Materials use the procedural cloth
  // texture so every panel reads as bound fabric.
  const clothTexture = useMemo(() => getClothTexture(book.accent), [book.accent])
  const titleTexture = useMemo(() => getCoverTitleTexture(book.title, index, book.accent), [book.title, book.accent, index])
  const materials = useMemo(
    () => ({
      coverMaterial: buildCoverMaterial(book.accent, clothTexture),
      spineMaterial: defaultSpineMaterial(clothTexture),
    }),
    [book.accent, clothTexture],
  )
  const parts = useMemo(
    () =>
      buildAllParts(
        () => materials,
        defaultBookmarkFor,
      )[index],
    [index, materials],
  )

  useFrame((state, delta) => {
    if (!ref.current) return
    const viewportWidth = state.size.width
    const placement = resolvePlacement(index, selected, mode, viewportWidth)
    const ease = 1 - Math.exp(-delta * (placement.distance === 0 ? 8 : 6))

    if (Math.abs(placement.position.x - ref.current.position.x) > 9) {
      ref.current.position.x = placement.position.x
    }
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, placement.position.x, ease)
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, placement.position.y + (hovered && placement.distance === 0 && mode !== 'inspection' ? 0.05 : 0), ease)
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, placement.position.z, ease)
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, placement.rotationY, ease)
    const nextScale = THREE.MathUtils.lerp(ref.current.scale.x, placement.scale, ease)
    ref.current.scale.setScalar(nextScale)
  })

  const initialPlacement = resolvePlacement(index, selected, mode, typeof window === 'undefined' ? 1440 : window.innerWidth)

  return (
    <group
      ref={ref}
      position={[initialPlacement.position.x, initialPlacement.position.y, initialPlacement.position.z]}
      onClick={(event) => {
        event.stopPropagation()
        if (index === selected) open()
        else select(index)
      }}
      onPointerEnter={() => {
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerLeave={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      {parts.map((part, partIndex) => (
        <mesh
          key={`${index}-${part.slot}-${partIndex}`}
          position={part.position}
          castShadow={part.castShadow}
          receiveShadow={part.receiveShadow}
          geometry={part.geometry}
          material={part.material}
        />
      ))}

      {/* Title texture floats 0.003 in front of the cover so it catches light
          like foil without competing with the actual foil motif. Cover
          center is at z=0, so front face sits at z=0.24. */}
      <mesh position={[0, 0, 0.24 + 0.003]}>
        <planeGeometry args={[COVER_WIDTH - 0.18, COVER_HEIGHT - 0.1]} />
        <meshBasicMaterial map={titleTexture} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      <Text position={[0, -COVER_HEIGHT / 2 - 0.07, 0.247]} fontSize={0.042} color="#bda886" anchorX="center" anchorY="middle" letterSpacing={0.16}>
        {String(index + 1).padStart(2, '0')}
      </Text>
    </group>
  )
}

function CinematicCamera() {
  const mode = useShelfStore((state) => state.mode)
  const { camera, size } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if ('fov' in camera) {
      // set FOV initially so SSR vs CSR don't disagree by a hair
      const initial = cameraKeyframeFor(mode, size.width)
      ;(camera as THREE.PerspectiveCamera).fov = initial.fov
      ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
    }
  }, [camera, mode, size.width])

  useFrame((_, delta) => {
    const ease = 1 - Math.exp(-delta * 5)
    const keyframe = cameraKeyframeFor(mode, size.width)
    if ('fov' in camera) {
      const persp = camera as THREE.PerspectiveCamera
      persp.fov = THREE.MathUtils.lerp(persp.fov, keyframe.fov, ease)
      persp.updateProjectionMatrix()
    }
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, keyframe.position[0], ease)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, keyframe.position[1], ease)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, keyframe.position[2], ease)
    lookTarget.set(camera.position.x, keyframe.lookY, 0)
    target.lerp(lookTarget, ease)
    camera.lookAt(target)
  })
  return null
}

function WalnutShelf() {
  // Build the wood material once per shelf — pure walnut tone, mid-roughness,
  // no metalness so it reads as stained timber rather than lacquer.
  const wood = useMemo(() => buildWoodMaterial('#3b2118'), [])
  const woodAccent = useMemo(() => buildWoodMaterial('#5a3324'), [])
  const woodShadow = useMemo(() => buildWoodMaterial('#24130f'), [])
  const woodDeep = useMemo(() => buildWoodMaterial('#130b09'), [])
  const woodPlank = useMemo(() => buildWoodMaterial('#2b1712'), [])
  const woodRim = useMemo(() => buildWoodMaterial('#4a2a1d'), [])

  return (
    <group position={[0, -1.82, -0.16]}>
      <mesh position={[0, 0.58, -0.78]} receiveShadow castShadow material={woodAccent}>
        <boxGeometry args={[32, 0.11, 0.16]} />
      </mesh>
      <mesh position={[0, 0.25, -0.04]} receiveShadow castShadow material={wood}>
        <boxGeometry args={[32, 0.2, 2.34]} />
      </mesh>
      <mesh position={[0, 0.365, 0.04]} receiveShadow material={woodAccent}>
        <boxGeometry args={[32, 0.035, 2.12]} />
      </mesh>
      <mesh position={[0, 0.14, 0.96]} receiveShadow castShadow material={woodRim}>
        <boxGeometry args={[32, 0.18, 0.16]} />
      </mesh>
      <mesh position={[0, -0.01, 0.91]} receiveShadow castShadow material={woodShadow}>
        <boxGeometry args={[32, 0.3, 0.26]} />
      </mesh>
      <mesh position={[0, -0.2, 0.98]} receiveShadow castShadow material={woodAccent}>
        <boxGeometry args={[32, 0.12, 0.38]} />
      </mesh>
      <mesh position={[0, -0.34, 1.02]} receiveShadow castShadow material={woodPlank}>
        <boxGeometry args={[32, 0.105, 0.47]} />
      </mesh>
      <mesh position={[0, -0.47, 1.06]} receiveShadow castShadow material={woodAccent}>
        <boxGeometry args={[32, 0.095, 0.54]} />
      </mesh>
      <mesh position={[0, -0.575, 1.08]} receiveShadow material={woodDeep}>
        <boxGeometry args={[32, 0.035, 0.56]} />
      </mesh>
    </group>
  )
}

export function ShelfScene() {
  const rig = useMemo(() => lightingRig(), [])
  return (
    <>
      <color attach="background" args={['#202025']} />
      <fog attach="fog" args={['#202025', 14, 28]} />
      <CinematicCamera />
      <hemisphereLight color={rig.ambient.skyColor} groundColor={rig.ambient.groundColor} intensity={rig.ambient.intensity} />
      <directionalLight
        position={rig.key.position}
        intensity={rig.key.intensity}
        color={rig.key.color}
        castShadow={rig.key.castShadow}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00035}
      />
      <directionalLight position={rig.fill.position} intensity={rig.fill.intensity} color={rig.fill.color} />
      <directionalLight position={rig.rim.position} intensity={rig.rim.intensity} color={rig.rim.color} />
      <pointLight position={rig.foilPop.position} intensity={rig.foilPop.intensity} color={rig.foilPop.color} distance={rig.foilPop.distance} />
      <group position={[0, 0, 0]}>
        {BOOKS.map((book, index) => (
          <Volume key={book.id} index={index} />
        ))}
        <WalnutShelf />
      </group>
    </>
  )
}

// Convenience re-export so any test that needs the materials/parts can
// resolve them from a single import path without reaching into data files.
export { buildAllParts as _buildAllParts } from '../three/bookModel'
