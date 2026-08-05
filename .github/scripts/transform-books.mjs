// Transform raw per-source fetch snapshots into the canonical 6-book catalog.
// Each input file contains one or more book records; we run them through
// toPublicBook (which assigns sha256 ids when missing) and emit a single array
// keyed by `id`, dropping any record whose id is not in the canonical 6-book set.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { parseArgs } from 'node:util'

import { toPublicBook } from '../../src/data/publicSchema.ts'

const CANONICAL_BOOK_IDS = [
  'activity',
  'automation',
  'public-projects',
  'knowledge-wiki',
  'recovery',
  'learning',
]

// Static metadata (title, kicker, summary, accent) lives outside the fetched
// payload because GitHub APIs don't expose the catalog-side copy. When a
// fetched record already supplies these fields we keep the fetched values so
// operators can override per run; otherwise we fall back to this table.
const STATIC_BOOK_METADATA = {
  activity: {
    title: '에르메스 활동',
    kicker: 'ACTIVITY PULSE',
    summary: '익명화된 흐름으로 보는 에르메스의 공개 활동 샘플입니다.',
    accent: '#D86552',
  },
  automation: {
    title: '자동화',
    kicker: 'QUIET SYSTEMS',
    summary: '반복 작업을 작고 관찰 가능한 파이프라인으로 바꾼 공개 예시입니다.',
    accent: '#9BB7BE',
  },
  'public-projects': {
    title: '공개 프로젝트',
    kicker: 'OPEN WORKS',
    summary: '공개 가능한 실험과 도구를 주제별로 탐색하는 카탈로그입니다.',
    accent: '#C86C43',
  },
  'knowledge-wiki': {
    title: '지식 위키',
    kicker: 'CONNECTED NOTES',
    summary: '읽고 만든 것을 연결해 다음 탐색의 출발점으로 만드는 공개 지식 지도입니다.',
    accent: '#354767',
  },
  recovery: {
    title: '에러와 복구',
    kicker: 'RESILIENT LOOPS',
    summary: '문제를 숨기지 않고 감지, 진단, 복구, 학습으로 전환하는 패턴입니다.',
    accent: '#36559B',
  },
  learning: {
    title: '에르메스의 학습',
    kicker: 'LEARNING TRAILS',
    summary: '실행에서 얻은 교훈을 재사용 가능한 절차로 다듬는 마지막 서가입니다.',
    accent: '#765F8E',
  },
}

function parseCli(argv) {
  const { values } = parseArgs({
    argv,
    options: {
      input: { type: 'string', multiple: true },
      output: { type: 'string' },
    },
  })
  if (!values.input || values.input.length === 0 || !values.output) {
    throw new Error(
      'transform-books: --input (one or more paths/globs expanded by the shell) and --output are required',
    )
  }
  return { inputs: values.input, output: values.output }
}

async function expandInput(path) {
  const info = await stat(path).catch(() => null)
  if (!info) return []
  if (info.isDirectory()) {
    const entries = await readdir(path)
    return entries
      .filter((name) => extname(name) === '.json')
      .map((name) => resolve(path, name))
  }
  return extname(path) === '.json' ? [path] : []
}

async function readJson(path) {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw)
}

// Normalize a raw record into the publicBook shape. Records that already match
// the schema (including the canonical `id`) pass through; everything else is
// dropped with a warning so the pipeline fails loud instead of silently rewriting.
export function normalizeRecord(record, source) {
  if (!record || typeof record !== 'object') {
    throw new Error(`transform-books: ${source} produced a non-object record`)
  }
  if (!record.id || !CANONICAL_BOOK_IDS.includes(record.id)) {
    throw new Error(
      `transform-books: ${source} has id="${record.id ?? '<missing>'}" which is not in the canonical 6-book set`,
    )
  }
  if (!Array.isArray(record.sections) || record.sections.length === 0) {
    throw new Error(`transform-books: ${source} book "${record.id}" has no sections`)
  }
  const metadata = STATIC_BOOK_METADATA[record.id]
  return toPublicBook({
    ...metadata,
    ...record,
  })
}

export async function transform(inputs) {
  const expanded = await Promise.all(inputs.map(expandInput))
  const files = expanded.flat().filter(Boolean)
  if (files.length === 0) {
    throw new Error(`transform-books: no .json inputs found among: ${inputs.join(', ')}`)
  }
  const byId = new Map()
  const warnings = []
  for (const file of files) {
    const raw = await readJson(file)
    const records = Array.isArray(raw) ? raw : [raw]
    for (const record of records) {
      try {
        const book = normalizeRecord(record, file)
        if (byId.has(book.id)) {
          warnings.push(`${file}: duplicate id "${book.id}" (kept the latest)`)
        }
        byId.set(book.id, book)
      } catch (err) {
        if (err instanceof Error) warnings.push(err.message)
        else warnings.push(String(err))
      }
    }
  }
  const missing = CANONICAL_BOOK_IDS.filter((id) => !byId.has(id))
  if (missing.length > 0) {
    warnings.push(`transform-books: no input produced books for ids: ${missing.join(', ')}`)
  }
  return { books: CANONICAL_BOOK_IDS.map((id) => byId.get(id)).filter(Boolean), warnings }
}

async function main() {
  try {
    const opts = parseCli(process.argv.slice(2))
    const { books, warnings } = await transform(opts.inputs)
    await writeFile(opts.output, JSON.stringify(books, null, 2) + '\n', 'utf8')
    for (const warning of warnings) console.warn(`warn: ${warning}`)
    console.log(`transform-books: wrote ${opts.output} (${books.length} books)`)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}