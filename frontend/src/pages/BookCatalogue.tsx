import { useEffect, useMemo, useState } from 'react'
import { deleteBook, getBooks } from '../services/api'
import type { Book, Profile, Route } from '../types'
import { BookGrid } from '../components/books/BookGrid'
import { StateMessage } from '../components/ui/StateMessage'
import { CoverImage } from '../components/books/CoverImage'
import { useBodyScrollLock } from '../utils/useBodyScrollLock'

type BookCatalogueProps = {
  onNavigate: (path: Route, query?: string) => void
  canManage?: boolean
  profile?: Profile | null
}

export function BookCatalogue({
  onNavigate,
  canManage = false,
  profile = null,
}: BookCatalogueProps) {
  const canBorrow = Boolean(profile && profile.role === 'member')
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedBookForView, setSelectedBookForView] = useState<Book | null>(null)

  // Prevent background scrolling when either modal is open
  useBodyScrollLock(Boolean(selectedBookForView || bookToDelete))

  // Close modals on Escape key
  useEffect(() => {
    if (!selectedBookForView && !bookToDelete) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedBookForView) setSelectedBookForView(null)
        if (bookToDelete) setBookToDelete(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBookForView, bookToDelete])

  // View mode: Grid vs List
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Read URL query params on initial load
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('search') || params.get('q') || ''
  })
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('category') || 'All'
  })
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'out_of_stock'>('all')
  const [sortBy, setSortBy] = useState('title_asc')

  const load = () => {
    setLoading(true)
    setError('')
    getBooks()
      .then(setBooks)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'Unable to load the catalogue.')
      )
      .finally(() => setLoading(false))
  }

  const remove = async () => {
    if (!bookToDelete) return
    setDeleting(true)
    try {
      await deleteBook(bookToDelete.id)
      setBooks((current) => current.filter((item) => item.id !== bookToDelete.id))
      if (selectedBookForView?.id === bookToDelete.id) {
        setSelectedBookForView(null)
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete this book.')
    } finally {
      setDeleting(false)
      setBookToDelete(null)
    }
  }

  useEffect(() => {
    let active = true
    getBooks()
      .then((data) => {
        if (active) setBooks(data)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the catalogue.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Sync category if URL search parameters change externally
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const cat = params.get('category')
      if (cat) setSelectedCategory(cat)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function handleClearSearch() {
    setSearchQuery('')
  }

  function resetFilters() {
    setSearchQuery('')
    setSelectedCategory('All')
    setAvailabilityFilter('all')
    setSortBy('title_asc')
  }

  // Extract all categories with their book counts
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>()
    books.forEach((b) => {
      const cats = b.category ? b.category.split(',') : ['Uncategorized']
      cats.forEach((c) => {
        const trimmed = c.trim()
        if (trimmed) {
          map.set(trimmed, (map.get(trimmed) || 0) + 1)
        }
      })
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [books])

  // Real-time filtered & sorted books
  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return books
      .filter((book) => {
        const matchesSearch =
          !query ||
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.isbn.toLowerCase().includes(query) ||
          (book.description && book.description.toLowerCase().includes(query))

        const matchesCategory =
          selectedCategory === 'All' ||
          (book.category && book.category.toLowerCase().includes(selectedCategory.toLowerCase()))

        const matchesAvailability =
          availabilityFilter === 'all' ||
          (availabilityFilter === 'available' && book.available_copies > 0) ||
          (availabilityFilter === 'out_of_stock' && book.available_copies === 0)

        return matchesSearch && matchesCategory && matchesAvailability
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'title_asc':
            return a.title.localeCompare(b.title)
          case 'title_desc':
            return b.title.localeCompare(a.title)
          case 'author_asc':
            return a.author.localeCompare(b.author)
          case 'copies_desc':
            return b.available_copies - a.available_copies
          case 'newest':
            return b.id - a.id
          default:
            return 0
        }
      })
  }, [books, searchQuery, selectedCategory, availabilityFilter, sortBy])

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    availabilityFilter !== 'all' ||
    sortBy !== 'title_asc'

  return (
    <>
      <div className="paradise-catalogue-wrapper">
        {/* ── MAIN CONTENT AREA ── */}
        <main className="catalogue-main-layout">
          {/* Category Pills Strip */}
          {!loading && !error && books.length > 0 && (
            <div className="catalogue-categories-strip">
              <div className="categories-strip-scroll">
                <button
                  type="button"
                  className={`category-chip ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('All')}
                >
                  <span className="chip-label">All Volumes</span>
                  <span className="chip-count">{books.length}</span>
                </button>
                {categoryStats.map(([catName, count]) => (
                  <button
                    key={catName}
                    type="button"
                    className={`category-chip ${selectedCategory.toLowerCase() === catName.toLowerCase() ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(catName)}
                  >
                    <span className="chip-label">{catName}</span>
                    <span className="chip-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search, Filter & Toolbar Bar */}
          {!loading && !error && books.length > 0 && (
            <div className="catalogue-control-panel">
              {/* Search Box Row */}
              <div className="catalogue-search-row">
                <div className="catalogue-search-box">
                  <span className="search-glass-icon" aria-hidden="true">⌕</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by book title, author, ISBN, or keywords..."
                    aria-label="Real-time catalogue search"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {canManage && (
                  <button
                    type="button"
                    className="catalogue-btn-add-primary"
                    onClick={() => onNavigate('/books/add')}
                  >
                    <span className="plus-sign">+</span> Add New Book
                  </button>
                )}
              </div>

              {/* Filters & Options Row */}
              <div className="catalogue-options-row">
                {/* Availability Pills */}
                <div className="availability-filter-group">
                  <span className="options-group-title">Availability:</span>
                  <div className="filter-pill-toggle">
                    <button
                      type="button"
                      className={`pill-toggle-btn ${availabilityFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setAvailabilityFilter('all')}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`pill-toggle-btn ${availabilityFilter === 'available' ? 'active' : ''}`}
                      onClick={() => setAvailabilityFilter('available')}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      className={`pill-toggle-btn ${availabilityFilter === 'out_of_stock' ? 'active' : ''}`}
                      onClick={() => setAvailabilityFilter('out_of_stock')}
                    >
                      Reserved
                    </button>
                  </div>
                </div>

                {/* Sort dropdown */}
                <div className="catalogue-sort-group">
                  <label htmlFor="catalogue-sort">Sort:</label>
                  <select
                    id="catalogue-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="catalogue-select"
                  >
                    <option value="title_asc">Title (A – Z)</option>
                    <option value="title_desc">Title (Z – A)</option>
                    <option value="author_asc">Author (A – Z)</option>
                    <option value="copies_desc">Most Copies Available</option>
                    <option value="newest">Recently Catalogued</option>
                  </select>
                </div>

                {/* View Mode Toggle: Grid vs List */}
                <div className="view-mode-toggle">
                  <button
                    type="button"
                    className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    ⊞
                  </button>
                  <button
                    type="button"
                    className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List view"
                    aria-label="List view"
                  >
                    ☰
                  </button>
                </div>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="catalogue-reset-btn"
                    onClick={resetFilters}
                  >
                    ↺ Reset filters
                  </button>
                )}
              </div>

              {/* Status & Results Summary Bar */}
              <div className="catalogue-meta-summary">
                <span className="summary-count">
                  Showing <strong>{filteredBooks.length}</strong> of <strong>{books.length}</strong> books
                  {selectedCategory !== 'All' && (
                    <> in category &ldquo;<strong>{selectedCategory}</strong>&rdquo;</>
                  )}
                  {searchQuery.trim() && (
                    <> matching &ldquo;<strong>{searchQuery.trim()}</strong>&rdquo;</>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* State Messages */}
          {loading && (
            <div className="catalogue-loading-state">
              <StateMessage
                loading
                title="Accessing the Archives..."
                text="Fetching collection metadata and shelf inventory."
              />
            </div>
          )}

          {!loading && error && (
            <div className="catalogue-error-state">
              <StateMessage
                title="Unable to load the collection."
                text={error}
                action="Try again"
                onAction={load}
              />
            </div>
          )}

          {!loading && !error && !books.length && (
            <div className="catalogue-empty-state-wrap">
              <StateMessage
                title="The library archives are currently empty."
                text="Add titles to begin populating the public and member collection."
                action={canManage ? 'Add the first book' : undefined}
                onAction={canManage ? () => onNavigate('/books/add') : undefined}
              />
            </div>
          )}

          {/* Book Collection Display */}
          {!loading && !error && books.length > 0 && filteredBooks.length > 0 && (
            <section className="catalogue-collection-section" aria-label="Book collection list">
              <BookGrid
                books={filteredBooks}
                onNavigate={onNavigate}
                onDelete={setBookToDelete}
                onQuickView={setSelectedBookForView}
                canManage={canManage}
                profile={profile}
                viewMode={viewMode}
              />
            </section>
          )}

          {/* Filter Empty Results */}
          {!loading && !error && books.length > 0 && filteredBooks.length === 0 && (
            <div className="catalogue-no-results">
              <div className="no-results-icon">📖</div>
              <h3>No matching volumes found</h3>
              <p>
                No titles in our collection match your active query &ldquo;<strong>{searchQuery || selectedCategory}</strong>&rdquo;.
              </p>
              <button
                type="button"
                className="catalogue-btn-add-primary"
                onClick={resetFilters}
              >
                Clear all filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── BOOK QUICK VIEW MODAL ── */}
      {selectedBookForView && (
        <div
          className="book-modal-backdrop"
          onClick={() => setSelectedBookForView(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="book-detail-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-corner-btn"
              onClick={() => setSelectedBookForView(null)}
              aria-label="Close book details"
            >
              ✕
            </button>

            <div className="book-detail-modal-grid">
              {/* Left Column: Book Cover Presentation */}
              <div className="detail-modal-cover-column">
                <div className="detail-modal-cover-wrap">
                  {selectedBookForView.cover_image_url ? (
                    <CoverImage
                      className="detail-modal-cover-img"
                      src={selectedBookForView.cover_image_url}
                      alt={`Cover of ${selectedBookForView.title}`}
                    />
                  ) : (
                    <div className="book-cover-placeholder-luxury theme-navy">
                      <div className="spine-crease" />
                      <div className="placeholder-gold-frame">
                        <span className="placeholder-emblem">📖</span>
                        <span className="placeholder-title">{selectedBookForView.title}</span>
                        <span className="placeholder-author">{selectedBookForView.author}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-cover-badge-row">
                  <span
                    className={`stock-pill-overlay ${
                      selectedBookForView.available_copies > 0 ? 'available' : 'borrowed'
                    }`}
                  >
                    <span className="stock-dot" />
                    <span>
                      {selectedBookForView.available_copies > 0
                        ? `${selectedBookForView.available_copies} of ${selectedBookForView.total_copies} Available`
                        : 'Currently Loaned Out'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Right Column: Metadata & Synopsis */}
              <div className="detail-modal-content-column">
                <div className="detail-modal-header-meta">
                  <span className="book-category-tag">
                    {selectedBookForView.category || 'General Collection'}
                  </span>
                  <span className="detail-isbn">ISBN: {selectedBookForView.isbn}</span>
                </div>

                <h2 className="detail-modal-title">{selectedBookForView.title}</h2>
                <p className="detail-modal-author">by <strong>{selectedBookForView.author}</strong></p>

                {/* Synopsis Section */}
                <div className="detail-modal-synopsis-box">
                  <span className="synopsis-label">SYNOPSIS &amp; SUMMARY</span>
                  <p className="synopsis-text">
                    {selectedBookForView.description
                      ? selectedBookForView.description
                      : 'This curated edition is catalogued within our collection. Additional archival notes and chapter summaries are available directly via the circulation staff.'}
                  </p>
                </div>

                {/* Specs Grid */}
                <div className="detail-specs-grid">
                  <div className="spec-card">
                    <span className="spec-title">Available Copies</span>
                    <strong className="spec-value highlight">
                      {selectedBookForView.available_copies}
                    </strong>
                  </div>
                  <div className="spec-card">
                    <span className="spec-title">Total Inventory</span>
                    <strong className="spec-value">
                      {selectedBookForView.total_copies}
                    </strong>
                  </div>
                  <div className="spec-card">
                    <span className="spec-title">Shelf Status</span>
                    <strong className="spec-value">
                      {selectedBookForView.available_copies > 0 ? '🟢 In Library' : '🔴 Checked Out'}
                    </strong>
                  </div>
                </div>

                {/* Modal Bottom Actions */}
                {(canBorrow || canManage) && (
                  <div className="detail-modal-actions-bar">
                    {canBorrow && (
                      selectedBookForView.available_copies > 0 ? (
                        <button
                          type="button"
                          className="modal-btn-borrow-primary"
                          onClick={() => {
                            const bookId = selectedBookForView.id
                            setSelectedBookForView(null)
                            onNavigate('/borrow', `?bookId=${bookId}`)
                          }}
                        >
                          Borrow / Reserve Volume →
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="modal-btn-borrow-primary disabled"
                          disabled
                        >
                          Currently Unavailable
                        </button>
                      )
                    )}

                    {canManage && (
                      <button
                        type="button"
                        className="modal-btn-edit-secondary"
                        onClick={() => {
                          const bookId = selectedBookForView.id
                          setSelectedBookForView(null)
                          onNavigate('/books/edit', `?bookId=${bookId}`)
                        }}
                      >
                        Edit Metadata
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {bookToDelete && (
        <div
          className="delete-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setBookToDelete(null)
          }}
        >
          <div
            className="delete-modal luxury-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="delete-modal-icon" aria-hidden="true">⚠️</div>
            <h2 id="delete-modal-title">Remove from Catalogue?</h2>
            <p>
              Are you sure you want to delete &ldquo;<strong>{bookToDelete.title}</strong>&rdquo; by {bookToDelete.author}?
              This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="button delete-modal-cancel"
                disabled={deleting}
                onClick={() => setBookToDelete(null)}
              >
                Keep Book
              </button>
              <button
                type="button"
                className="button delete-modal-confirm"
                disabled={deleting}
                onClick={remove}
              >
                {deleting ? 'Removing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
