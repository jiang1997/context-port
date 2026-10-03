import { Suspense, lazy } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { useI18n } from '../i18n';
import { Skeleton } from './feedback';

// Astryx's Markdown renderer is heavy (parser, code highlighting, tables);
// keep it out of the initial payload and load it when a document body first
// renders. Pages that never open a document never download it.
const MarkdownBody = lazy(() => import('./markdown-body'));

export function MarkdownContent({ content }: { content: string }) {
  const { t } = useI18n();
  if (!content.trim()) return <Text type="supporting">{t('@app.common.noContent')}</Text>;

  return (
    <Suspense fallback={<Skeleton lines={4} />}>
      <MarkdownBody content={content} />
    </Suspense>
  );
}
