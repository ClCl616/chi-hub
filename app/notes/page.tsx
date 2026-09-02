import { FeatureLayout } from '@/components/feature-layout';
import { NotesWorkspace } from '@/components/notes-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="QUICK NOTES"
      title="메모"
      description="생각을 빠르게 적고, 검색하고, 중요한 메모를 고정하세요."
    >
      <NotesWorkspace />
    </FeatureLayout>
  );
}
