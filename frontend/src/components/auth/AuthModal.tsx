import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getCurrentProfile, login, register, requestPasswordReset } from '../../services/api'
import { supabase, getRecoveryTokenFromUrl } from '../../services/supabase'
import type { Profile, Route } from '../../types'
import { FormField } from '../ui/FormField'
import { handleEnterKeyNavigation, useBodyScrollLock, useFocusTrap } from '../../utils/formNavigation'
import logo from '../../assets/logo.jpg'

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'set-new-password'

type Props = {
  isOpen: boolean
  initialMode?: AuthMode
  onClose: () => void
  onAuthenticated: (profile: Profile) => void
  onNavigate: (path: Route) => void
}

function profileHome(profile: Profile): Route {
  return profile.role === 'admin' ? '/admin' : profile.role === 'librarian' ? '/staff' : '/'
}

export function AuthModal({ isOpen, initialMode = 'login', onClose, onAuthenticated, onNavigate }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  // Sync mode with prop changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setError('')
      setMessage('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [isOpen, initialMode])

  // Focus trap and automatic initial focus management inside the modal
  useFocusTrap(modalRef, isOpen, mode)

  // Prevent background scroll when modal is open
  useBodyScrollLock(isOpen)

  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Full name is required.')
        return
      }
      if (!phone.trim()) {
        setError('Mobile number is required.')
        return
      }
      if (!email.trim()) {
        setError('Email address is required.')
        return
      }
      if (!password) {
        setError('Password is required.')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
    } else if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Enter both email and password.')
        return
      }
    } else if (mode === 'forgot-password') {
      if (!email.trim()) {
        setError('Enter your account email.')
        return
      }
    } else if (mode === 'set-new-password') {
      if (!newPassword) {
        setError('Please enter a new password.')
        return
      }
      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setSaving(true)
    try {
      if (mode === 'forgot-password') {
        // Requirement 1: call supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })

        if (resetError) {
          // Fallback through backend API to ensure reset email is delivered
          const response = await requestPasswordReset(email.trim(), window.location.origin)
          setMessage(response.message)
        } else {
          setMessage('If an account exists for that email, password reset instructions have been sent.')
        }
      } else if (mode === 'set-new-password') {
        // Ensure session tokens from URL hash are registered if available
        const { access_token, refresh_token } = getRecoveryTokenFromUrl()
        if (access_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || '',
          }).catch(() => {})
        }

        // Requirement 4: call supabase.auth.updateUser({ password: newPassword })
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (updateError) {
          throw updateError
        }

        // Show success message and clear fields
        setMessage('Your password has been successfully updated! You can now sign in.')
        setError('')
        setNewPassword('')
        setConfirmPassword('')

        // Clear recovery URL hash and params
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState(null, document.title, window.location.pathname)
        }

        // Switch back to Login view
        setTimeout(() => {
          setMode('login')
        }, 1600)
      } else {
        const result = mode === 'login'
          ? await login(email.trim(), password)
          : await register(email.trim(), password, fullName.trim(), phone.trim())

        if (!result.access_token) {
          setMessage(('message' in result ? result.message : undefined) ?? 'Check your email to confirm your account, then log in.')
        } else {
          window.localStorage.setItem('lms_access_token', result.access_token)
          const authenticatedProfile = await getCurrentProfile()
          onAuthenticated(authenticatedProfile)
          onClose()
          onNavigate(profileHome(authenticatedProfile))
        }
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'The authentication request could not be completed.')
    } finally {
      setSaving(false)
    }
  }

  const isForgot = mode === 'forgot-password'
  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isSetNewPassword = mode === 'set-new-password'

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal-card" ref={modalRef} onClick={(event) => event.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="auth-modal-header">
          <div className="auth-modal-brand">
            <img className="auth-modal-logo" src={logo} alt="" />
            <div className="auth-modal-brand-name">
              <strong>Library</strong>
              <small>Management System</small>
            </div>
          </div>
          <button className="auth-modal-close-btn" onClick={onClose} aria-label="Close dialog" type="button">
            ✕
          </button>
        </div>

        {/* Back to sign in button (shown in forgot-password or set-new-password mode) */}
        {(isForgot || isSetNewPassword) && (
          <div className="auth-modal-back-row">
            <button
              type="button"
              className="auth-modal-back-btn"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            >
              ← Back to sign in
            </button>
          </div>
        )}

        {/* Heading */}
        <div className="auth-modal-heading">
          <h2>
            {isLogin && 'Welcome back'}
            {isRegister && 'Create your account'}
            {isForgot && 'Reset your password'}
            {isSetNewPassword && 'Set new password'}
          </h2>
          <p>
            {isLogin && 'Enter your credentials to access your library workspace.'}
            {isRegister && 'Join the library to start browsing and borrowing books.'}
            {isForgot && 'Enter your account email to receive reset instructions.'}
            {isSetNewPassword && 'Enter your new password below to secure your account.'}
          </p>
        </div>

        {/* Form with Enter Key Navigation */}
        <form className="auth-modal-form" onSubmit={handleSubmit} onKeyDown={handleEnterKeyNavigation}>
          {isRegister && (
            <>
              <FormField
                label="Full name"
                name="full_name"
                value={fullName}
                placeholder="e.g. John Doe"
                onChange={setFullName}
              />
              <FormField
                label="Mobile number"
                name="phone"
                type="tel"
                value={phone}
                placeholder="e.g. +1 555-0199"
                hint="Used for loan notifications and contact."
                onChange={setPhone}
              />
            </>
          )}

          {isSetNewPassword ? (
            <>
              <FormField
                label="New password"
                name="new_password"
                type="password"
                value={newPassword}
                placeholder="At least 8 characters"
                hint="Must be at least 8 characters long."
                onChange={setNewPassword}
              />
              <FormField
                label="Confirm new password"
                name="confirm_password"
                type="password"
                value={confirmPassword}
                placeholder="Re-enter your new password"
                onChange={setConfirmPassword}
              />
            </>
          ) : (
            <>
              <FormField
                label="Email address"
                name="email"
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={setEmail}
              />

              {!isForgot && (
                <FormField
                  label="Password"
                  name="password"
                  type="password"
                  value={password}
                  hint={isRegister ? 'At least 8 characters.' : undefined}
                  onChange={setPassword}
                />
              )}
            </>
          )}

          {error && <p className="form-error auth-modal-error" role="alert">{error}</p>}
          {message && <p className="auth-message auth-modal-message" role="status">{message}</p>}

          <button className="button button-primary auth-modal-submit-btn" type="submit" disabled={saving}>
            {saving ? (
              <>
                <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
                <span>Please wait...</span>
              </>
            ) : isSetNewPassword ? (
              'Save New Password'
            ) : isForgot ? (
              'Send recovery link'
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Modal Footer Links */}
        <div className="auth-modal-footer">
          {isLogin && (
            <>
              <button
                type="button"
                className="auth-footer-link"
                onClick={() => { setMode('forgot-password'); setError(''); setMessage(''); }}
              >
                Forgot password?
              </button>
              <span className="auth-footer-sep">·</span>
              <span className="auth-footer-text">New here?</span>
              <button
                type="button"
                className="auth-footer-link"
                onClick={() => { setMode('register'); setError(''); setMessage(''); }}
              >
                Sign up
              </button>
            </>
          )}

          {isRegister && (
            <>
              <span className="auth-footer-text">Already have an account?</span>
              <button
                type="button"
                className="auth-footer-link"
                onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              >
                Sign in
              </button>
            </>
          )}

          {(isForgot || isSetNewPassword) && (
            <>
              <span className="auth-footer-text">Remember your password?</span>
              <button
                type="button"
                className="auth-footer-link"
                onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
