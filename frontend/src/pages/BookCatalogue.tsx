import { useEffect, useMemo, useState } from 'react'
import { deleteBook, getBooks } from '../services/api'
import type { Book, Route } from '../types'
import { BookGrid } from '../components/books/BookGrid'
import { StateMessage } from '../components/ui/StateMessage'

export function BookCatalogue({
  onNavigate,
  canManage = false,
}: {
  onNavigate: (path: Route, query?: string) => void
  canManage?: boolean
}) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Real-time Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
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

  function handleClearSearch() {
    setSearchQuery('')
  }

  function resetFilters() {
    setSearchQuery('')
    setSelectedCategory('All')
    setAvailabilityFilter('all')
    setSortBy('title_asc')
  }

  // Extract categories present in catalog
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    books.forEach((b) => {
      b.category.split(',').forEach((c) => {
        const trimmed = c.trim()
        if (trimmed) cats.add(trimmed)
      })
    })
    return Array.from(cats).sort()
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
          book.isbn.toLowerCase().includes(query)

        const matchesCategory =
          selectedCategory === 'All' ||
          book.category.toLowerCase().includes(selectedCategory.toLowerCase())

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
      <section className="catalogue-page">
        <div className="catalogue-heading">
          <div>
            <p className="section-kicker">THE COLLECTION</p>
            <h1>Book catalogue</h1>
            <p>Search and explore titles by name, author, or ISBN across our entire collection.</p>
          </div>
          {canManage && (
            <button className="button button-primary" onClick={() => onNavigate('/books/add')}>
              Add a book +
            </button>
          )}
        </div>

        {/* Real-time Search & Filter Toolbar */}
        {!loading && !error && books.length > 0 && (
          <div className="catalogue-toolbar-container">
            <div className="catalog-search-toolbar">
              <div className="catalog-search-input-wrapper">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search in real time by name, author, or ISBN..."
                  aria-label="Real-time search by book name, author, or ISBN"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={handleClearSearch}
                    aria-label="Clear search input"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="catalog-filters-bar">
              <div className="filter-group">
                <label htmlFor="cat-filter">Category:</label>
                <select
                  id="cat-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All Categories ({books.length})</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="avail-filter">Availability:</label>
                <select
                  id="avail-filter"
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value as 'all' | 'available' | 'out_of_stock')}
                >
                  <option value="all">All Books</option>
                  <option value="available">Available Now</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="sort-filter">Sort by:</label>
                <select
                  id="sort-filter"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="title_asc">Title (A - Z)</option>
                  <option value="title_desc">Title (Z - A)</option>
                  <option value="author_asc">Author (A - Z)</option>
                  <option value="copies_desc">Most Available Copies</option>
                  <option value="newest">Recently Added</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button type="button" className="catalog-reset-btn" onClick={resetFilters}>
                  ↺ Reset all
                </button>
              )}
            </div>

            <div className="catalog-status-row">
              <p className="catalog-results-count">
                Showing <strong>{filteredBooks.length}</strong> of <strong>{books.length}</strong> books
                {searchQuery.trim() && (
                  <span> matching &ldquo;<strong>{searchQuery.trim()}</strong>&rdquo;</span>
                )}
                {selectedCategory !== 'All' && (
                  <span> in <em>{selectedCategory}</em></span>
                )}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <StateMessage
            loading
            title="Loading the collection..."
            text="Just a moment while we fetch the latest books."
          />
        )}

        {!loading && error && (
          <StateMessage
            title="We couldn't load the catalogue."
            text={error}
            action="Try again"
            onAction={load}
          />
        )}

        {!loading && !error && !books.length && (
          <StateMessage
            title="The catalogue is waiting for its first book."
            text="Add a title to start building the collection."
            action={canManage ? 'Add the first book' : undefined}
            onAction={canManage ? () => onNavigate('/books/add') : undefined}
          />
        )}

        {!loading && !error && books.length > 0 && filteredBooks.length > 0 && (
          <BookGrid
            books={filteredBooks}
            onNavigate={onNavigate}
            onDelete={setBookToDelete}
            canManage={canManage}
          />
        )}

        {!loading && !error && books.length > 0 && filteredBooks.length === 0 && (
          <div className="catalog-empty-state">
            <span className="empty-state-icon">🔍</span>
            <h3>No books found</h3>
            <p>
              No books in the collection match &ldquo;<strong>{searchQuery || selectedCategory}</strong>&rdquo;.
            </p>
            <button type="button" className="button button-primary" onClick={resetFilters}>
              Clear search & filters
            </button>
          </div>
        )}
      </section>

      {bookToDelete && (
        <div
          className="delete-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setBookToDelete(null)
          }}
        >
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <h2 id="delete-modal-title">Delete this book?</h2>
            <p>Are you sure you want to delete &ldquo;{bookToDelete.title}&rdquo; from the catalogue?</p>
            <div className="delete-modal-actions">
              <button
                className="button delete-modal-cancel"
                disabled={deleting}
                onClick={() => setBookToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="button delete-modal-confirm"
                disabled={deleting}
                onClick={remove}
              >
                {deleting ? 'Deleting...' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
