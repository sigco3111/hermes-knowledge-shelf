export type PrivacyFinding = {
  file: string
  kind: string
  match: string
}

const rules: Array<[string, RegExp]> = [
  ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['phone', /(?<!\d)(?:\+?82[- .]?)?0(?:10|2|[3-6][1-5])[- .]?\d{3,4}[- .]?\d{4}(?!\d)/g],
  ['mac-user-path', /\/Users\/[^\s"'<>]+/g],
  ['linux-home-path', /\/home\/[^\s"'<>]+/g],
  ['hermes-private-path', /(?:~\/|\/)\.hermes(?:\/|\b)/gi],
  ['credential-keyword', /\b(?:token|secret|password|api[_-]?key)\b\s*(?:[:=]|is\b)/gi],
  ['telegram-id', /\btelegram(?:[_ -]?(?:user|chat))?[_ -]?id\b\s*[:=]?\s*\d{5,}/gi],
  ['discord-id', /\bdiscord(?:[_ -]?(?:user|guild|channel))?[_ -]?(?:id)?\b\s*[:=]?\s*\d{15,20}/gi],
  ['private-url', /https?:\/\/(?:www\.)?(?:notion\.so|notion\.site|localhost|127\.0\.0\.1|[^\s/]*internal[^\s/]*)\/[^\s"'<>]+/gi],
]

export function scanText(text: string, file: string): PrivacyFinding[] {
  const findings: PrivacyFinding[] = []
  for (const [kind, pattern] of rules) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      findings.push({ file, kind, match: match[0] })
    }
  }
  return findings
}
