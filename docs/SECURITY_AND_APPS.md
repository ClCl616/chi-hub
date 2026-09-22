# 외부 접속 보안과 모바일·워치 확장

2026-09-22 확인 기준. 도메인을 공개하는 것과 사용자 데이터를 공개하는 것은 다르다. 로그인, 서버 권한 검사, DB/Storage 정책을 함께 유지해야 한다.

## 이번에 확인한 상태

- 운영 public 사용자 테이블 10개 모두 RLS가 켜져 있고, 사용자 ID 소유권 조건이 있다. Storage `private-files`는 비공개이고 경로의 사용자 ID를 검사한다.
- 앱 API는 `getUser()`로 사용자 확인 후 동작한다. 로그인하지 않은 파일 API는 로컬 production smoke에서 401을 반환했다.
- 앱 서버는 loopback, Caddy는 HTTPS 진입점이다. 이번 배포에서 앱/Caddy 실행, 앱 loopback 수신과 공개 HTTPS를 확인했다.
- Supabase 보안 Advisor 경고는 **유출 비밀번호 차단 비활성화 1건**이다. 이 기능은 현재 공식 문서상 Pro 이상에서 제공된다. 경고가 없다는 것이 전체 보안 감사 통과를 의미하지는 않는다.
- 이번 코드에 HSTS, nosniff, iframe 차단, Referrer-Policy, 불필요한 장치 권한 차단을 Caddy 설정으로 추가했다. 운영 Caddy validate/reload와 공개 HTTPS 응답 검증을 완료했다.
- Markdown은 `react-markdown`과 GFM을 사용하며 raw HTML은 실행하지 않는다. 파일 서명 URL은 5분이며 목록은 4분마다 갱신한다. 이미 발급된 링크는 휴지통 이동 직후에도 만료 시점까지 유효할 수 있다.

## 개인용 서비스의 우선순위

1. **기존 사용자만 사용한다면 신규 가입을 Supabase에서 차단한다.** UI에서 가입 버튼만 숨기면 Auth API 직접 호출을 막지 못한다. 기존 허용 계정을 먼저 확인하고 정책을 변경한다. 이번 작업에서는 가입 정책을 임의로 바꾸지 않았다.
2. Google 계정과 Supabase 관리 계정에 2단계 인증을 사용한다. 앱 자체 MFA는 별도 등록·확인 UI와 API/RLS의 인증 수준 검사가 필요하며 아직 구현하지 않았다.
3. Windows/Node/Caddy/의존성을 업데이트하고, SSH/RDP는 Tailscale 내부에서만 접근한다. 공개 포트는 HTTPS에 필요한 80/443만 유지한다.
4. 로그인 남용 방지, 인증 후 업로드 횟수·용량 제한을 적용한다. 현재 파일당 500MB 제한은 사용자별 전체 용량 제한이 아니다. 대형 업로드는 앱 서버 메모리도 사용하므로 스트리밍/직접 업로드 개선을 후속으로 고려한다.
5. DB와 실제 Storage 파일을 별도로 백업하고 복구를 시험한다. 30일 휴지통은 백업을 대신하지 않는다. 휴지통 보관 중인 파일도 Storage 용량을 사용한다.
6. 필요 시 외부 프록시/WAF로 봇·과도한 요청을 제한한다. 사용 서비스 변경과 DNS 전환은 별도 결정 사항이며 이번에 변경하지 않았다.

휴지통 정리 작업은 모든 사용자의 만료된 파일에 접근해야 하므로 서버 전용 키를 사용한다. 앱 `.env.local`, 브라우저 번들, Git, 로그에 넣지 않고 `C:\Services\chi-hub-maintenance\trash.env`에 따로 보관한다. 관리자·배포 사용자·SYSTEM·NETWORK SERVICE만 읽을 수 있도록 ACL을 제한한다. 웹 앱의 LOCAL SERVICE에는 이 키 파일 접근 권한을 주지 않는다.

## 모바일 및 워치 앱

| 대상 | 가능한 방식 | 이 프로젝트에서 필요한 추가 작업 |
| --- | --- | --- |
| Android / iPhone 홈 화면 | 기존 PWA 설치 | 현재 manifest/service worker 기반. 브라우저별 설치와 로그인 동작 확인. 완전한 오프라인 편집은 별도 구현 |
| Android / iOS 앱 | Capacitor 또는 React Native 클라이언트 | 기존 서버 API 재사용, 모바일 인증·딥링크·세션 저장·푸시/알림·스토어 패키징. 현재 SSR 서버를 그대로 네이티브 앱 안에 넣는 구조는 아님 |
| Galaxy Watch 등 Wear OS | Kotlin + Compose for Wear OS | 워치 전용 화면, 폰과 연결 또는 독립 로그인, 타이머·루틴·일정 요약부터 구현 |
| Apple Watch | SwiftUI/watchOS | Mac/Xcode 환경, watchOS 앱과 인증/동기화, 위젯·알림 등 별도 구현 |

이번 변경은 웹의 PC·모바일 UI 분리까지다. 네이티브 모바일/워치 앱은 생성하지 않았다. 다음 순서는 모바일 PWA 검증 → 필요한 네이티브 기능 결정 → 플랫폼 하나부터 앱 구현이 적절하다. 타이머 종료 알림을 백그라운드에서도 보장하려면 각 OS의 네이티브 알림/백그라운드 제약을 고려해야 한다.

## 공식 참고 자료

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [신규 가입 및 인증 설정](https://supabase.com/docs/guides/auth/general-configuration)
- [비밀번호 보호](https://supabase.com/docs/guides/auth/password-security)
- [앱 MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [PWA 설치](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing)
- [Capacitor](https://capacitorjs.com/docs)
- [Wear OS 앱 시작](https://developer.android.com/training/wearables/get-started/creating)
- [watchOS](https://developer.apple.com/watchos/)
