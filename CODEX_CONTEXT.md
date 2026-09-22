# Project Context

> 마지막 정리: 2026-09-22 (Asia/Seoul). 실제 코드와 Git 상태를 먼저 확인한다.

## 새 PC / 새 Codex 채팅에서 시작하기

1. 이 문서와 AGENTS.md를 끝까지 읽고 실제 git status, 최근 커밋, 관련 소스를 확인한다. 서버 설정이나 migration을 처음부터 다시 설치하지 않는다.
2. **2026-09-16 사용자 요청으로 main을 GitHub에 push했다.** Windows 전환/브랜드 변경/인수인계 문서는 GitHub clone 또는 pull로 받을 수 있다. 이후 push도 별도 사용자 요청 범위에서 수행한다.
3. GitHub main에는 2026-09-16 문서까지 있다. 2026-09-22 변경은 로컬 커밋/bundle에만 있으며 아직 push하지 않았다. Git bundle은 대체 전달 수단이다. bundle에는 추적된 소스와 Git 이력만 포함되며 환경 파일, SSH 키, node_modules, 빌드, work/ QA 산출물은 포함되지 않는다.
4. 새 PC에 Git과 Node 24 LTS를 설치하고, Tailscale 접근 및 OpenSSH 인증을 별도로 구성한다. chi-server는 현재 PC의 SSH 별칭이므로 새 PC에 자동으로 생기지 않는다. 서버 호스트/사용자/인증 정보를 안전하게 설정하고 ssh chi-server 접속부터 확인한다. 비밀번호나 개인 키를 채팅에 요청하지 않는다.
5. 저장소에서 npm.cmd ci 실행. 실제 앱 개발 시 .env.example을 참고해 새 PC 전용 .env.local을 별도 준비하고 로컬 사이트 주소를 사용한다. 기존 파일은 덮어쓰지 않는다. 운영 Supabase 값을 쓰면 로컬 CRUD도 실데이터를 변경한다.
6. 2026-09-22 UI/휴지통/보안 헤더 배포와 자동 삭제 작업 등록 완료. 다음은 실사용 계정의 로그인/OAuth·실제 사용성 검증과 계획된 재부팅 복구 확인이다.

### 최신 소스 가져오기 (새 PC PowerShell)

새 작업 폴더의 상위 디렉터리에서 실행한다:

~~~powershell
git clone https://github.com/ClCl616/chi-hub.git
Set-Location chi-hub
git status -sb
git log -5 --oneline
npm.cmd ci
~~~

기존 저장소는 먼저 사용자 변경을 보존하고 현재 브랜치를 확인한 뒤 main에서 git pull --ff-only origin main으로 갱신한다. 분기가 갈라졌다면 강제 덮어쓰지 않는다.

### 대체 방법: Git bundle

서버에는 이 문서의 커밋까지 포함한 C:/Services/chi-hub-windows.bundle을 유지한다.
아래는 새 빈 작업 폴더의 상위 디렉터리에서 실행한다. 대상 chi-hub가 이미 있으면 clone하지 않는다.

~~~powershell
scp chi-server:C:/Services/chi-hub-windows.bundle ./chi-hub-windows.bundle
git clone -b main ./chi-hub-windows.bundle chi-hub
Set-Location chi-hub
git remote set-url origin https://github.com/ClCl616/chi-hub.git
git status -sb
git log -5 --oneline
npm.cmd ci
~~~

bundle에는 HEAD 참조를 따로 넣지 않으므로 clone 시 -b main을 지정한다.
기존 저장소는 작업을 보존한 뒤 bundle에서 git fetch <bundle경로> main, git merge --ff-only FETCH_HEAD로 동기화한다.
분기가 갈라졌거나 사용자 변경이 있으면 강제 reset/덮어쓰기를 하지 않는다. 서버 접근이 없으면 현재 개발 PC의 outputs/chi-hub-windows.bundle을 안전하게 전달받아 같은 방식으로 복원한다.
GitHub의 원격 추적 표시는 bundle에서 복원한 직후 실제 GitHub 상태와 다를 수 있으므로 필요하면 git fetch origin으로 갱신한다.

### 실행과 검증

