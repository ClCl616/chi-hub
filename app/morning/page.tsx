import { FeatureLayout } from '@/components/feature-layout';
import { MorningWorkspace } from '@/components/morning-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="MIRACLE MORNING & SLEEP"
      title="하루의 리듬"
    >
      <MorningWorkspace />
    </FeatureLayout>
  );
}
