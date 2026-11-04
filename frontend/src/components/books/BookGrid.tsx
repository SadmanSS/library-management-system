import type { Book, Route } from '../../types'
import { BookCard } from './BookCard'

export function BookGrid({ books, onNavigate }: { books: Book[]; onNavigate: (path: Route, query?: string) => void }) {
  return <div className="book-grid">{books.map((book) => <BookCard book={book} onNavigate={onNavigate} key={book.id} />)}</div>
}
