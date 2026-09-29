'use client';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { TabsList } from '@/components/ui/tabs';
import { NavigationSections } from './navigation-sections';
import type { NavigationProps } from './navigation-types';
export function DesktopNavigation({
  navigation,
  activeView,
  selectView,
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
            <NavigationSections
              navigation={navigation}
              activeView={activeView}
              selectView={selectView}
            />
          </TabsList>
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
