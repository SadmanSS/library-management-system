import { useEffect, useMemo, useState } from 'react'
import { deleteBook, getBook } from '../services/api'
import type { Book, Profile, Route } from '../types'
import { CoverImage } from '../components/books/CoverImage'
import { normalizeCategory } from '../utils/categoryNormalization'
import {
  ArrowRightIcon,
  BookOpenIcon,
  BookmarkIcon,
  ChevronLeftIcon,
} from '../components/ui/Icons'

type Props = {
  onNavigate: (path: Route, query?: string) => void
  profile?: Profile | null
  canManage?: boolean
}

export function BookDetail({ onNavigate, profile, canManage = false }: Props) {
  const parsedId = useMemo(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const idParam = params.get('bookId') || params.get('id')
    return idParam && Number.isInteger(Number(idParam)) ? Number(idParam) : null
  }, [])

  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(() => parsedId !== null)
  const [error, setError] = useState(() =>
    parsedId === null ? 'No book was selected or the requested ID is invalid.' : ''
  )
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canBorrow = Boolean(profile && profile.role === 'member')

  // Load book details by ID from URL query parameters
  useEffect(() => {
    if (!parsedId) return

    let mounted = true
    getBook(parsedId)
      .then((data) => {
        if (!mounted) return
        setBook(data)
      })
      .catch((err: unknown) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Unable to find this book title.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [parsedId])

  // Handle Book Deletion (for Staff / Admin)
  const handleDeleteBook = async () => {
    if (!book) return
    setDeleting(true)
    try {
      await deleteBook(book.id)
      onNavigate('/books')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unable to delete book.')
      setDeleting(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="book-detail-page">
        <div className="book-detail-container">
          <div className="book-detail-loading-card">
            <span className="loading-spinner" aria-hidden="true" />
            <h2>Loading Book Details...</h2>
            <p>Fetching publication metadata, inventory levels, and borrowing availability.</p>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: ERROR / NOT FOUND STATE
  // ──────────────────────────────────────────────────────────────────────────
  if (error || !book) {
    return (
      <div className="book-detail-page">
        <div className="book-detail-container">
          <div className="book-detail-error-card">
            <div className="error-icon-box" aria-hidden="true">
              <BookOpenIcon />
            </div>
            <h2>Book Not Found</h2>
            <p>{error || 'The book you requested is unavailable or could not be found.'}</p>
            <button
              type="button"
              className="editorial-btn-primary"
              onClick={() => onNavigate('/books')}
            >
              <span>Return to Catalogue</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isAvailable = book.available_copies > 0

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: MAIN BOOK DETAIL DISPLAY
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="book-detail-page">
      <div className="book-detail-container">
        {/* Navigation Breadcrumbs / Back Bar */}
        <nav className="book-detail-nav-bar" aria-label="Breadcrumb">
          <button
            type="button"
            className="book-detail-back-btn"
            onClick={() => onNavigate('/books')}
          >
            <ChevronLeftIcon />
            <span>Back to Catalogue</span>
          </button>
          <span className="book-detail-breadcrumb-sep">/</span>
          <span className="book-detail-breadcrumb-active">{normalizeCategory(book.category)}</span>
          <span className="book-detail-breadcrumb-sep">/</span>
          <span className="book-detail-breadcrumb-title">{book.title}</span>
        </nav>

        {/* Main Book Showcase Card (Split Grid) */}
        <div className="book-detail-showcase-grid">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT: COVER SHOWCASE
             ══════════════════════════════════════════════════════════════════ */}
          <div className="book-detail-visual-col">
            <div className="book-detail-cover-card">
              {book.cover_image_url ? (
                <CoverImage
                  className="book-detail-cover-img"
                  src={book.cover_image_url}
                  alt={`Cover of ${book.title}`}
                  fallback={
                    <div className="book-detail-cover-fallback">
                      <BookOpenIcon />
                      <span>{book.title}</span>
                    </div>
                  }
                />
              ) : (
                <div className="book-detail-cover-fallback">
                  <BookOpenIcon />
                  <span>{book.title}</span>
                </div>
              )}
            </div>

            {/* Staff / Admin Controls */}
            {canManage && (
              <div className="book-detail-admin-card">
                <span className="admin-card-label">CATALOGUE MANAGEMENT</span>
                <div className="admin-card-actions">
                  <button
                    type="button"
                    className="editorial-btn-secondary admin-btn"
                    onClick={() => onNavigate('/books/edit', `?bookId=${book.id}`)}
                  >
                    Edit Metadata
                  </button>
                  <button
                    type="button"
                    className="editorial-admin-btn-delete admin-btn"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete Title
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT: BOOK INFORMATION & METADATA SECTION (ROW BY ROW)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="book-detail-info-col">
            <div className="book-detail-meta-section">
              <div className="book-detail-meta-row title-row">
                <h1 className="book-detail-main-title">{book.title}</h1>
              </div>

              <div className="book-detail-meta-list">
                <div className="book-detail-meta-row">
                  <span className="meta-label">Author:</span>
                  <strong className="meta-value author-name">{book.author}</strong>
                </div>

                <div className="book-detail-meta-row">
                  <span className="meta-label">ISBN:</span>
                  <span className="meta-value font-mono">{book.isbn || 'N/A'}</span>
                </div>

                <div className="book-detail-meta-row">
                  <span className="meta-label">GENRE:</span>
                  <span className="meta-value">{normalizeCategory(book.category)}</span>
                </div>

                <div className="book-detail-meta-row">
                  <span className="meta-label">Available Copies:</span>
                  <span className="meta-value highlight">
                    {book.available_copies} of {book.total_copies}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SYNOPSIS & EDITORIAL NOTES (FULL-WIDTH SECTION)
           ══════════════════════════════════════════════════════════════════ */}
        <section className="book-detail-synopsis-section">
          <h2 className="synopsis-section-title">Synopsis &amp; Editorial Overview</h2>
          <div className="synopsis-body-text">
            {book.description ? (
              book.description.split('\n\n').map((para, index) => (
                <p key={index}>{para}</p>
              ))
            ) : (
              <p className="synopsis-placeholder">
                No detailed synopsis has been catalogued for this title yet. Please consult with our librarian or check the author archive for further research materials.
              </p>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            RESERVE & BORROW CALLOUT (AT THE LAST AFTER SYNOPSIS)
           ══════════════════════════════════════════════════════════════════ */}
        <section className="book-detail-borrow-card" aria-label="Reserve and Borrow Book">
          <div className="borrow-card-header">
            <BookmarkIcon className="borrow-card-icon" />
            <div>
              <h3 className="borrow-card-heading">
                {isAvailable ? 'Reserve & Borrow This Book' : 'Currently Loaned Out'}
              </h3>
              <p className="borrow-card-sub">
                {isAvailable
                  ? 'Reserve this title online. Your copy will be held at the circulation desk for 48 hours for immediate collection.'
                  : 'All registered copies of this title are currently checked out by other readers. Please check back soon or browse similar titles.'}
              </p>
            </div>
          </div>

          <div className="borrow-card-actions">
            <button
              type="button"
              className="editorial-btn-secondary book-detail-secondary-btn"
              onClick={() => onNavigate('/books')}
            >
              Browse Other Books
            </button>

            {isAvailable ? (
              canBorrow ? (
                <button
                  type="button"
                  className="editorial-btn-primary book-detail-action-btn"
                  onClick={() => onNavigate('/borrow', `?bookId=${book.id}`)}
                >
                  <BookOpenIcon />
                  <span>Borrow Book</span>
                  <ArrowRightIcon />
                </button>
              ) : !profile ? (
                <button
                  type="button"
                  className="editorial-btn-primary book-detail-action-btn"
                  onClick={() => onNavigate('/login')}
                >
                  <span>Sign In to Borrow</span>
                  <ArrowRightIcon />
                </button>
              ) : (
                <div className="borrow-card-staff-note">
                  <span>Staff / Admin Mode: Use circulation desk to manage check-outs.</span>
                </div>
              )
            ) : (
              <button
                type="button"
                className="editorial-btn-disabled book-detail-action-btn"
                disabled
              >
                <span>All Copies Out</span>
              </button>
            )}
          </div>
        </section>

        {/* Delete Confirmation Modal for Staff/Admin */}
        {showDeleteModal && (
          <div
            className="book-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              className="delete-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Delete Title from Collection?</h3>
              <p>
                Are you sure you want to permanently delete &ldquo;<strong>{book.title}</strong>&rdquo;? This action removes all records and cannot be undone.
              </p>
              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={handleDeleteBook}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
