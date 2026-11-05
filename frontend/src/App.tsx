import { useEffect, useState } from 'react'
import './App.css'
import { Footer } from './components/layout/Footer'
import { Navbar } from './components/layout/Navbar'
import { AddBook } from './pages/AddBook'
import { BookCatalogue } from './pages/BookCatalogue'
import { BorrowBook } from './pages/BorrowBook'
import { Home } from './pages/Home'
import { EditBook } from './pages/EditBook'
import { Profile } from './pages/Profile'
import { ReturnBook } from './pages/ReturnBook'
import type { Route } from './types'

const paths: Route[] = ['/', '/books', '/books/add', '/books/edit', '/profile', '/borrow', '/return']

function getPath(): Route {
  const path = window.location.pathname as Route
  return paths.includes(path) ? path : '/'
}

function navigate(path: Route, query = '') {
  window.history.pushState({}, '', `${path}${query}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function App() {
  const [path, setPath] = useState<Route>(getPath)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handlePopState = () => setPath(getPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const page = path === '/' ? <Home onNavigate={navigate} />
    : path === '/books' ? <BookCatalogue onNavigate={navigate} />
      : path === '/books/add' ? <AddBook onNavigate={navigate} />
        : path === '/books/edit' ? <EditBook onNavigate={navigate} />
        : path === '/profile' ? <Profile onNavigate={navigate} />
        : path === '/borrow' ? <BorrowBook onNavigate={navigate} />
          : <ReturnBook onNavigate={navigate} />

  return <div className="app-shell">
    <Navbar path={path} menuOpen={menuOpen} onNavigate={navigate} onToggleMenu={() => setMenuOpen((open) => !open)} />
    <main>{page}</main>
    <Footer />
  </div>
}

export default App
