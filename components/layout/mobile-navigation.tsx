'use client';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NavigationSections } from './navigation-sections';
import type { NavigationProps } from './navigation-types';
export function MobileHeader({
  navigation,
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
              <NavigationSections
                navigation={navigation}
                activeView={activeView}
                selectView={selectView}
                mobile
              />
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
