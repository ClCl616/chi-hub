import { FeatureLayout } from '@/components/feature-layout';
import { FilesWorkspace } from '@/components/files-workspace';
export default function Page() {
  return (
    <FeatureLayout
      eyebrow="PRIVATE STORAGE"
      title="내 파일"
      description="필요한 자료를 안전하게 보관하고 어디서든 다시 꺼내세요."
    >
      <FilesWorkspace />
    </FeatureLayout>
  );
}
