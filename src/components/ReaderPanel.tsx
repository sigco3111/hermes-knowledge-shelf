import { useEffect, useRef } from 'react'
import { BOOKS } from '../data/books'
import { useShelfStore } from '../store/shelfStore'

export function ReaderPanel() {
  const selectedIndex = useShelfStore((state) => state.selectedIndex)
  const close = useShelfStore((state) => state.close)
  const next = useShelfStore((state) => state.next)
  const previous = useShelfStore((state) => state.previous)
  const closeButton = useRef<HTMLButtonElement>(null)
  const book = selectedIndex === null ? null : BOOKS[selectedIndex]

  useEffect(() => {
    if (book) closeButton.current?.focus()
  }, [book])

  if (!book || selectedIndex === null) return null
  return (
    <aside className="reader" role="dialog" aria-modal="true" aria-labelledby="reader-title" data-testid="reader">
      <div className="reader__topline">
        <span>{book.kicker}</span><span>{String(selectedIndex + 1).padStart(2, '0')} / 07</span>
      </div>
      <button ref={closeButton} className="icon-button reader__close" onClick={close} aria-label="리더 닫기">×</button>
      <div className="reader__scroll">
        <p className="reader__eyebrow">HERMES KNOWLEDGE SHELF</p>
        <h2 id="reader-title">{book.title}</h2>
        <p className="reader__summary">{book.summary}</p>
        <div className="reader__rule" style={{ background: book.accent }} />
        {book.sections.map((section) => (
          <section key={section.heading}>
            <h3>{section.heading}</h3>
            <p>{section.body}</p>
          </section>
        ))}
        <p className="reader__notice">공개 데모용 익명 샘플 데이터</p>
      </div>
      <nav className="reader__nav" aria-label="책 이동">
        <button onClick={previous} aria-label="이전 책"><span>←</span> 이전</button>
        <button onClick={next} aria-label="다음 책">다음 <span>→</span></button>
      </nav>
    </aside>
  )
}
