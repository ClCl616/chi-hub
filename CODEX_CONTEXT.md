# Project Context

> 마지막 정리: 2026-09-15 (Asia/Seoul)
>
> 이 문서는 대화 로그의 사본이 아니라, 새 PC의 새 Codex 세션이 실제 코드와 함께 읽고 개발을 이어가기 위한 인수인계 문서다. 항상 실제 코드와 Git 상태를 먼저 확인하고, 불일치하면 코드를 기준으로 이 문서를 갱신한다.

## 프로젝트 개요

CHI.HUB는 한 사용자의 일상 기록과 생산성 도구를 한곳에 모은 모바일 우선 개인용 라이프 허브다. 집중 타이머, 반복 루틴, 데일리 할 일, 수면, 캘린더, 운동, 메모, 비공개 드라이브, 대학교 학식 정보를 제공한다.

- 기본 UI 언어: 한국어
- 운영 형태: 로그인 후 사용하는 개인용 PWA
- 운영 사이트: `https://chi-hub-personal.nolsup0305.chatgpt.site`
- Sites project id: `appgprj_6a96dbc41abc819195b2b881775473ee`
- 운영 데이터: 외부 Supabase 프로젝트의 Auth, PostgreSQL, Storage 사용
- 로컬 기본 주소: `http://127.0.0.1:3000`

## 개발 환경

### 새 채팅에서 먼저 확인할 인수인계 요약

- 대상 저장소는 **chi-hub**다. 현재 PC 경로는 `C:\Users\AIDIS3\Archive\Projects\chi-hub`이며 인접한 다른 프로젝트의 문서를 사용하지 않는다.
- 이번 UI 구현의 마지막 커밋은 `ee8c3e3`이다. 이 문서 정리 시작 시 작업 트리는 깨끗했고, `main`은 로컬 추적 참조 `origin/main`(`bcd9aed`)보다 4개 커밋 앞섰다. 이후 사용자 요청으로 2026-09-15에 UI 및 문서 커밋 `c2d5dfe`까지 GitHub `origin/main`에 push했다. 이 동기화 상태를 기록한 후속 문서 커밋도 같은 원격에 반영한다. 현재 차이는 `git log`와 `git status -sb`로 확인한다.
- **이번 UI와 인수인계 문서는 GitHub main에 동기화됐다.** 새 PC에서 clone/pull 후 `ee8c3e3`, `c2d5dfe` 및 후속 동기화 문서 커밋이 포함됐는지 확인한다.
- 사용자의 최종 방향: 기존 밝은 배경·검정·라임 색감 유지, 참고 이미지의 그룹 사이드바·상단 상태 행·정돈된 카드 배치만 적용. 탭은 기능 화면을 구분하며 선택한 기능 하나만 표시한다. 전체 기능 나열이나 별도 대시보드 요약 탭으로 되돌리지 않는다.
- UI 구현과 로컬 검증은 완료했다. 추가 제품 작업은 새 사용자 요청을 따른다. 운영 게시는 Sites `project_not_found`로 미완료이며 기존 프로젝트 연결 복구가 필요하다.
- 현재 PC에는 `.env.local`이 없다. 서버가 떠 있어도 실제 로그인·데이터 연결 성공을 의미하지 않는다. 새 PC에서는 Node/npm 설치와 환경 변수 준비 후 실행한다.

### 핵심 스택

- TypeScript, React 19
- Vinext `1.0.0-beta.5` 기반 App Router 구조
- Vite 8, Cloudflare Workers 호환 빌드
- OpenAI Sites Vite plugin 및 `.openai/hosting.json`
- Tailwind CSS 4와 전역 CSS(`app/globals.css`)
- shadcn/Base UI 컴포넌트, Lucide React 아이콘
- Supabase JS 및 `@supabase/ssr`
- date-fns, Recharts 등은 의존성에 포함됨
- Oxlint/Oxfmt
- Node.js `>=22.13.0`, npm 및 `package-lock.json`

### 환경 변수

실제 값은 Git에 넣지 않는다. `.env.example`에 다음 키만 문서화되어 있다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

