import { useEffect, useState } from 'react'
import './App.css'
import { Footer } from './components/layout/Footer'
import { Navbar } from './components/layout/Navbar'
import { AddBook } from './pages/AddBook'
import { BookCatalogue } from './pages/BookCatalogue'
import { BorrowBook } from './pages/Member/BorrowBook'
import { Home } from './pages/Home'
import { EditBook } from './pages/EditBook'
import { Profile } from './pages/Member/Profile'
import { ReturnBook } from './pages/Member/ReturnBook'
import { AuthPage } from './pages/AuthPage'
import { Admin } from './pages/Admin/Users'
import { StaffHome } from './pages/Stuff/Home'
import { AdminHome } from './pages/Admin/Home'
import { MemberHome } from './pages/Member/Home'
import { getCurrentProfile, hasAuthToken, logout } from './services/api'
import type { Profile as ProfileData, Route } from './types'
import { StateMessage } from './components/ui/StateMessage'

const paths: Route[] = ['/', '/home', '/books', '/books/add', '/books/edit', '/profile', '/borrow', '/return', '/login', '/register', '/forgot-password', '/staff', '/admin', '/admin/users']

function getPath(): Route {
  const path = window.location.pathname as Route
  if (path === '/' && !hasAuthToken()) return '/home'
  return paths.includes(path) ? path : '/'
}

function navigate(path: Route, query = '') {
  window.history.pushState({}, '', `${path}${query}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function App() {
  const [path, setPath] = useState<Route>(getPath)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [authLoading, setAuthLoading] = useState(hasAuthToken)

  useEffect(() => {
    const handlePopState = () => setPath(getPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!hasAuthToken()) {
      return
    }
    getCurrentProfile().then(setProfile).catch(() => {
      window.localStorage.removeItem('lms_access_token')
      setProfile(null)
    }).finally(() => setAuthLoading(false))
  }, [])

  const handleLogout = async () => {
    try { await logout() } finally {
      window.localStorage.removeItem('lms_access_token')
      setProfile(null)
      navigate('/login')
    }
  }

  if (authLoading) return <div className="app-shell"><StateMessage loading title="Checking your session..." text="Just a moment." /></div>

  const requiresAuth = ['/', '/books', '/books/add', '/books/edit', '/profile', '/borrow', '/return', '/staff', '/admin', '/admin/users'].includes(path)
  const canManageBooks = profile?.role === 'librarian' || profile?.role === 'admin'
  const isLandingPage = !profile && ['/home', '/login', '/register', '/forgot-password'].includes(path)

  const page = path === '/home' ? <Home onNavigate={navigate} onAuthenticated={setProfile} />
    : !profile && path === '/login' ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="login" />
    : !profile && path === '/register' ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="register" />
    : !profile && path === '/forgot-password' ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="forgot-password" />
    : path === '/' && !profile ? <Home onNavigate={navigate} onAuthenticated={setProfile} />
    : path === '/' && profile?.role === 'member' ? <MemberHome onNavigate={navigate} />
    : path === '/' && profile?.role === 'librarian' ? <StaffHome onNavigate={navigate} />
      : path === '/' && profile?.role === 'admin' ? <AdminHome onNavigate={navigate} />
    : path === '/books' ? <BookCatalogue onNavigate={navigate} canManage={canManageBooks} />
      : path === '/login' ? <AuthPage mode="login" onNavigate={navigate} onAuthenticated={setProfile} />
        : path === '/register' ? <AuthPage mode="register" onNavigate={navigate} onAuthenticated={setProfile} />
          : path === '/forgot-password' ? <AuthPage mode="forgot-password" onNavigate={navigate} onAuthenticated={setProfile} />
      : !profile && requiresAuth ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="login" />
      : path === '/staff' && profile?.role === 'librarian' ? <StaffHome onNavigate={navigate} />
        : path === '/admin' && profile?.role === 'admin' ? <AdminHome onNavigate={navigate} />
      : path === '/books/add' && canManageBooks ? <AddBook onNavigate={navigate} />
        : path === '/books/edit' && canManageBooks ? <EditBook onNavigate={navigate} />
        : path === '/profile' && profile ? <Profile profile={profile} onNavigate={navigate} onProfileUpdated={setProfile} />
        : path === '/borrow' ? <BorrowBook onNavigate={navigate} />
          : path === '/return' ? <ReturnBook onNavigate={navigate} />
            : path === '/admin/users' && profile?.role === 'admin' ? <Admin onNavigate={navigate} />
              : <StateMessage title="Access denied" text="Your account does not have permission to access this page." action="Go home" onAction={() => navigate('/')} />

  return (
    <div className="app-shell">
      {!isLandingPage && (
        <Navbar
          path={path}
          profile={profile}
          menuOpen={menuOpen}
          onNavigate={navigate}
          onToggleMenu={() => setMenuOpen((open) => !open)}
          onLogout={handleLogout}
        />
      )}
      <main>{page}</main>
      <Footer />
    </div>
  )
}

export default App