- 로컬 실행: npm.cmd run dev -- --hostname 127.0.0.1 --port 3000. 환경 파일 준비 후 사용한다.
- 코드 변경: npm.cmd run typecheck, 관련 lint/화면 검증, npm.cmd run build. 전체 lint의 기존 진단은 아래 참고.
- scripts/smoke-server.mjs는 파일 상단의 dummy 설정과 동일한 환경으로 빌드한 산출물에만 실행한다. 운영 설정 빌드에 섞어 쓰지 않는다.
- 운영 반영: 로컬 커밋 → bundle/SSH 전달 → 서버 clean worktree 확인 및 fast-forward → deploy/windows/deploy.ps1. 상세 명령은 deploy/windows/README.md.
- 문서만 바꾸면 서버 소스 동기화만 하고 앱 재빌드/재시작은 하지 않는다.

## 프로젝트와 사용자 결정

CHI Toolbox는 한국어 모바일 우선 개인용 PWA다. 타이머, 루틴/데일리 할 일, 캘린더, 메모, 수면, 운동, 비공개 드라이브, 학식을 제공한다.

- 2026-09-16 사용자 결정: Sites 계정 종속을 벗어나 **집의 상시 가동 Windows PC에서 운영**한다.
- 서비스 주소: `https://chitoolbox.com` (DNS/공개 HTTPS 연결 확인). Tailscale + SSH는 서버 관리 전용이며 사용자는 브라우저로 도메인에 접속한다.
- 여러 PC(집/랩실/노트북)에서 개발하고 검증된 Git 커밋만 운영 서버에 전달한다.
- 기존 Supabase Auth/DB/Storage를 유지한다. DB/schema 변경이나 데이터 이전은 이번 전환에 없다.
- 2026-09-16 명칭 변경 승인: 앱 이름 CHI Toolbox, 화면 로고 CHI TOOLBOX, 소개 문구는 2026-09-22에 “모든 것을 한 곳에서. 편리하게.”로 변경. 기존 C 아이콘/기능/데이터 유지. 내부 package, 저장 키, 서버 폴더와 작업/서비스 이름은 chi-hub/CHI-HUB를 유지한다.
- 기존 밝은 배경·검정·라임 색상을 유지한다. **8개 기능 중 선택한 화면 하나만 표시**하며 별도 요약 탭이나 전체 패널 나열로 되돌리지 않는다.
- 학식 UI는 대전대학교만 유지한다. 다른 학교 버튼을 임의로 복원하지 않는다.

## 저장소 / 환경

- 현재 개발 PC 경로: `C:\Archive\Project\chi-hub`. 이전 PC 경로와 다르다. 이 PC의 `chi-server` SSH 별칭과 배포용 공개 키 인증을 2026-09-22 구성/검증했다. 새 PC에는 별도 인증 설정 필요.
- 서버 소스 경로: `C:\Services\chi-hub`. SSH alias: `chi-server` (개인 키/계정 정보는 별도 관리).
- 서버는 Node 24.21.0, npm 11.19.0, Git 설치 및 clone 완료. 관리자 SSH 접근 확인.
- Caddy 경로: `C:\Services\chi-hub-caddy`; Caddyfile, data(인증서), logs를 사용한다. Windows 방화벽 CHI-HUB-Web은 Caddy 실행 파일의 TCP 80/443만 허용한다.
- 서버 런타임: `C:\Services\chi-hub-runtime`; releases, active.txt, previous.txt, logs를 사용한다.
- 사용자 확인으로 공유기의 서버 내부 IP 예약 완료. 공인 IP와 WAN IP 일치, 새 .com DNS A 레코드와 공개 HTTPS 연결 확인. IP/MAC 값은 기록하지 않는다.
- 공인 IP는 DHCP이므로 변경 가능. DNS 자동 갱신은 아직 구성하지 않았다.
- 개발 PC에 `.env.local` 없음. 서버는 사용자가 입력한 설정으로 build 및 Supabase Auth settings 조회 HTTP 200을 확인했다. 실제 값은 출력하지 않았다.
- 현재 PC Node는 Codex bundled 24.19.0이며 npm은 PATH에 없다. `node work/npm-tool/package/bin/npm-cli.js`(11.19.0)로 npm을 실행하고 npm ci 완료. 이 임시 경로는 Git에 없으므로 새 PC는 표준 Node/npm 설치 권장. 서버에는 표준 npm.cmd가 있다.
- 현재 PC 저장소에는 `core.longpaths` 명시 설정이 없다. work/는 임시 도구와 QA 캡처로 Git 제외. 재실행 가능한 검사는 scripts/test-workspaces.mjs 및 scripts/trash-worker.test.mjs.