로컬에서는 프로젝트 루트의 `.env.local`을 생성해 운영 Supabase URL과 공개 anon key를 설정한다. `.env.local`은 `.gitignore`에 의해 제외되며 PC마다 따로 준비해야 한다. 서비스 역할 키, 비밀번호, OAuth secret, 토큰은 클라이언트 코드나 이 문서에 기록하지 않는다.

### Supabase Auth 리다이렉트

Google OAuth와 이메일 인증 콜백이 동작하려면 Supabase Redirect URLs에 최소 다음 주소가 등록되어 있어야 한다.

- `http://127.0.0.1:3000/auth/callback`
- `http://localhost:3000/auth/callback`
- `https://chi-hub-personal.nolsup0305.chatgpt.site/auth/callback`

## 프로젝트 구조

```text
.
├─ .openai/hosting.json          # 기존 Sites 프로젝트 연결 정보
├─ app/
│  ├─ api/                       # 인증 및 기능별 서버 API
│  ├─ auth/callback/             # Supabase OAuth/이메일 콜백
│  ├─ page.tsx                   # AppShell + DashboardWorkspace 진입점
│  ├─ calendar|files|focus|.../   # 기존 주소 → ?view=기능명 리다이렉트
│  ├─ globals.css                # 전체 디자인 시스템과 기능별 스타일
│  ├─ dashboard.css              # 기존 CSS 뒤에 적용하는 대시보드 배치 스타일
│  ├─ layout.tsx                 # 메타데이터, 폰트, PWA 등록
│  └─ manifest.ts                # PWA manifest
├─ components/
│  ├─ app-shell.tsx              # 공통 사이드바/모바일 내비게이션/인증 게이트
│  ├─ dashboard-workspace.tsx    # 8개 기능의 keepMounted 탭 패널
│  ├─ workspace-status.tsx       # 상단 오늘 집중/루틴/할 일 요약
│  ├─ *-workspace.tsx            # 앱별 클라이언트 작업 화면
│  └─ ui/                        # 프로젝트에 포함된 UI 프리미티브
├─ hooks/use-api.ts              # API 조회/재시도 및 요청 helper
├─ lib/
│  ├─ campus-meals.ts            # 학식 응답 타입
│  └─ supabase/                  # 브라우저/서버 Supabase client와 인증 helper
├─ public/                       # PWA, 아이콘, 소셜 미리보기 정적 파일
├─ supabase/migrations/          # 운영 스키마 변경 이력 0001~0005
├─ CODEX_CONTEXT.md              # 지속적인 프로젝트 인수인계 문서
├─ AGENTS.md                     # Codex 작업 및 컨텍스트 관리 규칙
├─ package.json / package-lock.json
├─ vite.config.ts                # Vinext, Sites, Cloudflare 플러그인
└─ README.md
```

페이지와 API는 같은 기능 이름으로 대응한다. 사용자 데이터 API는 서버에서 Supabase 세션 사용자를 확인한 뒤 RLS가 적용된 테이블에 접근한다.

## 현재 구현 상태

### 공통 셸과 인증

- 색상은 기존 밝은 배경·검정·라임을 유지한다. 참고 이미지의 구조만 반영해 사이드바를 계획/집중·생활 관리·자료/정보로 묶고, 데스크톱 상단에 연결 상태와 오늘 집중·루틴 완료·남은 할 일 요약을 배치했다. `WorkspaceStatus`는 기존 API를 조회하며 변경 이벤트 후 갱신하고 조회 실패는 0 대신 대시로 표시한다. 타이머 화면은 넓은 화면에서 실행·오늘 요약·최근 기록의 3열, 좁은 화면에서 2열/1열로 배치한다.
- CHI.HUB는 공통 대시보드 셸 안에서 기능별 탭을 전환한다. **탭은 화면 구분이며 앵커 바로가기가 아니다. 선택한 기능 하나만 표시한다.** 전체 기능을 한 화면에 펼치는 패널 그리드와 접기/확대 버튼은 제거했다. 별도 요약 대시보드 탭도 없다. `app/dashboard.css`를 `app/globals.css` 뒤에 로드한다.
- 왼쪽의 타이머·루틴/할 일·캘린더·메모·수면·운동·드라이브·학식은 실제 탭이다. 모바일은 메뉴 및 하단 버튼으로 같은 선택 상태를 바꾼다. 탭 전환은 `?view=기능명`에 반영하고 새로고침·뒤로 가기를 지원한다. 기본 탭은 타이머다.
- 기존 개별 기능 주소는 `/?view=기능명`으로 리다이렉트한다. 예전 `/#기능명`도 해당 탭으로 복원하고 쿼리 형식으로 정규화한다. 로그인 복귀 경로는 쿼리와 해시를 보존한다.
- TabsList/Trigger/Content는 기존 UI 컴포넌트를 재사용한다. 기존 Tabs 래퍼는 orientation을 primitive로 전달하지 않으므로 AppShell에서는 Base UI Tabs.Root를 직접 사용해 수직 방향키 탐색을 지원한다. 방향키로 포커스 이동 후 Enter/Space로 선택한다.
- 사이드바 접기 상태는 `localStorage`의 `chi-hub-sidebar`에 저장됨.
- AppShell이 `/api/auth/status`로 인증을 확인하고 미인증 사용자를 `/login`으로 보냄.
- 이메일 회원가입/로그인/로그아웃과 Google OAuth가 구현됨.
- Google OAuth는 `/api/auth/google` 서버 라우트에서 시작하며 `/auth/callback`에서 세션 코드를 교환함.
- PWA manifest와 service worker 등록이 있음.

