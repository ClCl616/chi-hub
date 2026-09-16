# CHI Toolbox

한국어 모바일 우선 개인용 PWA. 집중 타이머, 루틴·할 일, 캘린더, 수면, 운동, 메모, 비공개 드라이브, 대전대학교 학식을 제공합니다.

## 실행 환경

- Node.js 24 LTS (`>=24.13.0 <25`), npm, Git
- React 19.2.8, Vinext 1.0.0-beta.10, Vite 8.3.0
- Supabase Auth / PostgreSQL / Storage, migration 0001~0005
- Windows Node.js standalone 운영, Caddy HTTPS

## 로컬 개발

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

이미 `.env.local`이 있으면 복사하지 않습니다. 파일에 기존 Supabase 프로젝트의 공개 설정을 입력합니다.
로컬도 운영 데이터에 연결되므로 CRUD 테스트는 실제 데이터를 변경합니다.
Supabase 서비스 역할 키는 사용하지 않습니다. 기존 프로젝트에 migration을 임의 재적용하지 않습니다.

## 검증 및 production 실행

```powershell
npm.cmd audit
npm.cmd run typecheck
npm.cmd run build
npm.cmd start
```

빌드 전에 `.env.local`이 필요합니다. 시작은 127.0.0.1:3000으로 제한됩니다.
`npm.cmd run lint`에는 기존 8개 진단이 남아 있습니다. 상세 내용은 CODEX_CONTEXT.md를 확인합니다.

## 운영

운영 대상은 집의 Windows PC, 주소는 https://chitoolbox.com 입니다.
개발은 여러 PC에서 하고, 검증된 커밋만 서버에 전달합니다. GitHub push는 사용자 요청 시 수행합니다.
Tailscale/SSH는 관리용이며 서비스 사용자는 도메인으로 접속합니다.

설치·자동 시작·릴리스 전환·복구·HTTPS 절차는 [Windows 운영 안내](deploy/windows/README.md)를 따릅니다.
기존 Sites 배포는 중단했으며 `.openai/hosting.json`은 과거 연결 기록입니다.
