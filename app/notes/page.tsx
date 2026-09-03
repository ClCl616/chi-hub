import { FeatureLayout } from '@/components/feature-layout';
import { NotesWorkspace } from '@/components/notes-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="QUICK NOTES"
      title="메모"
    >
      <NotesWorkspace />
    </FeatureLayout>
  );
}
