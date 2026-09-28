import { Suspense, lazy } from 'react';
import { Skeleton } from './feedback';

// react-markdown and its remark/rehype dependencies roughly double the bundle.
// Only the Context and Thread detail views need it, so keep them out of the
// initial payload and pay for them on first navigation to a document.
const MarkdownBody = lazy(() => import('./markdown-body'));

/**
 * Context and Thread bodies are authored as Markdown, so render them as
 * Markdown. `react-markdown` does not enable `rehype-raw`, which means any
 * raw HTML in the source is dropped rather than injected, and its default
 * `urlTransform` strips `javascript:` URLs. Both matter here because the
 * content is written by agents as well as by the account owner.
 */
export function MarkdownContent({ content }: { content: string }) {
  if (!content.trim()) return <p className="markdown-empty">No content yet</p>;

  return (
    <div className="markdown">
      <Suspense fallback={<Skeleton lines={4} />}>
        <MarkdownBody content={content} />
      </Suspense>
    </div>
  );
}
