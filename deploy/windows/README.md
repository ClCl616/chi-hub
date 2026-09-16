# Windows 운영 안내

운영 주소: https://chi-hub.kro.kr. 앱은 집의 Windows PC에서 실행하고,
Tailscale + SSH(`ssh chi-server`)는 관리/배포에만 사용한다.
이전 Sites 배포는 사용하지 않는다. `.openai/hosting.json`은 이전 배포의 기록이다.

## 준비

- Node.js 24 LTS, Git. 서버에서 확인한 버전은 Node 24.21.0 / npm 11.19.0.
- 소스: `C:\Services\chi-hub`, 운영 릴리스: `C:\Services\chi-hub-runtime`.
- 공유기의 서버 내부 IP 예약은 사용자 확인으로 완료. 실제 네트워크 값은 문서에 저장하지 않는다.
- `.env.example`을 `.env.local`로 복사하고 기존 Supabase 프로젝트의 공개 URL/anon 또는 publishable key를 입력한다.
- 사이트 URL 값은 `https://chi-hub.kro.kr`. 환경 변수 이름은 `.env.example` 참고.
- service_role/secret 키는 사용하지 않는다. 환경 파일은 Git, bundle, 채팅에 포함하지 않는다.
- 이 환경은 운영 DB를 사용하므로 마이그레이션을 다시 실행하거나 테스트 레코드를 임의 생성하지 않는다.

## 최초 배포 (서버의 관리자 PowerShell)

```powershell
Set-Location C:\Services\chi-hub
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\windows\deploy.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\windows\install-app-task.ps1
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

`deploy.ps1`은 clean worktree에서 잠금파일대로 설치하고 production build를 만든다.
별도 릴리스 디렉터리에 빌드/환경 파일을 복사하고 포트 13000에서 상태 검사를 수행한 후
active.txt를 갱신한다. 기존 앱은 빌드 중 계속 실행된다. 변경 적용 시 짧은 중단이 있다.
실패한 후보와 이전 릴리스는 자동 삭제하지 않는다.

`CHI-HUB-App` 작업은 부팅 시 LOCAL SERVICE 권한으로 실행된다. 로그인은 필요 없다.
앱이 비정상 종료되면 1분 간격으로 최대 999회 재시도한다.
앱 중지는 `stop-app.ps1`을 사용한다. 작업 스케줄러만 중지하면 하위 Node가 남을 수 있다. 이 스크립트는 기록된 PID/시작 시각/실행 경로를 검증한 뒤 해당 프로세스만 종료한다. 수동 중지 후에는 자동 재시작하지 않는다. 시작은 `Start-ScheduledTask -TaskName CHI-HUB-App`.
로그: `C:\Services\chi-hub-runtime\logs`. 로그/오래된 릴리스 정리는 운영자가 주기적으로 수행한다.
서버 재부팅 후 task와 /api/health 확인은 실제 운영 전 수행한다.

## HTTPS (앱 로컬 검증 후)

1. 관리자 PowerShell에서 `powershell -NoProfile -ExecutionPolicy Bypass -File deploy\windows\install-caddy.ps1` 실행. 공식 Caddy 2.11.4 Windows x64 zip의 SHA-512 checksum을 검증하고 설치한다. 실패 후 같은 설치를 재개할 때만 디렉터리를 확인하고 `-Resume`을 사용한다.
2. Caddy 설정은 `C:\Services\chi-hub-caddy\Caddyfile`, 인증서 저장은 data, 로그는 logs에 둔다. installer가 설정 검증, LOCAL SERVICE의 CHI-HUB-Caddy 자동 시작 서비스 및 장애 재시작을 구성한다. 초기에는 서비스를 시작하지 않는다.
3. 도메인 A 레코드를 집의 공인 IPv4로 유지한다. 잘못된 AAAA 레코드를 만들지 않는다.
4. 공유기 TCP 80/443을 서버 내부 IP의 80/443으로 전달한다. Windows 방화벽도 해당 포트를 허용한다.
5. 공유기/방화벽 설정 후 `Start-Service CHI-HUB-Caddy` 실행. 인증서는 Caddy가 발급/갱신한다. 오류는 `C:\Services\chi-hub-caddy\logs\caddy.log` 확인. 공식 Windows 서비스 안내: https://caddyserver.com/docs/running#sc-exe
6. 앱은 127.0.0.1:3000만 수신한다. 3000/13000을 포트포워딩하지 않는다.
7. Supabase Authentication > URL Configuration에서 Site URL을 새 HTTPS 주소로 설정한다.
   Redirect URLs에 `https://chi-hub.kro.kr/auth/callback`과 코드가 쓰는 `?next=...` 경로를 허용한다
   (예: `https://chi-hub.kro.kr/auth/callback**`). 기존 localhost/127.0.0.1 콜백은 유지한다.
