import type { Book, BookInput, BookWithCoverInput, Borrowing } from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const response = await fetch(`/api${path}`, {
    headers: isFormData ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  const body = response.status === 204 ? undefined : await response.json() as T & { detail?: string }
  if (!response.ok) {
    throw new Error(body?.detail ?? 'The request could not be completed.')
  }
  return body as T
}

export const getBooks = () => request<Book[]>('/books')
export const getBook = (id: number) => request<Book>(`/books/${id}`)
export const updateBook = (id: number, book: BookInput) => request<Book>(`/books/${id}`, {
  method: 'PUT',
  body: JSON.stringify(book),
})
export const deleteBook = (id: number) => request<void>(`/books/${id}`, { method: 'DELETE' })

export const createBook = (book: BookInput) => request<Book>('/books', {
  method: 'POST',
  body: JSON.stringify(book),
})

export const createBookWithCover = (book: BookWithCoverInput) => {
  const form = new FormData()
  Object.entries(book).forEach(([key, value]) => form.append(key, value instanceof File ? value : String(value)))
  return request<Book>('/books/with-cover', { method: 'POST', headers: {}, body: form })
}

export const getBorrowing = (id: number) => request<Borrowing>(`/borrowings/${id}`)

export const getBorrowings = () => request<Borrowing[]>('/borrowings')

export const createBorrowing = (input: Pick<Borrowing, 'book_id' | 'borrower_name' | 'borrower_contact' | 'due_date'>) =>
  request<Borrowing>('/borrowings', { method: 'POST', body: JSON.stringify(input) })

export const returnBorrowing = (id: number) =>
  request<Borrowing>(`/borrowings/${id}/return`, { method: 'POST' })