### 홈과 집중 타이머

- `DashboardWorkspace`는 실제 작업 컴포넌트를 `TabsContent keepMounted`로 유지한다. 비선택 화면은 숨기되 언마운트하지 않아 타이머·메모·입력 폼 상태가 유지된다. 한 화면에 여러 기능을 펼치지 않는다.
- 타이머 완료 창은 body 포털로 렌더링하므로 다른 탭을 보고 있어도 표시된다.
- 집중/짧은 휴식/긴 휴식 모드, 직접 시간 편집, 완료 기록, 기록 삭제가 구현됨.
- 실행 중인 타이머는 `localStorage`의 `chi-hub-focus-timer-v2`에 종료 시각을 저장해 새로고침이나 백그라운드 전환 뒤에도 이어짐.
- 완료된 집중 세션은 `focus_sessions`에 저장됨.

### 루틴과 데일리 할 일

- 매일 반복 및 특정 요일 반복 루틴을 생성/완료/삭제할 수 있음.
- 완료 날짜와 시각을 `routine_checks`에 기록함.
- 날짜별 데일리 할 일을 생성하고 완료 상태를 변경하거나 삭제할 수 있음.

### 수면

- 취침 시작/기상 종료 방식의 진행 중 수면 타이머와 직접 기록이 구현됨.
- 수면 시간, 품질, 메모와 평균 요약을 제공함.
- 사용자당 진행 중 수면 기록은 하나만 허용하는 partial unique index가 있음.

### 캘린더

- 월간 6주 그리드, 이전/다음 달 이동, 날짜 선택이 구현됨.
- 사용자가 직접 일정을 생성하고 삭제할 수 있음.
- 일정, 루틴 완료, 데일리 할 일, 수면, 집중 타이머 기록을 날짜별 통합 타임라인으로 표시함.
- 같은 대시보드에서 루틴·할 일·수면·집중 기록 변경 후 `apiRequest`가 알림을 보내면 통합 캘린더 GET을 다시 조회한다. 캘린더와 루틴/할 일의 날짜 선택은 로컬 날짜를 사용해 UTC 변환으로 하루 밀리던 문제를 보정했다.

### 운동

- 운동 제목, 날짜, 시간, 메모 기록과 삭제가 구현됨.
- 최근 7일 요약 통계를 제공함.

### 메모

- Markdown, 스티커, 필기(drawing) 유형과 카테고리, 검색, 고정, 미리보기, 삭제가 구현됨.
- 기존 메모는 실제 변경이 있을 때만 자동 저장함.
- 입력 후 800ms 동안 변경이 없으면 저장을 시작함.
- `저장 중…`을 최소 1.5초, `저장됨`을 최소 1.5초 표시한 후 0.4초 애니메이션으로 사라지게 설계됨.
- 새 메모는 내용이 있을 때 자동 저장하며 제목이 없으면 자동 제목을 생성함. 내용 없는 새 메모는 저장하지 않음.
- 메모 전환 시 미저장 변경을 즉시 저장 요청함.
- 삭제는 자체 확인 모달을 사용하며 삭제 후 새 메모 상태로 초기화됨. 이후 입력하면 새 메모 자동 저장이 다시 동작함.

