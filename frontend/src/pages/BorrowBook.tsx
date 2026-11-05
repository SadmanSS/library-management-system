import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createBorrowing, getBooks } from '../services/api'
import type { Book, Borrowing, Route } from '../types'
import { FormField } from '../components/ui/FormField'
import { StateMessage } from '../components/ui/StateMessage'
import { CoverImage } from '../components/books/CoverImage'

export function BorrowBook({ onNavigate }: { onNavigate: (path: Route, query?: string) => void }) {
  const [books, setBooks] = useState<Book[]>([]); const [bookId, setBookId] = useState(new URLSearchParams(location.search).get('bookId') ?? ''); const [name, setName] = useState(''); const [contact, setContact] = useState(''); const [dueDate, setDueDate] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [confirmation, setConfirmation] = useState<Borrowing | null>(null)
  useEffect(() => { getBooks().then((data) => { setBooks(data); if (!data.some((book) => String(book.id) === bookId && book.available_copies > 0)) setBookId(data.find((book) => book.available_copies > 0)?.id.toString() ?? '') }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load available books.')).finally(() => setLoading(false)) }, [bookId])
  async function submit(event: FormEvent) { event.preventDefault(); if (!bookId || !name.trim() || !contact.trim() || !dueDate) { setError('Choose a book and complete all borrower fields.'); return } setSaving(true); setError(''); try { setConfirmation(await createBorrowing({ book_id: Number(bookId), borrower_name: name.trim(), borrower_contact: contact.trim(), due_date: dueDate })) } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'This book could not be borrowed.') } finally { setSaving(false) } }
  const available = books.filter((book) => book.available_copies > 0)
  const selectedBook = books.find((book) => String(book.id) === bookId)
  if (loading) return <section className="form-page"><StateMessage loading title="Loading available books..." text="Just a moment while we fetch the latest availability." /></section>
  if (confirmation) return <section className="form-page"><div className="success-panel"><span className="success-icon">✓</span><p className="section-kicker">BORROWING CONFIRMED</p><h1>Enjoy your next read.</h1><p>Your book has been reserved for {confirmation.borrower_name}.</p><div className="transaction-card"><span>TRANSACTION ID</span><strong>#{confirmation.id}</strong><small>Keep this ID for future reference.</small></div><div className="hero-actions"><button className="button button-primary" onClick={() => onNavigate('/books')}>Back to catalogue →</button><button className="text-button" onClick={() => setConfirmation(null)}>Borrow another ↗</button></div></div></section>
  if (!error && !available.length) return <section className="form-page"><StateMessage title="No books are available right now." text="Please check the catalogue again later." action="View catalogue" onAction={() => onNavigate('/books')} /></section>
  return <section className="form-page"><div className="form-heading"><p className="section-kicker">TAKE A BOOK WITH YOU</p><h1>Borrow a book</h1><p>Choose an available title and tell us how to reach you. No account required.</p></div><form className="book-form borrow-form" onSubmit={submit}>
    {selectedBook && <div className="borrow-book-preview">
      <div className="borrow-book-cover">
        <span aria-hidden="true">▤</span>
        {selectedBook.cover_image_url && <CoverImage src={selectedBook.cover_image_url} alt={`Cover of ${selectedBook.title}`} />}
      </div>
      <div><p className="section-kicker">SELECTED TITLE</p><h2>{selectedBook.title}</h2><p>by {selectedBook.author}</p><small>{selectedBook.available_copies} of {selectedBook.total_copies} available</small></div>
    </div>}
    <label className="form-field full-width"><span>Book *</span><select value={bookId} onChange={(event) => setBookId(event.target.value)}><option value="">Select a book</option>{available.map((book) => <option value={book.id} key={book.id}>{book.title} — {book.available_copies} available</option>)}</select></label><div className="form-grid borrow-fields"><FormField label="Your name" name="borrower_name" value={name} onChange={setName} /><FormField label="Contact information" name="borrower_contact" value={contact} hint="Email or phone number." onChange={setContact} /><FormField label="Due date" name="due_date" type="date" value={dueDate} onChange={setDueDate} /></div>{error && <p className="form-error form-submit-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button button-secondary" onClick={() => onNavigate('/books')}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Confirming...' : 'Confirm borrowing'}</button></div></form></section>
}
