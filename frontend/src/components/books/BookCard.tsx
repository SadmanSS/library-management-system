import type { Book, Route } from '../../types'
import { CoverImage } from './CoverImage'

export function BookCard({ book, onNavigate, onDelete }: { book: Book; onNavigate: (path: Route, query?: string) => void; onDelete: (book: Book) => void }) {
  const available = book.available_copies > 0
  const cover = book.cover_image_url
  return <article className="book-card picture-book-card">
    <div className="book-cover">
      {cover ? <CoverImage src={cover} alt={`Cover of ${book.title}`} /> : <div className="book-cover-placeholder"><span>LM</span><small>{book.category}</small></div>}
    </div>
    <div className="book-card-content">
      <div className="book-card-top"><span className="book-category">{book.category}</span>
        <span className={available ? 'availability available' : 'availability unavailable'}>{available ? `${book.available_copies} available` : 'Unavailable'}</span>
      </div>
      <h2>{book.title}</h2>
      <p className="book-author">by {book.author}</p>
      <div className="book-card-details"><span>ISBN</span><strong>{book.isbn}</strong></div>
      <div className="book-card-actions"><button className="book-card-action" disabled={!available} onClick={() => onNavigate('/borrow', `?bookId=${book.id}`)}>{available ? 'Borrow this book →' : 'Currently unavailable'}</button><button className="book-management-action" onClick={() => onNavigate('/books/edit', `?bookId=${book.id}`)}>Edit</button><button className="book-management-action danger" onClick={() => onDelete(book)}>Delete</button></div>
    </div>
  </article>
}
