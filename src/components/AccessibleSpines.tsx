import { BOOKS } from '../data/books'
import { useShelfStore } from '../store/shelfStore'

export function AccessibleSpines() {
  const selectedIndex = useShelfStore((state) => state.selectedIndex)
  const select = useShelfStore((state) => state.select)
  return (
    <nav className="spine-nav" aria-label="지식 서가 7권">
      {BOOKS.map((book, index) => (
        <button key={book.id} className={selectedIndex === index ? 'is-selected' : ''}
          style={{ '--accent': book.accent } as React.CSSProperties}
          data-testid="book-spine" aria-label={`${book.title} 열기`} aria-pressed={selectedIndex === index}
          onClick={() => select(index)}>
          <span>{String(index + 1).padStart(2, '0')}</span><strong>{book.title}</strong>
        </button>
      ))}
    </nav>
  )
}
