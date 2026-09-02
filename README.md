# CHI.HUB

기록하고, 몰입하고, 성장하는 개인용 라이프 허브입니다. 모바일 우선 UI, PWA, Supabase 인증·데이터베이스·비공개 파일 보관함을 포함합니다.

## 주요 기능

- 실제 기록을 요약하는 홈 대시보드
- 새로고침과 백그라운드 전환에도 이어지는 집중 타이머와 세션 기록
- 일일 루틴 체크와 수면 기록·평균
- 운동 기록과 최근 7일 통계
- 검색·고정·편집·삭제가 가능한 메모
- Supabase Storage 기반 비공개 파일 업로드·다운로드·삭제
- 이메일 회원가입, 로그인, 복귀 경로, 로그아웃

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local`에 Supabase 프로젝트 URL과 anon key를 입력하고, `supabase/migrations/0001_initial_schema.sql`을 Supabase SQL Editor 또는 CLI로 적용하세요. Supabase Auth의 Site URL과 Redirect URL에는 로컬 주소와 운영 주소의 `/auth/callback`을 등록해야 합니다.

## 검증

```bash
npm run lint
npm run build
```

운영 배포는 `.openai/hosting.json`의 Sites 프로젝트 설정을 사용합니다.
