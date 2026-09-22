'use client';
import { LogOut, Menu } from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { NavigationProps } from './navigation-types';
export function MobileHeader({
  navigation,
  authState,
  logout,
  activeView,
  selectView,
}: NavigationProps) {
  return (
    <>
      {' '}
      <header className="mobile-header">
        <div className="mobile-brand">
          <span className="brand-mark">C</span>CHI TOOLBOX
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
    </>
  );
}
export function MobileBottomNavigation({
  navigation,
  activeView,
  selectView,
}: NavigationProps) {
  return (
    <>
      {' '}
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
    </>
  );
}
