// Fire the Vercel deploy hook so a successful merge triggers a live rebuild.
// The hook URL is project-scoped; it lives in the GitHub repo's secrets
// (`VERCEL_DEPLOY_HOOK`) so it isn't committed with the workflow.

const HOOK_TIMEOUT_MS = 10_000

function readHook(env) {
  const hook = env.VERCEL_DEPLOY_HOOK
  if (!hook) return null
  try {
    const parsed = new URL(hook)
    if (parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export async function postToVercel({ env = process.env, fetchImpl = fetch, timeoutMs = HOOK_TIMEOUT_MS } = {}) {
  const hook = readHook(env)
  if (!hook) {
    return { skipped: true, reason: 'VERCEL_DEPLOY_HOOK is empty or not a valid https URL' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(hook, { method: 'POST', signal: controller.signal })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Vercel deploy hook returned HTTP ${res.status}: ${body.slice(0, 200)}`)
    }
    return { skipped: false, status: res.status }
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  try {
    const result = await postToVercel()
    if (result.skipped) {
      console.warn(`post-to-vercel: skipped (${result.reason})`)
      process.exit(0)
    }
    console.log(`post-to-vercel: hook fired (HTTP ${result.status})`)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
