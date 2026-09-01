# CHI.HUB

CHI.LOG를 확장한 개인용 멀티툴의 초기 기반입니다. Next.js App Router 호환 구조, TypeScript, 모바일 우선 UI, PWA, Supabase 연결 골격을 포함합니다.

## 시작하기

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase 프로젝트 URL과 anon key를 `.env.local`에 입력하면 이후 인증·DB·Storage 기능을 연결할 수 있습니다.

## 현재 범위

- 반응형 공통 앱 셸과 모바일 하단 내비게이션
- 대시보드 대표 화면
- 집중, 루틴·수면, 운동, 메모, 파일의 빈 상태 화면
- 공개 포트폴리오와 CHI.LOG 이전 자리
- 로그인 준비 화면 및 Supabase 클라이언트 기반
- 웹 앱 매니페스트와 서비스 워커
