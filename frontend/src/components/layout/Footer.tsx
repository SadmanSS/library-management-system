import type { Route } from '../../types'
import logo from '../../assets/logo.jpg'

type FooterProps = {
  onNavigate?: (path: Route, query?: string) => void
}

export function Footer({ onNavigate }: FooterProps) {
  const handleNav = (path: Route, hash?: string) => {
    if (onNavigate) {
      onNavigate(path)
      if (hash) {
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
        }, 120)
      }
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="paradise-footer">
      <div className="paradise-footer-container">
        {/* Top Grid */}
        <div className="paradise-footer-grid">
          {/* Brand & Mission Column */}
          <div className="paradise-footer-col brand-col">
            <div className="paradise-footer-brand">
              <img src={logo} alt="Logo" className="brand-logo footer-custom-logo" />
              <div className="paradise-brand-text">
                <strong className="brand-name-top">Library</strong>
                <small className="brand-name-sub">management system</small>
              </div>
            </div>
            <p className="paradise-footer-blurb">
              Your gateway to knowledge, inspiration, and lifelong learning.
              Discover, explore, reserve, and borrow thousands of titles across all curated categories.
            </p>
            <div className="paradise-footer-badges">
              <span className="footer-mini-badge">📚 Extensive Catalog</span>
              <span className="footer-mini-badge">🔒 Secure Member Access</span>
              <span className="footer-mini-badge">⚡ Instant Reservations</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="paradise-footer-col">
            <h4 className="footer-col-title">Explore</h4>
            <ul className="footer-link-list">
              <li>
                <button type="button" onClick={() => handleNav('/')}>
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('/books')}>
                  Book Catalogue
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('/borrow')}>
                  Borrow &amp; Reservations
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('/', 'about')}>
                  About the Library
                </button>
              </li>
            </ul>
          </div>

          {/* Member & Circulation Column */}
          <div className="paradise-footer-col">
            <h4 className="footer-col-title">Services</h4>
            <ul className="footer-link-list">
              <li>
                <button type="button" onClick={() => handleNav('/books')}>
                  Browse Collection
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('/borrow')}>
                  Borrow & Reserve
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('/return')}>
                  Book Returns
                </button>
              </li>
            </ul>
          </div>

          {/* Hours Column */}
          <div className="paradise-footer-col store-col">
            <h4 className="footer-col-title">Library Hours</h4>
            <p className="footer-address">
              <strong>Central Library Building</strong><br />
              Main Campus / Archives Wing
            </p>
            <div className="footer-schedule">
              <div className="sched-row">
                <span>Mon – Fri:</span>
                <strong>8:30 AM – 6:30 PM</strong>
              </div>
              <div className="sched-row">
                <span>Saturday:</span>
                <strong>9:00 AM – 5:00 PM</strong>
              </div>
              <div className="sched-row">
                <span>Sunday:</span>
                <em>Online Catalogue 24/7</em>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="paradise-footer-bottom">
          <div className="footer-copyright">
            © {new Date().getFullYear()} Library Management System. All rights reserved.
          </div>
          <div className="footer-legal">
            <span>Privacy Policy</span>
            <span className="dot-sep">·</span>
            <span>Terms of Service</span>
            <span className="dot-sep">·</span>
            <span>Borrowing Policy</span>
          </div>
          <button
            type="button"
            className="footer-back-to-top"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            Back to Top ↑
          </button>
        </div>
      </div>
    </footer>
  )
}
