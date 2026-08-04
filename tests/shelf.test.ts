import { beforeEach, describe, expect, it } from 'vitest'
import { BOOKS } from '../src/data/books'
import { useShelfStore } from '../src/store/shelfStore'

describe('public shelf catalogue', () => {
  it('contains exactly the seven named books in order', () => {
    expect(BOOKS.map((book) => book.title)).toEqual([
      '에르메스 활동', '자동화', '공개 프로젝트', '지식 위키',
      '발행 기록', '에러와 복구', '에르메스의 학습',
    ])
  })
  it('uses unique ids and non-empty reader sections', () => {
    expect(new Set(BOOKS.map((book) => book.id)).size).toBe(7)
    expect(BOOKS.every((book) => book.sections.length > 0)).toBe(true)
  })
})

describe('shelf navigation store', () => {
  beforeEach(() => useShelfStore.setState({ selectedIndex: 0, mode: 'shelf' }))

  it('selects a book without opening it, then opens and closes inspection', () => {
    useShelfStore.getState().select(2)
    expect(useShelfStore.getState()).toMatchObject({ selectedIndex: 2, mode: 'shelf' })
    useShelfStore.getState().open()
    expect(useShelfStore.getState().mode).toBe('inspection')
    useShelfStore.getState().close()
    expect(useShelfStore.getState()).toMatchObject({ selectedIndex: 2, mode: 'shelf' })
  })

  it('wraps previous and next navigation from the initial selection', () => {
    useShelfStore.getState().previous()
    expect(useShelfStore.getState().selectedIndex).toBe(6)
    useShelfStore.getState().next()
    expect(useShelfStore.getState().selectedIndex).toBe(0)
  })

  it('keeps navigation available while the shelf is not open', () => {
    useShelfStore.getState().next()
    expect(useShelfStore.getState().selectedIndex).toBe(1)
    expect(useShelfStore.getState().mode).toBe('shelf')
  })
})
