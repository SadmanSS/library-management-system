import type { Route } from '../types'

export function Profile({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return <section className="placeholder-page profile-page">
    <p className="section-kicker">YOUR LIBRARY PROFILE</p>
    <h1>Profile</h1>
    <p>Manage your library details, borrowing history, and preferences in one place.</p>
    <div className="profile-demo-card">
      <div className="profile-avatar">SS</div>
      <div>
        <p className="section-kicker">DEMO ACCOUNT</p>
        <h2>Sadman Sakib</h2>
        <p>Member since November 2026</p>
      </div>
      <div className="profile-demo-details">
        <span><strong>0</strong> active loans</span>
        <span><strong>Library member</strong> account status</span>
      </div>
    </div>
    <button className="button button-primary" onClick={() => onNavigate('/books')}>Browse catalogue →</button>
  </section>
}
