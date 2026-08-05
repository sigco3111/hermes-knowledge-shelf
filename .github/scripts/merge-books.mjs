// Merge freshly fetched section snapshots into the existing books.public.json.
// Strategy: per-book LIFO rotation + id-based dedup. New sections append at the end;
// once `sections.max` is exceeded the oldest entries drop off, keeping the catalog bounded.
// Key order, indentation (2 spaces), and the single-line section format are preserved
// via a custom serializer so the file stays diff-friendly.

import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

const BOOK_KEY_ORDER = ['id', 'title', 'kicker', 'summary', 'accent', 'sections']
const SECTION_KEY_ORDER = ['id', 'heading', 'body']
const DEFAULT_MAX_SECTIONS = 6

function parseCli(argv) {
  const { values } = parseArgs({
    argv,
    options: {
      input: { type: 'string' },
      current: { type: 'string' },
      output: { type: 'string' },
      'max-sections': { type: 'string', default: String(DEFAULT_MAX_SECTIONS) },
    },
  })
  if (!values.input || !values.current || !values.output) {
    throw new Error(
      'merge-books: --input, --current, --output are required (e.g. ' +
        '--input fetched.json --current src/data/books.public.json --output src/data/books.public.json)',
    )
  }
  return {
    inputPath: values.input,
    currentPath: values.current,
    outputPath: values.output,
    maxSections: Math.max(1, Number.parseInt(values['max-sections'], 10) || DEFAULT_MAX_SECTIONS),
  }
}

async function readJson(path) {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw)
}

// Merge fetched sections into the existing book list, in place.
// `fetched` is an array of `{ id, sections: [{ id, heading, body, ... }] }` records;
// only books whose `id` matches an existing entry are merged.
export function mergeBooks(current, fetched, maxSections = DEFAULT_MAX_SECTIONS) {
  const byId = new Map(current.map((book) => [book.id, book]))
  for (const fetchedBook of fetched) {
    const existing = byId.get(fetchedBook.id)
    if (!existing) continue
    const merged = mergeSections(existing.sections, fetchedBook.sections, maxSections)
    existing.sections = merged
  }
  return current
}

// Per-book LIFO rotation: an incoming section with a matching id overwrites the
// existing entry (keeping its position); an unseen id appends to the tail.
// When the cap is exceeded, the oldest entries are dropped first.
export function mergeSections(currentSections, fetchedSections, maxSections = DEFAULT_MAX_SECTIONS) {
  if (!Array.isArray(fetchedSections) || fetchedSections.length === 0) {
    return currentSections.slice()
  }
  const byId = new Map(currentSections.map((section) => [section.id, section]))
  const order = currentSections.map((section) => section.id)
  for (const incoming of fetchedSections) {
    if (!incoming || !incoming.id) continue
    if (!byId.has(incoming.id)) order.push(incoming.id)
    byId.set(incoming.id, incoming)
  }
  const trimmed = order.length > maxSections ? order.slice(order.length - maxSections) : order
  return trimmed.map((id) => byId.get(id))
}

// Custom serializer: matches the existing books.public.json layout exactly so the
// diff stays minimal and reviewers can spot what changed.
export function serializeBooks(books) {
  const lines = ['[']
  books.forEach((book, bookIdx) => {
    lines.push('  {')
    BOOK_KEY_ORDER.forEach((key, keyIdx) => {
      if (!(key in book)) return
      const isLast = keyIdx === BOOK_KEY_ORDER.length - 1 || !BOOK_KEY_ORDER.slice(keyIdx + 1).some((k) => k in book)
      const comma = isLast ? '' : ','
      if (key === 'sections') {
        lines.push(`    "sections": [`)
        book.sections.forEach((section, secIdx) => {
          const secComma = secIdx === book.sections.length - 1 ? '' : ','
          lines.push(`      ${serializeSection(section)}${secComma}`)
        })
        lines.push(`    ]${comma}`)
      } else {
        lines.push(`    ${serializeScalar(key, book[key])}${comma}`)
      }
    })
    const bookComma = bookIdx === books.length - 1 ? '' : ','
    lines.push(`  }${bookComma}`)
  })
  lines.push(']')
  return lines.join('\n')
}

function serializeSection(section) {
  const parts = SECTION_KEY_ORDER.filter((k) => k in section).map((k) => serializeScalar(k, section[k]))
  const extras = Object.keys(section)
    .filter((k) => !SECTION_KEY_ORDER.includes(k))
    .map((k) => serializeScalar(k, section[k]))
  return `{ ${[...parts, ...extras].join(', ')} }`
}

function serializeScalar(key, value) {
  return `${JSON.stringify(key)}: ${JSON.stringify(value)}`
}

export async function runMerge({ inputPath, currentPath, outputPath, maxSections }) {
  const [current, fetched] = await Promise.all([readJson(currentPath), readJson(inputPath)])
  const merged = mergeBooks(current, fetched, maxSections)
  await writeFile(outputPath, serializeBooks(merged), 'utf8')
  return { bookCount: merged.length, sectionCounts: merged.map((b) => b.sections.length) }
}

async function main() {
  try {
    const opts = parseCli(process.argv.slice(2))
    const summary = await runMerge(opts)
    console.log(
      `merge-books: wrote ${opts.outputPath} (${summary.bookCount} books, sections=${
        summary.sectionCounts.join(',')
      })`,
    )
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}