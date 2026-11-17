import { useState, useEffect, useMemo } from 'react'
import { getBorrowings, returnBorrowing, getBooks } from '../../services/api'
import type { Borrowing, Book, Profile, Route } from '../../types'
import { useBodyScrollLock } from '../../utils/useBodyScrollLock'
import { CoverImage } from '../../components/books/CoverImage'
import { normalizeCategory } from '../../utils/categoryNormalization'
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  SearchIcon,
  XIcon,
} from '../../components/ui/Icons'

type Props = {
  onNavigate: (path: Route, query?: string) => void
  profile?: Profile | null
}

function formatDate(dateStr: string): string {
  try {
    if (!dateStr) return 'N/A'
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string): string {
  try {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function getLoanStatus(borrowing: Borrowing) {
  if (borrowing.status === 'returned' || Boolean(borrowing.return_date)) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      daysRemaining: 0,
      label: 'Returned',
      type: 'returned' as const,
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let dueDate: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(borrowing.due_date)) {
    const [year, month, day] = borrowing.due_date.split('-').map(Number)
    dueDate = new Date(year, month - 1, day, 0, 0, 0, 0)
  } else {
    dueDate = new Date(borrowing.due_date)
    dueDate.setHours(0, 0, 0, 0)
  }

  const diffTime = today.getTime() - dueDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    return {
      isOverdue: true,
      daysOverdue: diffDays,
      daysRemaining: 0,
      label: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} overdue`,
      type: 'overdue' as const,
    }
  }

  const remaining = Math.abs(diffDays)
  return {
    isOverdue: false,
    daysOverdue: 0,
    daysRemaining: remaining,
    label: remaining === 0 ? 'Due today' : `Due in ${remaining} ${remaining === 1 ? 'day' : 'days'}`,
    type: (remaining <= 2 ? 'warning' : 'active') as 'warning' | 'active',
  }
}

export function ReturnBook({ onNavigate, profile }: Props) {
  const isStaff = profile?.role === 'librarian' || profile?.role === 'admin'

  // Data states
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [books, setBooks] = useState<Record<number, Book>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [tabFilter, setTabFilter] = useState<'all' | 'overdue' | 'active' | 'returned'>('all')

  // Selected Transaction for Details Modal
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Prevent background scroll when modal is open
  useBodyScrollLock(Boolean(selectedBorrowing))

  // Close modal on Escape
  useEffect(() => {
    if (!selectedBorrowing) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedBorrowing(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBorrowing])

  const [returningId, setReturningId] = useState<number | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Load all transactions and catalogue books
  useEffect(() => {
    let mounted = true
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [borrowingsList, booksList] = await Promise.all([
          getBorrowings(),
          getBooks().catch(() => [] as Book[]),
        ])
        if (!mounted) return
        setBorrowings(borrowingsList)

        const map: Record<number, Book> = {}
        booksList.forEach((b) => {
          map[b.id] = b
        })
        setBooks(map)
      } catch (err: unknown) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Unable to load borrowing history records.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  // Filter borrowings by search query
  const filteredBorrowings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const cleanId = q.replace(/^#/, '').trim()

    return borrowings.filter((b) => {
      if (!q) return true

      // Search by Transaction ID (#42 or 42)
      if (b.id.toString().includes(cleanId) || `#${b.id}`.toLowerCase().includes(q)) {
        return true
      }
      // Search by borrower name
      if (b.borrower_name.toLowerCase().includes(q)) {
        return true
      }
      // Search by borrower contact
      if (b.borrower_contact.toLowerCase().includes(q)) {
        return true
      }
      // Search by book title, author, or ISBN
      const book = books[b.book_id]
      if (book) {
        if (book.title.toLowerCase().includes(q)) return true
        if (book.author.toLowerCase().includes(q)) return true
        if (book.isbn && book.isbn.toLowerCase().includes(q)) return true
      }
      return false
    })
  }, [borrowings, books, searchQuery])

  // Partition into overdue, active, returned
  const overdueBorrowings = useMemo(() => {
    return filteredBorrowings.filter((b) => {
      if (b.status === 'returned' || Boolean(b.return_date)) return false
      return getLoanStatus(b).isOverdue
    })
  }, [filteredBorrowings])

  const activeBorrowings = useMemo(() => {
    return filteredBorrowings.filter((b) => {
      if (b.status === 'returned' || Boolean(b.return_date)) return false
      return !getLoanStatus(b).isOverdue
    })
  }, [filteredBorrowings])

  const returnedBorrowings = useMemo(() => {
    return filteredBorrowings.filter((b) => b.status === 'returned' || Boolean(b.return_date))
  }, [filteredBorrowings])

  // Active list based on selected tab
  const displayedList = useMemo(() => {
    if (tabFilter === 'overdue') return overdueBorrowings
    if (tabFilter === 'active') return activeBorrowings
    if (tabFilter === 'returned') return returnedBorrowings
    return filteredBorrowings
  }, [tabFilter, overdueBorrowings, activeBorrowings, returnedBorrowings, filteredBorrowings])

  // Global counts across all borrowings
  const totalOverdueCount = useMemo(() => {
    return borrowings.filter((b) => b.status !== 'returned' && !b.return_date && getLoanStatus(b).isOverdue).length
  }, [borrowings])

  const totalActiveCount = useMemo(() => {
    return borrowings.filter((b) => b.status !== 'returned' && !b.return_date && !getLoanStatus(b).isOverdue).length
  }, [borrowings])

  const totalReturnedCount = useMemo(() => {
    return borrowings.filter((b) => b.status === 'returned' || Boolean(b.return_date)).length
  }, [borrowings])

  // Process return action (Staff or authorized return)
  async function handleProcessReturn(borrowingToReturn: Borrowing) {
    setReturningId(borrowingToReturn.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await returnBorrowing(borrowingToReturn.id)
      setBorrowings((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated, status: 'returned' } : item))
      )
      setSelectedBorrowing((prev) => (prev?.id === updated.id ? { ...prev, ...updated, status: 'returned' } : prev))

      // Update book available copies in cache
      setBooks((prev) => {
        const book = prev[borrowingToReturn.book_id]
        if (!book) return prev
        return {
          ...prev,
          [book.id]: {
            ...book,
            available_copies: Math.min(book.total_copies, book.available_copies + 1),
          },
        }
      })

      setActionSuccess(`Transaction #${updated.id} successfully checked in. Inventory has been updated.`)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to return book.')
    } finally {
      setReturningId(null)
    }
  }

  // Copy Transaction ID to clipboard
  function handleCopyId(idNum: number) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(String(idNum))
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  return (
    <div className="history-page">
      <div className="history-container">
        {/* Page Header */}
        <header className="history-header">
          <div className="history-header-content">
            <p className="history-kicker">{isStaff ? 'STAFF CIRCULATION DESK' : 'MEMBER LOANS & HISTORY'}</p>
            <h1 className="history-title">{isStaff ? 'Circulation Desk' : 'Borrowing History'}</h1>
            <p className="history-subtitle">
              {isStaff
                ? 'Review borrowing transactions, track overdue items, inspect borrower details, and check in returned titles.'
                : 'Monitor your active book loans, track return due dates, and review your reading history.'}
            </p>
          </div>

          {/* Metric Overview Badges */}
          <div className="history-stats-row">
            <div className={`history-stat-card ${totalOverdueCount > 0 ? 'overdue' : ''}`}>
              <span className="stat-label">Overdue</span>
              <strong className="stat-value">{totalOverdueCount}</strong>
            </div>
            <div className="history-stat-card">
              <span className="stat-label">Active Loans</span>
              <strong className="stat-value">{totalActiveCount}</strong>
            </div>
            <div className="history-stat-card">
              <span className="stat-label">Total Returned</span>
              <strong className="stat-value">{totalReturnedCount}</strong>
            </div>
          </div>
        </header>

        {/* Global Feedback Notifications */}
        {actionSuccess && (
          <div className="history-alert history-alert-success" role="alert">
            <CheckCircleIcon />
            <span>{actionSuccess}</span>
            <button type="button" className="alert-dismiss" onClick={() => setActionSuccess(null)}>
              <XIcon />
            </button>
          </div>
        )}

        {(error || actionError) && (
          <div className="history-alert history-alert-error" role="alert">
            <AlertCircleIcon />
            <span>{error || actionError}</span>
            <button
              type="button"
              className="alert-dismiss"
              onClick={() => {
                setError('')
                setActionError(null)
              }}
            >
              <XIcon />
            </button>
          </div>
        )}

        {/* Real-time Search and Filter Toolbar */}
        <div className="history-toolbar">
          <div className="history-search-bar">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isStaff
                  ? 'Search by Transaction ID (#12), student name, phone, or book title...'
                  : 'Search by Transaction ID (#12), book title, or author...'
              }
              aria-label="Search loan records"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <XIcon />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="history-filter-tabs" role="tablist" aria-label="Transaction filters">
            <button
              type="button"
              role="tab"
              aria-selected={tabFilter === 'all'}
              className={`history-tab-btn ${tabFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTabFilter('all')}
            >
              All Loans ({filteredBorrowings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tabFilter === 'overdue'}
              className={`history-tab-btn tab-overdue ${tabFilter === 'overdue' ? 'active' : ''}`}
              onClick={() => setTabFilter('overdue')}
            >
              Overdue ({overdueBorrowings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tabFilter === 'active'}
              className={`history-tab-btn ${tabFilter === 'active' ? 'active' : ''}`}
              onClick={() => setTabFilter('active')}
            >
              Active ({activeBorrowings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tabFilter === 'returned'}
              className={`history-tab-btn ${tabFilter === 'returned' ? 'active' : ''}`}
              onClick={() => setTabFilter('returned')}
            >
              Returned ({returnedBorrowings.length})
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="history-loading-card">
            <span className="loading-spinner" aria-hidden="true" />
            <h2>Loading loan records...</h2>
            <p>Fetching circulation history and status telemetry.</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="history-empty-card">
            <div className="empty-icon-wrap" aria-hidden="true">
              <BookOpenIcon />
            </div>
            <h2>No Loans Found</h2>
            <p>
              {searchQuery
                ? `No circulation records match your search query "${searchQuery}".`
                : tabFilter === 'overdue'
                ? 'Great news! There are no overdue book transactions at this time.'
                : tabFilter === 'active'
                ? 'You currently have no active borrowed books.'
                : tabFilter === 'returned'
                ? 'No past completed return records found.'
                : 'No borrowing transactions recorded yet.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                className="editorial-btn-secondary"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                className="editorial-btn-primary"
                onClick={() => onNavigate('/books')}
              >
                Explore Catalogue
              </button>
            )}
          </div>
        ) : (
          <div className="history-cards-list">
            {displayedList.map((borrowing) => {
              const book = books[borrowing.book_id]
              const status = getLoanStatus(borrowing)
              const isOverdue = status.type === 'overdue'
              const isReturned = status.type === 'returned'
              const isProcessing = returningId === borrowing.id

              return (
                <article
                  key={borrowing.id}
                  className={`history-item-card ${isOverdue ? 'item-overdue' : ''} ${isReturned ? 'item-returned' : ''}`}
                  onClick={() => setSelectedBorrowing(borrowing)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Transaction #${borrowing.id}. Tap for details.`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelectedBorrowing(borrowing)
                  }}
                >
                  {/* Book Cover Thumbnail */}
                  <div className="history-item-cover-wrap">
                    {book?.cover_image_url ? (
                      <CoverImage
                        className="history-item-cover-img"
                        src={book.cover_image_url}
                        alt=""
                        fallback={
                          <div className="history-item-cover-fallback">
                            <BookOpenIcon />
                          </div>
                        }
                      />
                    ) : (
                      <div className="history-item-cover-fallback">
                        <BookOpenIcon />
                      </div>
                    )}
                  </div>

                  {/* Main Information */}
                  <div className="history-item-content">
                    <div className="history-item-top-row">
                      <span className="history-docket-id">#{borrowing.id}</span>
                      <span
                        className={`editorial-status-pill ${
                          isOverdue ? 'reserved' : isReturned ? 'returned' : 'available'
                        }`}
                      >
                        <span className="status-dot" aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>

                    <h3 className="history-item-title">{book?.title || `Book #${borrowing.book_id}`}</h3>
                    <p className="history-item-author">by {book?.author || 'Unknown Author'}</p>

                    <div className="history-item-meta-grid">
                      <div className="meta-cell">
                        <span className="meta-label">Borrower</span>
                        <span className="meta-value">{borrowing.borrower_name}</span>
                      </div>

                      <div className="meta-cell">
                        <span className="meta-label">Due Date</span>
                        <span className={`meta-value ${isOverdue ? 'text-red' : ''}`}>
                          {formatDate(borrowing.due_date)}
                        </span>
                      </div>

                      {borrowing.return_date && (
                        <div className="meta-cell">
                          <span className="meta-label">Returned On</span>
                          <span className="meta-value">{formatDate(borrowing.return_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div
                    className="history-item-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isStaff && !isReturned && (
                      <button
                        type="button"
                        className="editorial-btn-primary history-action-btn"
                        onClick={() => handleProcessReturn(borrowing)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Checking in...' : 'Process Return'}
                      </button>
                    )}

                    <button
                      type="button"
                      className="editorial-btn-secondary history-action-btn"
                      onClick={() => setSelectedBorrowing(borrowing)}
                    >
                      <span>View Docket</span>
                      <ArrowRightIcon />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TRANSACTION DETAILS DOCKET MODAL
           ══════════════════════════════════════════════════════════════════ */}
        {selectedBorrowing && (
          <div
            className="book-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedBorrowing(null)}
          >
            <div
              className="history-docket-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="docket-modal-header">
                <div>
                  <span className="docket-kicker">LOAN RECORD DOCKET</span>
                  <h2 className="docket-title">Transaction #{selectedBorrowing.id}</h2>
                </div>
                <button
                  type="button"
                  className="docket-close-btn"
                  onClick={() => setSelectedBorrowing(null)}
                  aria-label="Close modal"
                >
                  <XIcon />
                </button>
              </div>

              {/* Book snippet */}
              {books[selectedBorrowing.book_id] && (
                <div className="docket-book-snippet">
                  <div className="snippet-cover">
                    {books[selectedBorrowing.book_id].cover_image_url ? (
                      <CoverImage src={books[selectedBorrowing.book_id].cover_image_url || ''} alt="" />
                    ) : (
                      <BookOpenIcon />
                    )}
                  </div>
                  <div className="snippet-info">
                    <span className="editorial-category-badge">
                      {normalizeCategory(books[selectedBorrowing.book_id].category)}
                    </span>
                    <h3 className="snippet-title">{books[selectedBorrowing.book_id].title}</h3>
                    <p className="snippet-author">by {books[selectedBorrowing.book_id].author}</p>
                    {books[selectedBorrowing.book_id].isbn && (
                      <small className="snippet-isbn">ISBN: {books[selectedBorrowing.book_id].isbn}</small>
                    )}
                  </div>
                </div>
              )}

              {/* Docket details table */}
              <div className="docket-specs-table">
                <div className="docket-spec-row">
                  <span className="docket-spec-label">Transaction ID</span>
                  <div className="docket-spec-value id-row">
                    <strong>#{selectedBorrowing.id}</strong>
                    <button
                      type="button"
                      className="docket-copy-btn"
                      onClick={() => handleCopyId(selectedBorrowing.id)}
                    >
                      {copiedId ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="docket-spec-row">
                  <span className="docket-spec-label">Borrower</span>
                  <div className="docket-spec-value">
                    <strong>{selectedBorrowing.borrower_name}</strong>
                    <small>{selectedBorrowing.borrower_contact}</small>
                  </div>
                </div>

                <div className="docket-spec-row">
                  <span className="docket-spec-label">Status</span>
                  <div className="docket-spec-value">
                    <span
                      className={`editorial-status-pill ${
                        getLoanStatus(selectedBorrowing).type === 'overdue'
                          ? 'reserved'
                          : getLoanStatus(selectedBorrowing).type === 'returned'
                          ? 'returned'
                          : 'available'
                      }`}
                    >
                      <span className="status-dot" aria-hidden="true" />
                      {getLoanStatus(selectedBorrowing).label}
                    </span>
                  </div>
                </div>

                <div className="docket-spec-row">
                  <span className="docket-spec-label">Due Date</span>
                  <span className="docket-spec-value">
                    {formatDate(selectedBorrowing.due_date)}
                  </span>
                </div>

                {selectedBorrowing.return_date && (
                  <div className="docket-spec-row">
                    <span className="docket-spec-label">Returned Date</span>
                    <span className="docket-spec-value text-green">
                      {formatDateTime(selectedBorrowing.return_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Docket Actions */}
              <div className="docket-modal-actions">
                {isStaff && selectedBorrowing.status !== 'returned' && !selectedBorrowing.return_date && (
                  <button
                    type="button"
                    className="editorial-btn-primary"
                    onClick={() => handleProcessReturn(selectedBorrowing)}
                    disabled={returningId === selectedBorrowing.id}
                  >
                    {returningId === selectedBorrowing.id ? 'Processing Return...' : 'Check In Book'}
                  </button>
                )}

                <button
                  type="button"
                  className="editorial-btn-secondary"
                  onClick={() => setSelectedBorrowing(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
