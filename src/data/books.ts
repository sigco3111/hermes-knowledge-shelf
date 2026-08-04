import rawBooks from './books.public.json'
import { toPublicBook, type PublicBook } from './publicSchema'

export const BOOKS: PublicBook[] = rawBooks.map(toPublicBook)