## 스택 / 주요 파일

- TypeScript, React/React DOM/React Server DOM Webpack **19.2.8**
- Vinext **1.0.0-beta.10**, Vite **8.3.0**, RSC plugin **0.5.34**
- Tailwind 4, shadcn/Base UI, Lucide, Supabase JS / SSR, Oxlint/Oxfmt
- Markdown: Tiptap 3.31.3 (React/Markdown/StarterKit/TaskList/Table/Image/Placeholder, 정확한 버전 고정), react-markdown 10.1.0 + remark-gfm 4.0.1, UI 회귀 검사용 devDependency playwright 1.62.1.
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
- 새 도메인 Supabase Site URL 및 `/auth/callback**` Redirect URLs 등록은 사용자 완료 확인.
- 로컬 `localhost:3000/auth/callback`, `127.0.0.1:3000/auth/callback`도 유지한다.
- 앱과 Caddy를 통해 HTTPS로 들어온 요청의 Google OAuth/이메일 확인/로그인 복귀를 확인해야 한다.
- `.env.local` 변경 시 client build에도 포함되므로 다시 build/deploy한다.
- 기존 Sites owner-only 관문은 새 도메인에 적용되지 않는다. 앱 인증/RLS는 유지되며 신규 가입 정책은 Supabase Auth 설정에서 관리한다.

## 현재 구현 동작 (보존)

### 공통 셸

- `app/page.tsx`: AppShell + DashboardWorkspace. globals.css → dashboard.css → workspace.css → desktop.css → mobile.css → enhancements.css 적용. PC/모바일 메뉴는 components/layout에 별도 컴포넌트, 같은 URL·데이터·타이머/편집 상태 공유. 820px 기준 화면 전용 스타일 분리.
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
- 캘린더는 월/주/일정 목록, 오늘/날짜 이동, 검색/기록 종류 필터. 날짜 팝업에서 일정 추가/수정/삭제, 종일 또는 당일 시작·종료 시간, 장소/메모/색상, 매일·매주·매월·매년 반복과 종료일. 반복 일정은 전체 시리즈 단위 수정/삭제, 없는 날짜(31일/윤일)는 건너뜀. 모바일 주 보기는 세로 목록. 다일 일정/알림/외부 캘린더 동기화는 미구현.
- 운동 제목/날짜/시간/메모, 삭제, 최근 7일 요약.
- 메모는 카테고리·검색·고정/격자·목록, 별도 문서 편집. Tiptap 서식 편집/Markdown 원문/읽기 모드, / 블록 메뉴(키보드 이동), 제목·목록·체크리스트·인용·코드·표·링크·실행 취소. Markdown 문자열로 저장하며 편집기는 지연 로드. HTML/각주가 포함된 기존 문서는 원문 모드로 열어 자동 변환을 피함. 지원하지 않는 복잡한 Markdown은 원문 사용. 기존 필기/스티커와 Ctrl+S/자동 저장 유지, 50,000자 초과는 잘라 저장하지 않고 오류 반환.
- use-note-editor: 800ms 자동 저장, 저장 요청 직렬화, 생성 UUID 재사용/POST upsert로 응답 유실 재시도 시 중복 방지, PATCH 응답을 목록에 즉시 반영. Ctrl/⌘+S 즉시 저장, 목록 복귀/새 메모 전 저장 완료 확인. 미저장 내용이 있으면 페이지 이탈 경고.
- 드라이브는 추가 버튼의 anchored 메뉴(파일/폴더), 중첩 폴더 생성·경로 탐색·이름 변경, 파일의 폴더 이동. 현재 폴더로 업로드/드롭, 검색/유형/정렬/격자·목록 유지. 폴더 삭제 시 활성 하위 폴더/파일을 원자적으로 30일 휴지통 이동, 복원 시 부모부터 복원. 별도로 이미 삭제했던 항목의 보관 기간은 유지. 부모가 없어진 파일/폴더는 루트로 복원. 폴더 자체의 다른 폴더로 이동 UI와 로컬 디렉터리 통째 업로드는 미구현.
- 파일 삭제는 확인창 없이 낙관적으로 숨기고 deleted_at 기록, 실패 시 목록 복구. 휴지통에서 30일 이내 복원. 서명 다운로드 URL 5분, 목록 4분 갱신.
- 30일 만료 정리는 scripts/purge-trash.mjs + trash-worker.mjs, CHI-HUB-Trash 일일 작업(04:00). 복원/삭제 경합을 claim으로 방지, Storage API 성공 후 DB 삭제. 서버 전용 키·보호 ACL·NETWORK SERVICE 실행 계정으로 등록 완료, 최초 task 실행 결과 0 확인. 앱 LOCAL SERVICE에는 worker 키 접근 권한 없음.
- 학식 UI는 대전대학교만 제공. 저장값 cbnu/hufs도 dju로 복원.
- 대전대 공식 주간 HTML의 혜화문화관/제2생활관/HRC 파싱. 충북대 파서와 한국외대 위치 안내 API는 서버에 유지.
- 한국외대 날짜별 메뉴는 미확인으로 추정하지 않는다. UI 버튼 복원 없이 요청이 있을 때만 조사.
- 학식 cache: browser 5분/shared 30분/stale 24시간. 과거/다음 주 UI 없음. 외부 HTML 변경에 취약.

