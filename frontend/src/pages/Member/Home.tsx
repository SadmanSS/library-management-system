import { useEffect, useMemo, useRef, useState } from 'react'
import { createBorrowing, getBooks } from '../../services/api'
import type { Book, Borrowing, Profile, Route } from '../../types'
import { CoverImage } from '../../components/books/CoverImage'
import { extractCategories } from '../../utils/categoryNormalization'
import { useBodyScrollLock } from '../../utils/useBodyScrollLock'
import {
  ArrowRightIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
} from '../../components/ui/Icons'

const ITEMS_PER_PAGE = 5

type MemberHomeProps = {
  onNavigate: (path: Route, query?: string) => void
  profile?: Profile | null
}

function getDefaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

function getMinDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-').map(Number)
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function MemberHome({ onNavigate, profile }: MemberHomeProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const listTopRef = useRef<HTMLElement>(null)

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  // Quick View Modal
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  // Quick Borrow Modal State
  const [quickBorrowBook, setQuickBorrowBook] = useState<Book | null>(null)
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerContact, setBorrowerContact] = useState('')
  const [dueDate, setDueDate] = useState(getDefaultDueDate)
  const [borrowSubmitting, setBorrowSubmitting] = useState(false)
  const [borrowSuccess, setBorrowSuccess] = useState<Borrowing | null>(null)
  const [borrowError, setBorrowError] = useState('')

  useBodyScrollLock(Boolean(selectedBook || quickBorrowBook))

  // Close Modals on Escape key
  useEffect(() => {
    if (!selectedBook && !quickBorrowBook) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!borrowSubmitting) {
          setSelectedBook(null)
          setQuickBorrowBook(null)
          setBorrowSuccess(null)
          setBorrowError('')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBook, quickBorrowBook, borrowSubmitting])

  useEffect(() => {
    let active = true

    getBooks()
      .then((bookData) => {
        if (!active) return
        setBooks(bookData || [])
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to load the library collection.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Open Quick Borrow modal with prefilled member credentials
  const openQuickBorrow = (book: Book) => {
    setQuickBorrowBook(book)
    setBorrowerName(profile?.full_name?.trim() || profile?.email?.split('@')[0] || '')
    setBorrowerContact(profile?.phone?.trim() || profile?.email?.trim() || '')
    setDueDate(getDefaultDueDate())
    setBorrowError('')
    setBorrowSuccess(null)
  }

  // Handle Quick Borrow submission
  const handleConfirmQuickBorrow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickBorrowBook) return

    const name = (borrowerName || profile?.full_name || profile?.email || '').trim()
    const contact = (borrowerContact || profile?.phone || profile?.email || '').trim()

    if (!name || !contact || !dueDate) {
      setBorrowError('Please provide your name, contact details, and a return due date.')
      return
    }

    setBorrowSubmitting(true)
    setBorrowError('')

    try {
      const res = await createBorrowing({
        book_id: quickBorrowBook.id,
        borrower_name: name,
        borrower_contact: contact,
        due_date: dueDate,
      })

      // Immediate optimistic update of available stock in current view
      setBooks((prev) =>
        prev.map((b) =>
          b.id === quickBorrowBook.id
            ? { ...b, available_copies: Math.max(0, b.available_copies - 1) }
            : b
        )
      )

      setBorrowSuccess(res)
    } catch (err: unknown) {
      setBorrowError(
        err instanceof Error ? err.message : 'This book could not be borrowed at this time.'
      )
    } finally {
      setBorrowSubmitting(false)
    }
  }

  // Filter books for the list view (searching title, author, ISBN, or genre keyword)
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return books.filter((book) => {
      return (
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.isbn && book.isbn.toLowerCase().includes(q)) ||
        (book.category && book.category.toLowerCase().includes(q))
      )
    })
  }, [books, searchQuery])

  // Pagination calculation (5 items per page)
  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE) || 1
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const paginatedBooks = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return filteredBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredBooks, safeCurrentPage])

  const startRecord = filteredBooks.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1
  const endRecord = Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredBooks.length)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== safeCurrentPage) {
      setCurrentPage(newPage)
      if (listTopRef.current) {
        listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages] as (number | 'ellipsis')[]
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as (number | 'ellipsis')[]
    }
    return [1, 'ellipsis', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, 'ellipsis', totalPages] as (number | 'ellipsis')[]
  }, [totalPages, safeCurrentPage])

  return (
    <div className="member-dashboard-page">
      <div className="member-dashboard-container">
        {/* ══════════════════════════════════════════════════════════════════
            SEARCH BAR
           ══════════════════════════════════════════════════════════════════ */}
        <section className="member-section member-discovery-section" ref={listTopRef}>
          <div className="member-discovery-controls">
            <div className="member-search-bar">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Search books by title, author, ISBN, or keywords..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Search books"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => handleSearchChange('')}
                  aria-label="Clear search"
                >
                  <XIcon />
                </button>
              )}
            </div>
          </div>

          {/* Results Bar */}
          {!loading && !error && (
            <div className="member-list-results-bar">
              <span className="results-count">
                Showing{' '}
                <strong>
                  {filteredBooks.length === 0
                    ? 0
                    : `${startRecord}–${endRecord}`}
                </strong>{' '}
                of {filteredBooks.length} titles
              </span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              BOOK LIST VIEW (TAP ROW FOR QUICK VIEW, QUICK BORROW BUTTON)
             ══════════════════════════════════════════════════════════════════ */}
          {loading ? (
            <div className="member-empty-card loading">
              <span className="loading-spinner" aria-hidden="true" />
              <span>Loading catalogue list...</span>
            </div>
          ) : error ? (
            <div className="member-empty-card error">{error}</div>
          ) : filteredBooks.length === 0 ? (
            <div className="member-empty-card">
              <h3>No books found matching your search</h3>
              <p>Try searching for a different title, author, or keyword.</p>
              <button
                type="button"
                className="member-action-btn secondary"
                onClick={() => setSearchQuery('')}
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="editorial-list-container member-book-list">
              {paginatedBooks.map((book) => {
                const isAvailable = book.available_copies > 0

                return (
                  <article
                    key={book.id}
                    className="editorial-book-row"
                    tabIndex={0}
                    role="button"
                    aria-label={`Book: ${book.title}. Tap to view full details.`}
                    onClick={() => setSelectedBook(book)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setSelectedBook(book)
                    }}
                  >
                    {/* Cover Thumbnail */}
                    <div
                      className="editorial-row-cover-wrap"
                      onClick={() => setSelectedBook(book)}
                    >
                      {book.cover_image_url ? (
                        <CoverImage
                          className="editorial-row-cover-img"
                          src={book.cover_image_url}
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

                    {/* Book Metadata & Info (No genre tag, tap opens quick view) */}
                    <div className="editorial-row-content">
                      <div className="editorial-row-meta">
                        <span
                          className={`editorial-status-pill ${
                            isAvailable ? 'available' : 'reserved'
                          }`}
                        >
                          <span className="status-dot" aria-hidden="true" />
                          {isAvailable ? 'Available' : 'Reserved'}
                        </span>
                      </div>

                      <h3
                        className="editorial-row-title"
                        title={book.title}
                      >
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

                    {/* Action Column: Quick Borrow only (no details button) */}
                    <div
                      className="editorial-row-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAvailable ? (
                        <button
                          type="button"
                          className="editorial-btn-secondary"
                          onClick={() => openQuickBorrow(book)}
                          title="Quick borrow this book"
                        >
                          <BookOpenIcon />
                          <span>Quick Borrow</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="editorial-btn-disabled"
                          disabled
                        >
                          All Copies Out
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* Pagination Controls (5 titles per page) */}
          {!loading && !error && filteredBooks.length > 0 && totalPages > 1 && (
            <nav className="editorial-section-pagination member-pagination" aria-label="Books pagination">
              <button
                type="button"
                className="editorial-page-nav-btn"
                disabled={safeCurrentPage === 1}
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
                <span>Previous</span>
              </button>

              <div className="editorial-page-numbers">
                {pageNumbers.map((page, idx) =>
                  page === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="editorial-page-ellipsis">
                      &hellip;
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      className={`editorial-page-num-btn ${page === safeCurrentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                      aria-label={`Go to page ${page}`}
                      aria-current={page === safeCurrentPage ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                className="editorial-page-nav-btn"
                disabled={safeCurrentPage === totalPages}
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRightIcon />
              </button>
            </nav>
          )}

          {/* Bottom Callout to Full Catalogue */}
          <div className="member-catalogue-footer-cta">
            <p>Looking for a specific genre, author, or research topic?</p>
            <button
              type="button"
              className="member-action-btn primary"
              onClick={() => onNavigate('/books')}
            >
              <span>Explore Complete Catalogue ({books.length} Titles)</span>
              <ArrowRightIcon />
            </button>
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          QUICK BORROW MODAL
         ══════════════════════════════════════════════════════════════════ */}
      {quickBorrowBook && (
        <div
          className="book-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!borrowSubmitting) {
              setQuickBorrowBook(null)
              setBorrowSuccess(null)
              setBorrowError('')
            }
          }}
        >
          <div
            className="book-detail-modal-card quick-borrow-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-borrow-title"
            onClick={(e) => e.stopPropagation()}
          >
            {borrowSuccess ? (
              <div className="quick-borrow-success">
                <div className="success-badge-icon">✓</div>
                <h3 id="quick-borrow-title" className="quick-borrow-title">
                  Book Borrowed Successfully!
                </h3>
                <p className="quick-borrow-sub">
                  <strong>{quickBorrowBook.title}</strong> is now checked out under your member account.
                </p>

                <div className="quick-borrow-receipt">
                  <div className="receipt-row">
                    <span>Transaction ID:</span>
                    <strong>#{borrowSuccess.id}</strong>
                  </div>
                  <div className="receipt-row">
                    <span>Borrower Name:</span>
                    <strong>{borrowSuccess.borrower_name}</strong>
                  </div>
                  <div className="receipt-row">
                    <span>Return Due Date:</span>
                    <strong>{formatDisplayDate(borrowSuccess.due_date)}</strong>
                  </div>
                </div>

                <div className="quick-borrow-actions">
                  <button
                    type="button"
                    className="editorial-btn-secondary"
                    onClick={() => {
                      setQuickBorrowBook(null)
                      onNavigate('/return')
                    }}
                  >
                    View in My Loans
                  </button>
                  <button
                    type="button"
                    className="editorial-btn-secondary"
                    onClick={() => {
                      setQuickBorrowBook(null)
                      setBorrowSuccess(null)
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setQuickBorrowBook(null)}
                  disabled={borrowSubmitting}
                  aria-label="Close modal"
                >
                  <XIcon />
                </button>

                <div className="quick-borrow-header">
                  <span className="editorial-category-badge">QUICK BORROW</span>
                  <h2 id="quick-borrow-title" className="quick-borrow-title">
                    Borrow this Title
                  </h2>
                  <p className="quick-borrow-sub">
                    Fast check-out with standard 14-day loan period.
                  </p>
                </div>

                {borrowError && (
                  <div className="quick-borrow-error">{borrowError}</div>
                )}

                <div className="quick-borrow-book-snippet">
                  <div className="snippet-cover-wrap">
                    {quickBorrowBook.cover_image_url ? (
                      <CoverImage
                        className="snippet-cover-img"
                        src={quickBorrowBook.cover_image_url}
                        alt={quickBorrowBook.title}
                        fallback={<BookOpenIcon className="fallback-emblem-icon" />}
                      />
                    ) : (
                      <BookOpenIcon className="fallback-emblem-icon" />
                    )}
                  </div>
                  <div className="snippet-info">
                    <h4 className="snippet-title">{quickBorrowBook.title}</h4>
                    <p className="snippet-author">by {quickBorrowBook.author}</p>
                    <span className="snippet-stock">
                      {quickBorrowBook.available_copies} of {quickBorrowBook.total_copies} copies currently available
                    </span>
                  </div>
                </div>

                <form onSubmit={handleConfirmQuickBorrow} className="quick-borrow-form">
                  <div className="form-group-row">
                    <div className="form-label-with-hint">
                      <label htmlFor="quick-borrow-name">Borrower Name</label>
                      <span className="form-readonly-badge">Account Verified</span>
                    </div>
                    <input
                      id="quick-borrow-name"
                      type="text"
                      value={borrowerName}
                      readOnly
                      tabIndex={-1}
                      className="input-readonly"
                      aria-readonly="true"
                    />
                  </div>

                  <div className="form-group-row">
                    <div className="form-label-with-hint">
                      <label htmlFor="quick-borrow-contact">Contact Information</label>
                      <span className="form-readonly-badge">Account Verified</span>
                    </div>
                    <input
                      id="quick-borrow-contact"
                      type="text"
                      value={borrowerContact}
                      readOnly
                      tabIndex={-1}
                      className="input-readonly"
                      aria-readonly="true"
                    />
                  </div>

                  <div className="form-group-row">
                    <label htmlFor="quick-borrow-due">Return Due Date</label>
                    <input
                      id="quick-borrow-due"
                      type="date"
                      value={dueDate}
                      min={getMinDueDate()}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="quick-borrow-modal-actions">
                    <button
                      type="button"
                      className="modal-btn-cancel quick-borrow-cancel-btn"
                      onClick={() => setQuickBorrowBook(null)}
                      disabled={borrowSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="editorial-btn-primary quick-borrow-submit-btn"
                      disabled={borrowSubmitting}
                    >
                      {borrowSubmitting ? 'Borrowing...' : 'Confirm & Borrow Now'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BOOK QUICK VIEW MODAL
         ══════════════════════════════════════════════════════════════════ */}
      {selectedBook && (
        <div
          className="book-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="book-detail-modal-card quickview-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quickview-book-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Row: Left: Picture, Right: Name, Author, Category, ISBN, Total & Available copies */}
            <div className="quickview-top-section">
              <div className="quickview-cover-wrap">
                {selectedBook.cover_image_url ? (
                  <CoverImage
                    className="quickview-cover-img"
                    src={selectedBook.cover_image_url}
                    alt={`Cover of ${selectedBook.title}`}
                    fallback={
                      <div className="editorial-cover-fallback">
                        <BookOpenIcon className="fallback-emblem-icon" />
                        <span className="fallback-title">{selectedBook.title}</span>
                        <span className="fallback-author">{selectedBook.author}</span>
                      </div>
                    }
                  />
                ) : (
                  <div className="editorial-cover-fallback">
                    <BookOpenIcon className="fallback-emblem-icon" />
                    <span className="fallback-title">{selectedBook.title}</span>
                    <span className="fallback-author">{selectedBook.author}</span>
                  </div>
                )}
              </div>

              <div className="quickview-header-info">
                <h2 id="quickview-book-title" className="quickview-title">
                  {selectedBook.title}
                </h2>
                <p className="quickview-author">by {selectedBook.author}</p>

                <div className="quickview-specs-list">
                  <div className="quickview-spec-row">
                    <span className="quickview-spec-label">
                      {extractCategories(selectedBook.category).length > 1 ? 'Categories:' : 'Category:'}
                    </span>
                    <div className="quickview-spec-value">
                      <div className="detail-modal-badges-wrap">
                        {extractCategories(selectedBook.category).map((cat) => (
                          <span key={cat} className="editorial-category-badge">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="quickview-spec-row">
                    <span className="quickview-spec-label">ISBN:</span>
                    <span className="quickview-spec-value">{selectedBook.isbn || 'N/A'}</span>
                  </div>

                  <div className="quickview-spec-row">
                    <span className="quickview-spec-label">Total Copies:</span>
                    <span className="quickview-spec-value">{selectedBook.total_copies}</span>
                  </div>

                  <div className="quickview-spec-row">
                    <span className="quickview-spec-label">Available Copies:</span>
                    <span className="quickview-spec-value">
                      <strong>{selectedBook.available_copies}</strong> of {selectedBook.total_copies}
                      <span
                        className={`editorial-status-pill ${
                          selectedBook.available_copies > 0 ? 'available' : 'reserved'
                        }`}
                        style={{ marginLeft: '8px' }}
                      >
                        <span className="status-dot" aria-hidden="true" />
                        {selectedBook.available_copies > 0 ? 'Available' : 'Currently Loaned Out'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Below Picture: Synopsis */}
            <div className="quickview-synopsis-section">
              <h3 className="quickview-synopsis-heading">Synopsis / Book Description</h3>
              <p className="quickview-synopsis-text">
                {selectedBook.description ||
                  'No written synopsis or description has been filed for this title yet. Please check in with our library concierge if you need more details.'}
              </p>
            </div>

            {/* Bottom Actions: Close (Left) & Quick Borrow (Right) */}
            <div className="quickview-bottom-actions">
              <button
                type="button"
                className="quickview-close-btn"
                onClick={() => setSelectedBook(null)}
              >
                Close
              </button>

              {selectedBook.available_copies > 0 ? (
                <button
                  type="button"
                  className="quickview-borrow-btn"
                  onClick={() => {
                    const target = selectedBook
                    setSelectedBook(null)
                    openQuickBorrow(target)
                  }}
                >
                  <BookOpenIcon />
                  <span>Quick Borrow</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="quickview-borrow-btn"
                  disabled
                >
                  Currently Unavailable
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
