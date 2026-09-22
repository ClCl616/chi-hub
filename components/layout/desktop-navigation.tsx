'use client';
import { Fragment } from 'react';
import { LogIn, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { NavigationProps } from './navigation-types';
export function DesktopNavigation({
  navigation,
  authState,
  logout,
  toggleSidebar,
}: NavigationProps) {
  return (
    <>
      {' '}
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <div className="brand">
            <span className="brand-mark">C</span>
            <span>
              CHI TOOLBOX<small>모든 것을 한 곳에서. 편리하게.</small>
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
          <TabsList className="workspace-tab-list" aria-label="작업 구분">
            {navigation.map(({ id, label, icon: Icon }, index) => (
              <Fragment key={id}>
                {[0, 4, 6].includes(index) && (
                  <div className="nav-group-label">
                    {index === 0
                      ? '계획 · 집중'
                      : index === 4
                        ? '생활 관리'
                        : '자료 · 정보'}
                  </div>
                )}
                <TabsTrigger className="workspace-tab" value={id}>
                  <Icon size={19} />
                  <span>{label}</span>
                </TabsTrigger>
              </Fragment>
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
    </>
  );
}
