import type { Book, Route } from '../../types'
import { CoverImage } from './CoverImage'

export function BookCard({ book, onNavigate, onDelete, canManage = true }: { book: Book; onNavigate: (path: Route, query?: string) => void; onDelete: (book: Book) => void; canManage?: boolean }) {
  const cover = book.cover_image_url
  return <article className="book-card picture-book-card">
    <div className="book-cover">
      {cover ? <CoverImage className="catalogue-cover-image" src={cover} alt={`Cover of ${book.title}`} /> : <div className="book-cover-placeholder"><span>LM</span><small>{book.category}</small></div>}
    </div>
    <div className="book-card-content">
      <h2>{book.title}</h2>
      <p className="book-author">by {book.author}</p>
      {canManage && <div className="book-card-actions"><button className="book-management-action" onClick={() => onNavigate('/books/edit', `?bookId=${book.id}`)}>Edit</button><button className="book-management-action danger" onClick={() => onDelete(book)}>Delete</button></div>}
    </div>
  </article>
}
