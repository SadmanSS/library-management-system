import { useRef, useState } from 'react'
import { updateProfile, uploadAvatar } from '../../services/api'
import type { Profile as ProfileData, Route } from '../../types'
import { useBodyScrollLock } from '../../utils/useBodyScrollLock'

type Props = {
  profile: ProfileData
  onNavigate: (path: Route) => void
  onProfileUpdated: (profile: ProfileData) => void
  onLogout: () => void
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

export function Profile({ profile, onNavigate, onProfileUpdated, onLogout }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  useBodyScrollLock(showPhotoModal || showLogoutConfirm)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const roleLabels: Record<string, { title: string; badge: string; desc: string }> = {
    admin: {
      title: 'Administrator',
      badge: 'ADMIN',
      desc: 'Full access to user administration, catalogue management, and system operations.',
    },
    librarian: {
      title: 'Librarian (Staff)',
      badge: 'STAFF',
      desc: 'Privileges to manage book inventory, issue loans, and handle check-in returns.',
    },
    member: {
      title: 'Library Member',
      badge: 'MEMBER',
      desc: 'Access to browse catalogue, place book reservations, and view active loans.',
    },
  }

  const roleMeta = roleLabels[profile.role] || roleLabels.member

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await updateProfile(fullName.trim(), phone.trim(), avatarUrl || null)
      onProfileUpdated(updated)
      setMessage('Profile details updated successfully.')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError('')
    setMessage('')

    try {
      let updated: ProfileData
      try {
        updated = await uploadAvatar(file)
      } catch {
        // Fallback to data URL if direct upload fails
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        updated = await updateProfile(fullName.trim(), phone.trim(), dataUrl)
      }
      setAvatarUrl(updated.avatar_url ?? '')
      onProfileUpdated(updated)
      setMessage('Profile picture updated successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveAvatar() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      setAvatarUrl('')
      const updated = await updateProfile(fullName.trim(), phone.trim(), null)
      onProfileUpdated(updated)
      setMessage('Profile picture removed.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to remove picture.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="profile-page-container">
      {/* Hidden file input for uploading from device */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
      />

      <div className="profile-header-section">
        <p className="section-kicker">ACCOUNT & PREFERENCES</p>
        <h1>My Profile</h1>
        <p>Review your personal library account details, customize your picture, and control your session.</p>
      </div>

      <div className="profile-overview-card">
        <div
          className="profile-avatar-wrapper"
          onClick={() => setShowPhotoModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowPhotoModal(true) } }}
          aria-label="Click to change profile picture"
          title="Click to change profile picture"
        >
          <div className="profile-overview-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="User Avatar" className="profile-avatar-img" />
            ) : (
              getInitials(profile.full_name || profile.email)
            )}
            <div className="profile-avatar-overlay">
              <span className="profile-avatar-overlay-icon">📷</span>
              <span className="profile-avatar-overlay-text">Edit</span>
            </div>
          </div>
          <button
            type="button"
            className="profile-avatar-edit-badge"
            onClick={(e) => {
              e.stopPropagation()
              setShowPhotoModal(true)
            }}
            title="Edit profile picture"
            aria-label="Edit profile picture"
          >
            📷
          </button>
        </div>

        <div className="profile-overview-main">
          <div className="profile-role-tag-row">
            <span className={`profile-role-badge badge-${profile.role}`}>{roleMeta.badge}</span>
            <span className="profile-role-name">{roleMeta.title}</span>
          </div>
          <h2>{profile.full_name || 'Library Patron'}</h2>
          <p className="profile-email-text">{profile.email}</p>
          <p className="profile-role-desc">{roleMeta.desc}</p>
        </div>
      </div>

      <div className="profile-grid-layout">
        <div className="profile-edit-section">
          <h3>Personal Details</h3>
          <p className="profile-section-sub">Update how your name and contact details appear across the library system.</p>

          <form onSubmit={handleSave} className="profile-form">
            <label className="form-field">
              <span>Full Name / Display Name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Austen"
              />
            </label>

            <label className="form-field">
              <span>Mobile Phone Number</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+8801XXXXXXXXX"
              />
            </label>

            <label className="form-field">
              <span>Registered Email</span>
              <input
                type="email"
                value={profile.email}
                disabled
                className="input-disabled"
              />
              <small className="field-hint">Email is linked to your authentication credentials.</small>
            </label>

            <label className="form-field">
              <span>Account Role</span>
              <input
                type="text"
                value={roleMeta.title}
                disabled
                className="input-disabled"
              />
            </label>

            {message && <p className="auth-message" role="status">{message}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}

            <div className="profile-actions">
              <button type="submit" className="button button-primary" disabled={saving || uploadingAvatar}>
                {saving ? 'Saving changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        <div className="profile-sidebar-panels">
          <div className="profile-quick-nav">
            <h3>Quick Actions</h3>
            <div className="profile-nav-buttons">
              {profile.role === 'admin' && (
                <>
                  <button className="profile-quick-btn" onClick={() => onNavigate('/')}>
                    <span className="btn-icon">⚙️</span>
                    <div>
                      <strong>Admin Dashboard</strong>
                      <small>System overview & control</small>
                    </div>
                  </button>
                  <button className="profile-quick-btn" onClick={() => onNavigate('/admin/users')}>
                    <span className="btn-icon">👥</span>
                    <div>
                      <strong>Manage Users</strong>
                      <small>Assign roles & access</small>
                    </div>
                  </button>
                  <button className="profile-quick-btn" onClick={() => onNavigate('/books/add')}>
                    <span className="btn-icon">➕</span>
                    <div>
                      <strong>Add New Book</strong>
                      <small>Register new title in catalog</small>
                    </div>
                  </button>
                </>
              )}

              {profile.role === 'librarian' && (
                <>
                  <button className="profile-quick-btn" onClick={() => onNavigate('/')}>
                    <span className="btn-icon">📋</span>
                    <div>
                      <strong>Staff Dashboard</strong>
                      <small>Daily operations desk</small>
                    </div>
                  </button>
                  <button className="profile-quick-btn" onClick={() => onNavigate('/books/add')}>
                    <span className="btn-icon">➕</span>
                    <div>
                      <strong>Add New Book</strong>
                      <small>Register new title in catalog</small>
                    </div>
                  </button>
                  <button className="profile-quick-btn" onClick={() => onNavigate('/return')}>
                    <span className="btn-icon">🔄</span>
                    <div>
                      <strong>Process Returns</strong>
                      <small>Check in returned patron books</small>
                    </div>
                  </button>
                </>
              )}

              <button className="profile-quick-btn" onClick={() => onNavigate('/books')}>
                <span className="btn-icon">📚</span>
                <div>
                  <strong>{profile.role === 'member' ? 'Browse Catalog' : 'Manage Catalog'}</strong>
                  <small>Explore collection & availability</small>
                </div>
              </button>

              {profile.role === 'member' && (
                <>
                  <button className="profile-quick-btn" onClick={() => onNavigate('/borrow')}>
                    <span className="btn-icon">📖</span>
                    <div>
                      <strong>Reserve a Book</strong>
                      <small>Place a borrowing request</small>
                    </div>
                  </button>
                  <button className="profile-quick-btn" onClick={() => onNavigate('/return')}>
                    <span className="btn-icon">🔄</span>
                    <div>
                      <strong>My Loans</strong>
                      <small>Check return status & dates</small>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="profile-session-box">
            <h3>Account Session</h3>
            <p>Signed in as <strong>{profile.email}</strong></p>
            <p className="session-hint">You can sign out of your account anytime to protect your privacy on shared devices.</p>

            {!showLogoutConfirm ? (
              <button
                type="button"
                className="profile-logout-button"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log Out
              </button>
            ) : (
              <div className="profile-logout-confirm">
                <p>Are you sure you want to log out?</p>
                <div className="logout-confirm-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setShowLogoutConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button-logout-danger"
                    onClick={onLogout}
                  >
                    Yes, Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Picture Options Modal */}
      {showPhotoModal && (
        <div
          className="avatar-modal-backdrop"
          onClick={() => setShowPhotoModal(false)}
          role="presentation"
        >
          <div
            className="avatar-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-modal-title"
          >
            <div className="avatar-modal-header">
              <h3 id="avatar-modal-title">Profile Picture</h3>
              <button
                type="button"
                className="avatar-modal-close"
                onClick={() => setShowPhotoModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="avatar-modal-preview">
              <div className="avatar-modal-circle">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Current avatar" className="profile-avatar-img" />
                ) : (
                  getInitials(profile.full_name || profile.email)
                )}
              </div>
              <p className="avatar-modal-hint">
                {avatarUrl ? 'Current profile picture' : 'No custom picture set'}
              </p>
            </div>

            <div className="avatar-modal-actions">
              <button
                type="button"
                className="avatar-action-button avatar-action-primary"
                onClick={() => {
                  setShowPhotoModal(false)
                  fileInputRef.current?.click()
                }}
                disabled={uploadingAvatar || saving}
              >
                <span className="action-btn-icon">📁</span>
                <div className="action-btn-text">
                  <strong>Change profile picture</strong>
                  <small>Upload a photo from your device</small>
                </div>
              </button>

              <button
                type="button"
                className="avatar-action-button avatar-action-danger"
                disabled={!avatarUrl || saving || uploadingAvatar}
                onClick={() => {
                  setShowPhotoModal(false)
                  handleRemoveAvatar()
                }}
              >
                <span className="action-btn-icon">🗑️</span>
                <div className="action-btn-text">
                  <strong>Remove profile picture</strong>
                  <small>Revert back to your initials</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
