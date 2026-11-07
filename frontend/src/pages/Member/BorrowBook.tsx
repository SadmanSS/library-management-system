import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createBorrowing, getBooks } from '../../services/api'
import type { Book, Borrowing, Profile, Route } from '../../types'
import { FormField } from '../../components/ui/FormField'
import { handleEnterKeyNavigation } from '../../utils/formNavigation'
import { StateMessage } from '../../components/ui/StateMessage'
import { CoverImage } from '../../components/books/CoverImage'

type Props = {
  onNavigate: (path: Route, query?: string) => void
  profile?: Profile | null
}

function getDefaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

function getMinDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function BorrowBook({ onNavigate, profile }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [bookId, setBookId] = useState(new URLSearchParams(location.search).get('bookId') ?? '')

  // Automatically populated and locked from the user's registered account
  const defaultName = profile?.full_name?.trim() || ''
  const defaultContact = profile?.phone?.trim() || profile?.email?.trim() || ''

  const [name, setName] = useState(defaultName)
  const [contact, setContact] = useState(defaultContact)
  const [dueDate, setDueDate] = useState(getDefaultDueDate())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<Borrowing | null>(null)

  // Sync profile details if profile loads asynchronously
  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
    if (profile?.phone) setContact(profile.phone)
    else if (profile?.email && !contact) setContact(profile.email)
  }, [profile])

  // Load books
  useEffect(() => {
    getBooks()
      .then((data) => {
        setBooks(data)
        if (!data.some((book) => String(book.id) === bookId && book.available_copies > 0)) {
          setBookId(data.find((book) => book.available_copies > 0)?.id.toString() ?? '')
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load available books.'))
      .finally(() => setLoading(false))
  }, [bookId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const finalName = (profile?.full_name || name).trim()
    const finalContact = (profile?.phone || profile?.email || contact).trim()

    if (!bookId || !finalName || !finalContact || !dueDate) {
      setError('Choose a book and complete all required borrowing details.')
      return
    }
    setSaving(true)
    setError('')
    try {
      setConfirmation(
        await createBorrowing({
          book_id: Number(bookId),
          borrower_name: finalName,
          borrower_contact: finalContact,
          due_date: dueDate,
        })
      )
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'This book could not be borrowed.')
    } finally {
      setSaving(false)
    }
  }

  const available = books.filter((book) => book.available_copies > 0)
  const selectedBook = books.find((book) => String(book.id) === bookId)

  if (loading) {
    return (
      <section className="form-page">
        <StateMessage loading title="Loading available books..." text="Just a moment while we fetch the latest availability." />
      </section>
    )
  }

  if (confirmation) {
    return (
      <section className="form-page">
        <div className="success-panel">
          <span className="success-icon">✓</span>
          <p className="section-kicker">BORROWING CONFIRMED</p>
          <h1>Enjoy your next read.</h1>
          <p>Your book has been reserved for {confirmation.borrower_name}.</p>
          <div className="transaction-card">
            <span>TRANSACTION ID</span>
            <strong>#{confirmation.id}</strong>
            <small>Keep this ID for future reference and return.</small>
          </div>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => onNavigate('/books')}>
              Back to catalogue →
            </button>
            <button className="text-button" onClick={() => setConfirmation(null)}>
              Borrow another ↗
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (!error && !available.length) {
    return (
      <section className="form-page">
        <StateMessage
          title="No books are available right now."
          text="Please check the catalogue again later."
          action="View catalogue"
          onAction={() => onNavigate('/books')}
        />
      </section>
    )
  }

  const isProfileLocked = Boolean(profile)

  return (
    <section className="form-page">
      <div className="form-heading">
        <p className="section-kicker">TAKE A BOOK WITH YOU</p>
        <h1>Borrow a book</h1>
        <p>
          {isProfileLocked
            ? 'Confirm your book reservation. Borrower information is securely populated from your account.'
            : 'Choose an available title and specify borrowing details.'}
        </p>
      </div>

      <form className="book-form borrow-form" onSubmit={submit} onKeyDown={handleEnterKeyNavigation}>
        {selectedBook && (
          <div className="borrow-book-preview">
            <div className="borrow-book-cover">
              <span aria-hidden="true">▤</span>
              {selectedBook.cover_image_url && (
                <CoverImage src={selectedBook.cover_image_url} alt={`Cover of ${selectedBook.title}`} />
              )}
            </div>
            <div>
              <p className="section-kicker">SELECTED TITLE</p>
              <h2>{selectedBook.title}</h2>
              <p>by {selectedBook.author}</p>
              <small>
                {selectedBook.available_copies} of {selectedBook.total_copies} available
              </small>
            </div>
          </div>
        )}

        <label className="form-field full-width">
          <span>Book *</span>
          <select value={bookId} onChange={(event) => setBookId(event.target.value)}>
            <option value="">Select a book</option>
            {available.map((book) => (
              <option value={book.id} key={book.id}>
                {book.title} — {book.available_copies} available
              </option>
            ))}
          </select>
        </label>

        <div className="form-grid borrow-fields">
          <FormField
            label="Your name"
            name="borrower_name"
            value={isProfileLocked ? profile?.full_name || name : name}
            readOnly={isProfileLocked}
            hint={isProfileLocked ? '🔒 Populated from your registered profile and cannot be changed.' : undefined}
            onChange={isProfileLocked ? undefined : setName}
          />
          <FormField
            label="Contact information"
            name="borrower_contact"
            value={isProfileLocked ? profile?.phone || profile?.email || contact : contact}
            readOnly={isProfileLocked}
            hint={isProfileLocked ? '🔒 Populated from your registered profile and cannot be changed.' : 'Email or phone number.'}
            onChange={isProfileLocked ? undefined : setContact}
          />
          <FormField
            label="Due date"
            name="due_date"
            type="date"
            min={getMinDueDate()}
            value={dueDate}
            hint="Return the book by this date."
            onChange={setDueDate}
          />
        </div>

        {error && <p className="form-error form-submit-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => onNavigate('/books')}>
            Cancel
          </button>
          <button className="button button-primary" disabled={saving}>
            {saving ? 'Confirming...' : 'Confirm borrowing'}
          </button>
        </div>
      </form>
    </section>
  )
}
