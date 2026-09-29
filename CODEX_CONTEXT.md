# CHI Toolbox 작업 컨텍스트

> 2026-09-29 (Asia/Seoul) 업데이트. 이 문서는 현재 상태의 요약이며, 실제 Git·소스·서버 상태가 우선이다. 비밀 값과 개인 SSH 접속 정보는 기록하지 않는다.

## 새 PC / 새 Codex 채팅의 시작 순서

1. `AGENTS.md`와 이 문서를 끝까지 읽고 `git status -sb`, `git log -7 --oneline`, 관련 코드를 확인한다. 기존 변경은 보존한다.
2. **2026-09-22 사용자 요청으로 최신 기능·DB·인수인계 문서를 GitHub main에 push했다.** 새 PC는 아래 GitHub clone/pull 절차로 복원할 수 있다. 이후 push도 별도 사용자 요청 범위에서 수행한다.
3. 2026-09-29 복습·메모 휴지통·학식 구분·다운로드·Windows 조작 개선 작업이 추가됐다. 최신 로컬/서버 버전은 아래 운영 상태와 `git log`를 확인한다. GitHub는 마지막 요청된 동기화 `4238593` 상태이며 이후 변경은 명시적 push 요청 없이 올리지 않는다. 문서 전용 커밋 때문에 소스 HEAD와 실행 빌드가 다른 것은 정상이다.
4. 새 PC에는 Git, Node 24 LTS(`>=24.13.0 <25`), npm을 설치한다. Tailscale/SSH 인증 및 `chi-server` 별칭은 별도로 준비한다. 저장소를 받는 것만으로 SSH 설정이나 환경 파일이 복원되지는 않는다.
5. `npm.cmd ci` 실행 후 아래 실행/검증 절차를 따른다. 실제 앱 사용에는 `.env.example`을 참고한 PC 전용 `.env.local`이 필요하다. 운영 Supabase 설정을 사용하면 로컬 CRUD도 실데이터를 바꾼다.
6. 서버 앱/Caddy/휴지통 작업/키 설정과 적용된 migration은 이미 준비되어 있다. 새 채팅에서 초기 설치나 키 입력을 반복하지 않는다. 최신 배포 상태와 남은 확인 사항은 아래 절을 따른다.

### GitHub 소스 복원 (2026-09-22 기준, PowerShell)

2026-09-29 확장까지 복원하려면 아래 Git bundle 절차를 사용한다. 이번 작업은 GitHub push 요청이 없어 로컬/서버에만 전달했다.

새 빈 작업 폴더의 상위 디렉터리에서 실행한다:

```powershell
git clone https://github.com/ClCl616/chi-hub.git
Set-Location chi-hub
git status -sb
git log -7 --oneline
npm.cmd ci
```

기존 clone은 사용자 변경을 먼저 보존하고 main에서 `git pull --ff-only origin main`으로 갱신한다. 분기가 갈라졌다면 강제 덮어쓰지 않는다. GitHub에는 비밀 값/SSH 설정/환경 파일이 없으므로 아래 환경 준비도 필요하다.

### 대체 복원: Git bundle (PowerShell)

SSH 접근이 준비된 새 PC에서 대상 폴더의 상위 디렉터리에서 실행한다:

```powershell
scp chi-server:C:/Services/chi-hub-windows.bundle ./chi-hub-windows.bundle
git bundle list-heads ./chi-hub-windows.bundle
git clone -b main ./chi-hub-windows.bundle chi-hub
Set-Location chi-hub
git remote set-url origin https://github.com/ClCl616/chi-hub.git
git status -sb
git log -7 --oneline
npm.cmd ci
```

- 서버 접근이 없으면 현재 개발 PC의 `outputs/chi-hub-windows.bundle`을 안전하게 전달받아 같은 방식으로 복원한다. 서버와 이 로컬 bundle에는 이 문서의 커밋까지 포함한다.
- bundle에는 main과 Git 이력이 포함된다. `.env.local`, SSH 키, worker 키, node_modules, 빌드, `work/` QA 캡처/임시 스크립트는 포함되지 않는다. `clone -b main`을 사용한다.
- GitHub main은 마지막 승인된 2026-09-22 소스까지 전달돼 있다. 이후 확장은 로컬/서버 bundle로 복원한다. bundle 복원 직후 origin의 ahead/behind 숫자만으로 최신 여부를 판단하지 말고 필요하면 `git fetch origin`으로 원격 추적 정보를 갱신한다.

