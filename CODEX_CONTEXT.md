# Project Context

> 마지막 정리: 2026-09-16 (Asia/Seoul). 실제 코드와 Git 상태를 먼저 확인한다.

## 프로젝트와 사용자 결정

CHI.HUB는 한국어 모바일 우선 개인용 PWA다. 타이머, 루틴/데일리 할 일, 캘린더, 메모, 수면, 운동, 비공개 드라이브, 학식을 제공한다.

- 2026-09-16 사용자 결정: Sites 계정 종속을 벗어나 **집의 상시 가동 Windows PC에서 운영**한다.
- 서비스 주소: `https://chi-hub.kro.kr`. Tailscale + SSH는 서버 관리 전용이며 사용자는 브라우저로 도메인에 접속한다.
- 여러 PC(집/랩실/노트북)에서 개발하고 검증된 Git 커밋만 운영 서버에 전달한다.
- 기존 Supabase Auth/DB/Storage를 유지한다. DB/schema 변경이나 데이터 이전은 이번 전환에 없다.
- 기존 밝은 배경·검정·라임 색상을 유지한다. **8개 기능 중 선택한 화면 하나만 표시**하며 별도 요약 탭이나 전체 패널 나열로 되돌리지 않는다.
- 학식 UI는 대전대학교만 유지한다. 다른 학교 버튼을 임의로 복원하지 않는다.

## 저장소 / 환경

- 개발 PC 경로: `C:\Users\AIDIS3\Archive\Projects\chi-hub`.
- 서버 소스 경로: `C:\Services\chi-hub`. SSH alias: `chi-server` (개인 키/계정 정보는 별도 관리).
- 서버는 Node 24.21.0, npm 11.19.0, Git 설치 및 clone 완료. 관리자 SSH 접근 확인.
- 서버 런타임: `C:\Services\chi-hub-runtime`; releases, active.txt, previous.txt, logs를 사용한다.
- 사용자 확인으로 공유기의 서버 내부 IP 예약 완료. 공인 IP와 WAN IP 일치, DNS A 레코드 연결 확인. IP/MAC 값은 기록하지 않는다.
- 공인 IP는 DHCP이므로 변경 가능. DNS 자동 갱신은 아직 구성하지 않았다.
- 개발 PC에 `.env.local` 없음. 서버에 입력 양식만 준비했으며 실제 설정 완료는 별도 확인한다.
- 개발 PC의 node는 Codex bundled runtime이고 npm은 PATH에 없다. 임시 `work/npm-tool/package/bin/npm-cli.js`(11.19.0)를 node로 실행했다. 서버에는 표준 npm.cmd가 있다.
- 현재 저장소 `core.longpaths=true`. work/에 과거 임시 QA 파일이 있으나 공식 테스트 스위트가 아니다.

## 스택 / 주요 파일

- TypeScript, React/React DOM/React Server DOM Webpack **19.2.8**
- Vinext **1.0.0-beta.10**, Vite **8.3.0**, RSC plugin **0.5.34**
- Tailwind 4, shadcn/Base UI, Lucide, Supabase JS / SSR, Oxlint/Oxfmt
- Node **24 LTS** (`>=24.13.0 <25`)
- `vite.config.ts`: Vinext + Tailwind만 사용. Sites/Cloudflare plugin/Workers 실행 의존성 제거.
- `next.config.ts`: `output: 'standalone'`. `dist/standalone/server.js`와 런타임 의존성을 생성.
- `scripts/environment.mjs`: production 환경 로드·필수값 검사. 키의 실제 값은 출력하지 않음.
- `scripts/build-server.mjs`: 환경 검사 후 production build.
- `scripts/start-server.mjs`: loopback에서만 실행, 설정된 사이트 host에 대한 proxy 신뢰.
- `app/api/health/route.ts`: DB와 무관한 프로세스 상태 확인.
- `scripts/smoke-server.mjs`: dummy 설정으로 빌드한 앱의 production HTTP 회귀 검사.
- `deploy/windows/`: Caddyfile, 배포/자동 시작/롤백 PowerShell, 상세 운영 안내.
- `.openai/hosting.json`: 이전 Sites 연결 기록. 현재 빌드에서 읽지 않고 새 Sites 배포도 하지 않는다.

## 환경 / 인증

환경 변수 이름은 `.env.example`에 유지한다. `.env.local`과 실제 URL/key 값은 Git·문서·로그에 넣지 않는다.
기존 Supabase URL과 anon 또는 publishable key를 사용하며 service_role/secret key는 사용하지 않는다.
서버 사이트 URL은 새 HTTPS 도메인, 로컬은 http://127.0.0.1:3000을 사용한다.

