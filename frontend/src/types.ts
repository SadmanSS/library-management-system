export type Route = '/' | '/home' | '/books' | '/books/add' | '/books/edit' | '/profile' | '/borrow' | '/return'
  | '/login' | '/register' | '/forgot-password' | '/staff' | '/admin' | '/admin/users'

export type Role = 'member' | 'librarian' | 'admin'

export type Profile = {
  auth_user_id: string
  email: string
  full_name: string | null
  phone?: string | null
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
