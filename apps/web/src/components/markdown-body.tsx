import { Markdown } from '@astryxdesign/core/Markdown';

/**
 * The actual renderer, split into its own module so that Astryx's Markdown
 * (parser, code highlighting, tables) is only fetched when a document body
 * is rendered.
 */
export default function MarkdownBody({ content }: { content: string }) {
  return <Markdown headingLevelStart={2}>{content}</Markdown>;
}
