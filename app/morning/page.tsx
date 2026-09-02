import { FeatureLayout } from '@/components/feature-layout';
import { MorningWorkspace } from '@/components/morning-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="MIRACLE MORNING & SLEEP"
      title="하루의 리듬"
      description="오늘의 루틴을 체크하고 수면 흐름을 함께 관리하세요."
    >
      <MorningWorkspace />
    </FeatureLayout>
  );
}
