import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { AccessibleSpines } from './components/AccessibleSpines'
import { ReaderPanel } from './components/ReaderPanel'
import { ShelfScene } from './components/ShelfScene'
import { BOOKS } from './data/books'
import { useShelfStore } from './store/shelfStore'
import './App.css'

function App() {
  const selectedIndex = useShelfStore((state) => state.selectedIndex)
  const mode = useShelfStore((state) => state.mode)
  const close = useShelfStore((state) => state.close)
  const open = useShelfStore((state) => state.open)
  const select = useShelfStore((state) => state.select)
  const next = useShelfStore((state) => state.next)
  const previous = useShelfStore((state) => state.previous)
  const wheelLock = useRef(0)
  const selectedBook = BOOKS[selectedIndex]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        next()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        previous()
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (mode !== 'shelf') return
      event.preventDefault()
      const now = performance.now()
      if (now < wheelLock.current) return
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (Math.abs(delta) < 6) return
      wheelLock.current = now + 420
      if (delta > 0) next()
      else previous()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
    }
  }, [close, mode, next, previous])

  return (
    <main className={`app app--${mode}`}>
      <header className="masthead" aria-label="에르메스 지식 서재 masthead">
        <div className="masthead__left" data-testid="masthead-left">
          <a href="#shelf" aria-label="에르메스 지식 서재 홈">Hermes Volumes</a>
          <span>SEVEN PUBLIC FIELDS OF KNOWLEDGE</span>
        </div>
        <div className="masthead__edition" data-testid="edition-meta">
          <span>EDITION 02 · 2026</span>
          <span>CHARCOAL · WALNUT · CLOTH</span>
        </div>
      </header>

      <section id="shelf" className="stage" aria-label="한 줄로 놓인 3D 지식 서가">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.36, 13.5], fov: 34, near: 0.1, far: 60 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <ShelfScene />
          <ContactShadows position={[0, -1.7, 0.54]} opacity={0.9} scale={30} blur={1.35} far={2.7} color="#070303" />
        </Canvas>
        <div className="stage__grain" aria-hidden="true" />
        <div className="stage__vignette" aria-hidden="true" />
      </section>

      <AccessibleSpines />

      <footer className="editorial-footer" data-testid="editorial-footer">
        <div className="editorial-footer__copy">
          <div className="editorial-footer__number">
            <span>{String(selectedIndex + 1).padStart(2, '0')}</span>
            <i />
            <span>07</span>
          </div>
          <div>
            <p className="editorial-footer__kicker">{selectedBook.kicker}</p>
            <h1 data-testid="footer-title">{selectedBook.title}</h1>
            <p className="editorial-footer__summary">{selectedBook.summary}</p>
          </div>
        </div>

        <nav className="editorial-footer__controls" aria-label="책 선택 컨트롤">
          <button className="direction-button" onClick={previous} aria-label="이전 책">‹</button>
          <button className="open-button" onClick={open} aria-label="OPEN">
            <span>OPEN</span>
          </button>
          <button className="direction-button" onClick={next} aria-label="다음 책">›</button>
        </nav>

        <div className="editorial-footer__position">
          <nav className="position-markers" aria-label="책 위치 7개">
            {BOOKS.map((book, index) => (
              <button
                key={book.id}
                className={selectedIndex === index ? 'is-active' : ''}
                data-testid="position-marker"
                aria-label={`${index + 1}번 ${book.title} 선택`}
                aria-current={selectedIndex === index ? 'true' : undefined}
                onClick={() => select(index)}
              ><span /></button>
            ))}
          </nav>
          <p>WHEEL · ARROWS · SELECT</p>
        </div>
      </footer>

      <ReaderPanel />
    </main>
  )
}

export default App
