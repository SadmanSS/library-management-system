import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Route = '/' | '/books' | '/books/add' | '/borrow'
type Book = {
  id: number
  title: string
  author: string
  isbn: string
  category: string
  description: string | null
  total_copies: number
  available_copies: number
  created_at: string
  updated_at: string
}

type BookForm = {
  title: string
  author: string
  isbn: string
  category: string
  description: string
  total_copies: string
  available_copies: string
}

type Borrowing = {
  id: number
  book_id: number
  borrower_name: string
  borrower_contact: string
  borrowed_at: string
  due_date: string
  return_date: string | null
  status: string
}

const emptyBookForm: BookForm = {
  title: '',
  author: '',
  isbn: '',
  category: '',
  description: '',
  total_copies: '1',
  available_copies: '',
}

const routes: { path: Route; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/books', label: 'Book Catalogue' },
  { path: '/books/add', label: 'Add Book' },
  { path: '/borrow', label: 'Borrow Book' },
]

function navigate(path: Route, query = '') {
  window.history.pushState({}, '', `${path}${query}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function App() {
  const [path, setPath] = useState<Route>(
    (window.location.pathname as Route) in Object.fromEntries(routes.map((route) => [route.path, true]))
      ? (window.location.pathname as Route)
      : '/',
  )
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handlePopState = () => setPath((window.location.pathname as Route) || '/')
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const currentPage = routes.find((route) => route.path === path)?.label ?? 'Home'

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => navigate('/')} aria-label="Go to home">
            <span className="brand-mark">LM</span>
            <span>
              <strong>Library</strong>
              <small>Management System</small>
            </span>
          </button>
          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            <span />
            <span />
            <span />
          </button>
          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            {routes.map((route) => (
              <button
                className={path === route.path ? 'nav-link active' : 'nav-link'}
                key={route.path}
                onClick={() => {
                  navigate(route.path)
                  setMenuOpen(false)
                }}
              >
                {route.label}
              </button>
            ))}
          </nav>
          <button className="header-action" onClick={() => navigate('/books/add')}>
            Add a book <span aria-hidden="true">+</span>
          </button>
        </div>
      </header>

      <main>
        {path === '/' ? (
          <HomePage onNavigate={navigate} />
        ) : path === '/books' ? (
          <CataloguePage onNavigate={navigate} />
        ) : path === '/books/add' ? (
          <AddBookPage onNavigate={navigate} />
        ) : path === '/borrow' ? (
          <BorrowBookPage onNavigate={navigate} />
        ) : (
          <PlaceholderPage title={currentPage} path={path} onNavigate={navigate} />
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span className="footer-brand">Library Management System</span>
          <span>Built for better library experiences.</span>
          <span>© 2026 LMS</span>
        </div>
      </footer>
    </div>
  )
}

function CataloguePage({ onNavigate }: { onNavigate: (path: Route, query?: string) => void }) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/books')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load the book catalogue.')
        return response.json() as Promise<Book[]>
      })
      .then((data) => {
        if (active) setBooks(data)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the book catalogue.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="catalogue-page">
      <div className="catalogue-heading">
        <div>
          <p className="section-kicker">THE COLLECTION</p>
          <h1>Book catalogue</h1>
          <p>Find your next great read from our growing collection.</p>
        </div>
        <button className="button button-primary" onClick={() => onNavigate('/books/add')}>
          Add a book <span aria-hidden="true">+</span>
        </button>
      </div>
      {loading && <StateMessage title="Loading the collection..." text="Just a moment while we fetch the latest books." />}
      {!loading && error && <StateMessage title="We couldn't load the catalogue." text={error} action="Try again" onAction={() => window.location.reload()} />}
      {!loading && !error && books.length === 0 && (
        <StateMessage title="The catalogue is waiting for its first book." text="Add a title to start building the collection." action="Add the first book" onAction={() => onNavigate('/books/add')} />
      )}
      {!loading && !error && books.length > 0 && (
        <div className="book-grid">
          {books.map((book) => <BookCard book={book} key={book.id} onBorrow={() => onNavigate('/borrow', `?bookId=${book.id}`)} />)}
        </div>
      )}
    </section>
  )
}

function BookCard({ book, onBorrow }: { book: Book; onBorrow: () => void }) {
  const available = book.available_copies > 0
  return (
    <article className="book-card">
      <div className="book-card-top">
        <span className="book-category">{book.category}</span>
        <span className={available ? 'availability available' : 'availability unavailable'}>
          {available ? `${book.available_copies} available` : 'Currently unavailable'}
        </span>
      </div>
      <h2>{book.title}</h2>
      <p className="book-author">by {book.author}</p>
      <div className="book-card-details">
        <span>ISBN</span>
        <strong>{book.isbn}</strong>
      </div>
      <div className="book-card-details">
        <span>Copies</span>
        <strong>{book.available_copies} / {book.total_copies}</strong>
      </div>
      <button className="book-card-action" disabled={!available} onClick={onBorrow}>
        {available ? 'Borrow this book →' : 'Unavailable'}
      </button>
    </article>
  )
}

function BorrowBookPage({ onNavigate }: { onNavigate: (path: Route, query?: string) => void }) {
  const [books, setBooks] = useState<Book[]>([])
  const [bookId, setBookId] = useState(new URLSearchParams(window.location.search).get('bookId') ?? '')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [confirmation, setConfirmation] = useState<Borrowing | null>(null)

  useEffect(() => {
    fetch('/api/books')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load available books.')
        return response.json() as Promise<Book[]>
      })
      .then((data) => {
        setBooks(data)
        const selected = data.find((book) => String(book.id) === bookId && book.available_copies > 0)
        if (!selected) setBookId(data.find((book) => book.available_copies > 0)?.id.toString() ?? '')
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load available books.'))
      .finally(() => setLoading(false))
  }, [bookId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError('')
    setError('')
    if (!bookId || !name.trim() || !contact.trim() || !dueDate) {
      setFieldError('Choose a book and complete all borrower fields.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/borrowings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: Number(bookId),
          borrower_name: name.trim(),
          borrower_contact: contact.trim(),
          due_date: dueDate,
        }),
      })
      const result = await response.json() as Borrowing & { detail?: string }
      if (!response.ok) throw new Error(result.detail ?? 'This book could not be borrowed.')
      setConfirmation(result)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'This book could not be borrowed.')
    } finally {
      setSaving(false)
    }
  }

  const availableBooks = books.filter((book) => book.available_copies > 0)
  if (loading) return <section className="form-page"><StateMessage title="Loading available books..." text="Just a moment while we fetch the latest availability." /></section>
  if (confirmation) {
    const borrowedBook = books.find((book) => book.id === confirmation.book_id)
    return (
      <section className="form-page">
        <div className="success-panel">
          <span className="success-icon">✓</span>
          <p className="section-kicker">BORROWING CONFIRMED</p>
          <h1>Enjoy your next read.</h1>
          <p>{borrowedBook?.title ?? 'Your selected book'} has been reserved for {confirmation.borrower_name}.</p>
          <div className="transaction-card">
            <span>TRANSACTION ID</span>
            <strong>#{confirmation.id}</strong>
            <small>Keep this ID for future reference.</small>
          </div>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => onNavigate('/books')}>Back to catalogue <span aria-hidden="true">→</span></button>
            <button className="text-button" onClick={() => setConfirmation(null)}>Borrow another <span aria-hidden="true">↗</span></button>
          </div>
        </div>
      </section>
    )
  }
  if (!error && availableBooks.length === 0) {
    return <section className="form-page"><StateMessage title="No books are available right now." text="Please check the catalogue again later." action="View catalogue" onAction={() => onNavigate('/books')} /></section>
  }
  return (
    <section className="form-page">
      <div className="form-heading">
        <p className="section-kicker">TAKE A BOOK WITH YOU</p>
        <h1>Borrow a book</h1>
        <p>Choose an available title and tell us how to reach you. No account required.</p>
      </div>
      <form className="book-form borrow-form" onSubmit={submit} noValidate>
        <label className="form-field full-width">
          <span>Book *</span>
          <select value={bookId} onChange={(event) => setBookId(event.target.value)}>
            <option value="">Select a book</option>
            {availableBooks.map((book) => <option value={book.id} key={book.id}>{book.title} — {book.available_copies} available</option>)}
          </select>
        </label>
        <div className="form-grid borrow-fields">
          <FormField label="Your name" name="borrower_name" value={name} error={fieldError && !name ? fieldError : undefined} onChange={setName} />
          <FormField label="Contact information" name="borrower_contact" value={contact} hint="Email or phone number." onChange={setContact} />
          <FormField label="Due date" name="due_date" type="date" value={dueDate} onChange={setDueDate} />
        </div>
        {fieldError && <p className="form-error form-submit-error" role="alert">{fieldError}</p>}
        {error && <p className="form-error form-submit-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => onNavigate('/books')}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Confirming...' : 'Confirm borrowing'}</button>
        </div>
      </form>
    </section>
  )
}

function AddBookPage({ onNavigate }: { onNavigate: (path: Route) => void }) {
  const [form, setForm] = useState<BookForm>(emptyBookForm)
  const [errors, setErrors] = useState<Partial<Record<keyof BookForm, string>>>({})
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  function updateField(field: keyof BookForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  function validate() {
    const nextErrors: Partial<Record<keyof BookForm, string>> = {}
    if (!form.title.trim()) nextErrors.title = 'Title is required.'
    if (!form.author.trim()) nextErrors.author = 'Author is required.'
    if (!form.isbn.trim()) nextErrors.isbn = 'ISBN is required.'
    if (!form.category.trim()) nextErrors.category = 'Category is required.'
    const total = Number(form.total_copies)
    const available = form.available_copies === '' ? total : Number(form.available_copies)
    if (!Number.isInteger(total) || total < 0) nextErrors.total_copies = 'Enter a whole number of 0 or more.'
    if (!Number.isInteger(available) || available < 0 || available > total) {
      nextErrors.available_copies = 'Available copies must not exceed total copies.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSubmitError('')
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          author: form.author.trim(),
          isbn: form.isbn.trim(),
          category: form.category.trim(),
          description: form.description.trim() || null,
          total_copies: Number(form.total_copies),
          ...(form.available_copies === '' ? {} : { available_copies: Number(form.available_copies) }),
        }),
      })
      const result = await response.json() as { detail?: string }
      if (!response.ok) throw new Error(result.detail ?? 'Unable to add this book.')
      setSuccess(true)
    } catch (reason: unknown) {
      setSubmitError(reason instanceof Error ? reason.message : 'Unable to add this book.')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <section className="form-page">
        <div className="success-panel">
          <span className="success-icon">✓</span>
          <p className="section-kicker">BOOK ADDED</p>
          <h1>The collection just got better.</h1>
          <p>Your book was added successfully and is now visible in the catalogue.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => onNavigate('/books')}>View catalogue <span aria-hidden="true">→</span></button>
            <button className="text-button" onClick={() => { setSuccess(false); setForm(emptyBookForm) }}>Add another book <span aria-hidden="true">+</span></button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="form-page">
      <div className="form-heading">
        <p className="section-kicker">GROW THE COLLECTION</p>
        <h1>Add a new book</h1>
        <p>Share a title with the library community. Fields marked with * are required.</p>
      </div>
      <form className="book-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <FormField label="Title" name="title" value={form.title} error={errors.title} onChange={(value) => updateField('title', value)} />
          <FormField label="Author" name="author" value={form.author} error={errors.author} onChange={(value) => updateField('author', value)} />
          <FormField label="ISBN" name="isbn" value={form.isbn} error={errors.isbn} onChange={(value) => updateField('isbn', value)} />
          <FormField label="Category" name="category" value={form.category} error={errors.category} onChange={(value) => updateField('category', value)} />
          <FormField label="Total copies" name="total_copies" type="number" min="0" value={form.total_copies} error={errors.total_copies} onChange={(value) => updateField('total_copies', value)} />
          <FormField label="Available copies" name="available_copies" type="number" min="0" value={form.available_copies} hint="Leave blank to use total copies." error={errors.available_copies} onChange={(value) => updateField('available_copies', value)} />
        </div>
        <label className="form-field full-width">
          <span>Description <small>(optional)</small></span>
          <textarea value={form.description} rows={4} onChange={(event) => updateField('description', event.target.value)} />
        </label>
        {submitError && <p className="form-error form-submit-error" role="alert">{submitError}</p>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => onNavigate('/books')}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Adding book...' : 'Add book'}</button>
        </div>
      </form>
    </section>
  )
}

function FormField({ label, name, value, type = 'text', min, hint, error, onChange }: { label: string; name: string; value: string; type?: string; min?: string; hint?: string; error?: string; onChange: (value: string) => void }) {
  return (
    <label className="form-field">
      <span>{label} *</span>
      <input name={name} type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />
      {hint && !error && <small>{hint}</small>}
      {error && <small id={`${name}-error`} className="form-error">{error}</small>}
    </label>
  )
}

function StateMessage({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="state-message">
      <span className="state-icon">{action ? '!' : '...'}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && onAction && <button className="button button-primary" onClick={onAction}>{action}</button>}
    </div>
  )
}

function HomePage({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="section-kicker">WELCOME TO YOUR LIBRARY</p>
          <h1>Discover your next <em>great read.</em></h1>
          <p className="hero-text">
            Browse the collection, find something you love, and make borrowing
            simple. Everything you need to enjoy your library, in one place.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => onNavigate('/books')}>
              Explore catalogue <span aria-hidden="true">→</span>
            </button>
            <button className="text-button" onClick={() => onNavigate('/borrow')}>
              How borrowing works <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
        <div className="hero-art" aria-label="Open book illustration" role="img">
          <div className="art-glow" />
          <div className="book-shape">
            <span className="book-page page-left" />
            <span className="book-page page-right" />
            <span className="book-spine" />
          </div>
          <span className="floating-note note-one">READ</span>
          <span className="floating-note note-two">01</span>
        </div>
      </section>

      <section className="quick-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">YOUR LIBRARY, SIMPLIFIED</p>
            <h2>Everything starts here.</h2>
          </div>
          <p>Simple tools for a richer reading experience.</p>
        </div>
        <div className="feature-grid">
          <FeatureCard number="01" title="Browse the catalogue" text="Find your next favourite from every book in the collection." action="View all books" onClick={() => onNavigate('/books')} />
          <FeatureCard number="02" title="Borrow with ease" text="Choose an available book and request it in just a few steps." action="Borrow a book" onClick={() => onNavigate('/borrow')} />
          <FeatureCard number="03" title="Grow the collection" text="Help us build a better library by adding a new book." action="Add a book" onClick={() => onNavigate('/books/add')} />
        </div>
      </section>
    </>
  )
}

function FeatureCard({ number, title, text, action, onClick }: { number: string; title: string; text: string; action: string; onClick: () => void }) {
  return (
    <article className="feature-card">
      <span className="card-number">{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="card-link" onClick={onClick}>{action} <span aria-hidden="true">↗</span></button>
    </article>
  )
}

function PlaceholderPage({ title, path, onNavigate }: { title: string; path: Route; onNavigate: (path: Route) => void }) {
  const descriptions: Record<string, string> = {
    '/books': 'Browse every title in the library collection.',
    '/books/add': 'Add a new title to the library collection.',
    '/borrow': 'Choose an available title and start borrowing.',
  }
  return (
    <section className="placeholder-page">
      <p className="section-kicker">LIBRARY MANAGEMENT SYSTEM</p>
      <h1>{title}</h1>
      <p>{descriptions[path]}</p>
      <div className="placeholder-panel">
        <span className="panel-icon">{path === '/books' ? '▤' : path === '/borrow' ? '↗' : '+'}</span>
        <h2>This page is ready for the next step.</h2>
        <p>The layout and navigation are in place. Backend integration will be added in a future feature.</p>
        <button className="button button-primary" onClick={() => onNavigate('/')}>Back to home</button>
      </div>
    </section>
  )
}

export default App