8. 휴대폰 LTE/5G에서 HTTPS, 기존 계정 로그인, Google OAuth, 파일 다운로드를 확인한다.

Caddy가 HTTPS를 종료하므로 앱 시작 스크립트가 사이트 호스트에 대해서만 forwarded host를 신뢰한다.
Supabase OAuth provider의 프로젝트 callback 자체는 같은 Supabase 프로젝트를 유지하므로 보통 그대로다.
외부 서비스 로그인과 사용자 데이터 동작은 실제 계정으로 별도 검증해야 한다.
공인 IP가 바뀌면 A 레코드를 갱신해야 한다. DNS 자동 갱신은 아직 구현하지 않았다.

## 여러 PC에서 개발 / 서버 업데이트

개발 PC에서는 변경 전 pull, 변경 후 build/typecheck와 관련 검증, commit을 수행한다.
GitHub push는 사용자가 요청한 경우만 수행한다. 서버에서 개발하거나 강제 reset하지 않는다.

GitHub 동기화 없이 전달하려면 개발 PC에서 명시적인 source bundle을 만든다:

```powershell
git bundle create outputs/chi-hub.bundle main
scp outputs/chi-hub.bundle chi-server:C:/Services/chi-hub-update.bundle
```

서버에서:

```powershell
Set-Location C:\Services\chi-hub
git status -sb
git fetch C:/Services/chi-hub-update.bundle main
git merge --ff-only FETCH_HEAD
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\windows\deploy.ps1
```

기존 사용자 변경이나 분기가 있으면 중단하고 보존한다. origin/main은 마지막 GitHub 조회 상태이므로
bundle 반영 후 로컬 main보다 뒤에 있을 수 있다. 서버의 설정/환경 파일은 각 PC와 별도 관리한다.
환경을 바꾸면 브라우저 코드에 공개 설정이 포함되므로 반드시 다시 빌드/배포한다.

## 이전 버전 복구

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\windows\rollback.ps1
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

DB 변경을 되돌리는 기능은 아니다. 이번 전환은 DB/schema를 변경하지 않는다.

## 검증과 제한

- `npm audit` 0건, TypeScript 검사 및 Node standalone 빌드/HTTP smoke 확인.
- 전체 lint는 기존 UI/API의 8개 진단이 남아 있으며 이번 호스팅 전환 범위에 포함하지 않는다.
- `scripts/smoke-server.mjs`는 dummy Supabase 설정으로 빌드한 로컬 산출물에만 사용한다.
  실제 데이터 변경 없이 화면/asset, 인증 차단, legacy redirect, HTTPS proxy callback을 검사한다.
- 이전 esbuild/sharp/workerd 설치 스크립트 안내는 해당 Cloudflare 의존성이 제거되어 더 이상 적용되지 않는다.
- 계정별 RLS와 앱 로그인은 유지된다. Sites의 별도 owner-only 접근 관문은 새 도메인에 적용되지 않는다.
  Supabase 신규 가입 허용 여부는 운영자가 기존 프로젝트의 Auth 설정에서 관리한다.

## 2026-09-16 서버 적용 상태

- 운영 앱: 67d0ded 소스로 빌드/설치, CHI-HUB-App 실행 중, loopback health 확인.
- 서버 npm audit 0건. Supabase Auth 설정 조회 HTTP 200. 실제 사용자 로그인은 아직 미검증.
- Caddy 2.11.4 설치/설정 검증 완료, 서비스 자동 시작/복구 설정 완료, 현재 중지 상태.
- Windows 방화벽 CHI-HUB-Web: Caddy 프로그램에만 TCP 80/443 inbound 허용.
- 공유기 포트포워딩, Caddy 시작/인증서 발급, Supabase callback 및 외부 접속 검증이 다음 단계.
- 서버 별도 validation-source/runtime에 dummy 테스트 빌드가 남아 있다. validation task와 프로세스는 제거했다. 실제 키/운영 데이터는 테스트에 사용하지 않았다.