- 기존 Google provider와 Supabase 프로젝트 자체는 유지한다.
- 새 도메인을 Supabase Site URL에 설정하고 `/auth/callback` 및 `?next=...`를 Redirect URLs에 허용해야 한다.
- 로컬 `localhost:3000/auth/callback`, `127.0.0.1:3000/auth/callback`도 유지한다.
- 앱과 Caddy를 통해 HTTPS로 들어온 요청의 Google OAuth/이메일 확인/로그인 복귀를 확인해야 한다.
- `.env.local` 변경 시 client build에도 포함되므로 다시 build/deploy한다.
- 기존 Sites owner-only 관문은 새 도메인에 적용되지 않는다. 앱 인증/RLS는 유지되며 신규 가입 정책은 Supabase Auth 설정에서 관리한다.

## 현재 구현 동작 (보존)

### 공통 셸

- `app/page.tsx`: AppShell + DashboardWorkspace. globals.css 다음 dashboard.css 적용.
- 계획/집중·생활 관리·자료/정보 그룹 메뉴, 상단 연결 상태와 오늘 집중/루틴/할 일 요약.
- API 변경 이벤트 후 상단 요약 갱신. 조회 실패는 0 대신 대시 표시.
- 8개 `TabsContent keepMounted`로 비선택 화면은 숨기되 타이머/메모/폼 상태 보존.
- 쿼리 `?view=기능명`으로 선택 보존, 기본 focus. 새로고침/뒤로 가기/legacy hash 지원.
- 기존 개별 기능 경로는 같은 탭 쿼리로 redirect. 로그인 복귀 시 쿼리/해시 보존.
- Base UI Tabs.Root 수직 방향키 포커스, Enter/Space 선택. 모바일 메뉴/하단 버튼 동기화.
- 사이드바 상태 localStorage `chi-hub-sidebar`. 인증 상태 API, 미로그인 시 로그인 페이지 이동.
- 이메일 가입/로그인/로그아웃, 서버 시작 Google OAuth, callback 세션 교환, PWA 구현.

### 기능

- 집중/짧은 휴식/긴 휴식, 시간 편집, 완료/삭제. 종료 시각을 `chi-hub-focus-timer-v2`에 저장해 새로고침/백그라운드 복원. 완료 창은 body portal이라 비선택 탭에서도 표시.
- 일간/요일 반복 루틴 생성/완료/삭제와 날짜별 daily tasks. 체크 날짜/시각 기록.
- 수면 타이머 시작/종료, 직접 기록, 품질/메모/평균. 사용자당 진행 기록 하나인 partial unique index.
- 월간 6주 캘린더, 일정 생성/삭제. 일정·루틴·할 일·수면·집중 통합 타임라인. 변경 이벤트 후 재조회, 로컬 날짜 사용.
- 운동 제목/날짜/시간/메모, 삭제, 최근 7일 요약.
- 메모 Markdown/스티커/필기, 카테고리/검색/고정/미리보기/삭제.
- 메모 자동 저장은 실제 변경만, 800ms debounce, 저장 중/저장됨 각각 최소 1.5초 후 0.4초 fade.
- 새 메모 빈 내용 미저장/자동 제목, 전환 시 즉시 저장 요청, 자체 삭제 모달 및 완전한 새 draft 초기화 유지.
- 드라이브는 private-files Storage, 사용자 ID 경로/RLS, 다중 업로드/다운로드/삭제, 목록/그리드/이미지 미리보기. 500 MiB 제한.
- 학식 UI는 대전대학교만 제공. 저장값 cbnu/hufs도 dju로 복원.
- 대전대 공식 주간 HTML의 혜화문화관/제2생활관/HRC 파싱. 충북대 파서와 한국외대 위치 안내 API는 서버에 유지.
- 한국외대 날짜별 메뉴는 미확인으로 추정하지 않는다. UI 버튼 복원 없이 요청이 있을 때만 조사.
- 학식 cache: browser 5분/shared 30분/stale 24시간. 과거/다음 주 UI 없음. 외부 HTML 변경에 취약.

## 데이터 모델

supabase/migrations에 0001~0005가 있으며 새 변경은 다음 migration으로 추가한다.

1. profiles, focus_sessions, sleep_logs, routines, routine_checks, workout_logs, notes, files, private Storage/RLS
2. 진행 중 수면, 사용자당 하나 제한, 500 MiB 파일 제한
3. 반복 필드와 daily_tasks
4. calendar_events
5. 메모 유형/카테고리/필기

API는 서버 세션 사용자를 확인하고 Supabase RLS로 사용자 범위를 제한한다.
실제 운영 migration 적용 여부는 코드만으로 단정할 수 없다. 로컬 CRUD도 운영 데이터를 변경하므로 테스트를 최소화한다.

## Windows 배포 절차 / 운영 원칙

