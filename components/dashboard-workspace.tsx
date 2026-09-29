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
import { ProfileWorkspace } from '@/components/profile-workspace';
import { SettingsWorkspace } from '@/components/settings-workspace';
import { StudyWorkspace } from '@/components/study-workspace';

export function DashboardWorkspace() {
  return (
    <>
      <TabsContent className="tab-view view-focus" value="focus" keepMounted>
        <FocusTimer />
      </TabsContent>
      <TabsContent
        className="tab-view view-morning"
        value="morning"
        keepMounted
      >
        <MorningWorkspace />
      </TabsContent>
      <TabsContent
        className="tab-view view-calendar"
        value="calendar"
        keepMounted
      >
        <CalendarWorkspace />
      </TabsContent>
      <TabsContent className="tab-view view-notes" value="notes" keepMounted>
        <NotesWorkspace />
      </TabsContent>
      <TabsContent className="tab-view view-study" value="study" keepMounted>
        <StudyWorkspace />
      </TabsContent>
      <TabsContent className="tab-view view-sleep" value="sleep" keepMounted>
        <SleepWorkspace />
      </TabsContent>
      <TabsContent
        className="tab-view view-workouts"
        value="workouts"
        keepMounted
      >
        <WorkoutWorkspace />
      </TabsContent>
      <TabsContent className="tab-view view-files" value="files" keepMounted>
        <FilesWorkspace />
      </TabsContent>
      <TabsContent className="tab-view view-meals" value="meals" keepMounted>
        <MealsWorkspace />
      </TabsContent>
      <TabsContent
        className="tab-view view-settings"
        value="settings"
        keepMounted
      >
        <SettingsWorkspace />
      </TabsContent>
      <TabsContent
        className="tab-view view-profile"
        value="profile"
        keepMounted
      >
        <ProfileWorkspace />
      </TabsContent>
    </>
  );
}
