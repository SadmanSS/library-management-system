import type { Book, Profile, Route } from '../../types'
import { CoverImage } from './CoverImage'
import { EyeIcon, BookOpenIcon } from '../ui/Icons'

type BookCardProps = {
  book: Book
  onNavigate: (path: Route, query?: string) => void
  onDelete: (book: Book) => void
  onQuickView?: (book: Book) => void
  canManage?: boolean
  profile?: Profile | null
  viewMode?: 'grid' | 'list'
}

export function BookCard({
  book,
  onNavigate,
  onDelete,
  onQuickView,
  canManage = false,
  viewMode = 'grid',
}: BookCardProps) {
  const cover = book.cover_image_url
  const isAvailable = book.available_copies > 0

  // List View Mode
  if (viewMode === 'list') {
    return (
      <article
        className="editorial-book-row"
        onClick={() => onQuickView?.(book)}
        tabIndex={0}
        role="region"
        aria-label={`Book: ${book.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onQuickView?.(book)
        }}
      >
        <div
          className="editorial-row-cover-wrap"
          onClick={(e) => {
            e.stopPropagation()
            onQuickView?.(book)
          }}
        >
          {cover ? (
            <CoverImage
              className="editorial-row-cover-img"
              src={cover}
              alt={`Cover of ${book.title}`}
              fallback={
                <div className="editorial-cover-fallback">
                  <BookOpenIcon className="fallback-emblem-icon" />
                  <span className="fallback-title">{book.title}</span>
                </div>
              }
            />
          ) : (
            <div className="editorial-cover-fallback">
              <BookOpenIcon className="fallback-emblem-icon" />
              <span className="fallback-title">{book.title}</span>
            </div>
          )}
        </div>

        <div className="editorial-row-content">
          <div className="editorial-row-meta">
            <span className={`editorial-status-pill ${isAvailable ? 'available' : 'reserved'}`}>
              <span className="status-dot" aria-hidden="true" />
              {isAvailable ? 'Available' : 'Reserved'}
            </span>
          </div>

          <h3 className="editorial-row-title" title={book.title}>
            {book.title}
          </h3>

          <p className="editorial-row-author">by {book.author}</p>

          {book.description && (
            <p className="editorial-row-description">{book.description}</p>
          )}

          <div className="editorial-row-stock">
            <span>
              <strong>{book.available_copies}</strong> of {book.total_copies} copies available
            </span>
            {book.isbn && <span className="editorial-row-isbn">ISBN: {book.isbn}</span>}
          </div>
        </div>

        <div
          className="editorial-row-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="editorial-btn-secondary"
            onClick={() => onQuickView?.(book)}
          >
            <EyeIcon className="btn-icon" />
            <span>View Details</span>
          </button>

          {canManage && (
            <div className="editorial-row-admin">
              <button
                type="button"
                className="editorial-admin-btn edit"
                onClick={() => onNavigate('/books/edit', `?bookId=${book.id}`)}
                title="Edit this book"
              >
                Edit
              </button>
              <button
                type="button"
                className="editorial-admin-btn delete"
                onClick={() => onDelete(book)}
                title="Delete this book"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </article>
    )
  }

  // Grid View Mode (Product Card)
  return (
    <article
      className="editorial-book-card"
      tabIndex={0}
      role="region"
      aria-label={`Book: ${book.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onQuickView?.(book)
      }}
    >
      {/* 1. Book Cover Image Container */}
      <div
        className="editorial-card-cover-wrap"
        onClick={() => onQuickView?.(book)}
      >
        {cover ? (
          <CoverImage
            className="editorial-card-cover-img"
            src={cover}
            alt={`Cover of ${book.title}`}
            fallback={
              <div className="editorial-cover-fallback">
                <BookOpenIcon className="fallback-emblem-icon" />
                <span className="fallback-title">{book.title}</span>
                <span className="fallback-author">{book.author}</span>
              </div>
            }
          />
        ) : (
          <div className="editorial-cover-fallback">
            <BookOpenIcon className="fallback-emblem-icon" />
            <span className="fallback-title">{book.title}</span>
            <span className="fallback-author">{book.author}</span>
          </div>
        )}

        <div className="editorial-cover-overlay">
          <span className="editorial-quickview-tag">
            <EyeIcon /> View Details
          </span>
        </div>
      </div>

      {/* 2-6. Card Content */}
      <div className="editorial-card-body">
        {/* Availability Status */}
        <div className="editorial-card-meta-row">
          <span className={`editorial-status-pill ${isAvailable ? 'available' : 'reserved'}`}>
            <span className="status-dot" aria-hidden="true" />
            {isAvailable ? 'Available' : 'Reserved'}
          </span>
        </div>

        {/* 3. Book Title */}
        <h3
          className="editorial-card-title"
          title={book.title}
          onClick={() => onQuickView?.(book)}
        >
          {book.title}
        </h3>

        {/* 4. Author Name */}
        <p className="editorial-card-author" title={`by ${book.author}`}>
          by {book.author}
        </p>

        {/* 5. Available Copies Information */}
        <div className="editorial-card-stock">
          <span className="editorial-stock-text">
            <strong>{book.available_copies}</strong> of {book.total_copies} copies available
          </span>
        </div>

        {/* 7. View Details Action */}
        <div
          className="editorial-card-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="editorial-btn-secondary"
            onClick={() => onQuickView?.(book)}
          >
            <EyeIcon className="btn-icon" />
            <span>View Details</span>
          </button>

          {canManage && (
            <div className="editorial-card-admin-row">
              <button
                type="button"
                className="editorial-admin-btn edit"
                onClick={() => onNavigate('/books/edit', `?bookId=${book.id}`)}
                title="Edit book"
              >
                Edit
              </button>
              <button
                type="button"
                className="editorial-admin-btn delete"
                onClick={() => onDelete(book)}
                title="Delete book"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
