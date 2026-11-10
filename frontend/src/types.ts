export type Route = '/' | '/home' | '/categories' | '/books' | '/books/add' | '/books/edit' | '/profile' | '/borrow' | '/return'
  | '/login' | '/register' | '/forgot-password' | '/staff' | '/admin' | '/admin/users'

export type Role = 'member' | 'librarian' | 'admin'

export type Profile = {
  auth_user_id: string
  email: string
  full_name: string | null
  phone?: string | null
  avatar_url?: string | null
  role: Role
}

export type Book = {
  id: number
  title: string
  author: string
  isbn: string
  category: string
  description: string | null
  cover_image_url?: string | null
  total_copies: number
  available_copies: number
  created_at: string
  updated_at: string
}

export type Borrowing = {
  id: number
  book_id: number
  borrower_name: string
  borrower_contact: string
  borrowed_at: string
  due_date: string
  return_date: string | null
  status: string
}

export type BookInput = {
  title: string
  author: string
  isbn: string
  category: string
  description: string | null
  total_copies: number
  available_copies?: number
}

export type BookWithCoverInput = BookInput & { cover: File }

export type ScheduleException = {
  id: string
  date: string // "YYYY-MM-DD"
  note: string
  is_closed: boolean
  open_time?: string
  close_time?: string
}

export type LibrarySchedule = {
  regular_open: string
  regular_close: string
  weekly_off_days: string[]
  saturday_hours?: string
  exceptions: ScheduleException[]
  last_updated_by?: string
  last_updated_at?: string
}
