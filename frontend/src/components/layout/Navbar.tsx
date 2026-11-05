import type { Route } from '../../types'
import logo from '../../assets/logo.jpg'

type Props = {
  path: Route
  menuOpen: boolean
  onNavigate: (path: Route, query?: string) => void
  onToggleMenu: () => void
}

const links: { path: Route; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/books', label: 'Catalog' },
  { path: '/return', label: 'My loans' },
  { path: '/borrow', label: 'Reservations' },
]

export function Navbar({ path, menuOpen, onNavigate, onToggleMenu }: Props) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={() => onNavigate('/')} aria-label="Go to home">
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
        <button className="header-action" onClick={() => onNavigate('/profile')}>Profile</button>
      </div>
    </header>
  )
}
