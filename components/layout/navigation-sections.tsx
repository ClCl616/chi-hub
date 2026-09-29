'use client';
import { Star } from 'lucide-react';
import { TabsTrigger } from '@/components/ui/tabs';
import { SheetClose } from '@/components/ui/sheet';
import { useWorkspacePreferences } from '@/hooks/use-workspace-preferences';
import type { NavigationProps } from './navigation-types';

export function NavigationSections({
  navigation,
  activeView,
  selectView,
  mobile = false,
}: Pick<NavigationProps, 'navigation' | 'activeView' | 'selectView'> & {
  mobile?: boolean;
}) {
  const { preferences, ready, saving, error, savePreference, refresh } =
    useWorkspacePreferences();
  const favorites = preferences.favorites;
  const groups = [
    {
      label: '계획 · 집중',
      ids: ['focus', 'morning', 'calendar', 'notes', 'study'],
    },
    { label: '생활 관리', ids: ['sleep', 'workouts'] },
    { label: '자료 · 정보', ids: ['files', 'meals'] },
  ];
  function item(id: string, fixed = false) {
    const entry = navigation.find((entry) => entry.id === id);
    if (!entry) return null;
    const Icon = entry.icon;
    const content = (
      <>
        <Icon size={19} />
        <span>{entry.label}</span>
      </>
    );
    const selected = favorites.includes(id);
    return (
      <div className="navigation-row" key={id}>
        {mobile ? (
          <SheetClose
            className={activeView === id ? 'active' : ''}
            onClick={() => selectView(id)}
            aria-pressed={activeView === id}
          >
            {content}
          </SheetClose>
        ) : (
          <TabsTrigger className="workspace-tab" value={id} title={entry.label}>
            {content}
          </TabsTrigger>
        )}
        {!fixed && (
          <button
            type="button"
            className="favorite-toggle"
            aria-label={`${entry.label} 즐겨찾기 ${selected ? '해제' : '추가'}`}
            aria-pressed={selected}
            disabled={!ready || saving}
            onClick={() =>
              void savePreference(
                'favorites',
                selected
                  ? favorites.filter((value) => value !== id)
                  : [...favorites, id],
              )
            }
          >
            <Star size={15} fill={selected ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      <div className="navigation-scroll">
        <section className="favorite-section" aria-label="즐겨찾기">
          <div className="nav-group-label">즐겨찾기</div>
          {favorites.length ? (
            favorites.map((id) => item(id))
          ) : (
            <p className="favorites-empty">자주 쓰는 탭의 ☆을 눌러보세요.</p>
          )}
        </section>
        {groups.map((group) => (
          <details key={group.label} className="navigation-group" open>
            <summary>{group.label}</summary>
            {group.ids
              .filter((id) => !favorites.includes(id))
              .map((id) => item(id))}
          </details>
        ))}
        {error && (
          <div className="navigation-error" role="alert">
            {error}
            <button onClick={() => void refresh()}>다시 불러오기</button>
          </div>
        )}
      </div>
      <div className="navigation-fixed">
        {item('profile', true)}
        {item('settings', true)}
      </div>
    </>
  );
}
