import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteBook, getBooks } from '../services/api'
import type { Book, Profile, Route } from '../types'
import { BookGrid } from '../components/books/BookGrid'
import { StateMessage } from '../components/ui/StateMessage'
import { useBodyScrollLock } from '../utils/useBodyScrollLock'
import {
  bookMatchesCategory,
  normalizeCategory,
} from '../utils/categoryNormalization'
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GridIcon,
  ListIcon,
  PlusIcon,
  ResetIcon,
  SearchIcon,
  XIcon,
} from '../components/ui/Icons'

type BookCatalogueProps = {
  onNavigate: (path: Route, query?: string) => void
  canManage?: boolean
  profile?: Profile | null
}

const ITEMS_PER_PAGE = 15

export function BookCatalogue({
  onNavigate,
  canManage = false,
  profile = null,
}: BookCatalogueProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Prevent background scrolling when delete modal is open
  useBodyScrollLock(Boolean(bookToDelete))

  // Close modals on Escape key
  useEffect(() => {
    if (!bookToDelete) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (bookToDelete) setBookToDelete(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bookToDelete])

  // View mode: Grid vs List
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Search, Category, Availability, Sort Filters
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('search') || params.get('q') || ''
  })
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('category') || 'All'
  })
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'out_of_stock'>('all')
  const [sortBy, setSortBy] = useState<'title_asc' | 'title_desc' | 'newest' | 'author_asc'>('title_asc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const catalogueTopRef = useRef<HTMLDivElement>(null)

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

  // Handlers that update filters and reset to page 1
  function handleSearchChange(query: string) {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  function handleClearSearch() {
    setSearchQuery('')
    setCurrentPage(1)
  }

  function handleCategoryChange(category: string) {
    setSelectedCategory(category)
    setCurrentPage(1)
  }

  function handleAvailabilityChange(filter: 'all' | 'available' | 'out_of_stock') {
    setAvailabilityFilter(filter)
    setCurrentPage(1)
  }

  function handleSortChange(sort: 'title_asc' | 'title_desc' | 'newest' | 'author_asc') {
    setSortBy(sort)
    setCurrentPage(1)
  }

  function resetFilters() {
    setSearchQuery('')
    setSelectedCategory('All')
    setAvailabilityFilter('all')
    setSortBy('title_asc')
    setCurrentPage(1)
  }

  // Extract distinct, normalized categories with accurate counts
  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>()
    books.forEach((book) => {
      const rawCategories = book.category ? book.category.split(',') : ['General']
      const normalizedForThisBook = new Set<string>()
      rawCategories.forEach((raw) => {
        const norm = normalizeCategory(raw)
        if (norm) normalizedForThisBook.add(norm)
      })
      normalizedForThisBook.forEach((cat) => {
        counts.set(cat, (counts.get(cat) || 0) + 1)
      })
    })

    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [books])

  // Distinct category names for dropdown
  const distinctCategoryOptions = useMemo(() => {
    return categoryStats.map(([catName]) => catName)
  }, [categoryStats])

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

        const matchesCategory = bookMatchesCategory(book.category, selectedCategory)

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
          case 'newest':
            return b.id - a.id
          default:
            return 0
        }
      })
  }, [books, searchQuery, selectedCategory, availabilityFilter, sortBy])

  // Pagination calculation
  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE) || 1
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const paginatedBooks = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return filteredBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredBooks, safeCurrentPage])

  const startRecord = filteredBooks.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1
  const endRecord = Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredBooks.length)

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    availabilityFilter !== 'all' ||
    sortBy !== 'title_asc'

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== safeCurrentPage) {
      setCurrentPage(newPage)
      if (catalogueTopRef.current) {
        catalogueTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // Results label for Section E
  const resultsHeading = useMemo(() => {
    if (searchQuery.trim()) return `Search Results (${filteredBooks.length})`
    if (selectedCategory !== 'All') return `${selectedCategory} (${filteredBooks.length})`
    return `All Books (${filteredBooks.length})`
  }, [searchQuery, selectedCategory, filteredBooks.length])

  return (
    <>
      <div className="editorial-catalogue-page" ref={catalogueTopRef}>
        <div className="editorial-catalogue-container">

          {/* ═══════════════════════════════════════════════════════════
              SECTION A: PAGE HEADING
             ═══════════════════════════════════════════════════════════ */}
          <header className="editorial-section-heading">
            <div className="editorial-heading-text-group">
              <h1 className="editorial-page-title">Explore the Collection</h1>
              <p className="editorial-page-subtitle">
                Discover books, explore ideas, and find your next great read.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                className="editorial-add-book-btn"
                onClick={() => onNavigate('/books/add')}
                aria-label="Add new book to catalogue"
              >
                <PlusIcon className="btn-icon" />
                <span>Add New Book</span>
              </button>
            )}
          </header>

          {/* ═══════════════════════════════════════════════════════════
              SECTION B: SEARCH BAR
             ═══════════════════════════════════════════════════════════ */}
          <section className="editorial-section-search" aria-label="Catalogue search">
            <div className="editorial-search-bar">
              <span className="editorial-search-icon-wrap" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                type="text"
                className="editorial-search-input"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by book title, author, ISBN, or keywords..."
                aria-label="Search by book title, author, ISBN, or keywords"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="editorial-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search query"
                >
                  <XIcon />
                </button>
              )}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION C: FILTER AND SORTING TOOLBAR
             ═══════════════════════════════════════════════════════════ */}
          <section className="editorial-section-toolbar" aria-label="Filter and sorting toolbar">
            <div className="editorial-toolbar-inner">
              {/* 1. Category Dropdown */}
              <div className="editorial-select-group">
                <label htmlFor="toolbar-category" className="editorial-select-label">
                  Category:
                </label>
                <div className="editorial-select-wrapper">
                  <select
                    id="toolbar-category"
                    className="editorial-select"
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {distinctCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="editorial-select-chevron" />
                </div>
              </div>

              {/* 2. Availability Dropdown */}
              <div className="editorial-select-group">
                <label htmlFor="toolbar-availability" className="editorial-select-label">
                  Availability:
                </label>
                <div className="editorial-select-wrapper">
                  <select
                    id="toolbar-availability"
                    className="editorial-select"
                    value={availabilityFilter}
                    onChange={(e) => handleAvailabilityChange(e.target.value as 'all' | 'available' | 'out_of_stock')}
                  >
                    <option value="all">All Books</option>
                    <option value="available">Available</option>
                    <option value="out_of_stock">Reserved / Borrowed</option>
                  </select>
                  <ChevronDownIcon className="editorial-select-chevron" />
                </div>
              </div>

              {/* 3. Sorting Dropdown */}
              <div className="editorial-select-group">
                <label htmlFor="toolbar-sort" className="editorial-select-label">
                  Sort by:
                </label>
                <div className="editorial-select-wrapper">
                  <select
                    id="toolbar-sort"
                    className="editorial-select"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as 'title_asc' | 'title_desc' | 'newest' | 'author_asc')}
                  >
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                    <option value="newest">Recently Added</option>
                    <option value="author_asc">Author (A-Z)</option>
                  </select>
                  <ChevronDownIcon className="editorial-select-chevron" />
                </div>
              </div>

              {/* Reset Action (Visible when filters are active) */}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="editorial-reset-filters-btn"
                  onClick={resetFilters}
                  title="Reset all active filters"
                >
                  <ResetIcon />
                  <span>Reset</span>
                </button>
              )}

              {/* 4. Grid/List View Toggle */}
              <div className="editorial-view-toggle" role="group" aria-label="View layout switcher">
                <button
                  type="button"
                  className={`editorial-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  aria-label="Switch to grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <GridIcon />
                </button>
                <button
                  type="button"
                  className={`editorial-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                  aria-label="Switch to list view"
                  aria-pressed={viewMode === 'list'}
                >
                  <ListIcon />
                </button>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION D: CATEGORY QUICK FILTERS
             ═══════════════════════════════════════════════════════════ */}
          {!loading && !error && books.length > 0 && (
            <nav className="editorial-section-categories" aria-label="Quick category filters">
              <div className="editorial-chips-scroll">
                <button
                  type="button"
                  className={`editorial-category-chip ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => handleCategoryChange('All')}
                >
                  <span>All</span>
                  <span className="chip-badge">{books.length}</span>
                </button>

                {categoryStats.map(([catName, count]) => {
                  const isSelected = selectedCategory.toLowerCase() === catName.toLowerCase()
                  return (
                    <button
                      key={catName}
                      type="button"
                      className={`editorial-category-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => handleCategoryChange(isSelected ? 'All' : catName)}
                    >
                      <span>{catName}</span>
                      <span className="chip-badge">{count}</span>
                    </button>
                  )
                })}
              </div>
            </nav>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION E: CATALOGUE RESULTS INFORMATION
             ═══════════════════════════════════════════════════════════ */}
          {!loading && !error && books.length > 0 && (
            <div className="editorial-section-results-info">
              <span className="editorial-results-heading">{resultsHeading}</span>
              <span className="editorial-results-count">
                {filteredBooks.length > 0
                  ? `Showing ${startRecord}–${endRecord} of ${filteredBooks.length} books`
                  : 'Showing 0 of 0 books'}
              </span>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="editorial-state-wrapper">
              <StateMessage
                loading
                title="Loading Collection..."
                text="Fetching the library catalogue and available volumes."
              />
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="editorial-state-wrapper">
              <StateMessage
                title="Unable to load the collection."
                text={error}
                action="Try again"
                onAction={load}
              />
            </div>
          )}

          {/* Empty Database State */}
          {!loading && !error && !books.length && (
            <div className="editorial-state-wrapper">
              <StateMessage
                title="The library collection is currently empty."
                text="Add book titles to populate the public and member catalogue."
                action={canManage ? 'Add the first book' : undefined}
                onAction={canManage ? () => onNavigate('/books/add') : undefined}
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION F: BOOK CARDS GRID
             ═══════════════════════════════════════════════════════════ */}
          {!loading && !error && books.length > 0 && filteredBooks.length > 0 && (
            <section className="editorial-section-grid" aria-label="Book collection">
              <BookGrid
                books={paginatedBooks}
                onNavigate={onNavigate}
                onDelete={setBookToDelete}
                onQuickView={(b) => onNavigate('/books/detail', `?bookId=${b.id}`)}
                canManage={canManage}
                profile={profile}
                viewMode={viewMode}
              />
            </section>
          )}

          {/* Filter Empty Results State */}
          {!loading && !error && books.length > 0 && filteredBooks.length === 0 && (
            <div className="editorial-no-results">
              <div className="editorial-no-results-icon" aria-hidden="true">
                <BookOpenIcon />
              </div>
              <h3 className="editorial-no-results-title">No matching books found</h3>
              <p className="editorial-no-results-text">
                No titles in our collection match your active query &ldquo;<strong>{searchQuery || selectedCategory}</strong>&rdquo;.
              </p>
              <button
                type="button"
                className="editorial-btn-primary"
                onClick={resetFilters}
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION G: PAGINATION
             ═══════════════════════════════════════════════════════════ */}
          {!loading && !error && filteredBooks.length > 0 && totalPages > 1 && (
            <nav className="editorial-section-pagination" aria-label="Catalogue pagination">
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`editorial-page-num-btn ${pageNum === safeCurrentPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={pageNum === safeCurrentPage ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                ))}
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

        </div>
      </div>

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
