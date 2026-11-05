import { useEffect, useMemo, useState } from 'react'
import { getBooks, getBorrowings } from '../services/api'
import type { Book, Borrowing, Route } from '../types'
import { BOOK_CATEGORIES } from '../constants/categories'
import { CoverImage } from '../components/books/CoverImage'

export function Home({ onNavigate }: { onNavigate: (path: Route, query?: string) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [books, setBooks] = useState<Book[]>([])
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [today] = useState(() => new Date())
  useEffect(() => {
    let active = true
    Promise.all([getBooks(), getBorrowings()])
      .then(([bookData, borrowingData]) => {
        if (active) {
          setBooks(bookData)
          setBorrowings(borrowingData)
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the library home page.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const results = useMemo(() => {
    const search = query.trim().toLowerCase()
    return books.filter((book) =>
      (category === 'All' || book.category.split(', ').includes(category)) &&
      (!search || book.title.toLowerCase().includes(search) || book.author.toLowerCase().includes(search)),
    )
  }, [books, category, query])

  const activeBorrowings = borrowings.filter((borrowing) => borrowing.status === 'active' && !borrowing.return_date)
  const bookTitles = useMemo(() => new Map(books.map((book) => [book.id, book.title])), [books])
  const formatDueDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`))
  const daysUntil = (date: string) => Math.ceil((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000)

  return <div className="shelfwise-home">
    <section className="shelfwise-hero">
      <div className="shelfwise-hero-inner">
        <h1>Find a book. Check it out. Know when it&apos;s due.</h1>
        <p>Search {books.length.toLocaleString()} titles across the main reading room and branch shelves.</p>
        <label className="catalog-search">
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="All">All categories</option>
            {BOOK_CATEGORIES.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or author" aria-label="Search the catalog" />
        </label>
      </div>
    </section>

    <main className="shelfwise-main">
      <section className="shelfwise-catalog" id="catalog">
        {loading
          ? <div className="catalog-empty catalog-loading"><span className="loading-spinner" aria-hidden="true" /><span>Loading the catalogue...</span></div>
          : error
            ? <div className="catalog-empty">{error}</div>
            : results.length === 0
              ? <div className="catalog-empty">No books match &ldquo;{query}&rdquo;. Try a different search or category.</div>
          : <ul className="shelfwise-book-list">{results.map((book) => {
            const isOut = book.available_copies === 0
            return <li className="shelfwise-book" key={book.id}>
              <div className={isOut ? 'book-mark out' : 'book-mark'}>
                <span className="book-mark-fallback" aria-hidden="true">▤</span>
                {book.cover_image_url
                  ? <CoverImage src={book.cover_image_url} alt={`Cover of ${book.title}`} />
                  : null}
              </div>
              <div className="shelfwise-book-info">
                <h2>{book.title}</h2>
                <p>{book.author}</p>
                <small>ISBN {book.isbn}</small>
              </div>
              <div className="shelfwise-book-action">
                <strong className={isOut ? 'out-text' : ''}>{isOut ? 'All copies out' : `${book.available_copies} of ${book.total_copies} available`}</strong>
                <button className="borrow-button" onClick={() => onNavigate(isOut ? '/books' : '/borrow', isOut ? undefined : `?bookId=${book.id}`)}>
                  {isOut ? 'Unavailable' : 'Borrow'}
                </button>
              </div>
            </li>
          })}</ul>}
      </section>

      <aside className="shelfwise-sidebar" id="loans">
        <div className="due-card">
          <h2><span aria-hidden="true">◷</span> Due soon</h2>
          <ul>{activeBorrowings.map((borrowing) => {
            const daysLeft = daysUntil(borrowing.due_date)
            return <li key={borrowing.id}>
            <div><strong>{bookTitles.get(borrowing.book_id) ?? `Book #${borrowing.book_id}`}</strong><button onClick={() => onNavigate('/return')}>↻ Return</button></div>
            <span className={daysLeft <= 2 ? 'due-slip urgent' : 'due-slip'}><small>DUE</small>{formatDueDate(borrowing.due_date)}</span>
          </li>
          })}
          {activeBorrowings.length === 0 && <li className="empty-loans">No active loans</li>}
          </ul>
        </div>
        <div className="today-card">
          <h2>Today at the library</h2>
          <p>Open 9:00 am – 8:00 pm</p>
          <p>{activeBorrowings.length} {activeBorrowings.length === 1 ? 'book' : 'books'} currently borrowed</p>
        </div>
      </aside>
    </main>
  </div>
}
