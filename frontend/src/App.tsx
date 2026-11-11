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
// Auth handled via Home popup
import { Admin } from './pages/Admin/Users'
import { StaffHome } from './pages/Stuff/Home'
import { AdminHome } from './pages/Admin/Home'
import { MemberHome } from './pages/Member/Home'
import { getCurrentProfile, hasAuthToken, logout } from './services/api'
import { supabase, isPasswordRecoveryUrl } from './services/supabase'
import type { Profile as ProfileData, Route } from './types'
import { StateMessage } from './components/ui/StateMessage'

const paths: Route[] = ['/', '/home', '/books', '/books/add', '/books/edit', '/profile', '/borrow', '/return', '/login', '/register', '/forgot-password', '/reset-password', '/staff', '/admin', '/admin/users']

function getPath(): Route {
  if (isPasswordRecoveryUrl()) return '/home'
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('paradise_theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('paradise_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  useEffect(() => {
    const handlePopState = () => setPath(getPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (isPasswordRecoveryUrl()) {
      navigate('/home')
    }
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/home')
      }
    })
    return () => {
      authListener?.subscription?.unsubscribe()
    }
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


  const page = path === '/home' ? <Home onNavigate={navigate} onAuthenticated={setProfile} profile={profile} />
    : !profile && path === '/login' ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="login" />
    : !profile && path === '/register' ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="register" />
    : !profile && path === '/forgot-password' ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="forgot-password" />
    : !profile && path === '/reset-password' ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="set-new-password" />
    : path === '/' && !profile ? <Home onNavigate={navigate} onAuthenticated={setProfile} profile={profile} />
    : path === '/' && profile?.role === 'member' ? <MemberHome onNavigate={navigate} />
    : path === '/' && profile?.role === 'librarian' ? <StaffHome onNavigate={navigate} />
      : path === '/' && profile?.role === 'admin' ? <AdminHome onNavigate={navigate} />
    : path === '/books' ? <BookCatalogue onNavigate={navigate} canManage={canManageBooks} profile={profile} />
      : path === '/login' || path === '/register' || path === '/forgot-password' || path === '/reset-password' ? <Home onNavigate={navigate} onAuthenticated={setProfile} profile={profile} />


      : !profile && requiresAuth ? <Home onNavigate={navigate} onAuthenticated={setProfile} initialAuthMode="login" />
      : path === '/staff' && profile?.role === 'librarian' ? <StaffHome onNavigate={navigate} />
        : path === '/admin' && profile?.role === 'admin' ? <AdminHome onNavigate={navigate} />
      : path === '/books/add' && canManageBooks ? <AddBook onNavigate={navigate} />
        : path === '/books/edit' && canManageBooks ? <EditBook onNavigate={navigate} />
        : path === '/profile' && profile ? <Profile profile={profile} onNavigate={navigate} onProfileUpdated={setProfile} onLogout={handleLogout} />
        : path === '/borrow' && profile?.role === 'member' ? <BorrowBook onNavigate={navigate} profile={profile} />
          : path === '/return' ? <ReturnBook onNavigate={navigate} profile={profile} />
            : path === '/admin/users' && profile?.role === 'admin' ? <Admin onNavigate={navigate} />
              : <StateMessage title="Access denied" text="Your account does not have permission to access this page." action="Go home" onAction={() => navigate('/')} />

  return (
    <div className="app-shell" data-theme={theme}>

        <Navbar
          path={path}
          profile={profile}
          menuOpen={menuOpen}
          onNavigate={navigate}
          onToggleMenu={() => setMenuOpen((open) => !open)}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

      <main>{page}</main>
      <Footer onNavigate={navigate} />
    </div>
  )
}

export default App
