import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * The actual renderer, split into its own module so that react-markdown and
 * its remark/rehype dependencies are only fetched when a document is opened.
 */
export default function MarkdownBody({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ children, href, ...rest }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </Markdown>
  );
}
