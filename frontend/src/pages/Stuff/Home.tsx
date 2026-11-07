import type { Route } from '../../types'

export function StaffHome({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return <section className="dashboard-page">
    <div className="dashboard-hero"><p className="section-kicker">LIBRARY OPERATIONS</p><h1>Staff dashboard</h1><p>Manage the catalogue and keep borrowing operations moving smoothly.</p></div>
    <div className="dashboard-grid">
      <button className="dashboard-card" onClick={() => onNavigate('/books')}><span>01</span><h2>Manage catalogue</h2><p>Add, edit, and remove books while keeping inventory accurate.</p></button>
      <button className="dashboard-card" onClick={() => onNavigate('/borrow')}><span>02</span><h2>Borrowing desk</h2><p>Register a borrowing transaction for a member.</p></button>
      <button className="dashboard-card" onClick={() => onNavigate('/return')}><span>03</span><h2>Returns</h2><p>Find active loans and complete return transactions.</p></button>
    </div>
  </section>
}
