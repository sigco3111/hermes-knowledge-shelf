import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import { BOOKS } from '../data/books'
import { useShelfStore } from '../store/shelfStore'

const positions = [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2]

function Volume({ index }: { index: number }) {
  const book = BOOKS[index]
  const selected = useShelfStore((state) => state.selectedIndex)
  const select = useShelfStore((state) => state.select)
  const ref = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }, delta) => {
    if (!ref.current) return
    const active = selected === index
    const destinationX = active ? 0 : positions[index] + (selected === null ? 0 : positions[index] < 0 ? -0.7 : 0.7)
    ref.current.position.x += (destinationX - ref.current.position.x) * Math.min(1, delta * 5)
    ref.current.position.z += ((active ? 2.05 : 0) - ref.current.position.z) * Math.min(1, delta * 5)
    ref.current.rotation.y += ((active ? -0.08 : hovered ? -0.12 : 0) - ref.current.rotation.y) * Math.min(1, delta * 7)
    ref.current.position.y = -0.2 + (active ? 0.35 : hovered ? 0.1 : 0) + Math.sin(clock.elapsedTime * 1.1 + index) * (active ? 0.018 : 0.006)
  })

  return (
    <group ref={ref} position={[positions[index], -0.2, 0]} onClick={(event) => { event.stopPropagation(); select(index) }}
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <RoundedBox args={[1.12, 4.9, 0.72]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color={book.accent} roughness={0.62} metalness={0.08} />
      </RoundedBox>
      <mesh position={[-0.48, 0, 0.38]} castShadow>
        <boxGeometry args={[0.1, 4.62, 0.035]} />
        <meshStandardMaterial color="#121424" roughness={0.7} />
      </mesh>
      <Text position={[0.04, 0.1, 0.39]} rotation={[0, 0, Math.PI / 2]} fontSize={0.22}
        maxWidth={3.9} color="#10131e" anchorX="center" anchorY="middle">
        {book.title}
      </Text>
      <Text position={[0.03, -2.05, 0.4]} fontSize={0.12} color="#10131e" anchorX="center">
        {String(index + 1).padStart(2, '0')}
      </Text>
    </group>
  )
}

export function ShelfScene() {
  const close = useShelfStore((state) => state.close)
  return (
    <>
      <color attach="background" args={['#080a12']} />
      <fog attach="fog" args={['#080a12', 11, 25]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 9, 8]} intensity={2.6} color="#fff4dc" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-7, 2, 4]} intensity={35} color="#5bdac9" distance={12} />
      <pointLight position={[7, 1, 3]} intensity={28} color="#9d72ff" distance={12} />
      <group position={[0, -0.1, 0]}>
        {BOOKS.map((book, index) => <Volume key={book.id} index={index} />)}
        <mesh position={[0, -2.85, 0]} receiveShadow onClick={close}>
          <boxGeometry args={[11.5, 0.32, 1.8]} />
          <meshStandardMaterial color="#171927" roughness={0.5} metalness={0.22} />
        </mesh>
        <mesh position={[0, 0, -0.62]} receiveShadow>
          <boxGeometry args={[11.5, 6.6, 0.22]} />
          <meshStandardMaterial color="#11131f" roughness={0.8} />
        </mesh>
        <mesh position={[-5.62, 0, 0]}><boxGeometry args={[0.22, 6.6, 1.8]} /><meshStandardMaterial color="#23263a" /></mesh>
        <mesh position={[5.62, 0, 0]}><boxGeometry args={[0.22, 6.6, 1.8]} /><meshStandardMaterial color="#23263a" /></mesh>
        <mesh position={[0, 3.2, 0]}><boxGeometry args={[11.5, 0.22, 1.8]} /><meshStandardMaterial color="#23263a" /></mesh>
      </group>
    </>
  )
}
