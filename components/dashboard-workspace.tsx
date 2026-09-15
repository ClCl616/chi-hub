'use client';
import { TabsContent } from '@/components/ui/tabs';
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
    <>
      <TabsContent className="tab-view" value="focus" keepMounted>
        <FocusTimer />
      </TabsContent>
      <TabsContent className="tab-view" value="morning" keepMounted>
        <MorningWorkspace />
      </TabsContent>
      <TabsContent className="tab-view" value="calendar" keepMounted>
        <CalendarWorkspace />
      </TabsContent>
      <TabsContent className="tab-view" value="notes" keepMounted>
        <NotesWorkspace />
      </TabsContent>
      <TabsContent className="tab-view" value="sleep" keepMounted>
        <SleepWorkspace />
      </TabsContent>
      <TabsContent className="tab-view" value="workouts" keepMounted>
        <WorkoutWorkspace />
      </TabsContent>
      <TabsContent className="tab-view" value="files" keepMounted>
        <FilesWorkspace />
      </TabsContent>
      <TabsContent className="tab-view" value="meals" keepMounted>
        <MealsWorkspace />
      </TabsContent>
    </>
  );
}
