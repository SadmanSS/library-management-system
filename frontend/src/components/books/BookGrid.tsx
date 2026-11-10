import type { Book, Profile, Route } from '../../types'
import { BookCard } from './BookCard'

type BookGridProps = {
  books: Book[]
  onNavigate: (path: Route, query?: string) => void
  onDelete: (book: Book) => void
  onQuickView?: (book: Book) => void
  canManage?: boolean
  profile?: Profile | null
  viewMode?: 'grid' | 'list'
}

export function BookGrid({
  books,
  onNavigate,
  onDelete,
  onQuickView,
  canManage = false,
  profile = null,
  viewMode = 'grid',
}: BookGridProps) {
  return (
    <div className={viewMode === 'list' ? 'catalog-list-container' : 'catalog-grid-container catalogue-grid-container'}>
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onNavigate={onNavigate}
          onDelete={onDelete}
          onQuickView={onQuickView}
          canManage={canManage}
          profile={profile}
          viewMode={viewMode}
        />
      ))}
    </div>
  )
}
