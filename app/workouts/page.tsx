import { FeatureLayout } from '@/components/feature-layout';
import { WorkoutWorkspace } from '@/components/workout-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="WORKOUT LOG"
      title="운동"
      description="움직임을 간단히 기록하고 최근의 꾸준함을 확인하세요."
    >
      <WorkoutWorkspace />
    </FeatureLayout>
  );
}
