import { useEffect, useState } from 'react'
import './App.css'

type Route = '/' | '/books' | '/books/add' | '/borrow'

const routes: { path: Route; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/books', label: 'Book Catalogue' },
  { path: '/books/add', label: 'Add Book' },
  { path: '/borrow', label: 'Borrow Book' },
]

function navigate(path: Route) {
  window.history.pushState({}, '', path)
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
