import { useEffect, useRef } from 'react'
import { BOOKS } from '../data/books'
import { useShelfStore } from '../store/shelfStore'

export function ReaderPanel() {
  const selectedIndex = useShelfStore((state) => state.selectedIndex)
  const mode = useShelfStore((state) => state.mode)
  const close = useShelfStore((state) => state.close)
  const next = useShelfStore((state) => state.next)
  const previous = useShelfStore((state) => state.previous)
  const backButton = useRef<HTMLButtonElement>(null)
  const book = BOOKS[selectedIndex]

  useEffect(() => {
    if (mode === 'inspection') backButton.current?.focus()
  }, [mode])

  if (mode !== 'inspection') return null

  return (
    <section
      className="inspection"
      data-testid="inspection-mode"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspection-title"
      style={{ '--book-accent': book.accent } as React.CSSProperties}
    >
      <div className="inspection__shade" />
      <div className="inspection__book" aria-hidden="true">
        <div className="inspection__cover">
          <span className={`cover-motif cover-motif--${selectedIndex + 1}`} />
          <small>{String(selectedIndex + 1).padStart(2, '0')} · HERMES ARCHIVE</small>
          <strong>{book.title}</strong>
          <i>PUBLIC KNOWLEDGE VOLUME</i>
        </div>
        <div className="inspection__pages" />
      </div>

      <article className="inspection__spread">
        <header className="inspection__topline">
          <span>{book.kicker}</span>
          <span>{String(selectedIndex + 1).padStart(2, '0')} / 07</span>
        </header>
        <div className="inspection__copy">
          <p className="inspection__eyebrow">SELECTED PUBLIC KNOWLEDGE</p>
          <h2 id="inspection-title">{book.title}</h2>
          <p className="inspection__summary">{book.summary}</p>
          <div className="inspection__rule" />
          <div className="inspection__sections">
            {book.sections.map((section) => (
              <section key={section.heading}>
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
          <p className="inspection__notice">PUBLIC DEMO · ANONYMOUS SAMPLE DATA</p>
        </div>
      </article>

      <button ref={backButton} className="inspection__back" onClick={close} aria-label="BACK">
        <span aria-hidden="true">←</span> BACK
      </button>
      <nav className="inspection__nav" aria-label="inspection 책 이동">
        <button onClick={previous} aria-label="inspection 이전 책">‹</button>
        <span>{String(selectedIndex + 1).padStart(2, '0')} / 07</span>
        <button onClick={next} aria-label="inspection 다음 책">›</button>
      </nav>
    </section>
  )
}
