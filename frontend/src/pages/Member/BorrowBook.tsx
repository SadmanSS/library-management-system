import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createBorrowing, getBooks } from '../../services/api'
import type { Book, Borrowing, Profile, Route } from '../../types'
import { CoverImage } from '../../components/books/CoverImage'
import { extractCategories, normalizeCategory } from '../../utils/categoryNormalization'
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BookmarkIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  SearchIcon,
  XIcon,
} from '../../components/ui/Icons'

type Props = {
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

function getMaxDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 60)
  return d.toISOString().split('T')[0]
}

function addDaysToToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  try {
    if (!dateStr) return 'N/A'
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getDaysUntil(dateStr: string): number {
  if (!dateStr) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let target: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number)
    target = new Date(year, month - 1, day, 0, 0, 0, 0)
  } else {
    target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
  }
  const diffTime = target.getTime() - today.getTime()
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)))
}

function getInitials(nameOrEmail: string): string {
  const clean = nameOrEmail.trim()
  if (!clean) return 'M'
  if (clean.includes('@')) return clean.slice(0, 2).toUpperCase()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

export function BorrowBook({ onNavigate, profile }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [bookId, setBookId] = useState(
    () => new URLSearchParams(typeof location !== 'undefined' ? location.search : '').get('bookId') ?? ''
  )

  // Borrower identity state
  const defaultName = profile?.full_name?.trim() || ''
  const defaultContact = profile?.phone?.trim() || profile?.email?.trim() || ''

  const [borrowerName, setBorrowerName] = useState(defaultName)
  const [borrowerContact, setBorrowerContact] = useState(defaultContact)
  const [dueDate, setDueDate] = useState(getDefaultDueDate())

  // Loading & Submission state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<Borrowing | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Book search & selector state
  const [bookSearchQuery, setBookSearchQuery] = useState('')
  const [isChangingBook, setIsChangingBook] = useState(false)

  // Load books from API
  useEffect(() => {
    let isMounted = true
    getBooks()
      .then((data) => {
        if (!isMounted) return
        setBooks(data)
        // If current bookId isn't available or empty, auto-select first available title
        const currentValid = data.some((book) => String(book.id) === bookId && book.available_copies > 0)
        if (!currentValid) {
          const firstAvailable = data.find((book) => book.available_copies > 0)
          if (firstAvailable) {
            setBookId(firstAvailable.id.toString())
          }
        }
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          setError(reason instanceof Error ? reason.message : 'Unable to load available books.')
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [bookId])

  // Computed available list and active selection
  const availableBooks = useMemo(() => books.filter((b) => b.available_copies > 0), [books])
  const selectedBook = useMemo(() => books.find((b) => String(b.id) === bookId), [books, bookId])

  // Filtered available books for the in-page search picker
  const filteredAvailableBooks = useMemo(() => {
    const q = bookSearchQuery.trim().toLowerCase()
    if (!q) return availableBooks
    return availableBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q))
    )
  }, [availableBooks, bookSearchQuery])

  // Days duration helper
  const loanDays = useMemo(() => getDaysUntil(dueDate), [dueDate])

  // Copy Transaction ID
  const handleCopyId = () => {
    if (confirmation?.id && navigator?.clipboard) {
      navigator.clipboard.writeText(String(confirmation.id))
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  // Handle Form Submission
  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const finalName = (profile?.full_name || borrowerName).trim()
    const finalContact = (profile?.phone || profile?.email || borrowerContact).trim()

    if (!bookId || !finalName || !finalContact || !dueDate) {
      setError('Please choose a title and complete all required reservation details.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await createBorrowing({
        book_id: Number(bookId),
        borrower_name: finalName,
        borrower_contact: finalContact,
        due_date: dueDate,
      })

      // Optimistically decrement available copies for this book in state
      setBooks((prev) =>
        prev.map((b) =>
          b.id === Number(bookId)
            ? { ...b, available_copies: Math.max(0, b.available_copies - 1) }
            : b
        )
      )

      setConfirmation(res)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'This book could not be reserved at this time.')
    } finally {
      setSaving(false)
    }
  }

  const isProfileLocked = Boolean(profile)
  const selectedCategories = selectedBook ? extractCategories(selectedBook.category) : []

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="reservation-page">
        <div className="reservation-container">
          <div className="reservation-loading-card">
            <span className="loading-spinner" aria-hidden="true" />
            <h2>Loading reservation desk...</h2>
            <p>Fetching real-time collection inventory and loan parameters.</p>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: CONFIRMATION RECEIPT
  // ──────────────────────────────────────────────────────────────────────────
  if (confirmation) {
    return (
      <div className="reservation-page">
        <div className="reservation-container">
          <div className="reservation-confirmation-view">
            {/* Success Emblem */}
            <div className="reservation-success-emblem" aria-hidden="true">
              <CheckCircleIcon />
            </div>

            <p className="reservation-kicker">RESERVATION CONFIRMED</p>
            <h1 className="reservation-confirmed-title">Your Book is Secured</h1>
            <p className="reservation-confirmed-subtitle">
              Your reservation has been recorded. Present your Transaction ID at the library circulation desk to collect your copy.
            </p>

            {/* Receipt Docket */}
            <div className="reservation-receipt-ticket">
              <div className="receipt-ticket-header">
                <span className="receipt-kicker">OFFICIAL BORROWING DOCKET</span>
                <span className="receipt-status-badge">Active Hold</span>
              </div>

              <div className="receipt-transaction-row">
                <div>
                  <span className="receipt-field-label">TRANSACTION ID</span>
                  <strong className="receipt-transaction-id">#{confirmation.id}</strong>
                </div>
                <button
                  type="button"
                  className="receipt-copy-btn"
                  onClick={handleCopyId}
                  title="Copy transaction ID"
                >
                  {copiedId ? '✓ Copied' : 'Copy ID'}
                </button>
              </div>

              <div className="receipt-details-grid">
                {selectedBook && (
                  <div className="receipt-detail-item full">
                    <span className="receipt-field-label">BOOK TITLE</span>
                    <strong className="receipt-book-title">{selectedBook.title}</strong>
                    <span className="receipt-book-author">by {selectedBook.author}</span>
                  </div>
                )}

                <div className="receipt-detail-item">
                  <span className="receipt-field-label">BORROWER</span>
                  <strong>{confirmation.borrower_name}</strong>
                  <small>{confirmation.borrower_contact}</small>
                </div>

                <div className="receipt-detail-item">
                  <span className="receipt-field-label">RETURN DUE DATE</span>
                  <strong className="receipt-due-date">{formatDate(confirmation.due_date)}</strong>
                  <small>Standard 14-day loan term</small>
                </div>

                <div className="receipt-detail-item full receipt-pickup-note">
                  <span className="receipt-field-label">PICKUP DESK</span>
                  <p>
                    Central Library &middot; Main Desk. Please collect your reserved book within <strong>48 hours</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="reservation-confirmed-actions">
              <button
                type="button"
                className="editorial-btn-primary reservation-btn-large"
                onClick={() => onNavigate('/return')}
              >
                <span>View in Loan History</span>
                <ArrowRightIcon />
              </button>
              <button
                type="button"
                className="editorial-btn-secondary reservation-btn-large"
                onClick={() => onNavigate('/books')}
              >
                Browse Catalogue
              </button>
              <button
                type="button"
                className="reservation-reset-link"
                onClick={() => {
                  setConfirmation(null)
                  setIsChangingBook(false)
                }}
              >
                Reserve Another Title &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: EMPTY STATE (NO AVAILABLE TITLES)
  // ──────────────────────────────────────────────────────────────────────────
  if (!error && availableBooks.length === 0) {
    return (
      <div className="reservation-page">
        <div className="reservation-container">
          <div className="reservation-empty-card">
            <div className="reservation-empty-icon" aria-hidden="true">
              <BookOpenIcon />
            </div>
            <h2>No Titles Available for Reservation</h2>
            <p>
              All copies in our collection are currently on loan or reserved. Please check our catalogue later or inspect existing loans.
            </p>
            <div className="reservation-empty-actions">
              <button
                type="button"
                className="editorial-btn-primary"
                onClick={() => onNavigate('/books')}
              >
                Explore Catalogue
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 4: MAIN RESERVATION DESK FORM
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="reservation-page">
      <div className="reservation-container">
        {/* Page Header */}
        <header className="reservation-header">
          <div className="reservation-header-content">
            <p className="reservation-kicker">RESERVATION DESK</p>
            <h1 className="reservation-title">Reserve a Book</h1>
            <p className="reservation-subtitle">
              Select a title from our collection, set your borrowing timeline, and secure your book reservation.
            </p>
          </div>

          <div className="reservation-trust-pills">
            <span className="reservation-trust-pill">
              <BookOpenIcon />
              <span>Free Member Loan</span>
            </span>
            <span className="reservation-trust-pill">
              <ClockIcon />
              <span>14-Day Standard Window</span>
            </span>
            <span className="reservation-trust-pill">
              <BookmarkIcon />
              <span>Instant Desk Hold</span>
            </span>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="reservation-alert-error" role="alert">
            <AlertCircleIcon className="alert-icon" />
            <div className="alert-text">
              <strong>Reservation Error:</strong> {error}
            </div>
            <button
              type="button"
              className="alert-dismiss-btn"
              onClick={() => setError('')}
              aria-label="Dismiss alert"
            >
              <XIcon />
            </button>
          </div>
        )}

        {/* Split Grid: Form (Left) & Ticket Preview (Right) */}
        <div className="reservation-layout-grid">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN: RESERVATION FORM
             ══════════════════════════════════════════════════════════════════ */}
          <form className="reservation-form" onSubmit={handleSubmit}>
            {/* SECTION 1: BOOK SELECTION */}
            <div className="reservation-card-section">
              <div className="reservation-section-header">
                <span className="reservation-step-number">01</span>
                <div>
                  <h2 className="reservation-section-heading">Select Title</h2>
                  <p className="reservation-section-sub">Choose an available book from our active library collection.</p>
                </div>
              </div>

              {/* If a book is selected and user is NOT actively in search picker mode */}
              {selectedBook && !isChangingBook ? (
                <div className="reservation-selected-card">
                  <div className="reservation-selected-cover">
                    {selectedBook.cover_image_url ? (
                      <CoverImage
                        src={selectedBook.cover_image_url}
                        alt={`Cover of ${selectedBook.title}`}
                        fallback={
                          <div className="reservation-cover-fallback">
                            <BookOpenIcon />
                          </div>
                        }
                      />
                    ) : (
                      <div className="reservation-cover-fallback">
                        <BookOpenIcon />
                      </div>
                    )}
                  </div>

                  <div className="reservation-selected-info">
                    <div className="reservation-selected-meta">
                      <span className="editorial-category-badge">
                        {normalizeCategory(selectedBook.category)}
                      </span>
                      <span className="editorial-status-pill available">
                        <span className="status-dot" aria-hidden="true" />
                        {selectedBook.available_copies} of {selectedBook.total_copies} available
                      </span>
                    </div>

                    <h3 className="reservation-selected-title">{selectedBook.title}</h3>
                    <p className="reservation-selected-author">by {selectedBook.author}</p>
                    {selectedBook.isbn && (
                      <span className="reservation-selected-isbn">ISBN: {selectedBook.isbn}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="reservation-change-btn"
                    onClick={() => {
                      setIsChangingBook(true)
                      setBookSearchQuery('')
                    }}
                    title="Choose a different book"
                  >
                    Change Title
                  </button>
                </div>
              ) : (
                <div className="reservation-picker-container">
                  {/* Search filter for available books */}
                  <div className="reservation-search-bar">
                    <SearchIcon className="search-icon" />
                    <input
                      type="text"
                      placeholder="Filter by title, author, category, or ISBN..."
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      aria-label="Filter available books"
                      autoFocus={isChangingBook}
                    />
                    {bookSearchQuery && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setBookSearchQuery('')}
                        aria-label="Clear filter"
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>

                  {/* Scrollable list of available titles */}
                  <div className="reservation-books-listbox" role="listbox" aria-label="Available books">
                    {filteredAvailableBooks.length === 0 ? (
                      <div className="reservation-list-empty">
                        <p>No available titles match &ldquo;{bookSearchQuery}&rdquo;</p>
                      </div>
                    ) : (
                      filteredAvailableBooks.map((b) => {
                        const isChosen = String(b.id) === bookId
                        return (
                          <div
                            key={b.id}
                            role="option"
                            aria-selected={isChosen}
                            className={`reservation-book-option ${isChosen ? 'selected' : ''}`}
                            onClick={() => {
                              setBookId(String(b.id))
                              setIsChangingBook(false)
                            }}
                          >
                            <div className="option-cover">
                              {b.cover_image_url ? (
                                <CoverImage src={b.cover_image_url} alt="" />
                              ) : (
                                <BookOpenIcon className="option-cover-fallback" />
                              )}
                            </div>

                            <div className="option-content">
                              <span className="option-title">{b.title}</span>
                              <span className="option-author">by {b.author}</span>
                            </div>

                            <div className="option-badge">
                              <span className="option-copies-pill">
                                {b.available_copies} available
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Accessible native select */}
                  <div className="reservation-fallback-select">
                    <label htmlFor="accessible-book-select">Or select from dropdown list:</label>
                    <select
                      id="accessible-book-select"
                      className="editorial-select"
                      value={bookId}
                      onChange={(e) => {
                        setBookId(e.target.value)
                        setIsChangingBook(false)
                      }}
                    >
                      <option value="">-- Choose a title --</option>
                      {availableBooks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title} by {b.author} ({b.available_copies} copies)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedBook && isChangingBook && (
                    <button
                      type="button"
                      className="reservation-cancel-change-btn"
                      onClick={() => setIsChangingBook(false)}
                    >
                      Keep currently selected book &times;
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: LOAN TIMELINE & DUE DATE */}
            <div className="reservation-card-section">
              <div className="reservation-section-header">
                <span className="reservation-step-number">02</span>
                <div>
                  <h2 className="reservation-section-heading">Loan Schedule</h2>
                  <p className="reservation-section-sub">Choose your borrowing window or pick a specific return date.</p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="reservation-presets-group">
                <label className="reservation-label">Borrowing Duration Presets:</label>
                <div className="reservation-preset-pills">
                  <button
                    type="button"
                    className={`reservation-preset-pill ${loanDays === 7 ? 'active' : ''}`}
                    onClick={() => setDueDate(addDaysToToday(7))}
                  >
                    <span>7 Days</span>
                    <small>1 Week</small>
                  </button>
                  <button
                    type="button"
                    className={`reservation-preset-pill ${loanDays === 14 ? 'active' : ''}`}
                    onClick={() => setDueDate(addDaysToToday(14))}
                  >
                    <span>14 Days</span>
                    <small>Standard</small>
                  </button>
                  <button
                    type="button"
                    className={`reservation-preset-pill ${loanDays === 21 ? 'active' : ''}`}
                    onClick={() => setDueDate(addDaysToToday(21))}
                  >
                    <span>21 Days</span>
                    <small>3 Weeks</small>
                  </button>
                  <button
                    type="button"
                    className={`reservation-preset-pill ${loanDays === 30 ? 'active' : ''}`}
                    onClick={() => setDueDate(addDaysToToday(30))}
                  >
                    <span>30 Days</span>
                    <small>Extended</small>
                  </button>
                </div>
              </div>

              {/* Date Input with Calculation Display */}
              <div className="reservation-date-input-wrap">
                <label className="reservation-label" htmlFor="reservation-due-date">
                  Expected Return Date:
                </label>
                <div className="reservation-date-field">
                  <div className="date-icon-box" aria-hidden="true">
                    <CalendarIcon />
                  </div>
                  <input
                    id="reservation-due-date"
                    type="date"
                    className="reservation-date-input"
                    min={getMinDueDate()}
                    max={getMaxDueDate()}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
                <p className="reservation-date-helper">
                  Due date: <strong>{formatDate(dueDate)}</strong> ({loanDays} {loanDays === 1 ? 'day' : 'days'} from today)
                </p>
              </div>
            </div>

            {/* SECTION 3: BORROWER CREDENTIALS */}
            <div className="reservation-card-section">
              <div className="reservation-section-header">
                <span className="reservation-step-number">03</span>
                <div>
                  <h2 className="reservation-section-heading">Borrower Information</h2>
                  <p className="reservation-section-sub">
                    {isProfileLocked
                      ? 'Authenticated credentials linked to your library member account.'
                      : 'Provide your contact details for reservation pickup.'}
                  </p>
                </div>
              </div>

              {isProfileLocked ? (
                <div className="reservation-member-profile-card">
                  <div className="profile-card-avatar" aria-hidden="true">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="profile-avatar-img" />
                    ) : (
                      getInitials(profile?.full_name || profile?.email || '')
                    )}
                  </div>
                  <div className="profile-card-details">
                    <div className="profile-card-name-row">
                      <strong>{profile?.full_name || 'Member'}</strong>
                      <span className="profile-verified-badge">
                        <CheckCircleIcon /> Verified Member
                      </span>
                    </div>
                    <span className="profile-contact-text">
                      {profile?.email} {profile?.phone ? `&middot; ${profile.phone}` : ''}
                    </span>
                    <small className="profile-card-note">
                      🔒 Secured via Member Account. No manual verification required at pickup.
                    </small>
                  </div>
                </div>
              ) : (
                <div className="reservation-guest-fields">
                  <div className="reservation-input-group">
                    <label className="reservation-label" htmlFor="guest-name">
                      Full Name *
                    </label>
                    <input
                      id="guest-name"
                      type="text"
                      className="reservation-text-input"
                      placeholder="e.g. Eleanor Vance"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="reservation-input-group">
                    <label className="reservation-label" htmlFor="guest-contact">
                      Contact Email or Phone *
                    </label>
                    <input
                      id="guest-contact"
                      type="text"
                      className="reservation-text-input"
                      placeholder="e.g. member@example.com or +1 555-0192"
                      value={borrowerContact}
                      onChange={(e) => setBorrowerContact(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* FORM ACTIONS */}
            <div className="reservation-form-actions">
              <button
                type="submit"
                className="editorial-btn-primary reservation-confirm-btn"
                disabled={saving || !bookId}
              >
                {saving ? (
                  <>
                    <span className="loading-spinner" aria-hidden="true" />
                    <span>Processing Reservation...</span>
                  </>
                ) : (
                  <>
                    <BookmarkIcon />
                    <span>Confirm Book Reservation</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="editorial-btn-secondary reservation-cancel-btn"
                onClick={() => onNavigate('/books')}
              >
                Cancel &amp; Return to Catalogue
              </button>
            </div>
          </form>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN: STICKY RESERVATION SUMMARY DOCKET
             ══════════════════════════════════════════════════════════════════ */}
          <aside className="reservation-summary-column" aria-label="Reservation Summary">
            <div className="reservation-summary-card">
              <div className="summary-card-header">
                <span className="summary-kicker">RESERVATION SUMMARY</span>
                <span className="summary-status-tag">Ready for Hold</span>
              </div>

              {selectedBook ? (
                <>
                  {/* Book Cover */}
                  <div className="summary-cover-wrap">
                    {selectedBook.cover_image_url ? (
                      <CoverImage
                        className="summary-cover-img"
                        src={selectedBook.cover_image_url}
                        alt={`Cover of ${selectedBook.title}`}
                        fallback={
                          <div className="summary-cover-fallback">
                            <BookOpenIcon />
                            <span>{selectedBook.title}</span>
                          </div>
                        }
                      />
                    ) : (
                      <div className="summary-cover-fallback">
                        <BookOpenIcon />
                        <span>{selectedBook.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Author */}
                  <div className="summary-title-section">
                    <div className="summary-badges-row">
                      {selectedCategories.map((cat) => (
                        <span key={cat} className="editorial-category-badge">
                          {cat}
                        </span>
                      ))}
                      <span className="editorial-status-pill available">
                        <span className="status-dot" aria-hidden="true" />
                        Available
                      </span>
                    </div>

                    <h3 className="summary-book-title">{selectedBook.title}</h3>
                    <p className="summary-book-author">by {selectedBook.author}</p>
                  </div>

                  {/* Loan Parameters Breakdown */}
                  <div className="summary-breakdown-list">
                    <div className="breakdown-row">
                      <span className="breakdown-label">Borrower</span>
                      <strong className="breakdown-value">
                        {profile?.full_name || borrowerName || 'Library Member'}
                      </strong>
                    </div>

                    <div className="breakdown-row">
                      <span className="breakdown-label">Loan Duration</span>
                      <strong className="breakdown-value">{loanDays} Days</strong>
                    </div>

                    <div className="breakdown-row">
                      <span className="breakdown-label">Due Date</span>
                      <strong className="breakdown-value highlight">{formatDate(dueDate)}</strong>
                    </div>

                    <div className="breakdown-row">
                      <span className="breakdown-label">Stock Status</span>
                      <span className="breakdown-value">
                        {selectedBook.available_copies} of {selectedBook.total_copies} copies ready
                      </span>
                    </div>

                    {selectedBook.isbn && (
                      <div className="breakdown-row">
                        <span className="breakdown-label">ISBN</span>
                        <span className="breakdown-value font-mono">{selectedBook.isbn}</span>
                      </div>
                    )}

                    <div className="breakdown-row total-row">
                      <span className="breakdown-label">Lending Fee</span>
                      <strong className="breakdown-value free-tag">$0.00 (Free Member Benefit)</strong>
                    </div>
                  </div>

                  {/* Advisory Notice */}
                  <div className="summary-policy-note">
                    <p>
                      <strong>Library Policy:</strong> Reserved books are held at the circulation desk for 48 hours following confirmation. Returns can be completed at any branch.
                    </p>
                  </div>
                </>
              ) : (
                <div className="summary-empty-prompt">
                  <BookOpenIcon />
                  <p>Choose an available book on the left to review its borrowing parameters and reservation schedule.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