### 드라이브

- Supabase Storage의 비공개 `private-files` 버킷을 사용함.
- 다중 업로드, 다운로드, 삭제, 목록/그리드 전환, 이미지 미리보기가 구현됨.
- 경로 첫 세그먼트에 사용자 ID를 사용하며 Storage RLS로 사용자 파일만 접근 가능함.
- 마이그레이션 기준 파일 제한은 500 MiB임.
- 사이드바 명칭은 `파일`이 아니라 `드라이브`를 사용함.

### 학식

- `/meals` 앱과 `/api/campus-meals` 서버 라우트가 구현됨.
- 학교 선택은 `localStorage`의 `chi-hub-university`에 저장됨.
- 대전대학교: 공식 페이지에서 혜화문화관, 제2생활관, 제5생활관(HRC) 주간 식단을 파싱함.
- 충북대학교: 공식 생활협동조합 페이지에서 한빛식당, 별빛식당, 은하수식당 주간 식단과 가격을 파싱함.
- 한국외국어대학교: 공식 사이트에서 날짜별 공개 식단을 확인하지 못해 서울/글로벌캠퍼스 공식 식당 위치 안내를 제공함.
- 외부 HTML은 브라우저가 아니라 서버 라우트에서 가져옴. 응답은 브라우저 5분, 공유 캐시 30분, stale-while-revalidate 24시간 정책을 사용함.
- 학식 기능은 Supabase 스키마를 변경하지 않음.

## 데이터 모델

`supabase/migrations`의 현재 마이그레이션은 다음 순서다.

- `0001_initial_schema.sql`: profiles, focus_sessions, sleep_logs, routines, routine_checks, workout_logs, notes, files, 비공개 Storage 버킷과 RLS
- `0002_sleep_timer_and_larger_files.sql`: 진행 중 수면 허용, 사용자당 하나로 제한, 파일 제한 500 MiB
- `0003_routines_and_daily_tasks.sql`: 일간/주간 반복 필드와 daily_tasks
- `0004_calendar_events.sql`: 사용자 일정
- `0005_note_types_and_categories.sql`: 메모 유형, 카테고리, 필기 데이터

모든 공개 사용자 테이블은 RLS를 사용하고 정책은 `auth.uid()`와 해당 행의 사용자 ID를 비교한다. 새 테이블이나 버킷을 추가할 때도 RLS와 사용자 범위 정책을 함께 작성해야 한다.

## 지금까지 완료한 작업

- CHI.HUB 앱 셸, 반응형 내비게이션, 접기 상태 유지
- Supabase 이메일 인증 및 Google OAuth
- 집중 타이머의 백그라운드/새로고침 복원과 세션 기록
- 반복 루틴, 데일리 할 일, 수면, 운동 기록
- 월간 캘린더와 여러 기능 기록의 통합 표시
- 메모 유형/카테고리/미리보기/필기/정교한 자동 저장/삭제 후 상태 초기화
- 비공개 드라이브의 다중 업로드, 그리드 보기, 이미지 미리보기
- 대전대·충북대·한국외대 대상 학식 앱 1차 구현
- 모바일 터치 및 키보드 포커스 접근성 보완
- 프로젝트 내부 지속 컨텍스트 문서와 자동 관리 규칙 도입

## 주요 기술적 결정

