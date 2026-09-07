import { FeatureLayout } from '@/components/feature-layout';
import { MorningWorkspace } from '@/components/morning-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="ROUTINES"
      title="루틴"
    >
      <MorningWorkspace />
    </FeatureLayout>
  );
}
