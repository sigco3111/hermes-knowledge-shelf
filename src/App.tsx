import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useEffect } from 'react'
import { AccessibleSpines } from './components/AccessibleSpines'
import { ReaderPanel } from './components/ReaderPanel'
import { ShelfScene } from './components/ShelfScene'
import { useShelfStore } from './store/shelfStore'
import './App.css'

function App() {
  const selectedIndex = useShelfStore((state) => state.selectedIndex)
  const close = useShelfStore((state) => state.close)
  const next = useShelfStore((state) => state.next)
  const previous = useShelfStore((state) => state.previous)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, next, previous])

  return (
    <main className={selectedIndex === null ? 'app' : 'app has-selection'}>
      <header className="masthead">
        <a className="brand" href="#shelf" aria-label="에르메스 지식 서재 홈">
          <span className="brand__mark">H</span>
          <span><strong>Hermes Knowledge Shelf</strong><small>에르메스 지식 서재</small></span>
        </a>
        <div className="masthead__meta"><span>PUBLIC SAMPLE</span><span>07 VOLUMES</span></div>
      </header>
      <section id="shelf" className="stage" aria-label="3D 지식 서가">
        <div className="stage__copy">
          <p>SELECTED KNOWLEDGE · PUBLIC BY DESIGN</p>
          <h1>일곱 권으로 읽는<br /><em>에르메스의 지식 흐름</em></h1>
          <span>책을 선택해 중앙으로 불러오세요</span>
        </div>
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0.3, 11.8], fov: 38 }} gl={{ antialias: true, alpha: false }}>
          <ShelfScene />
          <ContactShadows position={[0, -3.02, 0.5]} opacity={0.55} scale={14} blur={2.6} far={5} />
        </Canvas>
        <div className="stage__index">ARCHIVE / 01—07</div>
      </section>
      <AccessibleSpines />
      <ReaderPanel />
      <footer className="footnote"><span>← → 탐색 · ESC 닫기</span><span>익명 공개 샘플만 사용</span></footer>
    </main>
  )
}

export default App
