import { useEffect, useRef, useState } from 'react'
import { deleteAvatar, getUserSessions, logout, updateProfile, uploadAvatar } from '../../services/api'
import type { Profile as ProfileData, Route, UserSession } from '../../types'
import { getClientDeviceInfo } from '../../utils/deviceDetection'
import { useBodyScrollLock } from '../../utils/useBodyScrollLock'
import {
  AlertCircleIcon,
  CheckCircleIcon,
  XIcon,
} from '../../components/ui/Icons'

type Props = {
  profile: ProfileData
  onNavigate?: (path: Route) => void
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

function formatLastActive(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 2) return 'Active just now'
    if (diffMins < 60) return `Active ${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Active ${diffHours}h ago`
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function LaptopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="12" x="3" y="4" rx="2" />
      <line x1="2" x2="22" y1="20" y2="20" />
    </svg>
  )
}

function DesktopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}

function SmartphoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="12" height="18" x="6" y="3" rx="2" />
      <line x1="11" x2="13" y1="18" y2="18" />
    </svg>
  )
}

function TabletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="11" x2="13" y1="18" y2="18" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function getDeviceIcon(deviceType?: string) {
  const dt = (deviceType || '').toLowerCase()
  if (dt.includes('phone') || dt.includes('mobile')) return <SmartphoneIcon />
  if (dt.includes('tablet') || dt.includes('ipad')) return <TabletIcon />
  if (dt.includes('desktop') || dt.includes('pc')) return <DesktopIcon />
  return <LaptopIcon />
}

