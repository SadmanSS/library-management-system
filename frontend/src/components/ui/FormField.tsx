import { useState } from 'react'
import type { KeyboardEvent } from 'react'

type Props = {
  label: string
  name: string
  value: string
  type?: string
  min?: string
  hint?: string
  error?: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
  autoFocus?: boolean
  readOnly?: boolean
  disabled?: boolean
  onChange?: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function FormField({
  label,
  name,
  value,
  type = 'text',
  min,
  hint,
  error,
  placeholder,
  required = true,
  autoComplete,
  autoFocus,
  readOnly,
  disabled,
  onChange,
  onKeyDown,
}: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const computedType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <label className={`form-field ${readOnly ? 'form-field-readonly' : ''}`}>
      <span>
        {label} {required && '*'}
        {readOnly && <span className="readonly-badge" title="Populated from your profile">🔒 Locked</span>}
      </span>
      <div className="form-input-container">
        <input
          name={name}
          type={computedType}
          min={min}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={Boolean(error)}
          className={readOnly ? 'input-locked' : ''}
        />
        {isPassword && (
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {hint && !error && <small>{hint}</small>}
      {error && <small className="form-error">{error}</small>}
    </label>
  )
}
