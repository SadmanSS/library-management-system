import type { Route } from '../../types'

export function AdminHome({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return <section className="dashboard-page">
    <div className="dashboard-hero admin-dashboard-hero"><p className="section-kicker">SYSTEM ADMINISTRATION</p><h1>Admin dashboard</h1><p>Oversee users, roles, catalogue operations, and the library platform.</p></div>
    <div className="dashboard-grid">
      <button className="dashboard-card" onClick={() => onNavigate('/admin/users')}><span>01</span><h2>Manage users</h2><p>Review accounts and assign member, librarian, or admin roles.</p></button>
      <button className="dashboard-card" onClick={() => onNavigate('/books')}><span>02</span><h2>Manage catalogue</h2><p>Review and update every book in the collection.</p></button>
      <button className="dashboard-card" onClick={() => onNavigate('/return')}><span>03</span><h2>Borrowing records</h2><p>Monitor active loans and completed returns.</p></button>
    </div>
  </section>
}
