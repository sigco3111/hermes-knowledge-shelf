# Hermes Knowledge Shelf

**에르메스 지식 서재** — 공개 가능한 익명 샘플 데이터 6권을 3D 책장과 HTML 리더로 탐색하는 클린룸 MVP. [MengTo/complete-shelf](https://github.com/MengTo/complete-shelf)의 단일-파일 experience를 한국어 6권 카탈로그로 clone·수정한 결과물입니다.

- Live: https://hermes-knowledge-shelf.vercel.app
- Source: https://github.com/sigco3111/hermes-knowledge-shelf

## 개요

이 저장소는 MengTo/complete-shelf 저장소를 그대로 clone하여 우리 6권의 한국어 책 데이터(`BOOKS` 배열)만 교체한 결과물입니다. 진입점은 `index.html` 단일 파일이며, 이 안에 MengTo의 inline CSS, inline JS module(4,000+ 줄, 97개 함수), 그리고 우리 한국어 `BOOKS` 데이터가 들어 있습니다. 책 메타데이터는 `src/data/books.public.json`에 분리되어 있으며 GitHub Actions가 매일 자동 갱신합니다.

- 6권 3D 책장과 선택 책 중앙 포커스 애니메이션
- 상세 HTML 리더, 닫기, 이전/다음 탐색
- 키보드 `←`, `→`, `Escape` 지원
- 390px 모바일부터 데스크톱까지 반응형 레이아웃
- Three.js + RoundedBoxGeometry + RectAreaLightUniformsLib (jsdelivr CDN)
- 빌드 선행 개인정보 스캐너
- **GitHub Actions로 매일 KST 09:00에 books.public.json 자동 갱신** (`publishing` 책은 비공개 통계로 제외)

## MengTo 원본과의 차이

`index.html` 안에서 MengTo가 직접 변수를 정의하는 두 가지만 우리 카피로 교체했습니다.

### 1. `BOOKS` 배열 (6권 한국어 데이터)

```js
{
  id: "activity",
  title: "에르메스 활동",
  roman: "I",
  discipline: "ACTIVITY PULSE",
  note: "익명화된 흐름으로 보는 공개 활동의 박동.",
  deck: "한 권의 필드 매뉴얼: ...",
  binding: "코랄 클로스 · 앤티크 골드 포일",
  format: "148 × 216 mm · 공개 데모 에디션",
  theme: "에르메스 활동 · 흐름을 검증 가능한 산출물로",
  motif: "동심 펄스 링",
  motifKey: "brackets",
  paletteLabel: "코랄 · 본 · 골드",
  color: "#D86552",
  foil: "#efc16d",
  palette: { paper, paperDeep, paperPale, ink, inkSoft, wall, shelf, shelfDark, light, fill },
  width: 1.02, height: 1.58, depth: 0.26,
  chapters: ["흐름", "공개 지표", "검증 가능한 산출물"],
  seed: 11
},
// ... 자동화 (II) · 공개 프로젝트 (III) · 지식 위키 (IV)
//      에러와 복구 (V) · 에르메스의 학습 (VI)
```

발행 기록은 Tistory 쿠키 48시간 만료 패턴과 비공개 발행 통계로 인해 자동 갱신 대상에서 제외했습니다. 6권만 빌드합니다.

모든 한국어 텍스트는 공개 시연용 익명 샘플이며 실제 운영 정보가 아닙니다.

### 2. 정적 문자열

| 위치 | MengTo 원본 | 우리 카피 |
|---|---|---|
| `<title>` | Working Volumes — Seven Tools for Making | Hermes Knowledge Shelf · 에르메스 지식 서재 |
| `<meta name="description">` | (영문 설명) | (한국어 설명) |
| `<header class="editorial-identity">` | Working Volumes | Hermes Volumes |
| 헤더 부제목 | Seven field guides for making | Six public fields of knowledge |
| `<span id="palette-label">` | Ultramarine · bone · copper | Charcoal · walnut · copper |
| 폰트 import | Inter | Inter + Noto Sans KR + Noto Serif KR |
| `--serif` | Iowan Old Style | Noto Serif KR (한글 타이틀용) |

그 외의 모든 코드(MengTo의 scene/lighting/material/animation/state-machine)는 원본 그대로 유지됩니다. 6권의 한국어 책이 그대로 MengTo의 3D 책장, 카메라, 라이트, 책 리그(클로스 보드 + 스파인 + 페이지 + 헤드밴드 + 리본 + 컨택트 섀도우) 안에서 렌더됩니다.

## 동작 방식

`npm run dev`는 Vite 개발 서버를 띄우고 `index.html`을 그대로 서빙합니다. 이 파일은:

1. `<script type="importmap">`으로 Three.js + addons를 jsdelivr CDN에서 로드
2. Google Fonts(Inter + Noto Sans KR + Noto Serif KR) 로드
3. 인라인 `<script type="module">` 안에서 MengTo의 전체 JS 실행:
   - `BOOKS` 배열 → `createBookRig` × 6으로 멀티-파트 3D 책 생성
   - `initRenderer` + `addRoom` + `addLights` + `addDust`로 scene 구축
   - `updateShelfLayout`로 캐러셀 위치 / 회전 / 페이드 인터폴레이션
   - `updateTransition`로 hero ↔ opening ↔ detail ↔ closing 모션
   - `updateFlexiblePage`로 펼친 책의 페이지 컬/트위스트 변형
   - `applyBookTheme`로 책 선택 시 13채널 컬러 lerp
   - 휠 / 클릭 / 키보드 / 마커 입력으로 책 선택 + OPEN으로 인스펙션 진입

## 콘텐츠 자동 갱신 파이프라인

6권의 책 데이터는 GitHub Actions로 매일 KST 09:00에 자동 갱신됩니다. 매핑 문서(이 저장소 외부 운영 문서)가 implementation guide 역할을 합니다.

### 워크플로우
- 파일: `.github/workflows/refresh-books.yml`
- 트리거: cron `0 0 * * *` (UTC = KST 09:00) + `workflow_dispatch` 수동 (input: `dry_run`)
- 권한: `contents: write`
- 단계: fetch → transform → merge → privacy-check → typecheck → diff detect → commit (`[skip ci]`) → push → Vercel deploy hook

### 시크릿 (Settings → Secrets and variables → Actions)
| 이름 | 용도 | 필수? |
|---|---|---|
| `GITHUB_TOKEN` | 자동 제공. 공개 repo 접근 + 커밋 push | ✅ 자동 |
| `SIGCO_GITHUB_PAT` | `ai-agent-setup` (recovery 책, private repo) 접근 | ⚠️ 권장 |
| `VERCEL_DEPLOY_HOOK` | 머지 후 Vercel 자동 재배포 | ✅ 필수 |

`SIGCO_GITHUB_PAT`이 없으면 recovery 책(`ai-agent-setup`)은 공개 데이터로 fallback 처리되며, 다른 5권은 정상 갱신됩니다.

### 로컬 dry-run
```bash
npm run sync:content:dry-run   # mock fetch + transform + merge (commit 안 함)
npm run sync:content           # 실제 GitHub API 호출 (워크플로우 전용, PAT 권장)
npm run sync:content:clean     # .cache 정리
```

테스트 fixture는 `tests/fixtures/fetched/`에 mock으로 저장되어 있어 dry-run 시 네트워크 없이 전체 파이프라인을 검증할 수 있습니다.

### 알려진 함정
1. `GITHUB_TOKEN`은 Actions 실행 repo의 시크릿만 읽습니다. `sigco3111` 계정의 private repo에 접근하려면 별도 PAT(`SIGCO_GITHUB_PAT`)이 필요합니다.
2. 인증 없는 GitHub API 요청은 시간당 60회입니다. PAT 있으면 5000회로 늘어납니다. 6권 수집은 PAT 없이도 한 패스에 충분합니다.
3. `books.public.json`의 키 순서와 들여쓰기(2-space)는 `merge-books.mjs`의 커스텀 serializer가 보존합니다. 일반 `JSON.stringify(obj, null, 2)`로 덮어쓰지 마세요.
4. Vercel deploy hook은 Settings → Git → Deploy Hooks에서 생성한 URL을 시크릿에 저장합니다. URL은 프로젝트별로 다릅니다.
5. 깃액션 self-trigger 방지: 커밋 메시지에 `[skip ci]` 접미사가 포함되어 있습니다 (`refresh-books.yml` `commit` step 참조).
6. `publishing` 책 제외 사유: Tistory 쿠키 48시간 만료 패턴 + 비공개 발행 통계. 대안으로 `sigco3111` README 활동만 부분 반영 가능하나 현재 범위 밖입니다.

### 데이터 출처 매핑
| 책 | 메인 소스 | 보조 소스 | 비공개? |
|---|---|---|---|
| 에르메스 활동 | `sigco3111/sigco3111` 프로필 README | `hermes-control-room` | ❌ |
| 자동화 | `icbm2-knowledge-graph` | `hermes-control-room` state.json | ❌ |
| 공개 프로젝트 | `Repolis` | 프로필 repo 목록 | ❌ |
| 지식 위키 | `icbm2-knowledge-graph` | `icbm2-skills-marketplace` | ❌ |
| 에러와 복구 | `ai-agent-setup` ⚠️ private | `tokscale` | ⚠️ 일부 |
| 에르메스의 학습 | `icbm2-skills-marketplace` | `icbm2-knowledge-graph` | ❌ |

## 디렉토리 구조

```text
hermes-knowledge-shelf/
├── index.html                MengTo 원본 clone + 우리 BOOKS/문자열 (~5,890 줄)
├── .github/
│   ├── workflows/
│   │   └── refresh-books.yml 콘텐츠 자동 갱신 (cron + workflow_dispatch)
│   └── scripts/
│       ├── fetch-books.mjs   GitHub REST API로 6권 데이터 fetch (PAT fallback 내장)
│       ├── transform-books.mjs fetch 결과를 books.public.json 스키마로 변환
│       ├── merge-books.mjs   LIFO rotation + id 기반 dedup, 키 순서/들여쓰기 보존
│       └── post-to-vercel.mjs Vercel deploy hook 호출
├── scripts/                  verify-ui.mjs, capture-screens.mjs, privacy-check.ts 등 (기존)
├── src/
│   ├── data/
│   │   ├── books.public.json 6권 한국어 데이터 — GitHub Actions가 매일 갱신
│   │   ├── books.ts          books.public.json + Zod 검증 wrapper
│   │   └── publicSchema.ts   Zod schema + deriveSectionId (sha256 fallback)
│   ├── three/, components/, store/, privacy/  (구) React+Vite 잔재 (마운트 안 됨, typecheck 격리)
│   ├── App.tsx, main.tsx, App.css, index.css    (구) React 진입점
├── tests/
│   ├── refresh-books.test.ts 단위 테스트 (merge/transform/PAT fallback)
│   ├── fixtures/fetched/     GitHub API mock JSON
│   └── shelf/privacy/material/... Vitest + Playwright (기존/신규 혼재)
├── package.json              dev/build/test + sync:content:* 명령
├── tsconfig.json             TypeScript 설정 (legacy src/ 격리)
├── vite.config.ts            Vite 설정
├── vercel.json               Vercel 빌드 설정
└── README.md                 본 문서
```

`src/three`, `src/components`, `src/store`, `src/privacy`는 이전 React 구현의 잔재로 보존되어 있습니다. `tsconfig.app.json`이 typecheck 대상에서 제외하므로 빌드를 막지 않습니다. `npm run dev`의 진입점은 오직 `index.html` 한 파일입니다.

## 공개 데이터 정책

배포 번들에는 익명 통계와 명시적으로 공개 가능한 샘플 문장만 포함합니다. `npm run privacy-check`는 `src/`, `public/`, `sample-data/`, `tests/fixtures/`의 번들 입력을 재귀 검사하며 이메일, 전화번호, 사용자 홈 경로, Hermes 비공개 경로, 자격증명 키워드, Telegram/Discord 식별자, 비공개 URL 패턴을 발견하면 종료 코드 1로 빌드를 차단합니다. `index.html`의 한국어 BOOK 카피와 fixture 데이터는 모두 시연용이며 식별자/연락처를 포함하지 않습니다.

## 개발

```bash
npm ci
npm test            # Vitest 단위 테스트
npm run privacy-check
npm run typecheck
npm run build
npm run dev         # http://127.0.0.1:4173/ 에서 MengTo 클론 실행
npm run sync:content:dry-run   # 로컬에서 갱신 파이프라인 dry-run (mock 데이터)
```

Node.js 22.x를 사용합니다.

## 검증

`npm run dev`가 띄운 Vite 서버에서:

- `/` → HTTP 200, `#scene` 캔버스 1개, `#editorial-identity strong` = `Hermes Volumes`, `#counter` = `01 / 06`, `#palette-label` = `코랄 · 본 · 골드`
- 콘솔 에러 0건

`scripts/verify-ui.mjs` + `npm run test:e2e`는 (구) React 셀렉터를 통해 검증하며, 현재는 React 셀렉터가 `index.html`에 마운트되지 않으므로 실패할 수 있습니다. 실제 3D 검증은 `scripts/capture-mengto.mjs`로 수행합니다:

```bash
node scripts/capture-mengto.mjs  # /tmp/mengto-clone-{desktop,detail,mobile}.png 캡처
```

콘텐츠 자동 갱신은 `.github/workflows/refresh-books.yml`이 매일 자동 실행합니다. Actions 탭에서 실행 로그·산출 커밋을 확인할 수 있습니다.

## 라이선스 & 원본 인정

이 저장소의 `index.html`은 MengTo/complete-shelf의 단일-파일 experience를 한국어 6권 카탈로그로 clone·수정한 결과물입니다. Three.js scene, lighting, material, animation, state-machine 코드는 원본 그대로 유지되며, `BOOKS` 배열과 한국어 정적 문자열만 우리 카피로 교체되었습니다.

원본 MengTo/complete-shelf는 MIT License로 배포되며, 이 클론도 동일한 라이선스 조건을 따릅니다.

## 영감 및 기록

- 2026-08-05: 콘텐츠 자동 갱신 파이프라인 추가. GitHub Actions(`refresh-books.yml`) + 4개 스크립트(fetch/transform/merge/post-vercel) + 단위 테스트. `publishing` 책 제외 (Tistory 비공개 통계로 자동 갱신 부적합). 7권 → 6권. 매핑 문서가 implementation guide.
- 2026-08-05: MengTo 원본 clone·수정. `BOOKS` 배열에 7권 한국어 데이터 주입. 메타데이터(타이틀/설명/매스헤드/팔레트 노트/서체) 한국어화.
- 이전 단계에서는 동일한 7권을 clean-room으로 재구현하려 했으나 사용자가 원본 clone을 명시적으로 요청해 본 단계에서 원본 코드를 그대로 채택.
