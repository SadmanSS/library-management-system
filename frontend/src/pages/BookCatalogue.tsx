import { useEffect, useState } from 'react'
import { deleteBook, getBooks } from '../services/api'
import type { Book, Route } from '../types'
import { BookGrid } from '../components/books/BookGrid'
import { StateMessage } from '../components/ui/StateMessage'

export function BookCatalogue({ onNavigate, canManage = false }: { onNavigate: (path: Route, query?: string) => void; canManage?: boolean }) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [deleting, setDeleting] = useState(false)
  const load = () => { setLoading(true); setError(''); getBooks().then(setBooks).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load the catalogue.')).finally(() => setLoading(false)) }
  const remove = async () => {
    if (!bookToDelete) return
    setDeleting(true)
    try { await deleteBook(bookToDelete.id); setBooks((current) => current.filter((item) => item.id !== bookToDelete.id)) } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Unable to delete this book.') }
    finally { setDeleting(false); setBookToDelete(null) }
  }
  useEffect(() => {
    let active = true
    getBooks().then((data) => { if (active) setBooks(data) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the catalogue.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return <><section className="catalogue-page"><div className="catalogue-heading"><div><p className="section-kicker">THE COLLECTION</p><h1>Book catalogue</h1><p>Find your next great read from our growing collection.</p></div>{canManage && <button className="button button-primary" onClick={() => onNavigate('/books/add')}>Add a book +</button>}</div>{loading && <StateMessage loading title="Loading the collection..." text="Just a moment while we fetch the latest books." />}{!loading && error && <StateMessage title="We couldn't load the catalogue." text={error} action="Try again" onAction={load} />}{!loading && !error && !books.length && <StateMessage title="The catalogue is waiting for its first book." text="Add a title to start building the collection." action={canManage ? 'Add the first book' : undefined} onAction={canManage ? () => onNavigate('/books/add') : undefined} />}{!loading && !error && books.length > 0 && <BookGrid books={books} onNavigate={onNavigate} onDelete={setBookToDelete} canManage={canManage} />}</section>{bookToDelete && <div className="delete-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setBookToDelete(null) }}><div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title"><h2 id="delete-modal-title">Delete this book?</h2><p>Are you sure you want to delete "{bookToDelete.title}" from the catalogue?</p><div className="delete-modal-actions"><button className="button delete-modal-cancel" disabled={deleting} onClick={() => setBookToDelete(null)}>Cancel</button><button className="button delete-modal-confirm" disabled={deleting} onClick={remove}>{deleting ? 'Deleting...' : 'OK'}</button></div></div></div>}</>
}
