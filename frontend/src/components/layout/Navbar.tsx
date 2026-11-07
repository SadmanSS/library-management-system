import type { Profile, Route } from '../../types'
import logo from '../../assets/logo.jpg'

type Props = {
  path: Route
  menuOpen: boolean
  onNavigate: (path: Route, query?: string) => void
  onToggleMenu: () => void
  profile: Profile | null
  onLogout: () => void
}

const publicLinks: { path: Route; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/books', label: 'Catalog' },
]

export function Navbar({ path, profile, menuOpen, onNavigate, onToggleMenu, onLogout }: Props) {
  const links = profile
    ? [...publicLinks, ...(profile.role === 'librarian' ? [{ path: '/staff' as Route, label: 'Dashboard' }] : []), ...(profile.role === 'admin' ? [{ path: '/admin' as Route, label: 'Dashboard' }] : []), { path: '/return' as Route, label: 'My loans' }, { path: '/borrow' as Route, label: 'Reservations' }, ...(profile.role !== 'member' ? [{ path: '/books/add' as Route, label: 'Add book' }] : [])]
    : [...publicLinks, { path: '/login' as Route, label: 'Log in' }]
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={() => onNavigate(profile?.role === 'admin' ? '/admin' : profile?.role === 'librarian' ? '/staff' : '/')} aria-label="Go to home">
          <img className="brand-logo" src={logo} alt="" />
          <span className="brand-name"><strong>Library</strong><small>Management System</small></span>
        </button>
        <button className="menu-toggle" onClick={onToggleMenu} aria-expanded={menuOpen} aria-label="Toggle navigation">
          <span /><span /><span />
        </button>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {links.map((link) => (
            <button className={path === link.path ? 'nav-link active' : 'nav-link'} key={link.path} onClick={() => {
              onNavigate(link.path)
              onToggleMenu()
            }}>{link.label}</button>
          ))}
        </nav>
        {profile ? <button className="header-action" onClick={onLogout}>Log out</button> : <button className="header-action" onClick={() => onNavigate('/login')}>Log in</button>}
      </div>
    </header>
  )
}
