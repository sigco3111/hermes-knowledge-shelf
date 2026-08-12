// Fetch raw signals for the 6-book catalog from GitHub REST API and persist
// each book as `<id>.json` under the output directory. Real network calls run
// only in the workflow; locally use `--mock fixtures/` to replay canned
// responses without touching the network.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const GITHUB_API_BASE = 'https://api.github.com'
const USER_AGENT = 'hermes-knowledge-shelf-refresh'
// Books in pipeline order; each defines which GitHub endpoints to query and how
// the responses collapse into the public book schema (id + sections).
export const BOOK_SOURCES = [
  {
    id: 'activity',
    needsPat: false,
    fetch: fetchActivity,
  },
  {
    id: 'automation',
    needsPat: false,
    fetch: fetchAutomation,
  },
  {
    id: 'public-projects',
    needsPat: false,
    fetch: fetchPublicProjects,
  },
  {
    id: 'knowledge-wiki',
    needsPat: false,
    fetch: fetchKnowledgeWiki,
  },
  {
    id: 'recovery',
    needsPat: true,
    fetch: fetchRecovery,
  },
  {
    id: 'learning',
    needsPat: false,
    fetch: fetchLearning,
  },
]

function parseCli(argv) {
  const { values } = parseArgs({
    argv,
    options: {
      out: { type: 'string' },
      mock: { type: 'string' },
    },
  })
  if (!values.out) {
    throw new Error('fetch-books: --out <directory> is required')
  }
  return { outDir: values.out, mockDir: values.mock }
}

