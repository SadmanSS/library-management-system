import { useEffect, useState } from 'react'
import { getBooks } from '../services/api'
import type { Book, Route } from '../types'
import { BookGrid } from '../components/books/BookGrid'
import { StateMessage } from '../components/ui/StateMessage'

export function BookCatalogue({ onNavigate }: { onNavigate: (path: Route, query?: string) => void }) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => { setLoading(true); setError(''); getBooks().then(setBooks).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load the catalogue.')).finally(() => setLoading(false)) }
  useEffect(() => {
    let active = true
    getBooks().then((data) => { if (active) setBooks(data) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the catalogue.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return <section className="catalogue-page"><div className="catalogue-heading"><div><p className="section-kicker">THE COLLECTION</p><h1>Book catalogue</h1><p>Find your next great read from our growing collection.</p></div><button className="button button-primary" onClick={() => onNavigate('/books/add')}>Add a book +</button></div>{loading && <StateMessage title="Loading the collection..." text="Just a moment while we fetch the latest books." />}{!loading && error && <StateMessage title="We couldn't load the catalogue." text={error} action="Try again" onAction={load} />}{!loading && !error && !books.length && <StateMessage title="The catalogue is waiting for its first book." text="Add a title to start building the collection." action="Add the first book" onAction={() => onNavigate('/books/add')} />}{!loading && !error && books.length > 0 && <BookGrid books={books} onNavigate={onNavigate} />}</section>
}
