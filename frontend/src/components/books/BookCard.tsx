import type { Book, Route } from '../../types'
import { CoverImage } from './CoverImage'

export function BookCard({
  book,
  onNavigate,
  onDelete,
  canManage = true,
}: {
  book: Book
  onNavigate: (path: Route, query?: string) => void
  onDelete: (book: Book) => void
  canManage?: boolean
}) {
  const cover = book.cover_image_url
  const primaryCategory = book.category ? book.category.split(',')[0].trim() : 'General'
  const isAvailable = book.available_copies > 0

  return (
    <article className="book-card picture-book-card">
      <div className="book-cover">
        {cover ? (
          <CoverImage className="catalogue-cover-image" src={cover} alt={`Cover of ${book.title}`} />
        ) : (
          <div className="book-cover-placeholder">
            <span>LM</span>
            <small>{primaryCategory}</small>
          </div>
        )}
      </div>

      <div className="book-card-content">
        <div className="book-card-meta">
          <span className="book-category-tag">{primaryCategory}</span>
          <span className={`book-stock ${isAvailable ? 'in-stock' : 'out-of-stock'}`}>
            {isAvailable ? `${book.available_copies} avail.` : 'Out of stock'}
          </span>
        </div>

        <h2 title={book.title}>{book.title}</h2>
        <p className="book-author" title={`by ${book.author}`}>by {book.author}</p>

        {canManage && (
          <div className="book-card-actions">
            <button
              type="button"
              className="book-management-action"
              onClick={() => onNavigate('/books/edit', `?bookId=${book.id}`)}
            >
              Edit
            </button>
            <button
              type="button"
              className="book-management-action danger"
              onClick={() => onDelete(book)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