export function Profile({ profile, onProfileUpdated, onLogout }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null)
  const [logoutScopeToConfirm, setLogoutScopeToConfirm] = useState<'local' | 'others' | 'global' | null>(null)

  useBodyScrollLock(showPhotoModal || Boolean(logoutScopeToConfirm))
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

  // Fetch active sessions on mount and apply client device details
  useEffect(() => {
    let mounted = true
    async function fetchSessions() {
      setSessionsLoading(true)
      const clientInfo = getClientDeviceInfo()
      try {
        const data = await getUserSessions()
        if (mounted) {
          const mapped = data.map((s) => {
            if (s.is_current) {
              return {
                ...s,
                device_type: clientInfo.device_type,
                browser: clientInfo.browser,
                os: clientInfo.os,
                device_name: `${clientInfo.device_type} • ${clientInfo.browser}`,
              }
            }
            return s
          })
          setSessions(mapped)
        }
      } catch {
        if (mounted) {
          setSessions([
            {
              id: 'current',
              device_name: `${clientInfo.device_type} • ${clientInfo.browser}`,
              device_type: clientInfo.device_type,
              browser: clientInfo.browser,
              os: clientInfo.os,
              ip_address: null,
              last_active: new Date().toISOString(),
              is_current: true,
            },
          ])
        }
      } finally {
        if (mounted) setSessionsLoading(false)
      }
    }
    fetchSessions()
    return () => {
      mounted = false
    }
  }, [])

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
      let updated: ProfileData
      try {
        updated = await deleteAvatar()
      } catch {
        updated = await updateProfile(fullName.trim(), phone.trim(), null)
      }
      setAvatarUrl('')
      onProfileUpdated(updated)
      setMessage('Profile picture removed successfully.')
      setShowPhotoModal(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to remove picture.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExecuteLogout(scope: 'local' | 'others' | 'global') {
    setSessionActionLoading(scope)
    setError('')
    setMessage('')
    try {
      if (scope === 'others') {
        await logout('others')
        const clientInfo = getClientDeviceInfo()
        const updated = await getUserSessions().catch(() => [])
        const mapped = updated.map((s) => {
          if (s.is_current) {
            return {
              ...s,
              device_type: clientInfo.device_type,
              browser: clientInfo.browser,
              os: clientInfo.os,
              device_name: `${clientInfo.device_type} • ${clientInfo.browser}`,
            }
          }
          return s
        })
        setSessions(mapped.length ? mapped : sessions.filter((s) => s.is_current))
        setMessage('Successfully logged out of all other devices.')
        setLogoutScopeToConfirm(null)
      } else if (scope === 'global') {
        await logout('global')
        onLogout()
      } else {
        await logout('local')
        onLogout()
      }
    } catch (err: unknown) {
      if (scope === 'others') {
        setError(err instanceof Error ? err.message : 'Failed to log out of other devices.')
      } else {
        onLogout()
      }
    } finally {
      setSessionActionLoading(null)
    }
  }

  const currentSession = sessions.find((s) => s.is_current) || sessions[0]
  const otherSessions = sessions.filter((s) => s !== currentSession && !s.is_current)

  return (
    <div className="profile-page">
      <section className="profile-page-container">
      {/* Hidden file input for uploading from device */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
      />

      {/* Page Header */}
      <div className="profile-header-section">
        <p className="section-kicker">ACCOUNT & PREFERENCES</p>
        <h1>My Profile</h1>
        <p>Review your personal library account details, customize your picture, and control active login sessions.</p>
      </div>

      {/* Global Notifications */}
      {message && (
        <div className="profile-alert profile-alert-success" role="status">
          <CheckCircleIcon />
          <span>{message}</span>
          <button type="button" className="alert-dismiss" onClick={() => setMessage('')} aria-label="Dismiss alert">
            <XIcon />
          </button>
        </div>
      )}

      {error && (
        <div className="profile-alert profile-alert-error" role="alert">
          <AlertCircleIcon />
          <span>{error}</span>
          <button type="button" className="alert-dismiss" onClick={() => setError('')} aria-label="Dismiss alert">
            <XIcon />
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="profile-overview-card">
        <div
          className="profile-avatar-wrapper"
          onClick={() => setShowPhotoModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setShowPhotoModal(true)
            }
          }}
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

      {/* Grid Layout: Left is Personal Details, Right is Account Sessions */}
      <div className="profile-grid-layout">
        {/* Left Column: Personal Details */}
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

            <div className="profile-actions">
              <button type="submit" className="editorial-btn-primary profile-save-btn" disabled={saving || uploadingAvatar}>
                {saving ? 'Saving changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Account Sessions -> Active Sessions */}
        <div className="profile-sessions-section">
          <div className="sessions-header-row">
            <div className="sessions-header-icon">
              <ShieldCheckIcon />
            </div>
            <div>
              <p className="sessions-breadcrumb-trail">
                <span>Account Sessions</span>
                <span className="breadcrumb-arrow">&rarr;</span>
                <span className="breadcrumb-active">Active Sessions</span>
              </p>
              <h3>Account Sessions</h3>
              <p className="profile-section-sub">Devices currently authenticated with your account credentials.</p>
            </div>
          </div>

          {/* 1. THIS DEVICE (TOP) */}
          <div className="session-current-card">
            <div className="session-item-header">
              <div className="session-device-icon">
                {getDeviceIcon(currentSession?.device_type)}
              </div>
              <div className="session-device-info">
                <div className="session-device-name-row">
                  <div className="session-device-title-wrap">
                    <strong className="session-browser-name">
                      {currentSession?.browser || 'Browser'}
                    </strong>
                    <span className="session-device-type-badge">
                      {currentSession?.device_type || 'Device'}
                    </span>
                  </div>
                  <span className="session-pill-current">
                    <span className="session-pulse-dot" aria-hidden="true" />
                    This Device • Active Now
                  </span>
                </div>
                <div className="session-meta-row">
                  <span className="session-os-tag">{currentSession?.os || 'System'}</span>
                  {currentSession?.ip_address && (
                    <>
                      <span className="session-meta-sep">•</span>
                      <span className="session-ip">IP: {currentSession.ip_address}</span>
                    </>
                  )}
                  <span className="session-meta-sep">•</span>
                  <span className="session-time">Active now</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. THREE LOGOUT OPTIONS (PLACED BEFORE OTHER DEVICES) */}
          <div className="session-action-buttons">
            <button
              type="button"
              className="editorial-btn-secondary session-btn"
              onClick={() => setLogoutScopeToConfirm('local')}
            >
              Log Out From This Device
            </button>

            <button
              type="button"
              className="editorial-btn-secondary session-btn"
              disabled={otherSessions.length === 0 || sessionActionLoading !== null}
              onClick={() => setLogoutScopeToConfirm('others')}
              title={otherSessions.length === 0 ? 'No other active devices' : 'Revoke sessions on all other devices'}
            >
              Log Out From Other Devices ({otherSessions.length})
            </button>

            <button
              type="button"
              className="button-logout-danger session-btn"
              onClick={() => setLogoutScopeToConfirm('global')}
            >
              Log Out From Everywhere
            </button>
          </div>

          {/* 3. LOGGED-IN DEVICES & SESSION HISTORY (AFTER LOGOUT OPTIONS) */}
          <div className="session-others-group">
            <div className="session-others-title-row">
              <div>
                <span className="session-group-label">Logged-in Devices &amp; Session History</span>
                <p className="session-group-desc">Previous and concurrent logins detected on your account.</p>
              </div>
              <span className="session-others-badge">
                {sessionsLoading ? 'Checking...' : `${otherSessions.length} other ${otherSessions.length === 1 ? 'device' : 'devices'}`}
              </span>
            </div>

            {sessionsLoading ? (
              <div className="session-loading-box">
                <span className="spinner-dot" />
                <span>Checking logged-in devices...</span>
              </div>
            ) : otherSessions.length === 0 ? (
              <div className="session-empty-card">
                <p>No other active devices logged in. You are only signed in on this current device.</p>
              </div>
            ) : (
              <div className="session-others-list">
                {otherSessions.map((s) => (
                  <div key={s.id} className="session-device-item">
                    <div className="session-device-icon secondary">
                      {getDeviceIcon(s.device_type)}
                    </div>
                    <div className="session-device-info">
                      <div className="session-device-name-row">
                        <div className="session-device-title-wrap">
                          <strong className="session-browser-name">{s.browser || 'Browser'}</strong>
                          <span className="session-device-type-badge secondary">
                            {s.device_type || 'Device'}
                          </span>
                        </div>
                        <span className="session-status-subtle">Logged In</span>
                      </div>
                      <div className="session-meta-row">
                        <span className="session-os-tag">{s.os}</span>
                        {s.ip_address && (
                          <>
                            <span className="session-meta-sep">•</span>
                            <span className="session-ip">IP: {s.ip_address}</span>
                          </>
                        )}
                        <span className="session-meta-sep">•</span>
                        <span className="session-time">{formatLastActive(s.last_active)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog Modal */}
      {logoutScopeToConfirm && (
        <div
          className="avatar-modal-backdrop"
          onClick={() => setLogoutScopeToConfirm(null)}
          role="presentation"
        >
          <div
            className="avatar-modal session-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-confirm-title"
          >
            <div className="avatar-modal-header">
              <h3 id="session-confirm-title">
                {logoutScopeToConfirm === 'local'
                  ? 'Log Out From This Device?'
                  : logoutScopeToConfirm === 'others'
                  ? 'Log Out From Other Devices?'
                  : 'Log Out From Everywhere?'}
              </h3>
              <button
                type="button"
                className="avatar-modal-close"
                onClick={() => setLogoutScopeToConfirm(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="session-confirm-body">
              <p>
                {logoutScopeToConfirm === 'local' &&
                  'Are you sure you want to log out of this device? You will need to enter your email and password to sign back in.'}
                {logoutScopeToConfirm === 'others' &&
                  `Are you sure you want to log out of ${otherSessions.length} other ${otherSessions.length === 1 ? 'device' : 'devices'}? Their active sessions will be revoked immediately while this device remains signed in.`}
                {logoutScopeToConfirm === 'global' &&
                  'Are you sure you want to log out everywhere? All active sessions across all devices (including this computer) will be terminated immediately.'}
              </p>
            </div>

            <div className="session-confirm-actions">
              <button
                type="button"
                className="editorial-btn-secondary session-modal-cancel-btn"
                onClick={() => setLogoutScopeToConfirm(null)}
                disabled={sessionActionLoading !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                className={logoutScopeToConfirm === 'others' ? 'editorial-btn-primary session-modal-confirm-btn' : 'button-logout-danger session-modal-confirm-btn'}
                onClick={() => handleExecuteLogout(logoutScopeToConfirm)}
                disabled={sessionActionLoading !== null}
              >
                {sessionActionLoading === logoutScopeToConfirm
                  ? 'Processing...'
                  : logoutScopeToConfirm === 'others'
                  ? 'Yes, Log Out Other Devices'
                  : 'Yes, Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                {avatarUrl ? 'Current profile picture' : 'No custom picture set (showing initials)'}
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
                onClick={handleRemoveAvatar}
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
    </div>
  )
}
