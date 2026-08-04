import { create } from 'zustand'
import { BOOKS } from '../data/books'

type ShelfState = {
  selectedIndex: number | null
  select: (index: number) => void
  close: () => void
  next: () => void
  previous: () => void
}

export const useShelfStore = create<ShelfState>((set) => ({
  selectedIndex: null,
  select: (index) => set({ selectedIndex: Math.max(0, Math.min(BOOKS.length - 1, index)) }),
  close: () => set({ selectedIndex: null }),
  next: () => set((state) => state.selectedIndex === null
    ? state
    : { selectedIndex: (state.selectedIndex + 1) % BOOKS.length }),
  previous: () => set((state) => state.selectedIndex === null
    ? state
    : { selectedIndex: (state.selectedIndex - 1 + BOOKS.length) % BOOKS.length }),
}))
