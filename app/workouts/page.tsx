import { FeatureLayout } from '@/components/feature-layout';
import { WorkoutWorkspace } from '@/components/workout-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="WORKOUT LOG"
      title="운동"
    >
      <WorkoutWorkspace />
    </FeatureLayout>
  );
}
