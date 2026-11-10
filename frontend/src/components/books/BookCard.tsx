import type { Book, Profile, Route } from '../../types'
import { CoverImage } from './CoverImage'

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
  profile = null,
  viewMode = 'grid',
}: BookCardProps) {
  const cover = book.cover_image_url
  const primaryCategory = book.category ? book.category.split(',')[0].trim() : 'General'
  const isAvailable = book.available_copies > 0
  const canBorrow = Boolean(profile && profile.role === 'member')

  // Fallback palette choice based on book title length/id for variety
  const placeholderThemes = [
    'theme-navy',
    'theme-burgundy',
    'theme-forest',
    'theme-charcoal',
    'theme-amber',
  ]
  const themeClass = placeholderThemes[book.id % placeholderThemes.length]

  if (viewMode === 'list') {
    return (
      <article className="catalog-book-row" onClick={() => onQuickView?.(book)}>
        <div className="book-row-cover" onClick={(e) => { e.stopPropagation(); onQuickView?.(book) }}>
          {cover ? (
            <CoverImage className="row-cover-img" src={cover} alt={`Cover of ${book.title}`} />
          ) : (
            <div className={`book-cover-placeholder-luxury ${themeClass}`}>
              <div className="spine-crease" />
              <span className="placeholder-emblem">📖</span>
              <span className="placeholder-title">{book.title}</span>
            </div>
          )}
        </div>

        <div className="book-row-details">
          <div className="book-row-meta">
            <span className="book-category-tag">{primaryCategory}</span>
            <span className="book-isbn-tag">ISBN: {book.isbn}</span>
          </div>

          <h3 className="book-row-title">{book.title}</h3>
          <p className="book-row-author">by <em>{book.author}</em></p>

          {book.description && (
            <p className="book-row-synopsis">{book.description}</p>
          )}

          <div className="book-row-stock-info">
            <span className="stock-ratio">
              <strong>{book.available_copies}</strong> of <strong>{book.total_copies}</strong> copies available
            </span>
          </div>
        </div>

        <div className="book-row-actions" onClick={(e) => e.stopPropagation()}>
          {canBorrow && (
            isAvailable ? (
              <button
                type="button"
                className="catalog-btn-borrow"
                onClick={() => onNavigate('/borrow', `?bookId=${book.id}`)}
              >
                Borrow Volume →
              </button>
            ) : (
              <button type="button" className="catalog-btn-borrow disabled" disabled>
                All Loaned Out
              </button>
            )
          )}

          <button
            type="button"
            className="catalog-btn-quickview"
            onClick={() => onQuickView?.(book)}
          >
            Quick View
          </button>

          {canManage && (
            <div className="row-admin-actions">
              <button
                type="button"
                className="action-btn-pill edit"
                onClick={() => onNavigate('/books/edit', `?bookId=${book.id}`)}
                title="Edit this book"
              >
                Edit
              </button>
              <button
                type="button"
                className="action-btn-pill danger"
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

  // Grid Mode Card - Compact, elegant bookstore proportions
  return (
    <article
      className="catalog-book-card"
      tabIndex={0}
      role="region"
      aria-label={`Book: ${book.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onQuickView?.(book)
      }}
    >
      {/* Cover container */}
      <div
        className="book-card-cover-container"
        onClick={() => onQuickView?.(book)}
      >
        {cover ? (
          <CoverImage className="card-cover-img" src={cover} alt={`Cover of ${book.title}`} />
        ) : (
          <div className={`book-cover-placeholder-luxury ${themeClass}`}>
            <div className="spine-crease" />
            <div className="placeholder-gold-frame">
              <span className="placeholder-emblem">📖</span>
              <span className="placeholder-title">{book.title}</span>
              <span className="placeholder-author">{book.author}</span>
            </div>
          </div>
        )}

        {/* Quick View Hover Overlay */}
        <div className="cover-hover-overlay">
          <span className="quick-view-prompt">
            <span className="eye-icon">👁️</span> Quick View
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="book-card-body">
        <div className="card-top-tags">
          <span className="book-category-tag">{primaryCategory}</span>
          <span className="book-isbn-tag">{book.isbn.slice(0, 13)}</span>
        </div>

        <h3
          className="book-card-title"
          title={book.title}
          onClick={() => onQuickView?.(book)}
        >
          {book.title}
        </h3>

        <p className="book-card-author" title={`by ${book.author}`}>
          by <em>{book.author}</em>
        </p>

        <div className="book-card-stock-status">
          <span className="stock-meter-label">
            <strong>{book.available_copies}</strong> of {book.total_copies} available
          </span>
        </div>

        {/* Action Buttons */}
        {(canBorrow || canManage) && (
          <div className="book-card-footer">
            {canBorrow && (
              isAvailable ? (
                <button
                  type="button"
                  className="catalog-btn-borrow"
                  onClick={() => onNavigate('/borrow', `?bookId=${book.id}`)}
                >
                  Borrow <span className="arrow">→</span>
                </button>
              ) : (
                <button type="button" className="catalog-btn-borrow disabled" disabled>
                  Reserved
                </button>
              )
            )}

            {canManage && (
              <div className="card-manage-actions">
                <button
                  type="button"
                  className="action-btn-pill edit"
                  onClick={() => onNavigate('/books/edit', `?bookId=${book.id}`)}
                  title="Edit book"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="action-btn-pill danger"
                  onClick={() => onDelete(book)}
                  title="Delete book"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
