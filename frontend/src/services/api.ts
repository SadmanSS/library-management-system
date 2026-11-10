import type { Book, BookInput, BookWithCoverInput, Borrowing, LibrarySchedule, Profile, Role } from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('lms_access_token') : null
  const { headers: customHeaders, ...restInit } = init ?? {}

  const response = await fetch(`/api${path}`, {
    ...restInit,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...customHeaders,
    },
  })
  const body = response.status === 204 ? undefined : (await response.json()) as T & { detail?: string }
  if (!response.ok) {
    throw new Error(body?.detail ?? 'The request could not be completed.')
  }
  return body as T
}

export const getBooks = () => request<Book[]>('/books')
export const getBook = (id: number) => request<Book>(`/books/${id}`)
export const updateBook = (id: number, book: BookInput) =>
  request<Book>(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(book),
  })
export const updateBookWithCover = (id: number, book: BookInput & { cover: File }) => {
  const form = new FormData()
  Object.entries(book).forEach(([key, value]) =>
    form.append(key, value instanceof File ? value : String(value ?? ''))
  )
  return request<Book>(`/books/${id}/with-cover`, { method: 'PUT', body: form })
}
export const deleteBook = (id: number) => request<void>(`/books/${id}`, { method: 'DELETE' })

export const createBook = (book: BookInput) =>
  request<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(book),
  })

export const createBookWithCover = (book: BookWithCoverInput) => {
  const form = new FormData()
  Object.entries(book).forEach(([key, value]) => form.append(key, value instanceof File ? value : String(value)))
  return request<Book>('/books/with-cover', { method: 'POST', body: form })
}

export const getBorrowing = (id: number) => request<Borrowing>(`/borrowings/${id}`)
export const getBorrowings = () => request<Borrowing[]>('/borrowings')

export const createBorrowing = (
  input: Pick<Borrowing, 'book_id' | 'borrower_name' | 'borrower_contact' | 'due_date'>
) => request<Borrowing>('/borrowings', { method: 'POST', body: JSON.stringify(input) })

export const returnBorrowing = (id: number) => request<Borrowing>(`/borrowings/${id}/return`, { method: 'POST' })

export const hasAuthToken = () =>
  typeof window !== 'undefined' && Boolean(window.localStorage.getItem('lms_access_token'))
export const getCurrentProfile = () => request<Profile>('/auth/me')
export const login = (email: string, password: string) =>
  request<{ access_token: string; refresh_token?: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
export const register = (email: string, password: string, full_name: string, phone: string) =>
  request<{ access_token?: string; refresh_token?: string; message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name, phone }),
  })
export const logout = () => request<void>('/auth/logout', { method: 'POST' })
export const requestPasswordReset = (email: string) =>
  request<{ message: string }>('/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
export const updateProfile = (full_name: string, phone?: string, avatar_url?: string | null) =>
  request<Profile>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify({
      full_name,
      phone: phone || undefined,
      ...(avatar_url !== undefined ? { avatar_url } : {}),
    }),
  })

export const uploadAvatar = async (file: File) => {
  const form = new FormData()
  form.append('avatar', file)
  return request<Profile>('/auth/me/avatar', {
    method: 'POST',
    body: form,
  })
}

export const getUsers = () => request<Profile[]>('/admin/users')
export const updateUserRole = (authUserId: string, role: Role) =>
  request<Profile>(`/admin/users/${encodeURIComponent(authUserId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

export const getSchedule = () => request<LibrarySchedule>('/schedule')
export const updateSchedule = (schedule: LibrarySchedule) =>
  request<LibrarySchedule>('/schedule', {
    method: 'PUT',
    body: JSON.stringify(schedule),
  })
