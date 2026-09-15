'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  BedDouble,
  CalendarDays,
  Dumbbell,
  HardDrive,
  LogIn,
  LogOut,
  Menu,
  MoonStar,
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
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

const navigation = [
  { id: 'focus', label: '타이머', icon: TimerReset },
  { id: 'morning', label: '루틴 · 할 일', icon: MoonStar },
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
  { id: 'notes', label: '메모', icon: NotebookPen },
  { id: 'sleep', label: '수면', icon: BedDouble },
  { id: 'workouts', label: '운동', icon: Dumbbell },
  { id: 'files', label: '드라이브', icon: HardDrive },
  { id: 'meals', label: '학식', icon: UtensilsCrossed },
];
const viewChanged = 'chi-hub-view-changed';
function subscribeToView(onChange: () => void) {
  window.addEventListener(viewChanged, onChange);
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  return () => {
    window.removeEventListener(viewChanged, onChange);
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
  };
}
function getViewSnapshot() {
  const url = new URL(window.location.href);
  const value = url.searchParams.get('view') ?? url.hash.slice(1);
  return navigation.some((item) => item.id === value) ? value : 'focus';
}
function getServerViewSnapshot() {
  return 'focus';
}
function selectView(value: unknown) {
  if (
    typeof value !== 'string' ||
    !navigation.some((item) => item.id === value)
  )
    return;
  const url = new URL(window.location.href);
  url.searchParams.set('view', value);
  url.hash = '';
  if (url.href !== window.location.href)
    window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(viewChanged));
  window.scrollTo({ top: 0 });
}
const sidebarStorageKey = 'chi-hub-sidebar';
const sidebarChangeEvent = 'chi-hub-sidebar-change';
function subscribeToSidebar(onChange: () => void) {
  window.addEventListener(sidebarChangeEvent, onChange);
  return () => window.removeEventListener(sidebarChangeEvent, onChange);
}
function getSidebarSnapshot() {
  return window.localStorage.getItem(sidebarStorageKey) !== 'collapsed';
}
function getServerSidebarSnapshot() {
  return true;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const activeView = useSyncExternalStore(
    subscribeToView,
    getViewSnapshot,
    getServerViewSnapshot,
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
    const url = new URL(window.location.href);
    const legacyView = url.hash.slice(1);
    if (
      !url.searchParams.has('view') &&
      navigation.some((item) => item.id === legacyView)
    ) {
      url.searchParams.set('view', legacyView);
      url.hash = '';
      window.history.replaceState(null, '', url);
      window.dispatchEvent(new Event(viewChanged));
    }
  }, []);
  useEffect(() => {
    fetch('/api/auth/status', { cache: 'no-store' })
      .then((response) => {
        if (response.status === 401) {
          const url = new URL(window.location.href);
          window.location.href =
            '/login?returnTo=' +
            encodeURIComponent(url.pathname + url.search + url.hash);
          return;
        }
        setAuthState(response.ok ? 'ready' : 'offline');
      })
      .catch(() => setAuthState('offline'));
  }, []);
  function toggleSidebar() {
    window.localStorage.setItem(
      sidebarStorageKey,
      sidebarExpanded ? 'collapsed' : 'expanded',
    );
    window.dispatchEvent(new Event(sidebarChangeEvent));
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.href = '/login';
  }
  const title = navigation.find((item) => item.id === activeView)?.label;
  return (
    <TabsPrimitive.Root
      value={activeView}
      onValueChange={selectView}
      orientation="vertical"
      className={
        'app-shell workspace-tabs' +
        (sidebarExpanded ? '' : ' sidebar-collapsed')
      }
    >
      <a className="skip-content" href="#workspace">
        본문으로 건너뛰기
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <div className="brand">
            <span className="brand-mark">C</span>
            <span>
              CHI.HUB<small>나의 작업 공간</small>
            </span>
          </div>
          <button
            aria-label="사이드바 접기"
            className="sidebar-toggle sidebar-toggle-inset"
            onClick={toggleSidebar}
            type="button"
          >
            <PanelLeftClose size={19} />
          </button>
        </div>
        <div className="side-nav">
          <p>내 공간</p>
          <TabsList className="workspace-tab-list" aria-label="작업 구분">
            {navigation.map(({ id, label, icon: Icon }) => (
              <TabsTrigger className="workspace-tab" key={id} value={id}>
                <Icon size={19} />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="sidebar-footer">
          {authState === 'ready' ? (
            <button onClick={logout} type="button">
              <LogOut size={18} />
              로그아웃
            </button>
          ) : (
            <a href="/login">
              <LogIn size={18} />
              로그인
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
      <header className="mobile-header">
        <div className="mobile-brand">
          <span className="brand-mark">C</span>CHI.HUB
        </div>
        <Sheet>
          <SheetTrigger
            className="mobile-menu-trigger"
            aria-label="전체 메뉴 열기"
          >
            <Menu size={22} />
          </SheetTrigger>
          <SheetContent className="mobile-menu" side="right">
            <SheetTitle className="mobile-menu-title">작업 선택</SheetTitle>
            <div className="mobile-menu-nav">
              {navigation.map(({ id, label, icon: Icon }) => (
                <SheetClose
                  key={id}
                  className={activeView === id ? 'active' : ''}
                  onClick={() => selectView(id)}
                  aria-pressed={activeView === id}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </SheetClose>
              ))}
            </div>
            <div className="mobile-menu-footer">
              {authState === 'ready' ? (
                <button onClick={logout} type="button">
                  <LogOut size={18} />
                  로그아웃
                </button>
              ) : (
                <a href="/login">로그인</a>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </header>
      <header className="workspace-topbar">
        <span>개인 워크스페이스</span>
        <time>
          {new Intl.DateTimeFormat('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          }).format(new Date())}
        </time>
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
            <div className="tab-workspace">
              <header className="tab-heading">
                <h1>{title}</h1>
              </header>
              {children}
            </div>
          </>
        )}
      </main>
      <nav className="bottom-nav" aria-label="모바일 작업 선택">
        {navigation
          .filter((item) =>
            ['focus', 'morning', 'calendar', 'notes', 'files'].includes(
              item.id,
            ),
          )
          .map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={activeView === id ? 'active' : ''}
              aria-pressed={activeView === id}
              onClick={() => selectView(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
      </nav>
    </TabsPrimitive.Root>
  );
}
