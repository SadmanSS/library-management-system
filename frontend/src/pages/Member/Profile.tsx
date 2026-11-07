import { useState } from 'react'
import { updateProfile } from '../../services/api'
import type { Profile as ProfileData, Route } from '../../types'

export function Profile({ profile, onNavigate, onProfileUpdated }: { profile: ProfileData; onNavigate: (path: Route) => void; onProfileUpdated: (profile: ProfileData) => void }) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true); setMessage(''); setError('')
    try { const updated = await updateProfile(fullName.trim()); onProfileUpdated(updated); setMessage('Profile updated successfully.') } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Unable to update your profile.') } finally { setSaving(false) }
  }
  return <section className="placeholder-page profile-page">
    <p className="section-kicker">YOUR LIBRARY PROFILE</p>
    <h1>Profile</h1>
    <p>Manage your library details, borrowing history, and preferences in one place.</p>
    <div className="profile-demo-card">
      <div className="profile-avatar">SS</div>
      <div>
        <p className="section-kicker">DEMO ACCOUNT</p>
        <h2>{profile.full_name || profile.email}</h2>
        <p>{profile.role} account</p>
      </div>
      <div className="profile-demo-details">
        <span><strong>0</strong> active loans</span>
        <span><strong>Library member</strong> account status</span>
      </div>
    </div>
    <label className="form-field profile-name-field"><span>Display name</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
    {message && <p className="auth-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save profile'}</button>
    <button className="button button-primary" onClick={() => onNavigate('/books')}>Browse catalogue →</button>
  </section>
}