1. **운영 데이터는 Supabase에 유지한다.** Sites의 D1/R2는 `.openai/hosting.json`에서 현재 `null`이며, 기존 Supabase Auth/DB/Storage 연결을 보존한다.
2. **사용자 데이터 접근은 서버 API + Supabase RLS를 사용한다.** 브라우저에는 공개 anon key만 제공하고 service role key는 사용하지 않는다.
3. **로컬도 운영 Supabase에 연결한다.** 별도 개발 DB가 아니므로 로컬 CRUD도 실제 운영 데이터 변경이다.
4. **기기 UI 상태만 localStorage에 둔다.** 사이드바, 실행 중 집중 타이머, 선택 학교처럼 기기 로컬로 충분한 상태에 한정한다.
5. **학식은 공식 소스를 우선한다.** 공개 API가 없는 학교는 서버에서 공식 HTML을 파싱하고 캐시한다. 서드파티 데이터를 진실의 원천으로 사용하지 않는다.
6. **한국외대 메뉴를 추정하지 않는다.** 공식 날짜별 식단 소스를 찾지 못한 상태에서는 확인 가능한 식당 운영 정보만 표시한다.
7. **운영 배포는 Sites 전용 저장소만 사용한다.** GitHub `origin`은 다른 PC와 소스를 동기화하기 위한 용도이며 사용자가 명시적으로 요청한 경우에만 push한다. Sites 저장소 자격 증명은 필요할 때 도구에서 발급받아 해당 명령에만 사용하며 Git remote나 파일에 저장하지 않는다.
8. **`.env.local`은 영구적으로 로컬 전용이다.** Git, 인수인계 문서, 로그에 실제 값을 남기지 않는다.
9. **기존 디자인을 확장한다.** 검정/라임/종이색 토큰과 공통 AppShell/탭 구조를 유지하고, 기능 추가 시 기존 UI 프리미티브를 우선 재사용한다. 현재 홈은 FeatureLayout이 아니라 AppShell + DashboardWorkspace로 구성된다.

## 해결한 문제

- 로컬 Google 로그인이 `google-config` 오류로 돌아오던 문제를 서버 시작 OAuth 흐름과 Supabase Redirect URL 구성으로 해결함.
- 사이드바 접기 상태가 페이지 전환 뒤 초기화되는 문제를 localStorage 기반 외부 저장소 구독으로 해결함.
- 타이머가 새로고침/백그라운드에서 끊기는 문제를 절대 종료 시각 저장 방식으로 해결함.
- 루틴과 수면을 하나의 화면에 섞지 않고 독립 앱으로 분리함.
- 캘린더가 수동 일정만 보여주던 한계를 다른 앱의 기록을 합치는 통합 API로 해결함.
- 메모 자동 저장이 변경 없이 반복되거나 전환/삭제 뒤 잘못된 상태를 유지하던 문제를 snapshot 비교와 draft 초기화로 해결함.
- 브라우저 기본 confirm에 의존하던 메모 삭제를 자체 모달로 변경함.
- 드라이브의 단일 업로드/목록 한계를 다중 업로드, 그리드, 이미지 미리보기로 확장함.
- 공개 API가 없는 학식 데이터를 공식 학교 페이지의 서버측 파싱으로 제공함.

## 현재 진행 중인 작업

- 진행 중인 기능 구현은 없음.
- 대시보드 개편의 로컬 구현·검증은 완료됐으나 **운영 미반영**이다. 기존 프로젝트에 대한 Sites 조회와 소스 자격 증명 요청이 모두 `project_not_found`를 반환했다. 기존 사이트 소유 계정/워크스페이스 연결 확인 후 같은 프로젝트로 게시를 재개한다. 새 사이트를 만들거나 GitHub origin에 대신 push하지 않았다.
- 다음 작업을 시작하기 전에 이 문서의 알려진 문제와 실제 `git status`, 최근 커밋을 다시 확인한다.

## 알려진 문제 / 미해결 문제

### 코드 품질

2026-09-09 기준 전체 `oxlint` 실행 시 기존 코드에 다음 8개 진단이 남아 있다. 빌드는 성공하지만 lint는 깨끗하지 않다.

- `app/api/calendar/route.ts`: `no-explicit-any` 1건
- `components/files-workspace.tsx`: `<img>`에 대한 `next/no-img-element` 1건
- `components/notes-workspace.tsx`: `save` 선언 전 접근 및 effect dependency 2건
- `components/notes-workspace.tsx`: 삭제 모달에 semantic `<dialog>` 권고 1건
- `app/api/routines/route.ts`: unknown body 값을 `String()` 처리하는 `no-base-to-string` 2건
- `components/calendar-workspace.tsx`: deprecated `React.FormEvent` 진단 1건

Git으로 추적되는 unit/e2e 테스트 스위트는 없다. 이번 작업의 임시 Playwright 스크립트와 결과/스크린샷은 무시되는 `work/`에만 있어 새 PC에 자동 전달되지 않는다. 재검증 범위는 아래 검증 항목을 따른다. 전체 lint의 8개 진단은 과거 실행 결과이며 이번 UI 변경에서는 변경 컴포넌트만 lint를 실행했다.

