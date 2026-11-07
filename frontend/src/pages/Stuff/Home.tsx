import type { Route } from '../../types'

export function StaffHome({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <p className="section-kicker">LIBRARY OPERATIONS</p>
        <h1>Staff dashboard</h1>
        <p>Manage the catalogue, register new acquisitions, and handle circulation return operations.</p>
      </div>
      <div className="dashboard-grid">
        <button className="dashboard-card" onClick={() => onNavigate('/books')}>
          <span>01</span>
          <h2>Manage catalogue</h2>
          <p>Review, edit, and keep library book listings and copies up to date.</p>
        </button>
        <button className="dashboard-card" onClick={() => onNavigate('/books/add')}>
          <span>02</span>
          <h2>Add new book</h2>
          <p>Register new titles, upload book covers, and assign categories.</p>
        </button>
        <button className="dashboard-card" onClick={() => onNavigate('/return')}>
          <span>03</span>
          <h2>Process returns</h2>
          <p>Check in returned books from patrons and update stock availability.</p>
        </button>
      </div>
    </section>
  )
}
