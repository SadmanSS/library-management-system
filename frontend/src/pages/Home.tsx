import { useEffect, useState } from 'react'
import type { LibrarySchedule, Profile, Route, ScheduleException } from '../types'
import { AuthModal, type AuthMode } from '../components/auth/AuthModal'
import { getSchedule, updateSchedule } from '../services/api'
import { useBodyScrollLock } from '../utils/useBodyScrollLock'
import { supabase, isPasswordRecoveryUrl } from '../services/supabase'
import libraryBg from '../assets/hero-bookstore.jpg'

type HomeProps = {
  onNavigate: (path: Route, query?: string) => void
  onAuthenticated?: (profile: Profile) => void
  initialAuthMode?: AuthMode | null
  profile?: Profile | null
}

const DEFAULT_SCHEDULE: LibrarySchedule = {
  regular_open: '08:30 AM',
  regular_close: '06:30 PM',
  weekly_off_days: ['Sunday'],
  saturday_hours: '09:00 AM – 05:00 PM',
  exceptions: [],
}

function getStoredSchedule(): LibrarySchedule {
  try {
    const raw = localStorage.getItem('library_schedule')
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }
  return DEFAULT_SCHEDULE
}

export function Home({ onNavigate, onAuthenticated, initialAuthMode = null, profile = null }: HomeProps) {
  const [authModalMode, setAuthModalMode] = useState<AuthMode | null>(initialAuthMode)
  const [schedule, setSchedule] = useState<LibrarySchedule>(getStoredSchedule)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Schedule editor form states
  const [editOpenTime, setEditOpenTime] = useState('')
  const [editCloseTime, setEditCloseTime] = useState('')
  const [editSaturdayHours, setEditSaturdayHours] = useState('')
  const [editOffDay, setEditOffDay] = useState('Sunday')
  const [exceptionsList, setExceptionsList] = useState<ScheduleException[]>([])

  // New exception row states
  const [newDate, setNewDate] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newIsClosed, setNewIsClosed] = useState(true)
  const [newCustomHours, setNewCustomHours] = useState('10:00 AM – 02:00 PM')

  const isStaffOrAdmin = profile?.role === 'admin' || profile?.role === 'librarian'

  useBodyScrollLock(showScheduleModal)

  useEffect(() => {
    if (!showScheduleModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowScheduleModal(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showScheduleModal])

  useEffect(() => {
    setAuthModalMode(initialAuthMode ?? null)
  }, [initialAuthMode])

  // Listen for Supabase password recovery event & URL detection
  useEffect(() => {
    // 1. Check if the URL contains type=recovery or recovery token on mount
    if (isPasswordRecoveryUrl()) {
      setAuthModalMode('set-new-password')
    }

    // 2. Listen for Supabase PASSWORD_RECOVERY event
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalMode('set-new-password')
      }
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    getSchedule()
      .then((data) => {
        if (data) {
          setSchedule(data)
          localStorage.setItem('library_schedule', JSON.stringify(data))
        }
      })
      .catch(() => {
        // use local storage schedule
      })
  }, [])


  const closeAuth = () => {
    setAuthModalMode(null)
    if (isPasswordRecoveryUrl() && typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, document.title, window.location.pathname)
    }
    onNavigate('/home')
  }

  // Populate editor modal
  const openScheduleEditor = () => {
    setEditOpenTime(schedule.regular_open || '08:30 AM')
    setEditCloseTime(schedule.regular_close || '06:30 PM')
    setEditSaturdayHours(schedule.saturday_hours || '09:00 AM – 05:00 PM')
    setEditOffDay(schedule.weekly_off_days?.[0] || 'Sunday')
    setExceptionsList(schedule.exceptions || [])
    setShowScheduleModal(true)
  }

  const handleAddException = () => {
    if (!newDate.trim() || !newNote.trim()) return
    const item: ScheduleException = {
      id: Date.now().toString(),
      date: newDate,
      note: newNote.trim(),
      is_closed: newIsClosed,
      open_time: newIsClosed ? undefined : newCustomHours.split('–')[0]?.trim(),
      close_time: newIsClosed ? undefined : newCustomHours.split('–')[1]?.trim(),
    }
    setExceptionsList((prev) => [...prev, item])
    setNewDate('')
    setNewNote('')
  }

  const handleRemoveException = (id: string) => {
    setExceptionsList((prev) => prev.filter((x) => x.id !== id))
  }

  const handleSaveSchedule = async () => {
    setSavingSchedule(true)
    const updated: LibrarySchedule = {
      regular_open: editOpenTime.trim() || '08:30 AM',
      regular_close: editCloseTime.trim() || '06:30 PM',
      weekly_off_days: [editOffDay],
      saturday_hours: editSaturdayHours.trim() || '09:00 AM – 05:00 PM',
      exceptions: exceptionsList,
      last_updated_by: profile?.full_name || profile?.email || 'Staff',
      last_updated_at: new Date().toISOString(),
    }

    try {
      await updateSchedule(updated)
    } catch {
      // offline or fallback
    } finally {
      setSchedule(updated)
      localStorage.setItem('library_schedule', JSON.stringify(updated))
      setSavingSchedule(false)
      setShowScheduleModal(false)
    }
  }

  // Calculate current status (Open vs Closed)
  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDayName = days[now.getDay()]
  const todayIso = now.toISOString().split('T')[0]

  const todayException = schedule.exceptions?.find((e) => e.date === todayIso)
  const isTodayOffDay = schedule.weekly_off_days?.includes(currentDayName)

  let statusText = '🟢 Currently Open Today'
  let statusSub = `${schedule.regular_open} – ${schedule.regular_close}`

  if (todayException) {
    if (todayException.is_closed) {
      statusText = '🔴 Closed Today (Special Notice)'
      statusSub = todayException.note
    } else {
      statusText = '🟡 Special Hours Today'
      statusSub = `${todayException.open_time || ''} – ${todayException.close_time || ''} (${todayException.note})`
    }
  } else if (isTodayOffDay) {
    statusText = `🔴 Closed Today (${currentDayName} Weekly Off)`
    statusSub = 'Online Catalog Open 24/7'
  } else if (currentDayName === 'Saturday') {
    statusText = '🟢 Open Today (Saturday Schedule)'
    statusSub = schedule.saturday_hours || '09:00 AM – 05:00 PM'
  }

  return (
    <div className="paradise-landing">
      {/* ── HERO SECTION ── */}
      <section
        id="hero"
        className="paradise-hero"
        style={{
          backgroundImage: `var(--hero-gradient), url(${libraryBg})`,
        }}
      >
        <div className="paradise-hero-container">
          <div className="paradise-hero-content">
            {/* Headline */}
            <h1 className="paradise-headline">
              Your gateway<br />
              to <span className="highlight-gold">knowledge,</span><br />
              inspiration<br />
              &amp; imagination.
            </h1>

            {/* Subtitle with System-Specific Info */}
            <p className="paradise-subline">
              Discover, search, and borrow from thousands of titles across diverse academic,
              scientific, and literary collections. Easily manage reservations, track your loans,
              and explore curated knowledge — all in one centralized library system.
            </p>

            {/* Action Buttons */}
            <div className="paradise-cta-group">
              <button
                type="button"
                className="paradise-btn-dark"
                onClick={() => onNavigate('/books')}
              >
                Show Catalog <span className="btn-arrow" aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                className="paradise-btn-outline"
                onClick={() => {
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="btn-pin-icon" aria-hidden="true">🕒</span> Library Schedule
              </button>
            </div>

            {/* Trust Badges */}
            <div className="paradise-trust-badges">
              <div className="trust-badge-item">
                <span className="trust-icon" aria-hidden="true">📖</span>
                <span>15,000+ Catalogued Titles</span>
              </div>
              <div className="trust-badge-item">
                <span className="trust-icon" aria-hidden="true">⚡</span>
                <span>Instant Reservations</span>
              </div>
              <div className="trust-badge-item">
                <span className="trust-icon" aria-hidden="true">🔒</span>
                <span>Secure Member Circulation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator banner */}
        <a href="#about" className="paradise-scroll-indicator">
          <span>ABOUT OUR LIBRARY & HOURS</span>
          <span className="scroll-arrow" aria-hidden="true">↓</span>
        </a>
      </section>

      {/* ── ABOUT OUR LIBRARY MANAGEMENT SYSTEM & OPERATING SCHEDULE ── */}
      <section id="about" className="paradise-about-section">
        <div className="paradise-container">
          {/* About System Header & Overview */}
          <div className="about-overview-block">
            <div className="section-title-wrap">
              <span className="section-sub-kicker">ABOUT OUR SYSTEM</span>
              <h2 className="section-heading-serif">A Modern Centralized Library Management System</h2>
              <p className="section-description">
                Designed for seamless book discovery, reservations, and circulation, our Library Management
                System empowers patrons, researchers, and students to access comprehensive literature and
                academic resources with speed, precision, and complete transparency.
              </p>
            </div>

            {/* System Statistics Row */}
            <div className="about-stats-grid">
              <div className="about-stat-card">
                <span className="about-stat-icon" aria-hidden="true">📚</span>
                <div className="about-stat-info">
                  <strong>15,000+</strong>
                  <span>Catalogued Titles</span>
                </div>
              </div>
              <div className="about-stat-card">
                <span className="about-stat-icon" aria-hidden="true">⚡</span>
                <div className="about-stat-info">
                  <strong>99.8%</strong>
                  <span>On-Time Returns</span>
                </div>
              </div>
              <div className="about-stat-card">
                <span className="about-stat-icon" aria-hidden="true">👥</span>
                <div className="about-stat-info">
                  <strong>5,000+</strong>
                  <span>Active Members</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operating Schedule: In the Page (Full-Width, Integrated Flow) */}
          <div className="page-schedule-section">
            <div className="page-schedule-header">
              <div className="page-schedule-title-group">
                <span className="section-sub-kicker">PLAN YOUR VISIT &amp; BORROWING</span>
                <h3 className="page-schedule-heading">Library Operating Schedule</h3>
              </div>

              <div className="page-schedule-controls">
                {/* Live Status Pill */}
                <div className="page-schedule-status-pill">
                  <span className="schedule-status-title">{statusText}</span>
                  <span className="schedule-status-dot">•</span>
                  <small className="schedule-status-sub">{statusSub}</small>
                </div>

                {/* Staff & Admin Manage Pill Button */}
                {isStaffOrAdmin && (
                  <button
                    type="button"
                    className="schedule-manage-pill-btn"
                    onClick={openScheduleEditor}
                    title="Admin & Staff: Edit operating hours & off-days"
                  >
                    ⚙️ Manage Schedule &amp; Off Days
                  </button>
                )}
              </div>
            </div>

            {/* Schedule 3-Column Grid Across Page */}
            <div className="page-schedule-grid">
              {/* Card 1: Weekdays */}
              <div className="schedule-day-column">
                <div className="schedule-col-top">
                  <span className="schedule-day-pill">WEEKDAYS</span>
                  <span className="schedule-col-icon" aria-hidden="true">🏛️</span>
                </div>
                <h4 className="schedule-col-day">Monday – Friday</h4>
                <div className="schedule-col-time">
                  {schedule.regular_open} – {schedule.regular_close}
                </div>
                <p className="schedule-col-desc">
                  Full circulation services, book issuing, reading rooms, and reference assistance.
                </p>
              </div>

              {/* Card 2: Saturday */}
              <div className="schedule-day-column">
                <div className="schedule-col-top">
                  <span className="schedule-day-pill">WEEKEND</span>
                  <span className="schedule-col-icon" aria-hidden="true">📖</span>
                </div>
                <h4 className="schedule-col-day">Saturday</h4>
                <div className="schedule-col-time">
                  {schedule.saturday_hours || '09:00 AM – 05:00 PM'}
                </div>
                <p className="schedule-col-desc">
                  Study spaces, reservation pickups, returns drop-off, and weekend reading access.
                </p>
              </div>

              {/* Card 3: Weekly Off Day */}
              <div className="schedule-day-column schedule-col-off">
                <div className="schedule-col-top">
                  <span className="schedule-day-pill pill-off">WEEKLY OFF DAY</span>
                  <span className="schedule-col-icon" aria-hidden="true">🔒</span>
                </div>
                <h4 className="schedule-col-day">{schedule.weekly_off_days?.join(', ') || 'Sunday'}</h4>
                <div className="schedule-col-time off-time">
                  Closed for In-Person Visits
                </div>
                <p className="schedule-col-desc">
                  Physical desk closed. Digital catalog search, loans tracking, and reservations remain open 24/7 online.
                </p>
              </div>
            </div>

            {/* Special Date Exceptions Banner (if any) */}
            {schedule.exceptions && schedule.exceptions.length > 0 && (
              <div className="page-schedule-exceptions-row">
                <div className="exceptions-row-header">
                  <span className="exceptions-title">📅 Special Date Exceptions &amp; Notices:</span>
                </div>
                <div className="exceptions-chips-wrap">
                  {schedule.exceptions.map((exc) => (
                    <div key={exc.id} className="exception-chip">
                      <strong>{exc.date}</strong>
                      <span className="exception-chip-note">({exc.note})</span>
                      <span className={exc.is_closed ? 'exc-closed-pill' : 'exc-open-pill'}>
                        {exc.is_closed ? 'Closed All Day' : `${exc.open_time || ''} – ${exc.close_time || ''}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SCHEDULE MANAGEMENT MODAL (ADMIN & STAFF ONLY) ── */}
      {showScheduleModal && (
        <div
          className="store-modal-backdrop"
          onClick={() => setShowScheduleModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="store-modal-card schedule-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowScheduleModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <span className="modal-badge">⚙️ STAFF &amp; ADMIN CONTROLS</span>
            <h3>Update Library Schedule &amp; Off Days</h3>
            <p className="modal-address">
              Adjust regular opening and closing times, change weekly off-days, or configure specific dates
              for closures, maintenance, or extended hours.
            </p>

            {/* Form Fields */}
            <div className="schedule-form-grid">
              <div className="sched-form-field">
                <label>Monday – Friday Open Time</label>
                <input
                  type="text"
                  value={editOpenTime}
                  onChange={(e) => setEditOpenTime(e.target.value)}
                  placeholder="e.g. 08:30 AM"
                />
              </div>

              <div className="sched-form-field">
                <label>Monday – Friday Close Time</label>
                <input
                  type="text"
                  value={editCloseTime}
                  onChange={(e) => setEditCloseTime(e.target.value)}
                  placeholder="e.g. 06:30 PM"
                />
              </div>

              <div className="sched-form-field">
                <label>Saturday Operating Hours</label>
                <input
                  type="text"
                  value={editSaturdayHours}
                  onChange={(e) => setEditSaturdayHours(e.target.value)}
                  placeholder="e.g. 09:00 AM – 05:00 PM or Closed"
                />
              </div>

              <div className="sched-form-field">
                <label>Weekly Off Day</label>
                <select
                  value={editOffDay}
                  onChange={(e) => setEditOffDay(e.target.value)}
                >
                  <option value="Sunday">Sunday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Friday">Friday</option>
                  <option value="Monday">Monday</option>
                </select>
              </div>
            </div>

            {/* Specific Date Exceptions Builder */}
            <div className="modal-hours-block exceptions-builder-block">
              <h4>📅 Specific Date Exceptions (Holidays / Special Events)</h4>
              
              {exceptionsList.length > 0 ? (
                <ul className="exceptions-edit-list">
                  {exceptionsList.map((exc) => (
                    <li key={exc.id} className="exception-item-row">
                      <div>
                        <strong>{exc.date}</strong> — {exc.note}
                        <span className="exc-tag">
                          {exc.is_closed ? 'Closed all day' : `${exc.open_time} – ${exc.close_time}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="exception-delete-btn"
                        onClick={() => handleRemoveException(exc.id)}
                        title="Delete exception"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-exceptions-hint">No specific date exceptions currently scheduled.</p>
              )}

              {/* Add Exception Row */}
              <div className="add-exception-card">
                <strong>+ Add Specific Date Exception</strong>
                <div className="add-exception-inputs">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    title="Exception date"
                  />
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Occasion / Reason (e.g. National Holiday)"
                  />
                  <label className="exc-closed-checkbox">
                    <input
                      type="checkbox"
                      checked={newIsClosed}
                      onChange={(e) => setNewIsClosed(e.target.checked)}
                    />
                    <span>Closed all day</span>
                  </label>
                  {!newIsClosed && (
                    <input
                      type="text"
                      value={newCustomHours}
                      onChange={(e) => setNewCustomHours(e.target.value)}
                      placeholder="e.g. 10:00 AM – 02:00 PM"
                    />
                  )}
                  <button
                    type="button"
                    className="add-exc-action-btn"
                    onClick={handleAddException}
                  >
                    Add Date
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="modal-btn-primary"
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
            >
              {savingSchedule ? 'Saving Changes...' : 'Save Schedule Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ── */}
      <AuthModal
        isOpen={authModalMode !== null}
        initialMode={authModalMode || 'login'}
        onClose={closeAuth}
        onAuthenticated={(p) => {
          onAuthenticated?.(p)
          closeAuth()
        }}
        onNavigate={onNavigate}
      />
    </div>
  )
}