상세 명령은 `deploy/windows/README.md` 참고.

- `npm ci` → typecheck/관련 검증 → `npm run build` → 로컬 커밋 → SSH/bundle로 서버 소스 전달.
- GitHub origin push는 별도 사용자 요청 시만 수행. Sites 게시 의무는 이번 사용자 결정으로 대체됨.
- 서버 `deploy.ps1`: clean source 확인, 설치/빌드, 새 릴리스 복사, 13000 포트 상태 검사 후 active pointer 전환.
- `install-app-task.ps1`: LOCAL SERVICE 권한의 CHI-HUB-App 작업. 부팅 자동 시작, 비정상 종료 재시도, 로그 저장.
- 앱은 127.0.0.1:3000으로 제한. 공개 진입점은 Caddy HTTPS 80/443이며 3000/13000은 외부에 열지 않는다.
- `rollback.ps1`: 보관된 이전 빌드와 환경 파일로 복구. DB rollback 아님.
- 빌드 중 기존 운영 프로세스 유지. 전환에는 짧은 중단이 있고 로그/이전 릴리스 정리는 수동이다.
- `.env.local`은 source에 별도 관리하고 release에 서버 내부 복사. runtime ACL은 배포 사용자/관리자/SYSTEM/LOCAL SERVICE로 제한.
- 서버에서 사용자 변경을 덮어쓰거나 git reset하지 않는다.

## 검증 / 알려진 문제

2026-09-16 Windows 운영 전환 소스:

- npm audit **0건**. Cloudflare 계열 제거, React/Vinext/Vite/RSC 보안 업데이트, undici 잠금 버전 갱신.
- TypeScript 검사 성공. production standalone 빌드 성공.
- dummy Supabase 설정으로 HTTP smoke: 홈/로그인/학식/manifest, JS asset, 인증 401, legacy 경로, HTTPS proxy callback, 외부 redirect 방어 통과.
- 변경 TS/JS 파일 lint 통과. PowerShell syntax 검사 통과. 별도 서버 테스트 릴리스에서 LOCAL SERVICE task 시작/중지/재시작과 health 확인 완료. 테스트 task는 제거했다.
- 작업 스케줄러 중지만으로 하위 Node가 남는 Windows 동작을 확인해 stop-app.ps1에서 PID/시작 시각/경로 검증 후 종료하도록 보완했다.
- 전체 lint는 기존 8건 유지: calendar API any 1, files img 1, notes save 선언순서/deps 2 및 dialog 1, routines String unknown 2, calendar FormEvent deprecated 1.
- 실제 로그인/Google OAuth/사용자 CRUD/외부 HTTPS/부팅 복구는 아직 확인 필요. health 성공은 DB 연결 성공을 의미하지 않는다.
- 개발 PC에서는 임시 테스트 환경만 사용했으며 운영 데이터를 변경하지 않았다.
- 2026-09-15 UI의 8개 탭 × 3개 크기, 상태 보존, 키보드, 타이머 portal, 요약 갱신 QA는 이전 작업의 테스트 API 검증 기록이다. 이번에 전체 UI QA를 반복한 것은 아니다.

## 현재 진행 중 / 다음 단계

- Windows 서버 전환 설정과 취약점 정리 구현 완료, 서버 전달/설치 검증 진행 중.
- 서버 Supabase 설정 입력을 사용자에게 안내했다. 값 자체를 요청하지 않았다.
- 서버에서 새 소스 설치/빌드, task 실행, Caddy 설치/HTTPS, router TCP 80/443, Supabase callback 등록 및 실제 로그인 확인 필요.
- 공인 IP 변경 대응과 로그/릴리스 보관 정책은 후속 운영 과제.

## 최근 핵심 이력

- 2026-09-16: Windows 자가 호스팅 전환. Node standalone, 보안 의존성 업데이트, loopback/proxy 설정, health/smoke, 릴리스 배포/자동 시작/롤백 스크립트 추가. Sites 배포 중단 결정.
- `c977a79`: 이전 GitHub 동기화 문서. 이번 작업 전 main/origin-main 기준점.
- `235ee93`: 학식 대전대학교 단독 선택, 서버 다른 학교 API 유지. `b840a7b`와 함께 사용자 요청으로 GitHub 동기화.
- `ee8c3e3`: 기존 색상 보존한 그룹 사이드바/상단 요약/컴팩트 UI.
- `606cf7c`: 모든 기능 나열에서 상태 보존 단일 기능 탭으로 전환.
- 이전 Sites 주소는 `https://chi-hub-personal.nolsup0305.chatgpt.site`; project_not_found로 최근 UI/학식 미게시 상태였음. 이제 해당 게시 복구는 작업 목표가 아니다.
