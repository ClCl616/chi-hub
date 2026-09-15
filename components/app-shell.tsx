'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
  Dumbbell,
  HardDrive,
  LogIn,
  LogOut,
  Menu,
  MoonStar,
  BedDouble,
  CalendarDays,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  TimerReset,
  UtensilsCrossed,
} from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const navigation = [
  { href: '#focus', label: '타이머', icon: TimerReset },
  { href: '#morning', label: '루틴 · 할 일', icon: MoonStar },
  { href: '#sleep', label: '수면', icon: BedDouble },
  { href: '#calendar', label: '캘린더', icon: CalendarDays },
  { href: '#meals', label: '학식', icon: UtensilsCrossed },
  { href: '#workouts', label: '운동', icon: Dumbbell },
  { href: '#notes', label: '메모', icon: NotebookPen },
  { href: '#files', label: '드라이브', icon: HardDrive },
];
function subscribeToPanel(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
function getPanelSnapshot() {
  return window.location.hash;
}
function getServerPanelSnapshot() {
  return '';
}
function revealPanel() {
  requestAnimationFrame(() =>
    window.dispatchEvent(new Event('chi-hub-reveal-panel')),
  );
}
const sidebarStorageKey = 'chi-hub-sidebar';
const sidebarChangeEvent = 'chi-hub-sidebar-change';
function subscribeToSidebar(onStoreChange: () => void) {
  window.addEventListener(sidebarChangeEvent, onStoreChange);
  return () => window.removeEventListener(sidebarChangeEvent, onStoreChange);
}
function getSidebarSnapshot() {
  return window.localStorage.getItem(sidebarStorageKey) !== 'collapsed';
}
function getServerSidebarSnapshot() {
  return true;
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activePanel = useSyncExternalStore(
    subscribeToPanel,
    getPanelSnapshot,
    getServerPanelSnapshot,
  );
  const sidebarExpanded = useSyncExternalStore(
    subscribeToSidebar,
    getSidebarSnapshot,
    getServerSidebarSnapshot,
  );
  const [authState, setAuthState] = useState<'checking' | 'ready' | 'offline'>(
    'checking',
  );
  useEffect(() => {
    fetch('/api/auth/status', { cache: 'no-store' })
      .then((response) => {
        if (response.status === 401) {
          window.location.href = `/login?returnTo=${encodeURIComponent(pathname + window.location.hash)}`;
          return;
        }
        setAuthState(response.ok ? 'ready' : 'offline');
      })
      .catch(() => setAuthState('offline'));
  }, [pathname]);
  const mobileLinks = navigation;
  function toggleSidebar() {
    const next = !sidebarExpanded;
    window.localStorage.setItem(
      sidebarStorageKey,
      next ? 'expanded' : 'collapsed',
    );
    window.dispatchEvent(new Event(sidebarChangeEvent));
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.href = '/login';
  }
  return (
    <div className={`app-shell${sidebarExpanded ? '' : ' sidebar-collapsed'}`}>
      <a className="skip-content" href="#workspace">
        본문으로 건너뛰기
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <a className="brand" href="#workspace" aria-label="작업 공간 맨 위로">
            <span className="brand-mark">C</span>
            <span>
              CHI.HUB<small>내 하루의 작업 공간</small>
            </span>
          </a>
          <button
            aria-label="사이드바 접기"
            className="sidebar-toggle sidebar-toggle-inset"
            onClick={toggleSidebar}
            type="button"
          >
            <PanelLeftClose size={19} />
          </button>
        </div>
        <nav className="side-nav" aria-label="주 메뉴">
          <p>작업 패널</p>
          {navigation.map(({ href, label, icon: Icon }) => (
            <a
              className={activePanel === href ? 'active' : ''}
              href={href}
              onClick={revealPanel}
              key={href}
              aria-current={activePanel === href ? 'location' : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          {authState === 'ready' ? (
            <button onClick={logout} type="button">
              <LogOut size={18} /> 로그아웃
            </button>
          ) : (
            <a href="/login">
              <LogIn size={18} /> 로그인
            </a>
          )}
        </div>
      </aside>
      <button
        aria-label="사이드바 펼치기"
        className="sidebar-toggle sidebar-toggle-floating"
        onClick={toggleSidebar}
        type="button"
      >
        <PanelLeftOpen size={19} />
      </button>
      <div className="mobile-header">
        <a className="mobile-brand" href="#workspace">
          <span className="brand-mark">C</span> CHI.HUB
        </a>
        <Sheet>
          <SheetTrigger
            className="mobile-menu-trigger"
            aria-label="전체 메뉴 열기"
          >
            <Menu size={22} />
          </SheetTrigger>
          <SheetContent className="mobile-menu" side="right">
            <SheetTitle className="mobile-menu-title">
              <span className="brand-mark">C</span>
              <span>
                CHI.HUB<small>작업 패널</small>
              </span>
            </SheetTitle>
            <nav className="mobile-menu-nav" aria-label="전체 메뉴">
              {mobileLinks.map(({ href, label, icon: Icon }) => (
                <SheetClose
                  key={href}
                  render={
                    <a
                      aria-label={label}
                      className={activePanel === href ? 'active' : ''}
                      href={href}
                      onClick={revealPanel}
                    />
                  }
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </SheetClose>
              ))}
            </nav>
            <div className="mobile-menu-footer">
              {authState === 'ready' ? (
                <button onClick={logout} type="button">
                  <LogOut size={18} /> 로그아웃
                </button>
              ) : (
                <SheetClose render={<a aria-label="로그인" href="/login" />}>
                  <LogIn size={18} /> 로그인
                </SheetClose>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <header className="workspace-topbar">
        <div>
          <span>내 공간</span>
          <span aria-hidden="true">/</span>
          <strong>내 대시보드</strong>
        </div>
        <a href="#calendar" onClick={revealPanel}>
          <CalendarDays size={16} /> 캘린더
        </a>
      </header>
      <main className="main-content" id="workspace" tabIndex={-1}>
        {authState === 'checking' ? (
          <output className="auth-check">내 공간을 불러오는 중…</output>
        ) : (
          <>
            {authState === 'offline' && (
              <output className="service-banner">
                데이터 연결을 확인해주세요. 일부 기능이 제한될 수 있습니다.
              </output>
            )}
            {children}
          </>
        )}
      </main>
      <nav className="bottom-nav" aria-label="모바일 주 메뉴">
        {navigation
          .filter((item) =>
            ['#focus', '#morning', '#notes', '#calendar', '#files'].includes(
              item.href,
            ),
          )
          .map(({ href, label, icon: Icon }) => (
            <a
              className={activePanel === href ? 'active' : ''}
              href={href}
              onClick={revealPanel}
              key={href}
              aria-current={activePanel === href ? 'location' : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
            </a>
          ))}
      </nav>
    </div>
  );
}
