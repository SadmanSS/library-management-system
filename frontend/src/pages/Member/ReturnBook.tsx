import { useState, useEffect, useMemo } from 'react'
import type { FormEvent } from 'react'
import { getBorrowings, getBorrowing, returnBorrowing, getBooks } from '../../services/api'
import type { Borrowing, Book, Profile, Route } from '../../types'

type Props = {
  onNavigate: (path: Route, query?: string) => void
  profile?: Profile | null
}

function formatDate(dateStr: string): string {
  try {
    if (!dateStr) return 'N/A'
    // If it's a date string like YYYY-MM-DD
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

export function ReturnBook({ onNavigate: _onNavigate, profile }: Props) {
  const isStaff = profile?.role === 'librarian' || profile?.role === 'admin'

  // Data states
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [books, setBooks] = useState<Record<number, Book>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [tabFilter, setTabFilter] = useState<'all' | 'overdue' | 'active' | 'returned'>('all')

  // Selected Transaction for Modal
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null)
  const [returningId, setReturningId] = useState<number | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copiedPhone, setCopiedPhone] = useState(false)

  // Manual search fallback for members
  const [manualId, setManualId] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

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
        setError(err instanceof Error ? err.message : 'Unable to load circulation records.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  // Real-time live filtering
  const filteredBorrowings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const cleanId = q.replace(/^#/, '').trim()

    return borrowings.filter((b) => {
      if (!q) return true

      // Search by Transaction ID (#42 or 42)
      if (b.id.toString().includes(cleanId) || `#${b.id}`.toLowerCase().includes(q)) {
        return true
      }
      // Search by student / borrower name
      if (b.borrower_name.toLowerCase().includes(q)) {
        return true
      }
      // Search by student / borrower phone / contact
      if (b.borrower_contact.toLowerCase().includes(q)) {
        return true
      }
      // Search by book title, author, or ISBN
      const book = books[b.book_id]
      if (book) {
        if (book.title.toLowerCase().includes(q)) return true
        if (book.author.toLowerCase().includes(q)) return true
        if (book.isbn.toLowerCase().includes(q)) return true
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

  // Overall counts before filter
  const totalOverdueCount = useMemo(() => {
    return borrowings.filter((b) => b.status !== 'returned' && !b.return_date && getLoanStatus(b).isOverdue).length
  }, [borrowings])

  const totalActiveCount = useMemo(() => {
    return borrowings.filter((b) => b.status !== 'returned' && !b.return_date && !getLoanStatus(b).isOverdue).length
  }, [borrowings])

  const totalReturnedCount = useMemo(() => {
    return borrowings.filter((b) => b.status === 'returned' || Boolean(b.return_date)).length
  }, [borrowings])

  // Process return action
  async function handleProcessReturn(borrowingToReturn: Borrowing) {
    setReturningId(borrowingToReturn.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await returnBorrowing(borrowingToReturn.id)
      // Update local borrowings list
      setBorrowings((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated, status: 'returned' } : item))
      )
      // Update modal selected borrowing
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

      setActionSuccess(`Transaction #${updated.id} successfully returned! Book stock has been updated.`)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to return book.')
    } finally {
      setReturningId(null)
    }
  }

  // Copy phone number
  function handleCopyPhone(phone: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(phone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    }
  }

  // Manual lookup for member
  async function handleManualFind(e: FormEvent) {
    e.preventDefault()
    const idVal = Number(manualId)
    if (!Number.isInteger(idVal) || idVal < 1) {
      setError('Please enter a valid borrowing transaction ID.')
      return
    }
    setManualLoading(true)
    setError('')
    try {
      const record = await getBorrowing(idVal)
      setSelectedBorrowing(record)
      setActionSuccess(null)
      setActionError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Borrowing transaction not found.')
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <section className="circulation-page">
      {/* Page Header */}
      <div className="circulation-header">
        <div className="circulation-header-main">
          <p className="section-kicker">{isStaff ? 'STAFF CIRCULATION DESK' : 'LIBRARY LOANS'}</p>
          <h1>{isStaff ? 'Process book returns' : 'My borrowed books'}</h1>
          <p>
            {isStaff
              ? 'Review borrowed transactions, track overdue items, inspect student details, and check in returned books.'
              : 'Keep track of your borrowed books, monitor due dates, and review loan transactions.'}
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="circulation-stats-row">
          <div className={`circulation-stat-badge ${totalOverdueCount > 0 ? 'has-overdue' : ''}`}>
            <span className="stat-label">Overdue</span>
            <span className="stat-value">{totalOverdueCount}</span>
          </div>
          <div className="circulation-stat-badge">
            <span className="stat-label">Active Loans</span>
            <span className="stat-value">{totalActiveCount}</span>
          </div>
          <div className="circulation-stat-badge">
            <span className="stat-label">Total Returned</span>
            <span className="stat-value">{totalReturnedCount}</span>
          </div>
        </div>
      </div>

      {/* Global alert or error message */}
      {error && (
        <div className="circulation-alert circulation-alert-error" role="alert">
          <span>⚠️ {error}</span>
          <button className="alert-dismiss" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Member Manual Lookup Drawer (if member wants to search direct ID) */}
      {!isStaff && (
        <div className="circulation-lookup-card">
          <form className="member-lookup-form" onSubmit={handleManualFind}>
            <div className="form-field">
              <span>Find loan by Transaction ID</span>
              <div className="search-input-group">
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 42"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                />
                <button className="button button-primary" type="submit" disabled={manualLoading || !manualId}>
                  {manualLoading ? 'Finding...' : 'Look up'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Real-time Search and Filter Toolbar */}
      <div className="circulation-toolbar">
        <div className="circulation-search-bar">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="circulation-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isStaff
                ? 'Search in real time by Transaction ID (#12), student name, phone number, or book title...'
                : 'Search loans by Transaction ID (#12), title, or author in real time...'
            }
            aria-label="Real-time transaction search"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="circulation-filter-pills" role="tablist" aria-label="Transaction filters">
          <button
            type="button"
            role="tab"
            aria-selected={tabFilter === 'all'}
            className={`pill-btn ${tabFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTabFilter('all')}
          >
            All Loans ({filteredBorrowings.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabFilter === 'overdue'}
            className={`pill-btn pill-overdue ${tabFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => setTabFilter('overdue')}
          >
            ⚠️ Overdue ({overdueBorrowings.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabFilter === 'active'}
            className={`pill-btn ${tabFilter === 'active' ? 'active' : ''}`}
            onClick={() => setTabFilter('active')}
          >
            Active On-Schedule ({activeBorrowings.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabFilter === 'returned'}
            className={`pill-btn ${tabFilter === 'returned' ? 'active' : ''}`}
            onClick={() => setTabFilter('returned')}
          >
            ✓ Returned ({returnedBorrowings.length})
          </button>
        </div>
      </div>

      {/* Search feedback info when query is typed */}
      {searchQuery && (
        <div className="search-results-feedback">
          <span>
            Found <strong>{filteredBorrowings.length}</strong> matching transaction{filteredBorrowings.length === 1 ? '' : 's'} for &ldquo;<strong>{searchQuery}</strong>&rdquo;
          </span>
          <button className="clear-link" onClick={() => setSearchQuery('')}>Clear search</button>
        </div>
      )}

      {/* Main Loading state */}
      {loading ? (
        <div className="circulation-loading">
          <div className="loading-spinner" />
          <p>Loading circulation transactions...</p>
        </div>
      ) : (
        <div className="circulation-sections">
          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 1: OVERDUE TRANSACTIONS (Dedicated Section)
             ══════════════════════════════════════════════════════════════════════ */}
          {(tabFilter === 'all' || tabFilter === 'overdue') && (
            <div className="circulation-section overdue-section">
              <div className="section-banner overdue-banner">
                <div className="section-banner-title">
                  <span className="alert-symbol">⚠️</span>
                  <div>
                    <h2>Overdue Transactions</h2>
                    <p>These borrowings have passed their due date and require immediate check-in.</p>
                  </div>
                </div>
                <span className="overdue-count-pill">{overdueBorrowings.length} Overdue</span>
              </div>

              {overdueBorrowings.length === 0 ? (
                <div className="empty-section-card overdue-empty">
                  <span className="empty-icon">✓</span>
                  <div>
                    <h3>No Overdue Borrowings</h3>
                    <p>
                      {searchQuery
                        ? 'No overdue transactions match your search filter.'
                        : 'All active loans are currently within their due dates. Great job!'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="transaction-cards-grid">
                  {overdueBorrowings.map((b) => {
                    const book = books[b.book_id]
                    const status = getLoanStatus(b)
                    return (
                      <div
                        key={b.id}
                        className="transaction-card overdue-card"
                        onClick={() => {
                          setSelectedBorrowing(b)
                          setActionSuccess(null)
                          setActionError(null)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedBorrowing(b)
                            setActionSuccess(null)
                            setActionError(null)
                          }
                        }}
                      >
                        <div className="card-top-row">
                          <span className="transaction-id-badge overdue-badge">
                            ID #{b.id}
                          </span>
                          <span className="overdue-tag">
                            ⚠️ {status.label}
                          </span>
                        </div>

                        <div className="card-book-row">
                          {book?.cover_image_url ? (
                            <img className="card-cover-thumb" src={book.cover_image_url} alt="" />
                          ) : (
                            <div className="card-cover-placeholder">📖</div>
                          )}
                          <div className="card-book-info">
                            <h3 className="card-book-title">{book?.title || `Book #${b.book_id}`}</h3>
                            <p className="card-book-author">{book?.author || 'Unknown author'}</p>
                            {book?.isbn && <p className="card-book-isbn">ISBN: {book.isbn}</p>}
                          </div>
                        </div>

                        {/* Dates Row: Borrow date to Due date */}
                        <div className="card-dates-box overdue-dates">
                          <div className="date-item">
                            <span className="date-label">📅 Borrow Date</span>
                            <span className="date-value">{formatDate(b.borrowed_at)}</span>
                          </div>
                          <span className="date-arrow">➔</span>
                          <div className="date-item">
                            <span className="date-label">⏰ Due Date</span>
                            <span className="date-value due-alert">{formatDate(b.due_date)}</span>
                          </div>
                        </div>

                        {/* Borrower Preview & Open Action */}
                        <div className="card-bottom-row">
                          <div className="borrower-preview">
                            <span className="borrower-icon">👤</span>
                            <span className="borrower-name">{b.borrower_name}</span>
                          </div>
                          <button
                            type="button"
                            className="card-open-btn overdue-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedBorrowing(b)
                              setActionSuccess(null)
                              setActionError(null)
                            }}
                          >
                            Open Details &amp; Return →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 2: ACTIVE ON-SCHEDULE TRANSACTIONS
             ══════════════════════════════════════════════════════════════════════ */}
          {(tabFilter === 'all' || tabFilter === 'active') && (
            <div className="circulation-section active-section">
              <div className="section-banner active-banner">
                <div className="section-banner-title">
                  <span className="banner-symbol">📚</span>
                  <div>
                    <h2>Active Borrowings</h2>
                    <p>Current active loans within their due date period.</p>
                  </div>
                </div>
                <span className="active-count-pill">{activeBorrowings.length} Active</span>
              </div>

              {activeBorrowings.length === 0 ? (
                <div className="empty-section-card">
                  <span className="empty-icon">📖</span>
                  <div>
                    <h3>No Active Loans</h3>
                    <p>
                      {searchQuery
                        ? 'No active transactions match your search filter.'
                        : 'There are currently no active on-schedule loans.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="transaction-cards-grid">
                  {activeBorrowings.map((b) => {
                    const book = books[b.book_id]
                    const status = getLoanStatus(b)
                    return (
                      <div
                        key={b.id}
                        className="transaction-card"
                        onClick={() => {
                          setSelectedBorrowing(b)
                          setActionSuccess(null)
                          setActionError(null)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedBorrowing(b)
                            setActionSuccess(null)
                            setActionError(null)
                          }
                        }}
                      >
                        <div className="card-top-row">
                          <span className="transaction-id-badge active-id-badge">
                            ID #{b.id}
                          </span>
                          <span className={`status-pill ${status.type === 'warning' ? 'warning-pill' : 'active-pill'}`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="card-book-row">
                          {book?.cover_image_url ? (
                            <img className="card-cover-thumb" src={book.cover_image_url} alt="" />
                          ) : (
                            <div className="card-cover-placeholder">📖</div>
                          )}
                          <div className="card-book-info">
                            <h3 className="card-book-title">{book?.title || `Book #${b.book_id}`}</h3>
                            <p className="card-book-author">{book?.author || 'Unknown author'}</p>
                            {book?.isbn && <p className="card-book-isbn">ISBN: {book.isbn}</p>}
                          </div>
                        </div>

                        {/* Dates Row: Borrow date to Due date */}
                        <div className="card-dates-box">
                          <div className="date-item">
                            <span className="date-label">📅 Borrow Date</span>
                            <span className="date-value">{formatDate(b.borrowed_at)}</span>
                          </div>
                          <span className="date-arrow">➔</span>
                          <div className="date-item">
                            <span className="date-label">⏰ Due Date</span>
                            <span className="date-value">{formatDate(b.due_date)}</span>
                          </div>
                        </div>

                        {/* Borrower Preview & Open Action */}
                        <div className="card-bottom-row">
                          <div className="borrower-preview">
                            <span className="borrower-icon">👤</span>
                            <span className="borrower-name">{b.borrower_name}</span>
                          </div>
                          <button
                            type="button"
                            className="card-open-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedBorrowing(b)
                              setActionSuccess(null)
                              setActionError(null)
                            }}
                          >
                            Open Details &amp; Return →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 3: RETURNED TRANSACTIONS HISTORY
             ══════════════════════════════════════════════════════════════════════ */}
          {(tabFilter === 'all' || tabFilter === 'returned') && (
            <div className="circulation-section returned-section">
              <div className="section-banner returned-banner">
                <div className="section-banner-title">
                  <span className="banner-symbol">✓</span>
                  <div>
                    <h2>Returned History</h2>
                    <p>Archived transactions that have already been checked back into the library.</p>
                  </div>
                </div>
                <span className="returned-count-pill">{returnedBorrowings.length} Returned</span>
              </div>

              {returnedBorrowings.length === 0 ? (
                <div className="empty-section-card">
                  <span className="empty-icon">✓</span>
                  <div>
                    <h3>No Returned Records Found</h3>
                    <p>
                      {searchQuery
                        ? 'No returned records match your search filter.'
                        : 'No returned history to display yet.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="transaction-cards-grid">
                  {returnedBorrowings.map((b) => {
                    const book = books[b.book_id]
                    return (
                      <div
                        key={b.id}
                        className="transaction-card returned-card"
                        onClick={() => {
                          setSelectedBorrowing(b)
                          setActionSuccess(null)
                          setActionError(null)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedBorrowing(b)
                            setActionSuccess(null)
                            setActionError(null)
                          }
                        }}
                      >
                        <div className="card-top-row">
                          <span className="transaction-id-badge returned-id-badge">
                            ID #{b.id}
                          </span>
                          <span className="status-pill returned-pill">
                            ✓ Returned
                          </span>
                        </div>

                        <div className="card-book-row">
                          {book?.cover_image_url ? (
                            <img className="card-cover-thumb" src={book.cover_image_url} alt="" />
                          ) : (
                            <div className="card-cover-placeholder">📖</div>
                          )}
                          <div className="card-book-info">
                            <h3 className="card-book-title">{book?.title || `Book #${b.book_id}`}</h3>
                            <p className="card-book-author">{book?.author || 'Unknown author'}</p>
                          </div>
                        </div>

                        <div className="card-dates-box returned-dates">
                          <div className="date-item">
                            <span className="date-label">📅 Borrowed</span>
                            <span className="date-value">{formatDate(b.borrowed_at)}</span>
                          </div>
                          <span className="date-arrow">➔</span>
                          <div className="date-item">
                            <span className="date-label">✓ Returned On</span>
                            <span className="date-value">
                              {b.return_date ? formatDate(b.return_date) : 'Returned'}
                            </span>
                          </div>
                        </div>

                        <div className="card-bottom-row">
                          <div className="borrower-preview">
                            <span className="borrower-icon">👤</span>
                            <span className="borrower-name">{b.borrower_name}</span>
                          </div>
                          <button
                            type="button"
                            className="card-open-btn returned-open-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedBorrowing(b)
                              setActionSuccess(null)
                              setActionError(null)
                            }}
                          >
                            View Record →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TRANSACTION DETAIL & RETURN MODAL (Opens when clicking any card)
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedBorrowing && (
        <div
          className="transaction-modal-backdrop"
          onClick={() => setSelectedBorrowing(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-tx-title"
        >
          <div
            className="transaction-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="transaction-modal-header">
              <div className="modal-title-group">
                <span className="modal-kicker">BORROWING TRANSACTION</span>
                <h2 id="modal-tx-title">Transaction #{selectedBorrowing.id}</h2>
              </div>
              <div className="modal-header-actions">
                {(() => {
                  const status = getLoanStatus(selectedBorrowing)
                  if (status.type === 'returned') {
                    return <span className="status-pill returned-pill">✓ Returned</span>
                  }
                  if (status.isOverdue) {
                    return <span className="status-pill overdue-pill">⚠️ {status.label}</span>
                  }
                  return <span className="status-pill active-pill">{status.label}</span>
                })()}
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedBorrowing(null)}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* In-modal alerts */}
            {actionSuccess && (
              <div className="modal-alert modal-alert-success" role="alert">
                <span>✓ {actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="modal-alert modal-alert-error" role="alert">
                <span>⚠️ {actionError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="transaction-modal-body">
              {/* BORROWER / STUDENT INFORMATION CARD (Highlighted for staff) */}
              <div className="modal-section-card borrower-info-card">
                <div className="modal-section-header">
                  <span className="section-icon">👤</span>
                  <h3>Borrower / Student Information</h3>
                </div>
                <div className="borrower-details-grid">
                  <div className="borrower-detail-item">
                    <span className="detail-label">Full Name</span>
                    <strong className="detail-value name-value">
                      {selectedBorrowing.borrower_name}
                    </strong>
                  </div>

                  <div className="borrower-detail-item">
                    <span className="detail-label">Phone / Contact</span>
                    <div className="contact-value-row">
                      <a
                        href={`tel:${selectedBorrowing.borrower_contact}`}
                        className="phone-link"
                        title="Click to call"
                      >
                        📞 {selectedBorrowing.borrower_contact}
                      </a>
                      <button
                        type="button"
                        className="copy-phone-btn"
                        onClick={() => handleCopyPhone(selectedBorrowing.borrower_contact)}
                        title="Copy phone number"
                      >
                        {copiedPhone ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOOK DETAILS CARD */}
              <div className="modal-section-card book-info-card">
                <div className="modal-section-header">
                  <span className="section-icon">📖</span>
                  <h3>Book Details</h3>
                </div>
                <div className="modal-book-layout">
                  {books[selectedBorrowing.book_id]?.cover_image_url ? (
                    <img
                      className="modal-book-cover"
                      src={books[selectedBorrowing.book_id].cover_image_url || ''}
                      alt={books[selectedBorrowing.book_id]?.title || 'Book cover'}
                    />
                  ) : (
                    <div className="modal-book-placeholder">📖</div>
                  )}
                  <div className="modal-book-meta">
                    <h4 className="modal-book-title">
                      {books[selectedBorrowing.book_id]?.title || `Book #${selectedBorrowing.book_id}`}
                    </h4>
                    <p className="modal-book-author">
                      Author: <strong>{books[selectedBorrowing.book_id]?.author || 'Unknown'}</strong>
                    </p>
                    {books[selectedBorrowing.book_id]?.category && (
                      <p className="modal-book-category">
                        Category: <span className="cat-tag">{books[selectedBorrowing.book_id].category}</span>
                      </p>
                    )}
                    {books[selectedBorrowing.book_id]?.isbn && (
                      <p className="modal-book-isbn">
                        ISBN: <code>{books[selectedBorrowing.book_id].isbn}</code>
                      </p>
                    )}
                    {books[selectedBorrowing.book_id] && (
                      <p className="modal-book-inventory">
                        Available copies: <strong>{books[selectedBorrowing.book_id].available_copies}</strong> of{' '}
                        <strong>{books[selectedBorrowing.book_id].total_copies}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* DATES & TIMELINE CARD */}
              <div className="modal-section-card timeline-card">
                <div className="modal-section-header">
                  <span className="section-icon">🗓️</span>
                  <h3>Circulation Timeline</h3>
                </div>
                <div className="timeline-grid">
                  <div className="timeline-item">
                    <span className="timeline-dot" />
                    <div>
                      <span className="timeline-label">Borrowed On</span>
                      <strong className="timeline-date">{formatDateTime(selectedBorrowing.borrowed_at)}</strong>
                    </div>
                  </div>

                  <div className={`timeline-item ${getLoanStatus(selectedBorrowing).isOverdue ? 'item-overdue' : ''}`}>
                    <span className={`timeline-dot ${getLoanStatus(selectedBorrowing).isOverdue ? 'dot-overdue' : ''}`} />
                    <div>
                      <span className="timeline-label">Due Date</span>
                      <strong className="timeline-date">{formatDate(selectedBorrowing.due_date)}</strong>
                      <span className="timeline-status-hint">
                        {getLoanStatus(selectedBorrowing).label}
                      </span>
                    </div>
                  </div>

                  {selectedBorrowing.return_date && (
                    <div className="timeline-item item-returned">
                      <span className="timeline-dot dot-returned" />
                      <div>
                        <span className="timeline-label">Returned On</span>
                        <strong className="timeline-date">{formatDateTime(selectedBorrowing.return_date)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="transaction-modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedBorrowing(null)}
              >
                Close
              </button>

              {/* If active or overdue, allow staff or borrower to return the book */}
              {selectedBorrowing.status === 'active' && !selectedBorrowing.return_date ? (
                <button
                  type="button"
                  className="button button-primary process-return-btn"
                  disabled={returningId === selectedBorrowing.id}
                  onClick={() => handleProcessReturn(selectedBorrowing)}
                >
                  {returningId === selectedBorrowing.id ? (
                    'Processing Return...'
                  ) : (
                    '✓ Confirm & Process Return'
                  )}
                </button>
              ) : (
                <span className="returned-notice">
                  ✓ This book was returned on {selectedBorrowing.return_date ? formatDate(selectedBorrowing.return_date) : 'record'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
