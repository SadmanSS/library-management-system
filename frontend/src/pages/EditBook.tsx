import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { getBook, updateBook, updateBookWithCover } from '../services/api'
import type { Book, BookInput, Route } from '../types'
import { FormField } from '../components/ui/FormField'
import { StateMessage } from '../components/ui/StateMessage'
import { CoverImage } from '../components/books/CoverImage'

export function EditBook({ onNavigate }: { onNavigate: (path: Route) => void }) {
  const id = Number(new URLSearchParams(location.search).get('bookId'))
  const invalidId = !Number.isInteger(id) || id < 1
  const [book, setBook] = useState<Book | null>(null)
  const [form, setForm] = useState<BookInput>({ title: '', author: '', isbn: '', category: '', description: null, total_copies: 1, available_copies: 1 })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [cover, setCover] = useState<File | null>(null)
  useEffect(() => {
    if (invalidId) return
    getBook(id).then((data) => {
      setBook(data)
      setForm({ title: data.title, author: data.author, isbn: data.isbn, category: data.category, description: data.description, total_copies: data.total_copies, available_copies: data.available_copies })
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load this book.'))
  }, [id, invalidId])
  const coverPreview = useMemo(() => cover ? URL.createObjectURL(cover) : null, [cover])
  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
  }, [coverPreview])
  const update = (key: keyof BookInput, value: string | number | null) => setForm((current) => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim() || !form.author.trim() || !form.isbn.trim() || !form.category.trim() || form.available_copies === undefined || form.available_copies > form.total_copies) {
      setError('Complete all required fields and use valid copy counts.')
      return
    }
    setSaving(true); setError('')
    const input = { ...form, title: form.title.trim(), author: form.author.trim(), isbn: form.isbn.trim(), category: form.category.trim(), description: form.description?.trim() || null }
    try { if (cover) await updateBookWithCover(id, { ...input, cover }); else await updateBook(id, input); onNavigate('/books') } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Unable to update this book.') } finally { setSaving(false) }
  }
  if ((error || invalidId) && !book) return <section className="form-page"><StateMessage title="Unable to edit this book." text={error || 'Invalid book selected.'} action="Back to catalogue" onAction={() => onNavigate('/books')} /></section>
  if (!book) return <section className="form-page"><StateMessage loading title="Loading book..." text="Just a moment while we fetch the book details." /></section>
  return <section className="form-page"><div className="form-heading"><p className="section-kicker">UPDATE THE COLLECTION</p><h1>Edit book</h1><p>Update this book&apos;s catalogue details.</p></div><form className="book-form" onSubmit={submit}><div className="edit-book-preview"><label className="edit-book-cover" htmlFor="edit-cover"><input id="edit-cover" className="edit-cover-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCover(event.target.files?.[0] ?? null)} />{coverPreview || book.cover_image_url ? <CoverImage src={coverPreview ?? book.cover_image_url!} alt={`Cover of ${book.title}`} /> : <span className="edit-book-cover-placeholder">Add cover</span>}<span className="edit-book-cover-overlay">Change picture</span></label><div><h2>{book.title}</h2><p>Click the picture to upload a new cover (JPEG/PNG/WebP, up to 5 MB).</p></div></div><div className="form-grid"><FormField label="Title" name="title" value={form.title} onChange={(value) => update('title', value)} /><FormField label="Author" name="author" value={form.author} onChange={(value) => update('author', value)} /><FormField label="ISBN" name="isbn" value={form.isbn} onChange={(value) => update('isbn', value)} /><FormField label="Categories" name="category" value={form.category} hint="Separate multiple categories with commas." onChange={(value) => update('category', value)} /><FormField label="Total copies" name="total_copies" type="number" min="0" value={String(form.total_copies)} onChange={(value) => update('total_copies', Number(value))} /><FormField label="Available copies" name="available_copies" type="number" min="0" value={String(form.available_copies ?? '')} onChange={(value) => update('available_copies', Number(value))} /></div><label className="form-field full-width"><span>Description</span><textarea rows={4} value={form.description ?? ''} onChange={(event) => update('description', event.target.value)} /></label>{error && <p className="form-error form-submit-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button button-secondary" onClick={() => onNavigate('/books')}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div></form></section>
}