## 데이터 모델

supabase/migrations에 0001~0005, 20260922092822_drive_trash.sql, 20260922101159_calendar_details_and_drive_folders.sql이 있다. 새 변경은 새 migration으로 추가한다.

1. profiles, focus_sessions, sleep_logs, routines, routine_checks, workout_logs, notes, files, private Storage/RLS
2. 진행 중 수면, 사용자당 하나 제한, 500 MiB 파일 제한
3. 반복 필드와 daily_tasks
4. calendar_events
5. 메모 유형/카테고리/필기
6. 20260922092822_drive_trash: deleted_at/purge_started_at, 30일 보관 trigger, service_role 전용 만료 claim RPC. 운영 적용·임시 테이블 롤백 검사 완료(사용자 파일 변경 없음).

7. 20260922101159_calendar_details_and_drive_folders: calendar_events 시간/장소/색상/반복, drive_folders + files.folder_id/trash_root_id. 소유자 복합 FK/RLS, 계층 순환·삭제된 목적지 차단 trigger, 계정별 advisory lock, 원자적 폴더 휴지통 RPC, 서비스 전용 만료 폴더 정리. 운영 적용 및 합성 자료 transaction rollback 검증 완료. worker는 Storage 파일 정리가 성공한 뒤 비어 있는 만료 폴더를 정리한다.

API는 서버 세션 사용자를 확인하고 Supabase RLS로 사용자 범위를 제한한다.
2026-09-22 운영 테이블 구조·RLS·비공개 Storage를 조회했고 새 휴지통 migration을 적용했다. 기존 0001~0005는 migration history에 없으므로 db push로 다시 실행하지 않는다. 로컬 CRUD도 운영 데이터를 변경하므로 테스트를 최소화한다.

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

2026-09-16 작업에서 수행한 검증 기록이다. 아래 audit/build/UI 결과를 문서 정리 때마다 다시 실행한 것으로 해석하지 않는다.

