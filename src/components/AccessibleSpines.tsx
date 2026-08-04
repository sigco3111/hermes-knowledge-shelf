import { BOOKS } from '../data/books'
import { useShelfStore } from '../store/shelfStore'

export function AccessibleSpines() {
  const selectedIndex = useShelfStore((state) => state.selectedIndex)
  const select = useShelfStore((state) => state.select)

  return (
    <div className="book-dom-layer" aria-label="지식 서가 7권 metadata">
      {BOOKS.map((book, index) => (
        <button
          key={book.id}
          className="book-dom-hit"
          data-testid="book-mesh"
          data-book-index={index}
          data-title={book.title}
          data-accent={book.accent}
          aria-label={`${book.title} 선택`}
          aria-pressed={selectedIndex === index}
          onClick={() => select(index)}
        >
          <span className="sr-only">{book.title}</span>
        </button>
      ))}
    </div>
  )
}
