import type { Book, Route } from '../../types'
import { BookCard } from './BookCard'

export function BookGrid({ books, onNavigate, onDelete }: { books: Book[]; onNavigate: (path: Route, query?: string) => void; onDelete: (book: Book) => void }) {
  return <div className="book-grid">{books.map((book) => <BookCard book={book} onNavigate={onNavigate} onDelete={onDelete} key={book.id} />)}</div>
}