- npm audit **0건**. Cloudflare 계열 제거, React/Vinext/Vite/RSC 보안 업데이트, undici 잠금 버전 갱신.
- TypeScript 검사 성공. production standalone 빌드 성공.
- dummy Supabase 설정으로 HTTP smoke: 홈/로그인/학식/manifest, JS asset, 인증 401, legacy 경로, HTTPS proxy callback, 외부 redirect 방어 통과.
- 변경 TS/JS 파일 lint 통과. PowerShell syntax 검사 통과. 별도 서버 테스트 릴리스에서 LOCAL SERVICE task 시작/중지/재시작과 health 확인 완료. 테스트 task는 제거했다.
- 작업 스케줄러 중지만으로 하위 Node가 남는 Windows 동작을 확인해 stop-app.ps1에서 PID/시작 시각/경로 검증 후 종료하도록 보완했다.
- 전체 lint는 기존 8건 유지: calendar API any 1, files img 1, notes save 선언순서/deps 2 및 dialog 1, routines String unknown 2, calendar FormEvent deprecated 1.
- 실제 로그인/Google OAuth/사용자 CRUD/부팅 복구는 아직 확인 필요. 공개 HTTPS는 새 도메인에서 확인 완료. health 성공은 DB 연결 성공을 의미하지 않는다.
- 개발 PC에서는 임시 테스트 환경만 사용했으며 운영 데이터를 변경하지 않았다.
- 2026-09-15 UI의 8개 탭 × 3개 크기, 상태 보존, 키보드, 타이머 portal, 요약 갱신 QA는 이전 작업의 테스트 API 검증 기록이다. 이번에 전체 UI QA를 반복한 것은 아니다.

## 2026-09-22 최신 확장 작업 / 현재 다음 단계

- 삼성 캘린더 참고 일정 탐색/반복/수정, Notion 참고 Markdown 서식·블록 편집, 드라이브 추가 팝업·실제 폴더 계층, PC/태블릿/모바일 반응형 확장 완료. 외부 Samsung/Notion 계정 연동은 아님.
- typecheck, 변경 파일 lint, production build/HTTP smoke 통과. mock 브라우저에서 저장 경합/재시도/Ctrl+S/Markdown HTML 차단, 서식·슬래시, 중첩 폴더 생성/파일 이동, 휴지통 복원/실패 복구/드롭, 반복 일정/수정 검사. 8개 패널 × 360/390/768/1024/1440px 가로 넘침 검사 통과. 날짜 단위 검사 3개 및 기존 worker 검사 3개 통과.
- 새 migration 적용 전 합성 계정·폴더·파일로 SQL transaction rollback 검사: 계층 순환 차단, 재귀 삭제/복원, 삭제된 목적지 업로드 차단, 타 계정 조회/수정/소속 차단. 사용자 실자료 변경 없음. 적용 후 RLS/함수 권한 검증, Advisor 신규 경고 없음(기존 유출 비밀번호 보호 비활성화 1건).
- 최신 확장 웹 배포 완료: c695539, 실행 릴리스 20260922-191648-828-c69553950b99. 서버 npm audit 0건, CHI-HUB-App Running 및 loopback health 정상. 공개 HTTPS health/login/manifest 200, 미인증 folders/files/calendar-events 401 확인. 후속 문서 커밋까지 서버 소스/bundle 동기화. GitHub push는 하지 않음.
- 기존 CHI-HUB-Trash는 NETWORK SERVICE, 매일 서버 현지 04:00. 키는 C:/Services/chi-hub-maintenance/trash.env, 앱 LOCAL SERVICE 접근 차단 유지. 새 worker는 폴더 정리까지 실행하며 작업/키 재등록 불필요.
- 다음: 사용자 계정으로 로그인/OAuth 및 실자료 사용성 확인, 계획된 재부팅 복구 검증. 네이티브/워치 앱 및 보안 안내는 docs/SECURITY_AND_APPS.md. 새 보안 설정이나 외부 서비스 동기화는 이번 범위 아님.

## 이전 운영 상태 (2026-09-16 확인 기록)

인수인계 문서 커밋 9a5e25c까지 로컬/서버 소스 동기화 후 사용자 요청으로 GitHub main에 push했다. 후속 문서 정리도 함께 동기화한다. 아래 실행 빌드와 소스 HEAD 차이는 문서 전용 커밋 때문이며 앱 미배포 변경이 아니다. 정확한 HEAD는 git log로 확인한다.