### 기능 및 운영

- 현재 PC에는 `.env.local`이 없다. 운영 인증·실제 데이터·DB 마이그레이션 적용 여부는 미검증이다. 로컬 브라우저 QA는 격리된 테스트 컨텍스트에서 조회와 변경 API를 모두 가로채 테스트 응답으로 대체했으며 운영 데이터를 변경하지 않았다.
- Windows에서 긴 Codex 체크포인트 경로로 `git pull`이 실패했으나 저장소 로컬 `core.longpaths=true` 설정 후 무결성 검사와 fast-forward 동기화를 완료했다. 체크포인트는 삭제하지 않았다.
- 현재 세션 기본 PATH에서 npm이 발견되지 않아 임시 npm 실행기로 기존 잠금파일의 의존성을 설치하고 빌드했다. 새 터미널의 개발 명령은 npm 설치/PATH 확인이 필요하다. 패키지 버전·잠금파일은 변경하지 않았다.
- 한국외대는 공식 날짜별 식단 소스가 확인되지 않아 메뉴가 아닌 식당 위치만 표시한다. 공식 API/피드/페이지 발견 시 파서를 추가해야 한다.
- 대전대와 충북대 식단은 외부 HTML 구조에 의존하므로 학교 사이트 마크업 변경 시 파서가 깨질 수 있다. 빈 결과나 502 발생 시 공식 페이지 구조부터 확인한다.
- 학식 파서는 현재 주간 페이지를 대상으로 하며 과거/다음 주 탐색 UI는 없다.
- 로컬 환경이 운영 Supabase를 사용하므로 테스트 데이터 생성/수정/삭제도 실제 반영된다.
- 초기 마이그레이션이 실제 Supabase 프로젝트에 모두 적용됐는지는 새 환경에서 코드만으로 단정하지 말고 Supabase 상태를 확인해야 한다.

## 다음 작업

우선순위가 확정된 제품 작업은 없다. 다음 후보는 사용자 요청에 따라 선택한다.

1. 기존 8개 lint 진단을 기능 회귀 없이 정리하고 전체 lint를 통과시키기
2. 한국외대 공식 날짜별 식단 소스 또는 안정적인 제휴 데이터 경로 조사
3. 학식 소스 파서에 fixture 기반 단위 테스트와 소스 구조 변경 감지 추가
4. README의 기능 목록과 마이그레이션 안내를 현재 구현 상태(구글 로그인, 캘린더, 메모 유형, 학식, 0001~0005)에 맞게 갱신
5. 사용자가 요청하는 다음 CHI.HUB 앱 또는 기존 기능 개선

## 실행 / 빌드 / 테스트 방법

### 새 PC 초기 설정

1. **이번 변경이 포함된 프로젝트 전체를 확보한다.** GitHub main을 clone/pull해 UI와 인수인계 문서 커밋을 받은 뒤 `git log`로 확인한다.
2. Node.js 22.13 이상을 설치한다.
3. 프로젝트 루트에서 `npm ci`를 실행한다.
4. `.env.example`을 참고해 `.env.local`을 만들고 운영 Supabase 공개 설정을 입력한다.
5. Supabase Google provider와 Redirect URLs를 확인한다.

### 로컬 실행

```bash
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3000
```

정확한 로컬 확인 주소는 `http://127.0.0.1:3000`이다. Supabase HTTPS 접근이 필요하므로 Codex에서 서버를 실행할 때 네트워크 권한 제한이 없는 방식이 필요할 수 있다. 이미 3000 포트 서버가 있다면 먼저 상태를 확인하고 중복 실행하지 않는다.

### 검증

```bash
npm run build
npm run lint
```

