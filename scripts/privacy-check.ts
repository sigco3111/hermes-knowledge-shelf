import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { scanText } from '../src/privacy/scanner'

const root = process.cwd()
const targets = ['src', 'public', 'sample-data']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.svg', '.txt', '.md'])
const excluded = new Set(['scanner.ts'])

async function filesUnder(path: string): Promise<string[]> {
  try {
    const info = await stat(path)
    if (info.isFile()) return [path]
    const names = await readdir(path)
    return (await Promise.all(names.map((name) => filesUnder(join(path, name))))).flat()
  } catch {
    return []
  }
}

const files = (await Promise.all(targets.map((target) => filesUnder(join(root, target)))))
  .flat()
  .filter((file) => extensions.has(extname(file)) && !excluded.has(file.split('/').at(-1) ?? ''))

const findings = []
for (const file of files) {
  findings.push(...scanText(await readFile(file, 'utf8'), relative(root, file)))
}

if (findings.length) {
  console.error(`Privacy check failed: ${findings.length} finding(s)`)
  for (const finding of findings) console.error(`- ${finding.file}: ${finding.kind}: ${finding.match}`)
  process.exit(1)
}
console.log(`Privacy check passed: ${files.length} bundle input files scanned, 0 findings`)
