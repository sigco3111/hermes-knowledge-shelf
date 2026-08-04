# Hermes Knowledge Shelf

**에르메스 지식 서재**는 공개 가능한 익명 샘플 데이터 7권을 3D 책장과 HTML 리더로 탐색하는 클린룸 MVP입니다.

- Live: https://hermes-knowledge-shelf.vercel.app
- Source: https://github.com/sigco3111/hermes-knowledge-shelf

## 기능

- 7권 3D 책장과 선택 책 중앙 포커스 애니메이션
- 상세 HTML 리더, 닫기, 이전/다음 탐색
- 키보드 `←`, `→`, `Escape` 지원
- 390px 모바일부터 데스크톱까지 반응형 레이아웃
- allowlist 기반 공개 스키마 변환
- 빌드 선행 개인정보 스캐너

## 공개 데이터 정책

배포 번들에는 익명 통계와 명시적으로 공개 가능한 샘플 문장만 포함합니다. `npm run privacy-check`는 `src/`, `public/`, `sample-data/`의 번들 입력을 재귀 검사하며 이메일, 전화번호, 사용자 홈 경로, Hermes 비공개 경로, 자격증명 키워드, Telegram/Discord 식별자, 비공개 URL 패턴을 발견하면 종료 코드 1로 빌드를 차단합니다. 입력 데이터는 Zod allowlist 스키마를 통과한 필드만 앱에서 사용합니다.

## 개발

```bash
npm ci
npm test
npm run privacy-check
npm run typecheck
npm run build
npm run dev
```

Node.js 22.x를 사용합니다.

## 검증

Vitest 단위 테스트와 Playwright 실브라우저 검증을 수행합니다. Playwright 검증은 1440×900 및 390×844에서 7권 노출, 리더 열기, 이전/다음 키보드 탐색, 닫기, 브라우저 콘솔 및 페이지 오류 0건을 확인합니다.

## 독립 구현 및 영감

이 프로젝트는 자체 설계한 신규 코드와 자산만으로 독립 구현했습니다. `MengTo/complete-shelf`에서 “책장을 탐색하고 책을 열어 읽는다”는 시각적 아이디어만 참고했으며, 해당 저장소의 코드, 자산, 셰이더는 열람하거나 복사하지 않았습니다.

## 라이선스

이 저장소에서 새로 작성한 코드는 [MIT License](./LICENSE)로 배포합니다.
