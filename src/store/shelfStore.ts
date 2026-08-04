import { create } from 'zustand'
import { BOOKS } from '../data/books'

type ShelfMode = 'shelf' | 'inspection'

type ShelfState = {
  selectedIndex: number
  mode: ShelfMode
  select: (index: number) => void
  open: () => void
  close: () => void
  next: () => void
  previous: () => void
}

const wrapIndex = (index: number) => (index + BOOKS.length) % BOOKS.length

export const useShelfStore = create<ShelfState>((set) => ({
  selectedIndex: 0,
  mode: 'shelf',
  select: (index) => set({ selectedIndex: Math.max(0, Math.min(BOOKS.length - 1, index)) }),
  open: () => set({ mode: 'inspection' }),
  close: () => set({ mode: 'shelf' }),
  next: () => set((state) => ({ selectedIndex: wrapIndex(state.selectedIndex + 1) })),
  previous: () => set((state) => ({ selectedIndex: wrapIndex(state.selectedIndex - 1) })),
}))