function buildHeaders(token) {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export function pickToken(env, sigcoPat) {
  // SIGCO_GITHUB_PAT raises us to 5000 req/h; otherwise we fall back to the
  // workflow's auto-provided GITHUB_TOKEN (60 req/h, fine for a single pass).
  // GitHub Actions injects unset secrets as the empty string, so we must
  // treat '' (and any falsy value) the same as "not configured" and fall
  // through to GITHUB_TOKEN instead of sending an empty Bearer header.
  if (sigcoPat && sigcoPat.length > 0) return { token: sigcoPat, label: 'SIGCO_GITHUB_PAT' }
  if (env.GITHUB_TOKEN && env.GITHUB_TOKEN.length > 0) return { token: env.GITHUB_TOKEN, label: 'GITHUB_TOKEN' }
  return { token: null, label: 'anonymous' }
}

async function githubFetch(url, headers, { remaining = Infinity } = {}) {
  if (remaining !== undefined && remaining <= 0) {
    throw new Error(`fetch-books: rate limit exhausted before ${url}`)
  }
  const res = await fetch(url, { headers })
  const remainingHeader = Number.parseInt(res.headers.get('x-ratelimit-remaining') ?? '', 10)
  const newRemaining = Number.isFinite(remainingHeader) ? remainingHeader : remaining - 1
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`fetch-books: ${url} -> HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const body = await res.json()
  return { body, remaining: newRemaining }
}

async function fetchActivity({ owner, headers, remaining }) {
  const profile = await githubFetch(
    `${GITHUB_API_BASE}/users/${owner}`,
    headers,
    { remaining },
  )
  const repos = await githubFetch(
    `${GITHUB_API_BASE}/users/${owner}/repos?per_page=100&type=owner`,
    headers,
    { remaining: profile.remaining },
  )
  const publicRepos = repos.body.filter((repo) => !repo.private)
  const recent = publicRepos
    .slice()
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, 5)
  const flowSummary = `최근 ${recent.length}개 공개 저장소 push · 팔로워 ${profile.body.followers ?? 0} · 공개 저장소 ${profile.body.public_repos ?? 0}.`
  return {
    id: 'activity',
    sections: [
      { heading: '흐름', body: flowSummary },
      {
        heading: '공개 지표',
        body: `pinned ${publicRepos.length} · 최근 push ${recent.length} · 팔로워 ${profile.body.followers ?? 0}.`,
      },
    ],
  }
}

async function fetchAutomation({ owner, headers, remaining }) {
  const graph = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/icbm2-knowledge-graph`,
    headers,
    { remaining },
  )
  const body = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/icbm2-knowledge-graph/contents/graph.json`,
    headers,
    { remaining: graph.remaining },
  ).catch(() => ({ body: null, remaining: graph.remaining }))
  const nodes = body?.body?.nodes ? Object.keys(body.body.nodes).length : 0
  return {
    id: 'automation',
    sections: [
      { heading: '원칙', body: '수집, 변환, 검증, 알림을 분리해 실패 지점을 명확하게 만듭니다.' },
      {
        heading: '샘플 상태',
        body: `그래프 노드 ${nodes} · auto-updated 뱃지 활성 (${graph.body.open_issues_count} 이슈).`,
      },
    ],
  }
}

async function fetchPublicProjects({ owner, headers, remaining }) {
  const repos = await githubFetch(
    `${GITHUB_API_BASE}/users/${owner}/repos?per_page=100&type=owner`,
    headers,
    { remaining },
  )
  const publicRepos = repos.body.filter((repo) => !repo.private)
  const languages = new Map()
  for (const repo of publicRepos) {
    if (repo.language) languages.set(repo.language, (languages.get(repo.language) ?? 0) + 1)
  }
  const recent = publicRepos
    .slice()
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, 5)
  const recentLine = recent.map((repo, idx) => `${idx + 1}. ${repo.name}`).join(' · ')
  return {
    id: 'public-projects',
    sections: [
      {
        heading: '컬렉션',
        body: `공개 repo ${publicRepos.length}개 · 언어 다양성 ${languages.size}종.`,
      },
      { heading: '최근 추가', body: recentLine || '최근 push 없음.' },
    ],
  }
}

async function fetchKnowledgeWiki({ owner, headers, remaining }) {
  const skills = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/icbm2-skills-marketplace`,
    headers,
    { remaining },
  )
  const graph = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/icbm2-knowledge-graph`,
    headers,
    { remaining: skills.remaining },
  )
  return {
    id: 'knowledge-wiki',
    sections: [
      {
        heading: '구조',
        body: '개념, 도구, 사례를 짧은 노드로 만들고 관련 항목 사이에 맥락을 연결합니다.',
      },
      {
        heading: '샘플 토픽',
        body: `스킬 ${skills.body.stargazers_count}★ · 지식 노드 ${graph.body.stargazers_count}★.`,
      },
    ],
  }
}

async function fetchRecovery({ owner, headers, remaining }) {
  // ai-agent-setup is private; without a PAT we get a 404 here and the caller
  // (with-pat-fallback) replaces this record with a public-only stub.
  const repo = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/ai-agent-setup`,
    headers,
    { remaining },
  ).catch((err) => {
    if (err instanceof Error && err.message.includes('404')) return { body: null, remaining }
    throw err
  })
  if (!repo?.body) {
    return {
      id: 'recovery',
      sections: [],
      _needsFallback: true,
    }
  }
  const tokscale = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/tokscale`,
    headers,
    { remaining: repo.remaining },
  )
  return {
    id: 'recovery',
    sections: [
      {
        heading: '복구 루프',
        body: '증상을 기록하고 원인을 좁힌 뒤 가장 작은 수정과 회귀 검증을 수행합니다.',
      },
      {
        heading: '공개 원칙',
        body: `사례는 구조만 공유하며 식별자, 원문, 내부 주소는 포함하지 않습니다. 공개 사례 N건 · tokscale ${tokscale.body.stargazers_count}★.`,
      },
    ],
  }
}

async function fetchLearning({ owner, headers, remaining }) {
  const skills = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/icbm2-skills-marketplace`,
    headers,
    { remaining },
  )
  const graph = await githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/icbm2-knowledge-graph`,
    headers,
    { remaining: skills.remaining },
  )
  return {
    id: 'learning',
    sections: [
      {
        heading: '학습 방식',
        body: '결과보다 과정의 선택과 실패 신호를 기록해 다음 작업의 출발 비용을 낮춥니다.',
      },
      {
        heading: '다음 질문',
        body: `무엇을 더 단순하게 만들 수 있는가? 무엇을 자동 검증할 수 있는가? 누적 스킬 ${skills.body.stargazers_count}★ · 카테고리 ${graph.body.topics?.length ?? 0}.`,
      },
    ],
  }
}

// Apply with-pat-fallback: when a record carries `_needsFallback: true` and no
// PAT was provided, replace it with a public-only stub so the recovery book
// still renders something instead of erroring out.
export function applyPatFallback(books, hasPat) {
  if (hasPat) return books
  return books.map((book) => {
    if (book.id !== 'recovery' || !book._needsFallback) {
      const { _needsFallback, ...rest } = book
      return rest
    }
    return {
      id: 'recovery',
      sections: [
        {
          heading: '복구 루프',
          body: '증상을 기록하고 원인을 좁힌 뒤 가장 작은 수정과 회귀 검증을 수행합니다.',
        },
        {
          heading: '공개 원칙',
          body: '사례는 구조만 공유하며 식별자, 원문, 내부 주소는 포함하지 않습니다. (PAT 부재로 공개 데이터만 사용.)',
        },
      ],
    }
  })
}

async function fetchLiveBooks(owner, env) {
  const sigcoPat = env.SIGCO_GITHUB_PAT
  // Normalize the unset-secret empty string to null so downstream checks
  // (`source.needsPat`, `hasPat`, and the pickToken selection) all agree.
  const hasPat = Boolean(sigcoPat && sigcoPat.length > 0)
  const { token, label } = pickToken(env, hasPat ? sigcoPat : null)
  console.log(`fetch-books: using ${label}`)
  const headers = buildHeaders(token)
  let remaining = Number.POSITIVE_INFINITY
  const results = []
  for (const source of BOOK_SOURCES) {
    if (source.needsPat && !hasPat) {
      console.warn(
        `fetch-books: ${source.id} requires SIGCO_GITHUB_PAT (private repo) — collecting a fallback request`,
      )
    }
    const result = await source.fetch({ owner, headers, remaining })
    remaining = result.remaining ?? remaining
    results.push(result)
  }
  return { books: results, hasPat }
}

async function fetchMockBooks(mockDir) {
  const entries = await readdir(mockDir)
  const files = entries.filter((name) => name.endsWith('.json'))
  const books = []
  for (const file of files) {
    const raw = await readFile(join(mockDir, file), 'utf8')
    books.push(JSON.parse(raw))
  }
  return { books, hasPat: Boolean(process.env.SIGCO_GITHUB_PAT) }
}

export async function fetchBooks({ owner = 'sigco3111', env = process.env, mockDir = null } = {}) {
  const { books, hasPat } = mockDir ? await fetchMockBooks(mockDir) : await fetchLiveBooks(owner, env)
  return { books: applyPatFallback(books, hasPat), hasPat }
}

async function main() {
  try {
    const opts = parseCli(process.argv.slice(2))
    await mkdir(resolve(opts.outDir), { recursive: true })
    const { books } = await fetchBooks({ mockDir: opts.mockDir })
    for (const book of books) {
      if (!book.id) continue
      const file = join(resolve(opts.outDir), `${book.id}.json`)
      await writeFile(file, JSON.stringify(book, null, 2) + '\n', 'utf8')
    }
    console.log(`fetch-books: wrote ${books.length} book files into ${opts.outDir}`)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}