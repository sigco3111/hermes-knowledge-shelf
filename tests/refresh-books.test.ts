import { describe, expect, it } from 'vitest'
import { mergeBooks } from '../.github/scripts/merge-books.mjs'
import { normalizeRecord } from '../.github/scripts/transform-books.mjs'
import { pickToken, applyPatFallback } from '../.github/scripts/fetch-books.mjs'

declare module '../.github/scripts/merge-books.mjs' {
  export function mergeBooks(current: any, fetched: any, maxSections?: number): any
  export function mergeSections(currentSections: any, fetchedSections: any, maxSections?: number): any
  export function serializeBooks(books: any): string
  export function runMerge(opts: {
    inputPath: string
    currentPath: string
    outputPath: string
    maxSections: number
  }): Promise<{ bookCount: number; sectionCounts: number[] }>
}

declare module '../.github/scripts/transform-books.mjs' {
  export function normalizeRecord(record: unknown, source: string): any
}

declare module '../.github/scripts/fetch-books.mjs' {
  export function pickToken(env: Record<string, string | undefined>, sigcoPat: string | undefined): {
    token: string | null
    label: 'SIGCO_GITHUB_PAT' | 'GITHUB_TOKEN' | 'anonymous'
  }
  export function applyPatFallback<T extends { id: string; _needsFallback?: boolean }>(
    books: T[],
    hasPat: boolean,
  ): T[]
}

const makeBook = (id: string, sections: Array<{ id: string; heading: string; body: string }> = []) =>
  ({ id, sections })

describe('mergeBooks', () => {
  it('leaves the catalogue untouched when fetched is empty', () => {
    const current = [makeBook('activity', [{ id: 'a1', heading: 'h1', body: 'b1' }])]
    const result = mergeBooks(current, [], 6)
    expect(result).toBe(current)
    expect(result[0].sections).toEqual([{ id: 'a1', heading: 'h1', body: 'b1' }])
  })

  it('appends a section with a new id to the end of the list', () => {
    const current = [
      makeBook('activity', [
        { id: 'aaa', heading: 'h1', body: 'b1' },
        { id: 'bbb', heading: 'h2', body: 'b2' },
      ]),
    ]
    const fetched = [makeBook('activity', [{ id: 'ccc', heading: 'h3', body: 'b3' }])]
    const result = mergeBooks(current, fetched, 6)
    expect(result[0].sections).toHaveLength(3)
    expect(result[0].sections[2]).toEqual({ id: 'ccc', heading: 'h3', body: 'b3' })
  })

  it('overwrites an existing section by id while preserving order', () => {
    const current = [
      makeBook('activity', [
        { id: 'aaa', heading: 'h1', body: 'b1' },
        { id: 'bbb', heading: 'h2', body: 'b2' },
      ]),
    ]
    const fetched = [makeBook('activity', [{ id: 'aaa', heading: 'h1-updated', body: 'UPDATED' }])]
    const result = mergeBooks(current, fetched, 6)
    expect(result[0].sections).toHaveLength(2)
    expect(result[0].sections[0]).toEqual({ id: 'aaa', heading: 'h1-updated', body: 'UPDATED' })
    expect(result[0].sections[1].id).toBe('bbb')
  })

  it('drops the oldest sections when the cap is exceeded', () => {
    const current = [
      makeBook('activity', [
        { id: 'a1', heading: 'h1', body: 'b1' },
        { id: 'a2', heading: 'h2', body: 'b2' },
        { id: 'a3', heading: 'h3', body: 'b3' },
        { id: 'a4', heading: 'h4', body: 'b4' },
        { id: 'a5', heading: 'h5', body: 'b5' },
        { id: 'a6', heading: 'h6', body: 'b6' },
      ]),
    ]
    const fetched = [makeBook('activity', [{ id: 'a7', heading: 'h7', body: 'b7' }])]
    const result = mergeBooks(current, fetched, 6)
    expect(result[0].sections).toHaveLength(6)
    expect(result[0].sections[0].id).toBe('a2')
    expect(result[0].sections[5].id).toBe('a7')
  })

  it('ignores fetched records whose book id is not in the current catalogue', () => {
    const current = [
      makeBook('activity', [{ id: 'a1', heading: 'h1', body: 'b1' }]),
      makeBook('automation', [{ id: 'b1', heading: 'h2', body: 'b2' }]),
    ]
    const fetched = [
      makeBook('unknown-book', [{ id: 'x1', heading: 'hx', body: 'bx' }]),
      makeBook('activity', [{ id: 'a2', heading: 'h3', body: 'b3' }]),
    ]
    const result = mergeBooks(current, fetched, 6)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('activity')
    expect(result[0].sections).toHaveLength(2)
    expect(result[1].id).toBe('automation')
    expect(result[1].sections).toHaveLength(1)
  })
})

describe('normalizeRecord', () => {
  it('rejects records whose id is not in the canonical 6-book set', () => {
    expect(() =>
      normalizeRecord({ id: 'random-id', sections: [{ heading: 'h', body: 'b' }] }, 'src.json'),
    ).toThrow(/canonical/)
  })

  it('rejects records whose sections array is empty', () => {
    expect(() => normalizeRecord({ id: 'activity', sections: [] }, 'src.json')).toThrow(/no sections/)
  })

  it('assigns a sha256-based id to sections that omit one', () => {
    const book = normalizeRecord(
      {
        id: 'activity',
        sections: [{ heading: '흐름', body: '아이디어를 작업 단위로 나눕니다.' }],
      },
      'src.json',
    )
    expect(book.id).toBe('activity')
    const section = book.sections[0] as { id: string; heading: string; body: string }
    expect(section.id).toBeDefined()
    expect(section.id).toHaveLength(12)
    expect(section.heading).toBe('흐름')
  })
})

describe('pickToken', () => {
  it('prefers SIGCO_GITHUB_PAT over GITHUB_TOKEN, falling back to anonymous', () => {
    expect(pickToken({ GITHUB_TOKEN: 'ghp_default' }, 'ghp_sigco').label).toBe('SIGCO_GITHUB_PAT')
    expect(pickToken({ GITHUB_TOKEN: 'ghp_default' }, undefined).label).toBe('GITHUB_TOKEN')
    expect(pickToken({}, undefined).label).toBe('anonymous')
    expect(pickToken({}, undefined).token).toBeNull()
  })
})

describe('applyPatFallback', () => {
  it('replaces the recovery book with a public-only stub when hasPat=false and _needsFallback=true', () => {
    const books = [
      { id: 'activity', sections: [{ heading: 'h', body: 'b' }] },
      { id: 'recovery', sections: [], _needsFallback: true },
    ]
    const result = applyPatFallback(books, false)
    const recovery = result.find((book: { id: string }) => book.id === 'recovery')
    expect(recovery).toBeDefined()
    if (!recovery) throw new Error('recovery book should be present after fallback')
    expect((recovery as { _needsFallback?: unknown })._needsFallback).toBeUndefined()
    expect(recovery.sections).toHaveLength(2)
    expect(recovery.sections[0].heading).toBe('복구 루프')
    expect((books[1] as { _needsFallback?: boolean })._needsFallback).toBe(true)
  })

  it('passes the recovery book through unchanged when hasPat=true', () => {
    const recoveryEntry = {
      id: 'recovery',
      sections: [{ heading: '원본', body: 'PAT으로 가져온 본문' }],
    }
    const books = [recoveryEntry]
    const result = applyPatFallback(books, true)
    expect(result[0]).toBe(recoveryEntry)
    expect(result[0].sections).toHaveLength(1)
    expect(result[0].sections[0].heading).toBe('원본')
  })
})
