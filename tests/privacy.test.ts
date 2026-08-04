import { describe, expect, it } from 'vitest'
import { toPublicBook } from '../src/data/publicSchema'
import { scanText } from '../src/privacy/scanner'

describe('public schema allowlist', () => {
  it('keeps only explicitly public fields and normalizes sections', () => {
    const raw = {
      id: 'activity', title: '에르메스 활동', kicker: 'PUBLIC SAMPLE',
      summary: '익명 공개 예시', accent: '#62e6c8',
      sections: [{ heading: '개요', body: '공개 데이터' }],
      internalNote: 'must disappear', owner: 'must disappear',
    }
    expect(toPublicBook(raw)).toEqual({
      id: 'activity', title: '에르메스 활동', kicker: 'PUBLIC SAMPLE',
      summary: '익명 공개 예시', accent: '#62e6c8',
      sections: [{ heading: '개요', body: '공개 데이터' }],
    })
  })

  it('rejects malformed public records', () => {
    expect(() => toPublicBook({ id: '', title: 'x', sections: [] })).toThrow()
  })
})

describe('privacy scanner', () => {
  it.each([
    ['email', 'person@example.com'],
    ['phone', '010-1234-5678'],
    ['mac path', '/Users/person/private'],
    ['linux path', '/home/person/private'],
    ['hermes path', '~/.hermes/memories'],
    ['credential', 'api_key = abc'],
    ['telegram id', 'telegram_id: 12345678'],
    ['discord id', 'discord user 123456789012345678'],
    ['private url', 'https://notion.so/private-space/abc'],
  ])('detects %s', (_, value) => {
    expect(scanText(value, 'fixture.txt')).not.toHaveLength(0)
  })

  it('accepts anonymous public sample text', () => {
    expect(scanText('공개 샘플 · 자동화 성공률 98% · 7개 카테고리', 'public.json')).toEqual([])
  })
})