- 2026-09-15 `ee8c3e3` UI 소스 기준 production build, `tsc --noEmit --incremental false`, 변경 컴포넌트 oxlint 및 `git diff --check` 통과. 이후 문서만 수정하는 작업에서는 빌드를 반복하지 않는다.
- 전체 lint의 과거 8개 진단과 추적되는 자동 테스트 스위트 부재는 위 코드 품질 항목 참고.
- 이번 브라우저 검증: Edge headless에서 8개 탭 × 1440/1024/390px, 한 패널만 표시·가로 넘침 없음, 메모 초안/자동 저장·실행 타이머 유지, 방향키+Enter, 모바일 메뉴, 새로고침/뒤로 가기/레거시 해시/8개 주소 리다이렉트, 비선택 탭 타이머 완료 창, 상단 요약 집계·변경 후 갱신·조회 실패 표시를 확인했다.
- 테스트 컨텍스트에서 `/api/**` 조회와 변경을 모두 대체 응답으로 처리했다. 실제 Supabase 인증/CRUD/운영 화면 검증을 완료한 것으로 해석하지 않는다.
- 현재 PC의 임시 QA 파일: `work/tabs-qa.cjs`, `work/tab-timer-completion-qa.cjs`, `work/layout-status-qa.cjs`. Playwright와 Edge 경로가 현재 PC에 종속되며 정식 프로젝트 의존성이나 이식 가능한 테스트 스위트가 아니다.
- 로컬 HTTP smoke test 시 최소 `/`, `/login`, 수정한 페이지와 관련 API의 비오류 응답을 확인한다.
- 학식 점검 예: `/api/campus-meals?university=dju`, `cbnu`, `hufs`와 `/meals`.
- 인증된 CRUD 테스트는 운영 데이터를 바꾸므로 테스트용 레코드 범위를 명확히 하고 즉시 정리한다.

### 배포

사용자가 변경을 요청해 로컬 확인이 끝나면 다음을 한 흐름으로 완료한다.

1. 변경된 정확한 소스를 로컬 커밋
2. Sites 프로젝트의 전용 비공개 소스 저장소에만 업로드
3. 같은 커밋의 빌드 산출물을 Sites version으로 저장
4. 기존 owner-only 비공개 접근을 유지해 게시
5. 게시 상태 성공과 운영 URL 확인

운영 배포를 GitHub Pages나 GitHub Actions로 대체하지 않는다. GitHub `origin` push는 사용자가 소스 동기화를 명시적으로 요청한 경우에만 수행한다. `.env.local`을 커밋하거나 Sites archive에 소스 파일로 포함하지 않는다.

## 주의사항

- **데이터 안전:** 로컬 앱이 운영 Supabase에 연결된다. 생성·수정·삭제는 실제 사용자 데이터에 반영된다.
- **Git 안전:** 현재 `origin`은 GitHub 저장소다. 명시적 사용자 요청이 있을 때만 필요한 브랜치/커밋을 push하고, 운영 게시에는 사용하지 않는다. Sites 소스 저장소는 영구 remote로 추가하지 않는다.
- **비밀 관리:** `.env.local`, API 키, 토큰, 쿠키, 사용자 이메일/개인 데이터의 실제 값은 문서·커밋·도구 출력에 남기지 않는다.
- **마이그레이션:** 새 schema 변경은 새 번호의 SQL 파일로 추가하고 RLS, 정책, 인덱스, 롤백 영향을 검토한다. 이미 적용된 마이그레이션을 의미 없이 다시 쓰지 않는다.
- **학식 데이터:** 공식 페이지 링크와 학교명을 보존하고, 파싱 실패 시 임의 메뉴를 표시하지 않는다.
- **메모 자동 저장:** 저장 타이밍과 상태 애니메이션은 사용자가 여러 차례 조정한 동작이다. 관련 코드를 바꿀 때 아래 규칙을 회귀 테스트한다.
  - 실제 변경만 저장
  - 800ms debounce
  - 저장 중/저장됨 최소 표시 시간
  - 새 메모의 빈 내용 미저장 및 자동 제목
  - 전환 시 즉시 저장 요청
  - 삭제 후 완전한 새 draft 상태
- **기존 변경 보존:** dirty worktree의 사용자 변경을 덮어쓰거나 reset하지 않는다.
- **컨텍스트 유지:** 중요한 기능/구조/설정/결정이 바뀌면 같은 작업에서 이 문서를 현재형으로 정리한다. 사소한 변경을 일지처럼 모두 누적하지 않는다.

## Git 및 다른 PC로의 전달

