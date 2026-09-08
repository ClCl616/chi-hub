import { FeatureLayout } from '@/components/feature-layout';
import { MealsWorkspace } from '@/components/meals-workspace';

export default function MealsPage() {
  return (
    <FeatureLayout eyebrow="CAMPUS MEALS" title="오늘, 뭐 먹지?">
      <MealsWorkspace />
    </FeatureLayout>
  );
}
