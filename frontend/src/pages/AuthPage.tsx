import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getCurrentProfile, login, register, requestPasswordReset } from '../services/api'
import type { Profile, Route } from '../types'
import { FormField } from '../components/ui/FormField'
import { handleEnterKeyNavigation } from '../utils/formNavigation'

type Mode = 'login' | 'register' | 'forgot-password'

export function AuthPage({ mode, onNavigate, onAuthenticated }: { mode: Mode; onNavigate: (path: Route) => void; onAuthenticated: (profile: Profile) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)

  // Focus the first input field on page load or mode switch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!formRef.current) return
      const firstInput = formRef.current.querySelector<HTMLInputElement>(
        'input:not([type="hidden"]):not([disabled])'
      )
      firstInput?.focus()
    }, 60)
    return () => clearTimeout(timer)
  }, [mode])

  async function submit(event: FormEvent) {
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
    }

    setSaving(true)
    try {
      if (mode === 'forgot-password') {
        setMessage((await requestPasswordReset(email.trim())).message)
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
          onNavigate(profileHome(authenticatedProfile))
        }
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'The authentication request could not be completed.')
    } finally { setSaving(false) }
  }

  const isForgot = mode === 'forgot-password'
  const isLogin = mode === 'login'
  const isRegister = mode === 'register'

  return (
    <section className="auth-page-v2">
      {/* Left visual panel */}
      <div className="auth-visual">
        <div className="auth-visual-bg" aria-hidden="true">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
        </div>
        <div className="auth-visual-content">
          <div className="auth-visual-icon">📚</div>
          <h1>
            {isLogin && 'Welcome back.'}
            {isRegister && 'Join the library.'}
            {isForgot && 'Reset password.'}
          </h1>
          <p>
            {isLogin && 'Sign in to access your personal dashboard, browse books, and manage your loans.'}
            {isRegister && 'Create your account to start borrowing books and tracking your reading journey.'}
            {isForgot && 'Enter your email and we\'ll send you instructions to reset your password.'}
          </p>

          <div className="auth-visual-features">
            <div className="auth-vf">
              <span className="auth-vf-dot" />
              <div>
                <strong>Browse & borrow</strong>
                <small>Discover books and track your loans.</small>
              </div>
            </div>
            <div className="auth-vf">
              <span className="auth-vf-dot" />
              <div>
                <strong>Manage inventory</strong>
                <small>Staff tools for books, covers & returns.</small>
              </div>
            </div>
            <div className="auth-vf">
              <span className="auth-vf-dot" />
              <div>
                <strong>Role-based security</strong>
                <small>Every account is protected by design.</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <p className="section-kicker">LIBRARY ACCESS</p>
            <h2>
              {isLogin && 'Sign in'}
              {isRegister && 'Create account'}
              {isForgot && 'Forgot password'}
            </h2>
            <p className="auth-form-desc">
              {isLogin && 'Enter your credentials to continue.'}
              {isRegister && 'Fill in your details to get started.'}
              {isForgot && 'We\'ll send recovery instructions to your email.'}
            </p>
          </div>

          <form
            className="auth-form-v2"
            ref={formRef}
            onSubmit={submit}
            onKeyDown={handleEnterKeyNavigation}
          >
            {isRegister && (
              <>
                <FormField label="Full name" name="full_name" value={fullName} placeholder="e.g. John Doe" onChange={setFullName} />
                <FormField label="Mobile number" name="phone" type="tel" value={phone} placeholder="e.g. +1 555-0199" hint="Used for loan notifications and contact." onChange={setPhone} />
              </>
            )}
            <FormField label="Email address" name="email" type="email" value={email} onChange={setEmail} />
            {!isForgot && (
              <FormField label="Password" name="password" type="password" value={password} hint="At least 8 characters." onChange={setPassword} />
            )}

            {error && <p className="form-error form-submit-error" role="alert">{error}</p>}
            {message && <p className="auth-message" role="status">{message}</p>}

            <button className="button button-primary auth-submit-btn" type="submit" disabled={saving}>
              {saving ? (
                <><span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> Please wait...</>
              ) : isForgot ? 'Send reset link' : isLogin ? 'Sign in' : 'Create account'}
            </button>

            <div className="auth-form-footer">
              {isLogin && (
                <>
                  <span className="auth-footer-text">Don't have an account?</span>
                  <button type="button" className="auth-footer-link" onClick={() => onNavigate('/register')}>Sign up</button>
                  <span className="auth-footer-sep">·</span>
                  <button type="button" className="auth-footer-link" onClick={() => onNavigate('/forgot-password')}>Forgot password?</button>
                </>
              )}
              {!isLogin && (
                <>
                  <span className="auth-footer-text">Already have an account?</span>
                  <button type="button" className="auth-footer-link" onClick={() => onNavigate('/login')}>Sign in</button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

function profileHome(profile: Profile): Route {
  return profile.role === 'admin' ? '/admin' : profile.role === 'librarian' ? '/staff' : '/'
}
