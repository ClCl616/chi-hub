'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';

export function WorkspacePanel({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const reveal = () => {
      if (window.location.hash !== `#${id}`) return;
      setCollapsed(false);
      requestAnimationFrame(() => {
        panel.current?.scrollIntoView({ block: 'start' });
        panel.current?.focus({ preventScroll: true });
      });
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    window.addEventListener('chi-hub-reveal-panel', reveal);
    return () => {
      window.removeEventListener('hashchange', reveal);
      window.removeEventListener('chi-hub-reveal-panel', reveal);
    };
  }, [id]);

  return (
    <section
      ref={panel}
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className={`hub-panel hub-${id}${expanded ? ' is-expanded' : ''}${collapsed ? ' is-collapsed' : ''}`}
    >
      <header className="hub-panel-heading">
        <h2 id={`${id}-title`}>
          {icon}
          {title}
        </h2>
        <div>
          <button
            type="button"
            aria-label={`${title} ${expanded ? '기본 크기로' : '넓게 보기'}`}
            aria-pressed={expanded}
            onClick={() => {
              setExpanded((value) => !value);
              setCollapsed(false);
            }}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            aria-label={`${title} ${collapsed ? '펼치기' : '접기'}`}
            aria-expanded={!collapsed}
            aria-controls={`${id}-body`}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </header>
      <div className="hub-panel-body" id={`${id}-body`} hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}