- CHI Toolbox 명칭/도메인 전환 완료. 서버 runtime은 3edc62f 빌드 릴리스 20260916-170601-382-3edc62fdf13b이며 CHI-HUB-App 실행 중. 이전 릴리스는 rollback용으로 보존.
- Caddy 2.11.4, CHI-HUB-Caddy 자동 시작/복구 서비스. 새 Caddyfile 검증·reload 완료. 기존 설정은 서버 Caddyfile.previous에 보존.
- 문서 정리 시 CHI-HUB-App/Caddy Running, loopback health 정상 및 공개 HTTPS health/login/manifest 200 재확인.
- 직전 배포에서 DNS 연결 및 공개 HTTPS 인증서 검증 성공. HTTP→HTTPS 308, health/login/manifest/공유 이미지 200, 미인증 파일 API 401, 새 도메인 callback 복귀 확인.
- Supabase 설정 변경은 사용자 완료 확인이며 콘솔을 직접 검증한 것은 아니다. 실제 이메일/Google 로그인, 세션 유지, 기존 데이터 조회는 사용자 계정으로 확인 필요. 코드 없는 callback redirect 검증은 실제 OAuth 성공 검증과 다르다.
- 계획된 서버 재부팅 시 CHI-HUB-App/Caddy 자동 복구와 공개 health를 확인한다. 사용자 원격 작업을 끊을 수 있어 임의로 재부팅하지 않는다.
- 직전 배포의 npm audit 0건. 실제 사용자 데이터 생성·변경·삭제 없음.
- GitHub origin/main에 이번 작업을 push했다. 서버의 validation-source/runtime는 이전 dummy 시험 산출물이며 task/프로세스는 제거했다.
- 공인 IP 변경 대응과 로그/릴리스 보관 정책은 후속 운영 과제.

## 최근 핵심 이력

- 2026-09-22 후속: 캘린더 반복/시간/수정/보기 전환, Tiptap 블록 Markdown 편집, 드라이브 폴더와 추가 메뉴, 5개 화면 폭 반응형 검증.
- 2026-09-22: PC/모바일 표시 구조 분리, 메모/드라이브 UI 개편 및 저장 수정, 캘린더 날짜 팝업, 30일 휴지통 DB 적용. 앱·Caddy·자동 정리 worker 배포 및 서비스 계정 실행 검증 완료.

- 2026-09-16: CHI Toolbox 명칭 및 chitoolbox.com 전환, 새 공유 이미지, 서버 배포와 공개 HTTPS 검증 완료.
- 2026-09-16: Windows 자가 호스팅 전환. Node standalone, 보안 의존성 업데이트, loopback/proxy 설정, health/smoke, 릴리스 배포/자동 시작/롤백 스크립트 추가. Sites 배포 중단 결정.
- `c977a79`: 이전 GitHub 동기화 문서. 이번 작업 전 main/origin-main 기준점.
- `235ee93`: 학식 대전대학교 단독 선택, 서버 다른 학교 API 유지. `b840a7b`와 함께 사용자 요청으로 GitHub 동기화.
- `ee8c3e3`: 기존 색상 보존한 그룹 사이드바/상단 요약/컴팩트 UI.
- `606cf7c`: 모든 기능 나열에서 상태 보존 단일 기능 탭으로 전환.
- 이전 Sites 주소는 `https://chi-hub-personal.nolsup0305.chatgpt.site`; project_not_found로 최근 UI/학식 미게시 상태였음. 이제 해당 게시 복구는 작업 목표가 아니다.

## 브랜드 변경 참고

- 이전 chi-hub.kro.kr은 공유 kro.kr 등록 도메인의 Let's Encrypt 발급 한도(429)로 인증서를 발급받지 못했다. 사용자 선택으로 chitoolbox.com 전환을 완료했다.
- CHI Toolbox 명칭, 화면 로고/알림/PWA/메타데이터 변경. 기존 색감의 새 공유 이미지 public/og-toolbox.png 사용. 이전 이미지는 보존.
- 로컬 typecheck/build/HTTP smoke 통과. dummy API로 1440/390px 화면과 manifest/title/login/OG 검증.
- 도메인이 바뀌므로 기존 브라우저 로그인/로컬 타이머·사이드바 상태는 자동 이전되지 않는다. Supabase 저장 데이터는 기존 계정으로 접근한다.