기존 clone을 갱신할 때는 먼저 작업 트리가 깨끗한지와 현재 브랜치를 확인한 뒤 실행한다:

```powershell
git status -sb
git branch --show-current
git fetch C:/path/to/chi-hub-windows.bundle main
git merge --ff-only FETCH_HEAD
npm.cmd ci
```

경로는 전달받은 실제 bundle로 바꾼다. 분기나 사용자 변경이 있으면 강제 reset/덮어쓰기를 하지 않는다.

## 프로젝트와 유지할 사용자 결정

CHI Toolbox는 한국어 개인용 PWA다. 타이머, 루틴/데일리 할 일, 캘린더, 메모, 복습/학습, 수면, 운동, 비공개 드라이브, 학식의 9개 기능을 제공한다.

- 운영은 집의 Windows 서버, 공개 주소는 `https://chitoolbox.com`. Tailscale/SSH는 관리 전용이다. Sites에 게시하지 않는다. `.openai/hosting.json`은 과거 기록이다.
- PC·모바일은 **같은 URL에서 전용 UI를 분리하고 데이터·저장 상태는 공유**한다. 밝은 배경/검정/라임, 기존 C 아이콘을 유지한다.
- 화면에는 선택한 기능 하나만 표시한다. 별도 요약 탭이나 전체 기능 나열로 되돌리지 않는다. 비선택 탭도 keepMounted로 타이머/메모 상태를 보존한다.
- 표시 이름은 CHI Toolbox / CHI TOOLBOX, 소개 문구는 “모든 것을 한 곳에서. 편리하게.”. 내부 package/서버 경로/작업 이름은 chi-hub/CHI-HUB 유지.
- 드라이브 삭제는 브라우저 확인창 없이 휴지통으로 이동, **30일 보관** 후 일일 작업으로 영구 삭제한다.
- 학식 화면은 대전대학교만 제공한다. 다른 학교 선택 버튼을 임의 복원하지 않는다.
- 삼성 캘린더/삼성 노트/Notion/Google Drive는 기능·UI 참고 대상이다. 이 서비스들과 계정/데이터를 연동한 것은 아니다.
- 변경 검증 후 로컬 커밋 → bundle/SSH → Windows 서버 반영. GitHub push는 명시적 사용자 요청 시만 허용한다.

## 현재 운영 상태와 환경 구분

2026-09-29 확장 `eb13304`와 간접 의존성 보안 패치 `60d70d8`의 로컬 검증·DB migration·Windows 배포를 완료했다. 아래 실행 빌드를 공개 HTTPS에서 확인했으며 후속 문서 커밋은 앱 재시작 없이 소스/bundle만 동기화한다. GitHub는 마지막 승인된 `4238593` 상태를 유지한다.

| 항목 | 현재 상태 |
| --- | --- |
| 실행 빌드 | `60d70d8` (기능 `eb13304` + 의존성 패치) |
| 실행 릴리스 | `C:/Services/chi-hub-runtime/releases/20260929-163849-043-60d70d8ea60c` |
| 서버 소스 | `C:/Services/chi-hub` |
| 앱 | CHI-HUB-App, LOCAL SERVICE, Running, `127.0.0.1:3000` health 정상 |
| HTTPS | CHI-HUB-Caddy 서비스 Running, Caddy 2.11.4 |
| Caddy 경로 | `C:/Services/chi-hub-caddy`의 Caddyfile/data/logs |
| 휴지통 작업 | CHI-HUB-Trash, NETWORK SERVICE, 매일 서버 현지 04:00, Ready |
| 마지막 작업 실행 | 2026-09-29 04:00:02, LastTaskResult 0; 파일/폴더 정리 예약 실행 확인 |
| 다음 작업 실행 | 2026-09-30 04:00; 이번 메모 정리가 포함되는 첫 예약 실행은 이후 확인 |
| 서버 도구 | Node 24.21.0 / npm 11.19.0 |
| 현재 개발 PC | `C:/Archive/Project/chi-hub`, `.env.local` 없음 |

