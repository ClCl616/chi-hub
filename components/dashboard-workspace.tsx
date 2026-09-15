'use client';
import {
  BedDouble,
  CalendarDays,
  Dumbbell,
  HardDrive,
  MoonStar,
  NotebookPen,
  TimerReset,
  UtensilsCrossed,
} from 'lucide-react';
import { WorkspacePanel } from '@/components/workspace-panel';
import { FocusTimer } from '@/components/focus-timer';
import { MorningWorkspace } from '@/components/morning-workspace';
import { NotesWorkspace } from '@/components/notes-workspace';
import { CalendarWorkspace } from '@/components/calendar-workspace';
import { SleepWorkspace } from '@/components/sleep-workspace';
import { WorkoutWorkspace } from '@/components/workout-workspace';
import { FilesWorkspace } from '@/components/files-workspace';
import { MealsWorkspace } from '@/components/meals-workspace';

export function DashboardWorkspace() {
  return (
    <div className="hub-workspace">
      <header className="hub-heading">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            }).format(new Date())}
          </p>
          <h1>오늘의 작업 공간</h1>
        </div>
        <span>CHI.HUB</span>
      </header>
      <div className="hub-grid">
        <WorkspacePanel
          id="focus"
          title="타이머"
          icon={<TimerReset size={19} />}
        >
          <FocusTimer />
        </WorkspacePanel>
        <WorkspacePanel
          id="morning"
          title="루틴 · 할 일"
          icon={<MoonStar size={19} />}
        >
          <MorningWorkspace />
        </WorkspacePanel>
        <WorkspacePanel
          id="notes"
          title="메모"
          icon={<NotebookPen size={19} />}
        >
          <NotesWorkspace />
        </WorkspacePanel>
        <WorkspacePanel
          id="calendar"
          title="캘린더"
          icon={<CalendarDays size={19} />}
        >
          <CalendarWorkspace />
        </WorkspacePanel>
        <WorkspacePanel id="sleep" title="수면" icon={<BedDouble size={19} />}>
          <SleepWorkspace />
        </WorkspacePanel>
        <WorkspacePanel
          id="workouts"
          title="운동"
          icon={<Dumbbell size={19} />}
        >
          <WorkoutWorkspace />
        </WorkspacePanel>
        <WorkspacePanel
          id="files"
          title="드라이브"
          icon={<HardDrive size={19} />}
        >
          <FilesWorkspace />
        </WorkspacePanel>
        <WorkspacePanel
          id="meals"
          title="학식"
          icon={<UtensilsCrossed size={19} />}
        >
          <MealsWorkspace />
        </WorkspacePanel>
      </div>
    </div>
  );
}
