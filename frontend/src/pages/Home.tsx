import { useEffect, useState } from 'react'
import type { Profile, Route } from '../types'
import logo from '../assets/logo.jpg'
import { AuthModal, type AuthMode } from '../components/auth/AuthModal'

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let frame: number
    const duration = 2000
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return <>{count.toLocaleString()}{suffix}</>
}

type HomeProps = {
  onNavigate: (path: Route) => void
  onAuthenticated?: (profile: Profile) => void
  initialAuthMode?: AuthMode | null
}

export function Home({ onNavigate, onAuthenticated, initialAuthMode = null }: HomeProps) {
  const [visible, setVisible] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<AuthMode | null>(initialAuthMode)

  useEffect(() => {
    setVisible(true)
  }, [])

  useEffect(() => {
    if (initialAuthMode) {
      setAuthModalMode(initialAuthMode)
    }
  }, [initialAuthMode])

  const openAuth = (mode: AuthMode) => {
    setAuthModalMode(mode)
  }

  const closeAuth = () => {
    setAuthModalMode(null)
    if (window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/forgot-password') {
      window.history.replaceState({}, '', '/home')
    }
  }

  return (
    <div className="landing">
      {/* ── Landing Header (replacing standard navbar) ── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand" onClick={() => onNavigate('/home')} role="button" tabIndex={0}>
            <img className="landing-brand-logo" src={logo} alt="Library Management System" />
            <div className="landing-brand-name">
              <strong>Library</strong>
              <small>Management System</small>
            </div>
          </div>
          <div className="landing-header-actions">
            <button className="landing-header-login" onClick={() => openAuth('login')} type="button">
              Log in
            </button>
            <button className="button button-primary landing-header-signup" onClick={() => openAuth('register')} type="button">
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className={`landing-hero${visible ? ' landing-visible' : ''}`}>
        <div className="landing-hero-bg" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <div className="landing-hero-inner">
          <div className="landing-hero-content">
            <div className="landing-brand-badge">
              <img src={logo} alt="" className="badge-mini-logo" />
              <span>Library Management System</span>
            </div>
            <h1 className="landing-headline">
              One calm, connected<br />
              home for your <em>library.</em>
            </h1>
            <p className="landing-subline">
              Discover books, manage lending, and keep every library operation
              organized in one secure workspace.
            </p>
            <div className="landing-cta">
              <button className="button button-primary landing-btn" onClick={() => openAuth('login')} type="button">
                Log in to dashboard
                <span className="btn-arrow">→</span>
              </button>
              <button className="landing-btn-ghost" onClick={() => openAuth('register')} type="button">
                Create an account →
              </button>
            </div>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="floating-card fc-1">
              <div className="fc-icon">📖</div>
              <div>
                <strong>Catalogue & Lending</strong>
                <br />
                <small>Instant search & checkout</small>
              </div>
            </div>
            <div className="floating-card fc-2">
              <div className="fc-icon">⚡</div>
              <div>
                <strong>Real-time Tracking</strong>
                <br />
                <small>Due dates & automatic returns</small>
              </div>
            </div>
            <div className="floating-card fc-3">
              <div className="fc-icon">🛡️</div>
              <div>
                <strong>Role-based Security</strong>
                <br />
                <small>Members, Staff & Admins</small>
              </div>
            </div>
            <div className="hero-book-stack">
              <div className="stack-book sb-1" />
              <div className="stack-book sb-2" />
              <div className="stack-book sb-3" />
              <div className="stack-book sb-4" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="landing-stats">
        <div className="landing-stats-inner">
          <div className="stat-item">
            <strong><Counter target={12000} suffix="+" /></strong>
            <span>Books managed</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <strong><Counter target={3500} suffix="+" /></strong>
            <span>Active members</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <strong><Counter target={98} suffix="%" /></strong>
            <span>On-time returns</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <strong><Counter target={24} suffix="/7" /></strong>
            <span>Digital access</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features">
        <div className="landing-features-inner">
          <p className="section-kicker">EVERYTHING YOU NEED</p>
          <h2 className="landing-section-title">Powerful features,<br />effortless experience.</h2>
          <p className="landing-section-sub">Built for every role in your library — members, librarians, and administrators.</p>

          <div className="feature-cards">
            <div className="f-card">
              <div className="f-card-icon">🔍</div>
              <h3>Smart catalogue</h3>
              <p>Browse, search, and filter your entire book collection with real-time availability tracking.</p>
            </div>
            <div className="f-card">
              <div className="f-card-icon">📋</div>
              <h3>Effortless lending</h3>
              <p>Borrow and return books in seconds. Track due dates and get reminders automatically.</p>
            </div>
            <div className="f-card">
              <div className="f-card-icon">🛡️</div>
              <h3>Role-based access</h3>
              <p>Secure, backend-enforced permissions for members, librarians, and administrators.</p>
            </div>
            <div className="f-card">
              <div className="f-card-icon">📊</div>
              <h3>Dashboard insights</h3>
              <p>Each role gets a tailored dashboard with the tools and data they need most.</p>
            </div>
            <div className="f-card">
              <div className="f-card-icon">🖼️</div>
              <h3>Book covers</h3>
              <p>Upload and manage cover images with cloud storage — your catalogue looks gorgeous.</p>
            </div>
            <div className="f-card">
              <div className="f-card-icon">⚡</div>
              <h3>Lightning fast</h3>
              <p>Modern React frontend with instant navigation and zero page reloads.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles showcase ── */}
      <section className="landing-roles">
        <div className="landing-roles-inner">
          <p className="section-kicker">DESIGNED FOR EVERY ROLE</p>
          <h2 className="landing-section-title">One platform,<br />three experiences.</h2>

          <div className="role-cards">
            <div className="role-card role-member">
              <div className="role-number">01</div>
              <div className="role-badge-label">Members</div>
              <h3>Discover & borrow</h3>
              <p>Browse the catalogue, borrow available books, track due dates, and manage your reading list — all from a personal dashboard.</p>
              <button className="role-link" onClick={() => openAuth('register')} type="button">Join as a member →</button>
            </div>
            <div className="role-card role-staff">
              <div className="role-number">02</div>
              <div className="role-badge-label">Librarians</div>
              <h3>Manage & organize</h3>
              <p>Add books, upload covers, handle borrowing and returns, and keep your library inventory accurate and up to date.</p>
              <button className="role-link" onClick={() => openAuth('login')} type="button">Staff sign in →</button>
            </div>
            <div className="role-card role-admin">
              <div className="role-number">03</div>
              <div className="role-badge-label">Administrators</div>
              <h3>Control & configure</h3>
              <p>Manage user accounts and roles, oversee all operations, and maintain security with full administrative control.</p>
              <button className="role-link" onClick={() => openAuth('login')} type="button">Admin sign in →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Auth Modal Popup ── */}
      <AuthModal
        isOpen={authModalMode !== null}
        initialMode={authModalMode || 'login'}
        onClose={closeAuth}
        onAuthenticated={onAuthenticated || (() => {})}
        onNavigate={onNavigate}
      />
    </div>
  )
}
