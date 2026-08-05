# Hermes Knowledge Shelf

**에르메스 지식 서재** — 공개 가능한 익명 샘플 데이터 7권을 3D 책장과 HTML 리더로 탐색하는 클린룸 MVP. [MengTo/complete-shelf](https://github.com/MengTo/complete-shelf)의 단일-파일 experience를 한국어 7권 카탈로그로 clone·수정한 결과물입니다.

- Live: https://hermes-knowledge-shelf.vercel.app
- Source: https://github.com/sigco3111/hermes-knowledge-shelf

## 개요

이 저장소는 MengTo/complete-shelf 저장소를 그대로 clone하여 우리 7권의 한국어 책 데이터(`BOOKS` 배열)만 교체한 결과물입니다. 진입점은 `index.html` 단일 파일이며, 이 안에 MengTo의 inline CSS, inline JS module(4,000+ 줄, 97개 함수), 그리고 우리 한국어 `BOOKS` 데이터가 들어 있습니다.

- 7권 3D 책장과 선택 책 중앙 포커스 애니메이션
- 상세 HTML 리더, 닫기, 이전/다음 탐색
- 키보드 `←`, `→`, `Escape` 지원
- 390px 모바일부터 데스크톱까지 반응형 레이아웃
- Three.js + RoundedBoxGeometry + RectAreaLightUniformsLib (jsdelivr CDN)
- 빌드 선행 개인정보 스캐너

## MengTo 원본과의 차이

`index.html` 안에서 MengTo가 직접 변수를 정의하는 두 가지만 우리 카피로 교체했습니다.

### 1. `BOOKS` 배열 (7권 한국어 데이터)

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
//      발행 기록 (V) · 에러와 복구 (VI) · 에르메스의 학습 (VII)
```

모든 한국어 텍스트는 공개 시연용 익명 샘플이며 실제 운영 정보가 아닙니다.

### 2. 정적 문자열

| 위치 | MengTo 원본 | 우리 카피 |
|---|---|---|
| `<title>` | Working Volumes — Seven Tools for Making | Hermes Knowledge Shelf · 에르메스 지식 서재 |
| `<meta name="description">` | (영문 설명) | (한국어 설명) |
| `<header class="editorial-identity">` | Working Volumes | Hermes Volumes |
| 헤더 부제목 | Seven field guides for making | Seven public fields of knowledge |
| `<span id="palette-label">` | Ultramarine · bone · copper | Charcoal · walnut · copper |
| 폰트 import | Inter | Inter + Noto Sans KR + Noto Serif KR |
| `--serif` | Iowan Old Style | Noto Serif KR (한글 타이틀용) |

그 외의 모든 코드(MengTo의 scene/lighting/material/animation/state-machine)는 원본 그대로 유지됩니다. 7권의 한국어 책이 그대로 MengTo의 3D 책장, 카메라, 라이트, 책 리그(클로스 보드 + 스파인 + 페이지 + 헤드밴드 + 리본 + 컨택트 섀도우) 안에서 렌더됩니다.

## 동작 방식

`npm run dev`는 Vite 개발 서버를 띄우고 `index.html`을 그대로 서빙합니다. 이 파일은:

1. `<script type="importmap">`으로 Three.js + addons를 jsdelivr CDN에서 로드
2. Google Fonts(Inter + Noto Sans KR + Noto Serif KR) 로드
3. 인라인 `<script type="module">` 안에서 MengTo의 전체 JS 실행:
   - `BOOKS` 배열 → `createBookRig` × 7로 멀티-파트 3D 책 생성
   - `initRenderer` + `addRoom` + `addLights` + `addDust`로 scene 구축
   - `updateShelfLayout`로 캐러셀 위치 / 회전 / 페이드 인터폴레이션
   - `updateTransition`로 hero ↔ opening ↔ detail ↔ closing 모션
   - `updateFlexiblePage`로 펼친 책의 페이지 컬/트위스트 변형
   - `applyBookTheme`로 책 선택 시 13채널 컬러 lerp
   - 휠 / 클릭 / 키보드 / 마커 입력으로 책 선택 + OPEN으로 인스펙션 진입

## 디렉토리 구조

```text
hermes-knowledge-shelf/
├── index.html               MengTo 원본 clone + 우리 BOOKS/문자열 (5,931 줄, 880K)
├── scripts/                 verify-ui.mjs, capture-screens.mjs 등
├── src/                      이전 React+Vite 구현 잔재 (현재는 진입점에 사용 안 함)
│   ├── App.tsx              (구) React shell — 더 이상 마운트되지 않음
│   ├── App.css              (구) 스타일
│   ├── components/          (구) ShelfScene.tsx, ReaderPanel.tsx, ...
│   ├── data/books.ts        (구) 한국어 BOOKS 데이터 (TypeScript) — 인덱스에는 미사용
│   ├── three/               (구) Three.js 헬퍼들 (procedural textures, placement)
│   └── ...                  (구) zustand store, privacy scanner, ...
├── tests/                   Vitest + Playwright (구) React-기반 검증
├── package.json             Vite dev/build/test 명령
├── tsconfig.json            TypeScript 설정
├── vite.config.ts           Vite 설정
└── README.md                본 문서
```

`src/`, `tests/`는 이전 React 구현의 잔재로 보존되어 있습니다. 빌드 산출물(`dist/`)도 함께 유지됩니다. `npm run dev`의 진입점은 오직 `index.html` 한 파일입니다.

## 공개 데이터 정책

배포 번들에는 익명 통계와 명시적으로 공개 가능한 샘플 문장만 포함합니다. `npm run privacy-check`는 `src/`, `public/`, `sample-data/`의 번들 입력을 재귀 검사하며 이메일, 전화번호, 사용자 홈 경로, Hermes 비공개 경로, 자격증명 키워드, Telegram/Discord 식별자, 비공개 URL 패턴을 발견하면 종료 코드 1로 빌드를 차단합니다. `index.html`의 한국어 BOOK 카피는 모두 시연용이며 식별자/연락처를 포함하지 않습니다.

## 개발

```bash
npm ci
npm test            # Vitest 단위 테스트 (구 React 구현 검증)
npm run privacy-check
npm run typecheck
npm run build
npm run dev         # http://127.0.0.1:4173/ 에서 MengTo 클론 실행
```

Node.js 22.x를 사용합니다.

## 검증

`npm run dev`가 띄운 Vite 서버에서:

- `/` → HTTP 200, `#scene` 캔버스 1개, `#editorial-identity strong` = `Hermes Volumes`, `#counter` = `01 / 07`, `#palette-label` = `코랄 · 본 · 골드`
- 콘솔 에러 0건

`scripts/verify-ui.mjs` + `npm run test:e2e`는 (구) React 셀렉터를 통해 검증하며, 현재는 React 셀렉터가 `index.html`에 마운트되지 않으므로 실패할 수 있습니다. 실제 3D 검증은 `scripts/capture-mengto.mjs`로 수행합니다:

```bash
node scripts/capture-mengto.mjs  # /tmp/mengto-clone-{desktop,detail,mobile}.png 캡처
```

## 라이선스 & 원본 인정

이 저장소의 `index.html`은 MengTo/complete-shelf의 단일-파일 experience를 한국어 7권 카탈로그로 clone·수정한 결과물입니다. Three.js scene, lighting, material, animation, state-machine 코드는 원본 그대로 유지되며, `BOOKS` 배열과 한국어 정적 문자열만 우리 카피로 교체되었습니다.

원본 MengTo/complete-shelf는 MIT License로 배포되며, 이 클론도 동일한 라이선스 조건을 따릅니다.

## 영감 및 기록

- 2026-08-05: MengTo 원본 clone·수정. `BOOKS` 배열에 7권 한국어 데이터 주입. 메타데이터(타이틀/설명/매스헤드/팔레트 노트/서체) 한국어화.
- 이전 단계에서는 동일한 7권을 clean-room으로 재구현하려 했으나 사용자가 원본 clone을 명시적으로 요청해 본 단계에서 원본 코드를 그대로 채택.