import type { Profile, Route } from '../../types'
import logo from '../../assets/logo.jpg'

type Props = {
  path: Route
  menuOpen: boolean
  onNavigate: (path: Route, query?: string) => void
  onToggleMenu: () => void
  profile: Profile | null
  onLogout?: () => void
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

const publicLinks: { path: Route; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/books', label: 'Catalog' },
]

export function Navbar({ path, profile, menuOpen, onNavigate, onToggleMenu }: Props) {
  const isStaffOrAdmin = profile?.role === 'librarian' || profile?.role === 'admin'
  const links: { path: Route; label: string }[] = profile
    ? [
        { path: '/', label: 'Home' },
        ...(isStaffOrAdmin ? [{ path: '/return' as Route, label: 'Return' }] : []),
        { path: '/books', label: 'Catalog' },
        ...(profile.role === 'member'
          ? [
              { path: '/return' as Route, label: 'My loans' },
              { path: '/borrow' as Route, label: 'Reservations' },
            ]
          : []),
      ]
    : [...publicLinks, { path: '/login' as Route, label: 'Log in' }]

  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="brand"
          onClick={() => onNavigate('/')}
          aria-label="Go to home dashboard"
        >
          <img className="brand-logo" src={logo} alt="" />
          <span className="brand-name">
            <strong>Library</strong>
            <small>Management System</small>
          </span>
        </button>

        <button
          className="menu-toggle"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {links.map((link) => (
            <button
              className={path === link.path ? 'nav-link active' : 'nav-link'}
              key={link.path}
              onClick={() => {
                onNavigate(link.path)
                onToggleMenu()
              }}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {profile ? (
          <button
            className={`header-action header-profile-btn ${path === '/profile' ? 'active' : ''}`}
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
          <button className="header-action" onClick={() => onNavigate('/login')}>
            Log in
          </button>
        )}
      </div>
    </header>
  )
}
