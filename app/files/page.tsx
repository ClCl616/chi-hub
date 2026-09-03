import { FeatureLayout } from '@/components/feature-layout';
import { FilesWorkspace } from '@/components/files-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="PRIVATE STORAGE"
      title="내 파일"
    >
      <FilesWorkspace />
    </FeatureLayout>
  );
}
