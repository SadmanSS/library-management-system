import { useEffect, useRef, useState } from 'react'
import type { Profile, Route } from '../../types'
import logo from '../../assets/logo.jpg'

type Props = {
  path: Route
  menuOpen: boolean
  onNavigate: (path: Route, query?: string) => void
  onToggleMenu: () => void
  profile: Profile | null
  onLogout?: () => void
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

function getInitials(nameOrEmail: string): string {
  const clean = nameOrEmail.trim()
  if (!clean) return 'U'
  if (clean.includes('@')) {
    return clean.slice(0, 2).toUpperCase()
  }
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}

export function Navbar({ path, profile, menuOpen, onNavigate, onToggleMenu, theme = 'light', onToggleTheme }: Props) {
  const isStaffOrAdmin = profile?.role === 'librarian' || profile?.role === 'admin'
  const isLandingPage =
    path === '/' ||
    path === '/home' ||
    (!profile && (path === '/login' || path === '/register' || path === '/forgot-password'))

  const [activeSection, setActiveSection] = useState<'home' | 'about'>('home')
  const targetSectionRef = useRef<'home' | 'about' | null>(null)
  const scrollTimeoutRef = useRef<number | null>(null)
  const rafPendingRef = useRef(false)

  // Listen for scroll to synchronize active nav link without flickering
  useEffect(() => {
    if (!isLandingPage) return

    const computeActiveSection = () => {
      rafPendingRef.current = false
      // If user clicked a navigation link, lock active section to clicked target until scroll ends
      if (targetSectionRef.current !== null) return

      const scrollY = window.scrollY
      const aboutEl = document.getElementById('about')

      // Check if user has scrolled near the bottom of the page
      const isNearBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 70
      if (isNearBottom && aboutEl) {
        setActiveSection((prev) => (prev !== 'about' ? 'about' : prev))
        return
      }

      const aboutTop = aboutEl ? aboutEl.offsetTop - 160 : Infinity
      const next: 'home' | 'about' = scrollY >= aboutTop ? 'about' : 'home'

      setActiveSection((prev) => (prev !== next ? next : prev))
    }

    const handleScroll = () => {
      // If smooth navigation is active, keep resetting debounce timer until scrolling stops completely
      if (targetSectionRef.current !== null) {
        if (scrollTimeoutRef.current) {
          window.clearTimeout(scrollTimeoutRef.current)
        }
        scrollTimeoutRef.current = window.setTimeout(() => {
          targetSectionRef.current = null
        }, 180)
        return
      }

      // Throttle scroll updates with requestAnimationFrame to prevent micro-flickering
      if (!rafPendingRef.current) {
        rafPendingRef.current = true
        window.requestAnimationFrame(computeActiveSection)
      }
    }

    // Modern browsers fire scrollend when smooth scrolling concludes
    const handleScrollEnd = () => {
      targetSectionRef.current = null
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('scrollend', handleScrollEnd, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scrollend', handleScrollEnd)
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isLandingPage])

  // Handle pending cross-page navigation target (e.g. from /books to /home#about)
  useEffect(() => {
    if (!isLandingPage) return
    const pending = sessionStorage.getItem('lms_nav_section')
    if (pending === 'home' || pending === 'about') {
      sessionStorage.removeItem('lms_nav_section')
      setActiveSection(pending)
      targetSectionRef.current = pending
      window.setTimeout(() => {
        if (pending === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
          document.getElementById(pending)?.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [isLandingPage])

  const handleHomeClick = () => {
    setActiveSection('home')
    targetSectionRef.current = 'home'
    if (isLandingPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      sessionStorage.setItem('lms_nav_section', 'home')
      onNavigate('/')
    }
    if (menuOpen) onToggleMenu()
  }

  const scrollToSection = (sectionId: 'about') => {
    setActiveSection(sectionId)
    targetSectionRef.current = sectionId
    if (!isLandingPage) {
      sessionStorage.setItem('lms_nav_section', sectionId)
      onNavigate('/home')
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    }
    if (menuOpen) onToggleMenu()
  }

  return (
    <header className="site-header paradise-nav-header">
      <div className="header-inner paradise-nav-inner">
        {/* Brand: Website Logo & Name */}
        <button
          type="button"
          className="brand paradise-brand"
          onClick={handleHomeClick}
          aria-label="Library Management System Home"
        >
          <img src={logo} alt="Library Logo" className="brand-logo navbar-custom-logo" />
          <span className="brand-name paradise-brand-text">
            <strong className="brand-name-top">Library</strong>
            <small className="brand-name-sub">management system</small>
          </span>
        </button>

        {/* Mobile menu toggle */}
        <button
          className="menu-toggle"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          type="button"
        >
          <span />
          <span />
          <span />
        </button>

        {/* Main Nav Links: Home, Categories, About */}
        <nav className={`main-nav paradise-main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <button
            type="button"
            className={isLandingPage && activeSection === 'home' ? 'nav-link paradise-nav-link active' : 'nav-link paradise-nav-link'}
            onClick={handleHomeClick}
          >
            Home
          </button>

          {isStaffOrAdmin && (
            <button
              type="button"
              className={path === '/return' ? 'nav-link paradise-nav-link active' : 'nav-link paradise-nav-link'}
              onClick={() => {
                onNavigate('/return')
                if (menuOpen) onToggleMenu()
              }}
            >
              Return
            </button>
          )}

          {profile?.role === 'member' && (
            <>
              <button
                type="button"
                className={path === '/return' ? 'nav-link paradise-nav-link active' : 'nav-link paradise-nav-link'}
                onClick={() => {
                  onNavigate('/return')
                  if (menuOpen) onToggleMenu()
                }}
              >
                My loans
              </button>
              <button
                type="button"
                className={path === '/borrow' ? 'nav-link paradise-nav-link active' : 'nav-link paradise-nav-link'}
                onClick={() => {
                  onNavigate('/borrow')
                  if (menuOpen) onToggleMenu()
                }}
              >
                Reservations
              </button>
            </>
          )}

          <button
            type="button"
            className={path === '/books' ? 'nav-link paradise-nav-link active' : 'nav-link paradise-nav-link'}
            onClick={() => {
              onNavigate('/books')
              if (menuOpen) onToggleMenu()
            }}
          >
            Catalogue
          </button>

          {!profile && (
            <button
              type="button"
              className={isLandingPage && activeSection === 'about' ? 'nav-link paradise-nav-link active' : 'nav-link paradise-nav-link'}
              onClick={() => scrollToSection('about')}
            >
              About
            </button>
          )}
        </nav>

        {/* Right Actions: Theme Toggle, Sign In */}
        <div className="paradise-nav-actions">
          {/* Theme Mode Toggle (White / Light Mode vs Dark Mode) */}
          <button
            type="button"
            className="nav-icon-btn paradise-theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Profile / Sign In */}
          {profile ? (
            <button
              type="button"
              className={`header-action header-profile-btn paradise-profile-btn ${path === '/profile' ? 'active' : ''}`}
              onClick={() => onNavigate('/profile')}
              aria-label="View Profile"
            >
              <span className="header-profile-avatar" aria-hidden="true">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="header-profile-avatar-img" />
                ) : (
                  getInitials(profile.full_name || profile.email)
                )}
              </span>
              <span className="header-profile-label">Profile</span>
            </button>
          ) : (
            <button
              type="button"
              className="paradise-login-pill"
              onClick={() => onNavigate('/login')}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