- `CODEX_CONTEXT.md`와 `AGENTS.md`는 `.gitignore` 대상이 아니며 Git으로 추적해야 한다.
- `.env.local`, 빌드 산출물(`dist`, `.next`, `.vinext`)과 로컬 Wrangler 상태는 전달 대상이 아니다.
- USB로 옮길 때는 저장소와 숨김 `.git` 디렉터리를 함께 복사하거나, 최소한 추적 파일 전체와 최신 커밋을 포함하는 Git bundle을 사용한다.
- 다른 PC의 새 Codex 세션에서는 먼저 `AGENTS.md`, `CODEX_CONTEXT.md`, 실제 `git status`, `git log`, `package.json`, `.openai/hosting.json`을 확인한다.
- 2026-09-15 사용자 요청으로 이번 UI와 인수인계 문서를 GitHub origin/main에 push했다. 새 PC는 GitHub clone/pull로 이어갈 수 있다. Sites 운영 게시는 여전히 미완료이며 소스 동기화와 운영 배포를 구분한다.
- Git bundle로 옮길 때는 문서 정리 커밋까지 만든 뒤 현재 PC에서 `git bundle create ../chi-hub-handoff.bundle main`, `git bundle verify ../chi-hub-handoff.bundle`을 실행할 수 있다. 새 PC에서는 `git clone /path/to/chi-hub-handoff.bundle chi-hub`로 복원한다. bundle clone의 origin은 bundle 경로이므로 GitHub remote를 자동으로 가진다고 가정하지 않는다. 이 명령들은 전달 안내이며 이번 문서 정리에서 bundle을 생성한 것은 아니다.
- 새 채팅 시작 요청 예: “AGENTS.md와 CODEX_CONTEXT.md를 끝까지 읽고 실제 Git 상태와 비교해줘. 밝은 배경·검정·라임과 기능별 단일 화면 탭 구조를 유지하면서 다음 요청을 이어가줘. 이번 UI는 로컬 완료·운영 미배포 상태인지 먼저 확인해줘.”

## 최근 작업 기록

- 2026-09-15: 참고 이미지의 그룹 메뉴·상단 상태 행·컴팩트한 카드 배치를 적용하되 기존 밝은 배경/검정/라임 색상 유지. 24개 화면/크기 조합, 탭 상태 보존·키보드·타이머 완료 창과 요약 집계/변경 갱신/오류 표시를 격리된 테스트 API로 검증. TypeScript·변경 컴포넌트 lint·production build 통과. 실제 데이터 수정 없음. 기존 Sites 프로젝트 접근 불가로 로컬 반영만 완료.
- 2026-09-15: 사용자 피드백으로 전체 패널 나열을 폐기하고 기능별 실제 탭으로 재구성. 중복 패널 프레임과 접기/확대 UI 제거, 한 번에 한 작업 화면만 표시. 8개 탭 × 1440/1024/390px에서 표시 화면 1개·숨은 화면 상태 유지·가로 넘침 없음. 키보드(방향키+Enter), 모바일 메뉴, 메모 내용·실행 타이머 유지, 비선택 타이머 완료 창, 새로고침·뒤로 가기·이전 해시와 8개 이전 주소 복원 검증. 테스트 API만 사용했으며 운영 데이터 변경 없음. build·TypeScript·변경 컴포넌트 lint 통과. Sites 접근 불가 상태 유지.
- 2026-09-09: 프로젝트 내부 지속 컨텍스트 시스템(`CODEX_CONTEXT.md`, `AGENTS.md`) 도입 및 다른 PC 동기화를 위해 GitHub `main` 업로드를 사용자 요청으로 허용.
- 2026-09-08 · `3926970`: 대전대·충북대·한국외대 학식 앱 추가, 로컬 API/페이지 및 production build 검증, 비공개 Sites 게시.
- 2026-09-07 · `75055bf`: 메모 삭제 후 새 draft 상태 초기화.
- 2026-09-07 · `18e4569`: 메모 저장 흐름과 자체 삭제 모달 개선.
- 2026-09-07 · `d2e2d51`: 메모 `저장됨` 상태 fade 애니메이션.
- 2026-09-07 · `1e894d0`, `49d5d81`, `1e09ac4`, `dfaf660`: 메모 자동 저장, 전환, 새 메모 저장 피드백 정교화.
- 2026-09-07 · `082349f`: 앱 내비게이션 및 캘린더 경험 개선.
- 2026-09-07 · `9b0e622`, `70622fc`: 드라이브 보기/업로드 개선 및 캘린더 일정 삭제.