- 현재 PC는 Node 24.19.0을 사용하고 npm이 PATH에 없어 `node work/npm-tool/package/bin/npm-cli.js`(11.19.0)를 사용했다. 이 임시 경로에 새 PC가 의존해서는 안 된다. 아래 명령은 표준 `npm.cmd` 기준이다.
- 앱 환경은 `.env.example`의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. 공개 anon/publishable key만 사용하고 service_role/secret key를 앱에 넣지 않는다.
- worker만 서버 전용 `C:/Services/chi-hub-maintenance/trash.env`의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 사용한다. 키 설정 완료. 보호 ACL과 NETWORK SERVICE 읽기 권한, 앱 LOCAL SERVICE 접근 차단을 유지한다. 실제 값을 출력/커밋하지 않는다.
- Google OAuth: 운영 도메인 Site URL/콜백 등록은 사용자 완료 확인. 로컬 localhost/127.0.0.1 콜백도 유지한다. 실제 계정 로그인 검증은 아직 별도 필요하다.
- `.env.local` 공개 값은 client build에 포함되므로 환경 변경 시 재빌드 필요. 서버 환경/릴리스는 별도 보관하며 bundle에 포함하지 않는다.
- 공인 IP는 DHCP이고 DNS 자동 갱신은 미구현. 공유기 서버 내부 IP 예약은 사용자 완료 확인. 앱 개발 서버나 포트 3000/13000을 공개하지 않는다.

## 코드 구조와 구현 완료 내용

스택: React/React DOM/RSC 19.2.8, Vinext 1.0.0-beta.10, Vite 8.3.0, TypeScript 5.9.3, Tailwind 4, Base UI 1.7.0, Supabase JS/SSR. Tiptap 패키지는 3.31.3 고정, 읽기는 react-markdown 10.1.0/remark-gfm 4.0.1. 브라우저 회귀 검사는 Playwright 1.62.1.

