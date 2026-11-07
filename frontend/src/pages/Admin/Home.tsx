import type { Route } from '../../types'

export function AdminHome({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return (
    <section className="dashboard-page">
      <div className="dashboard-hero admin-dashboard-hero">
        <p className="section-kicker">SYSTEM ADMINISTRATION</p>
        <h1>Admin dashboard</h1>
        <p>Oversee users, account roles, catalogue administration, and system operations.</p>
      </div>
      <div className="dashboard-grid">
        <button className="dashboard-card" onClick={() => onNavigate('/admin/users')}>
          <span>01</span>
          <h2>Manage users</h2>
          <p>Review accounts and assign member, librarian, or administrator roles.</p>
        </button>
        <button className="dashboard-card" onClick={() => onNavigate('/books')}>
          <span>02</span>
          <h2>Manage catalogue</h2>
          <p>Review, edit, and maintain every book in the library collection.</p>
        </button>
        <button className="dashboard-card" onClick={() => onNavigate('/books/add')}>
          <span>03</span>
          <h2>Add new book</h2>
          <p>Register new acquisitions with cover art, category, and inventory count.</p>
        </button>
        <button className="dashboard-card" onClick={() => onNavigate('/return')}>
          <span>04</span>
          <h2>Process returns</h2>
          <p>Check in returned books from patrons, track overdue loans, and inspect borrower records.</p>
        </button>
      </div>
    </section>
  )
}