- 2026-09-29 의존성 감사에서 `shadcn → @modelcontextprotocol/sdk → ajv → fast-uri`의 취약점 1건이 확인돼 잠금파일의 fast-uri만 3.1.6→3.1.8로 갱신했다. 앱 소스/standalone에서 이 패키지 참조는 확인되지 않았다. 로컬/서버 npm audit는 0건이며 [공식 보안 안내](https://github.com/advisories/GHSA-qw65-cvwx-89v3)의 수정 범위에 해당한다.

### 공통 셸과 반응형

- `app/page.tsx`, AppShell/DashboardWorkspace, `components/layout/desktop-navigation.tsx`, `mobile-navigation.tsx`.
- CSS 순서: globals → dashboard → workspace → desktop → mobile → enhancements → productivity. 820px 기준 전용 메뉴/화면, 중간 태블릿 폭 보정. 복습·학식 구분·키보드 스타일은 `app/productivity.css`.
- 탭 쿼리: `?view=focus|morning|calendar|notes|study|sleep|workouts|files|meals`. 기본 focus, 뒤로 가기/기존 개별 경로 redirect, 로그인 복귀 시 쿼리/해시 보존.
- 요약은 API 변경 이벤트로 갱신, 조회 실패는 0 대신 대시. 사이드바 상태 키는 `chi-hub-sidebar`.

### 캘린더

- `components/calendar-workspace.tsx`, `lib/calendar.ts`, `app/api/calendar/route.ts`, `app/api/calendar-events/route.ts`.
- 월/주/일정 목록, 오늘/날짜 이동, 검색/종류 필터, 전체 폭 달력. 모바일 주 보기는 세로 목록.
- 날짜 팝업에서 일정 추가/수정/삭제, 종일/당일 시작·종료 시간, 장소·메모·색상, 매일/매주/매월/매년 반복과 종료일.
- 반복은 별도 행을 대량 생성하지 않고 시작일과 규칙을 저장해 화면 날짜마다 계산한다. 수정/삭제는 전체 시리즈에 적용. 월말 31일/윤일처럼 없는 날짜는 건너뛴다.
- 일정·루틴·할 일·수면·집중 기록 통합. 다일 일정, 단일 반복 회차 예외, 알림, 외부 캘린더 동기화는 미구현.

### 메모

- `components/notes-workspace.tsx`, 지연 로드하는 `rich-note-editor.tsx`, `hooks/use-note-editor.ts`, `app/api/notes/route.ts`.
- 카테고리/검색/고정/격자·목록, 별도 문서 편집. 서식 편집/Markdown 원문/읽기 모드, `/` 블록 메뉴와 키보드 선택, 제목·목록·체크리스트·인용·코드·표·링크·실행 취소.
- DB에는 Markdown 문자열 저장. HTML/각주가 감지된 기존 문서는 원문 모드로 연다. 복잡한 비지원 문법은 원문 유지 권장; 서식 편집 시 지원 블록 기준으로 정규화될 수 있다. 읽기 모드는 raw HTML 실행 차단. 기존 스티커/필기 유지.
- 800ms 자동 저장, Ctrl/⌘+S, 저장 요청 직렬화. 새 메모 UUID 재사용/POST upsert로 재시도 중복 방지. 제목 변경 PATCH 응답을 목록에 즉시 반영한다.
- 목록 복귀/다른 메모 열기 전 저장 완료 확인, 미저장 시 이탈 경고. 50,000자 초과 저장은 절단 대신 오류 반환.
- 삭제는 `deleted_at` 기반 휴지통 이동. 메모 탭 휴지통에서 내용/필기를 확인하고 30일 이내 복원한다. DB trigger와 활성 항목 API 필터가 삭제 후 자동 저장 및 만료 복원을 차단한다. worker의 `purge_expired_notes`가 만료 메모를 정리한다. 이 기능 적용 전에 이미 영구 삭제된 메모는 복구할 수 없다.

### 복습 / 학습

- `components/study-workspace.tsx`, `app/api/study/route.ts`, `lib/study.ts`. 학습 제목/과목/내용/복습일 등록·수정, 오늘(밀린 항목 포함)/전체/보관함, 제목 검색과 30개 단위 페이지 이동.
- 내용을 먼저 떠올리고 공개한 뒤 다시 학습/기억했어요/쉬웠어요 평가. 일반 진행 간격은 1→3→7→14→30→60일이며, 다시 학습은 1일 후/단계 초기화, 쉬움은 2단계 진행한다. 날짜는 브라우저 현지 날짜 기준이다.
- `study_items`, `study_reviews`는 사용자별 RLS와 소유자 복합 FK를 사용한다. review RPC는 row lock, 예상 복습 횟수, 동일 요청 UUID 재사용으로 중복 진행을 막는다. 수정/보관은 updated_at 비교로 오래된 화면의 덮어쓰기를 차단한다. 생성 재시도도 같은 UUID를 유지한다.
- 최근 전체 복습 기록 20개 내 해당 항목 기록을 표시한다. 외부 학습 서비스 연동·알림·메모 자동 연결·학습 항목 영구 삭제 UI는 없다. 보관함에서 학습을 중단/재개한다.

### Windows 마우스 / 키보드

- `components/workspace-shortcuts.tsx`: 화면 제목 옆 단축키 버튼, Ctrl+K 작업 검색·전환, F1 도움말, Alt+1~9 탭 이동, Ctrl+Shift+F 현재 화면 검색, Alt+N 새 항목/드라이브 추가 메뉴. 메모 Ctrl+S와 팝업 Esc 유지.
- 한글 조합 중, AltGr, 반복 키, 팝업/메뉴에서는 전역 단축키를 무시한다. 입력 요소에서는 Alt 작업 이동을 가로채지 않는다. 기존 브라우저 뒤로 가기와 마우스 뒤로 버튼은 쿼리 기반 작업 이동에 적용된다.
- 드라이브 폴더 버튼에서 F2 이름 변경·Delete 휴지통, 파일 다운로드 링크에서 Enter 다운로드·Delete 휴지통. 키보드 포커스 강조, 마우스 hover, Segoe UI/Malgun Gothic 폴백, 고대비·모션 감소 환경을 지원한다. 네이티브 Windows 앱으로 변환한 것은 아니다.

### 드라이브 / 휴지통

- `components/files-workspace.tsx`, `app/api/files/route.ts`, `app/api/folders/route.ts`.
- ‘추가’ 버튼 위치에 열리는 메뉴로 파일/폴더 추가. 중첩 폴더 생성·경로 탐색·이름 변경·파일 이동. 기존 파일은 folder_id=null인 루트에 유지.
- 현재 폴더에 파일 업로드/드래그앤드롭, 검색/유형/정렬/격자·목록, 파일당 500 MiB. private-files 비공개 bucket/사용자 경로 정책 유지. 파일 목록은 4분마다 갱신.
- 이미지 미리보기 서명 URL은 5분. 다운로드는 `/api/files/download?id=...`에서 로그인/소유권/휴지통 상태 확인 후 새 60초 Storage 서명을 발급하고 스트리밍한다. `Content-Disposition`의 UTF-8 filename*로 한글·공백 포함 원본 파일명을 보존하고 브라우저 전체 파일 메모리 적재를 피한다. 다운로드 트래픽은 Windows 앱을 경유한다.
- 파일 삭제는 즉시 화면에서 숨기고 deleted_at 저장, 실패 시 목록 복구. 폴더 삭제는 활성 하위 폴더/파일을 원자적으로 휴지통 이동. 별도 삭제했던 항목의 보관 시각은 바꾸지 않는다.
- 30일 이내 복원. 폴더는 부모부터 복원, 원래 부모가 삭제된 항목은 루트로 복원. 폴더 자체 이동 UI와 로컬 디렉터리 통째 업로드는 미구현.
- `scripts/purge-trash.mjs` → `trash-worker.mjs`: 만료 파일 claim → Storage API로 바이트 삭제 → DB 메타데이터 삭제. 실패는 재시도 가능하도록 보존. 이후 자식/파일이 없는 만료 폴더를 아래에서 위로 정리한다. Storage 객체를 SQL로 직접 삭제하지 않는다.
- worker는 서버 소스의 스크립트를 실행하므로 소스 변경도 예약 작업에 반영된다. 작업/키 재등록은 불필요하다.

### 기존 기능에서 보존할 동작

- 집중/휴식 타이머는 `chi-hub-focus-timer-v2` 종료 시각으로 새로고침/백그라운드 복원. 완료 팝업은 body portal이라 숨겨진 탭에서도 표시.
- 루틴의 일간/요일 반복 및 날짜별 daily_tasks, 수면 시작/종료/직접 기록(진행 기록은 사용자당 하나), 운동 기록/최근 7일 요약 유지.
- 학식은 대전대 공식 HTML에서 혜화문화관/제2생활관/HRC 파싱. 기존 cbnu/hufs 저장 선택도 dju로 복원. 타 학교 서버 코드는 남아 있지만 UI 복원 금지. 브라우저 5분/서버 30분/stale 24시간 cache, 외부 HTML 변경에 취약.
- 학식은 조식/중식/석식별 제목·아이콘·테두리와 식사 필터로 구분한다. 아침/점심/저녁 별칭도 인식하며 복합/미분류 표기는 원문을 유지해 기타 식사로 표시한다. 없는 식사는 미공개 안내를 보여준다.

## DB 변경 이력과 주의점

- 기존 `0001`~`0005`: 사용자 자료/Storage/RLS, 수면 제한/500 MiB, 반복 루틴/daily_tasks, calendar_events, 메모 유형/카테고리/필기.
- `20260922092822_drive_trash.sql`: files.deleted_at/purge_started_at, 30일 보관 trigger, service_role 전용 claim_expired_files. 운영 적용 완료.
- `20260922101159_calendar_details_and_drive_folders.sql`: 일정 시간/장소/색상/반복, drive_folders, files.folder_id/trash_root_id. 소유자 복합 FK/RLS, 계층 순환/삭제된 목적지 차단, 계정별 advisory lock, 원자적 폴더 삭제·복원 RPC, 서비스 전용 purge_expired_folders. 운영 적용 완료.
- `20260929071714_study_and_note_trash.sql`: notes.deleted_at/보관 trigger/서비스 전용 purge_expired_notes, study_items/study_reviews/RLS 및 원자적 review_study_item. 운영 적용 완료. CLI로 생성한 파일은 MCP가 실제 적용한 migration version과 일치하도록 이름을 맞췄다.
- 기존 0001~0005는 실제 테이블이 존재하지만 migration history에 없다. **db push로 전체 migration을 다시 실행하지 않는다.** 새 schema 변경만 새 migration으로 만들고 실제 이력/정책을 확인한다.
- 최근 적용 시 files/drive_folders/calendar_events RLS 활성, anon의 폴더 RPC 실행 및 authenticated의 영구 폴더 정리 실행 차단 확인. API는 getAuthContext로 사용자를 확인한다.
- Supabase security Advisor는 2026-09-29 재확인했으며 새 경고 없이 기존 [유출 비밀번호 보호 비활성화](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) 1건을 유지한다.

## 새 PC에서 실행 / 검증

실제 앱 개발은 별도 준비한 로컬 `.env.local`과 함께:

```powershell
npm.cmd ci
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

사용자 자료에 접근하지 않는 검증은 별도 PowerShell에서 dummy 설정으로 실행한다. 실제 환경 파일을 덮어쓰지 않으며, 검증용 셸은 종료 후 폐기한다:

```powershell
npm.cmd run typecheck
node --test scripts/calendar.test.mjs scripts/trash-worker.test.mjs scripts/productivity.test.mjs
$env:NEXT_PUBLIC_SUPABASE_URL='https://smoke-test.invalid'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='smoke-test-anon-key'
$env:NEXT_PUBLIC_SITE_URL='https://chitoolbox.com'
npm.cmd run build
node scripts/smoke-server.mjs
```

브라우저 회귀 검사는 dummy 설정의 개발 서버를 별도 셸에 실행한다:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='https://smoke-test.invalid'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='smoke-test-anon-key'
$env:NEXT_PUBLIC_SITE_URL='http://127.0.0.1:13002'
npm.cmd run dev -- --hostname 127.0.0.1 --port 13002
```

다른 셸에서 설치된 Microsoft Edge를 사용한다:

```powershell
$env:TEST_BROWSER='msedge'
node scripts/test-workspaces.mjs
```

Edge가 없으면 `npx.cmd playwright install chromium`으로 브라우저를 설치하고 TEST_BROWSER를 `chromium`으로 사용한다. 이 스크립트는 localhost만 허용하며 `/api/**`를 mock한다. UI 검사 결과가 실제 로그인/운영 Storage CRUD 성공을 의미하지 않는다. 캡처는 Git 제외 `work/qa/`에 생성한다.

- `scripts/test-drive-folders.sql`: 합성 계정/자료로 계층·복원·RLS 검사. 단독 실행하면 안 되며 **명시적인 BEGIN/ROLLBACK 안에서** 실행한다. 정기 자동 테스트가 아니다. 기존 `scripts/test-trash.sql`도 롤백 검사용이다.
- `scripts/test-study-notes.sql`은 BEGIN/ROLLBACK을 포함한 전체 파일로 실행한다. 합성 계정으로 간격/중복/오래된 복습/보관/RLS/메모 복원·만료/RPC 권한을 검사한다. 실제 사용자 자료를 만들거나 변경하지 않는다.
- 브라우저 검사에서 Edge 다운로드는 인터셉트 밖의 재요청이 발생하므로 다운로드 링크 경로 검증 후 별도 loopback HTTP fixture로 UTF-8 파일명/실제 바이트를 검사한다. 이것은 실제 운영 로그인·Storage 다운로드 검증을 대신하지 않는다.
- 전체 `npm.cmd run lint`는 현재 `app/api/routines/route.ts`의 no-base-to-string 2건(42/91행)이 남는다. 이번 문서 정리에서 다시 확인했다. 이전 문서의 8건/3건은 오래된 결과다.
- `git diff --check`, `git status -sb`로 변경 범위를 확인한다. 문서만 변경한 작업에서는 앱 빌드/CRUD를 불필요하게 반복하지 않는다.

## 배포 / 다른 PC로 전달

`deploy/windows/README.md`에 운영 명령이 있다. 그 문서의 2026-09-16 전환 당시 린트/DB 변경 없음 문구는 과거 범위이며 현재 상태는 이 문서를 따른다.

1. 로컬 검증 → 커밋 → `git bundle create outputs/chi-hub-update.bundle main` → SSH로 서버 전달.
2. 서버 `C:/Services/chi-hub`의 사용자 변경 유무 확인 → bundle fetch → `git merge --ff-only FETCH_HEAD`. 실패 시 강제 reset 금지.
3. 코드/의존성/앱 환경 변경이면 `powershell -NoProfile -ExecutionPolicy Bypass -File deploy/windows/deploy.ps1` 실행. clean source에서 npm ci/build, 후보 포트 13000 health 검사 후 active 전환. 이전 릴리스 보존.
4. **문서만 변경하면 소스/bundle 동기화만 수행**하고 앱 재시작하지 않는다. 다른 PC용 `C:/Services/chi-hub-windows.bundle`과 개발 PC `outputs/chi-hub-windows.bundle`도 최종 커밋으로 갱신한다.
5. `active.txt`, 앱/Caddy 상태, loopback/public health를 확인한다. `rollback.ps1`은 앱 빌드 복구이며 DB rollback이 아니다. 중지는 PID를 검증하는 `stop-app.ps1` 사용.

복잡한 원격 PowerShell은 UTF-16LE Base64 `-EncodedCommand`로 전달하면 중첩 인용 문제를 줄일 수 있다. `work/`의 이전 임시 배포/키 설정 스크립트는 bundle에 없으며 새 PC 필수 도구로 취급하지 않는다.

## 검증 완료 / 남은 확인 사항

### 2026-09-29 확장에서 완료

- 타입 검사, 변경 파일 lint, 단위 검사 9개, production build/HTTP smoke 통과. 기존 큰 chunk 경고와 routines lint 2건은 그대로다.
- 브라우저: 기존 메모 저장/Markdown·드라이브·일정 회귀, 메모 휴지통/복원 실패 재시도, 복습 추가/수정/평가/보관/재개, 학식 식사 필터, 한글 파일명과 다운로드 바이트, 단축키 및 입력/팝업 보호 확인.
- 9개 화면 × 360/390/768/1024/1440px 가로 넘침 검사와 PC/모바일 캡처 확인.
- 새 migration 적용 및 합성 자료 SQL 트랜잭션 롤백 검사 통과. 보안 Advisor 새 경고 없음(기존 유출 비밀번호 보호 비활성화 1건 유지).
- 운영 사전 확인: 서버 clean/소스 4238593, 앱/Caddy 실행, health 정상. 파일/폴더 worker의 2026-09-29 04:00 실행 결과 0. 이번 메모 worker 확장은 다음 실행 결과 확인 대상이다.
- 최종 배포: 실행 빌드 `60d70d8`, 앱/Caddy Running, 앱 수신 `127.0.0.1:3000`만 존재, 후보 포트 13000 종료. 공개 health/login/study URL/manifest 200, 미인증 study/notes trash/download API 401. 서버 audit 0건. 실제 계정 로그인·Storage 다운로드는 별도 실사용 확인 대상이다.
- 드라이브 F2 이름 변경 및 파일/폴더 Delete 휴지통 단축키까지 브라우저에서 확인했다. 이 작업에서 시작한 로컬 QA 서버는 종료했다.

### 2026-09-22 기능 작업에서 완료

- typecheck, 변경 파일 lint, production build/HTTP smoke, npm audit 0건. 빌드는 일부 500 kB 초과 chunk 경고가 있지만 성공했으며 메모 편집기는 지연 로드한다.
- 날짜 단위 검사 3개/worker 검사 3개. 브라우저에서 제목 갱신·저장 경합·Ctrl+S·재시도·Markdown HTML 차단·서식/슬래시, 중첩 폴더 생성/파일 이동, 휴지통 복원/실패 복구/드롭, 반복 일정/수정 검사.
- 8개 패널 × 360/390/768/1024/1440px 가로 넘침 검사, 메모/드라이브/캘린더 캡처 확인.
- migration 적용 전 합성 자료 transaction rollback으로 순환 차단, 재귀 삭제/복원, 삭제된 목적지 및 타 계정 접근 차단 검사. 실제 사용자 자료를 테스트용으로 변경하지 않음.
- Windows 운영 배포, 공개 HTTPS health/login/manifest 200, 미인증 folders/files/calendar-events 401 확인. Caddy 보안 헤더와 worker 계정 분리는 앞선 배포에서 완료.
- 이번 **문서 정리**에서는 Git/실제 코드/전체 lint/서버 소스·bundle·실행 릴리스·서비스/작업 상태를 다시 확인했다. 위 기능 테스트와 빌드를 전부 다시 실행한 것은 아니다.

### 다음 작업 후보와 실제 제약

1. 사용자 계정 로그인/Google OAuth, 기존 자료 및 새 UI의 실사용 확인. health 성공은 DB/Auth/Storage 전체 성공이 아니다.
2. 메모 정리가 추가된 CHI-HUB-Trash의 다음 예약 실행 결과 확인. 파일/폴더 정리는 2026-09-29 정기 실행 결과 0을 확인했다.
3. 계획된 서버 재부팅 후 앱/Caddy 자동 복구 확인. 사용자 원격 작업을 끊을 수 있으므로 임의 재부팅하지 않는다.
4. 코드 확인상 캘린더의 수면/집중 날짜는 timestamp 문자열의 앞 10자를 사용한다(`app/api/calendar/route.ts`). 사용자 현지 날짜 변환이 아니므로 자정 부근 날짜 표시 확인/보완 후보다. 이번 문서 작업에서 수정하지 않았다.
5. 목록 API는 페이지네이션이 없다: 메모 200개, 파일 1000개, 폴더 요청 5000개이며 실제 반환에는 Supabase 설정 상한도 적용될 수 있다. 대량 자료 탐색/검색 범위 개선은 후속 과제다.
6. 기존 routines 린트 2건, 복잡한 Markdown 호환성, 큰 client chunk, 공인 IP/DNS 변경 대응, 로그/릴리스 보관 정책은 후속 개선 후보다.
7. 모바일은 PWA이며 네이티브 모바일/워치 앱은 아직 만들지 않았다. 관련 보안·확장 안내는 `docs/SECURITY_AND_APPS.md`.

2026-09-29 요청한 기능과 의존성 패치는 검증·운영 배포까지 완료되었다. 위 후속 후보는 사용자가 요청하지 않은 새 개발 목표로 자동 확대하지 않는다.

## 최근 핵심 이력

- `eb13304`: 간격 복습, 메모 30일 휴지통, 식사별 학식 구분, 원본 파일명 다운로드, Windows 단축키/포커스. 새 DB migration과 회귀 검사 포함, 운영 반영 완료.
- `60d70d8`: fast-uri 간접 의존성 보안 패치, 로컬/서버 audit 0건 및 재배포. 이후 문서 전용 배포 기록 커밋이 이어진다.

- `c695539`: 캘린더 보기/시간/반복/수정, Tiptap 블록 Markdown, 실제 드라이브 폴더와 추가 메뉴, 반응형 확장. 운영 반영 완료.
- `151e06f`: 해당 확장의 검증/배포 문서. 이후 인수인계 문서 정리 커밋이 이어진다.
- `6cd7d0c`, `50e8b81`, `82aad99`: PC/모바일 분리, 메모 저장 수정, 날짜 팝업, 드롭/30일 휴지통, Caddy 보안 헤더, worker 계정 분리 및 배포 기록.
- `4b0a829` 및 후속 안내 문서: 실제 상태 기준 인수인계 정리 후 사용자 요청으로 GitHub main 동기화.
- `4130e9d`: 2026-09-16 Windows 자가 호스팅/도메인/브랜드 전환 후 문서. 상세 과거 이력은 git log를 확인한다.
