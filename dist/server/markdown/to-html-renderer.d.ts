/**
 * Markdown renderer for Symbiont CMS
 *
 * Renders markdown to HTML using markdown-it with custom renderers and plugins.
 *
 * **IMPORTANT**: This renderer must maintain compatibility with:
 * - Notion markdown (via the built-in notion-md module)
 * - Tiptap markdown (future implementation)
 *
 * See `.docs/markdown-compatibility.md` for the full markdown syntax contract
 * and compatibility requirements between content sources and this renderer.
 *
 * **ARCHITECTURE NOTE**: This renderer does NOT detect features (syntax highlighting,
 * math, images, etc.). Feature detection should happen during content ingestion
 * (Notion→DB or Tiptap→DB sync) and be stored in the database. This keeps the
 * renderer simple and performant. See `.docs/feature-detection-architecture.md`
 * for details on the recommended approach.
 *
 * @module markdown-renderer
 */
import type { MarkdownConfig } from '../../types.js';
interface TOCItem {
    level: number;
    heading: string;
    slug: string;
    child?: TOCItem[];
}
export interface RenderedMarkdown {
    html: string;
    toc: TOCItem[];
}
/**
 * Renders markdown to HTML using markdown-it
 *
 * @param content - Markdown content to render
 * @param config - Markdown configuration from symbiont config
 */
export declare function renderMarkdownToHtml(content: string, config: MarkdownConfig | undefined): Promise<RenderedMarkdown>;
/**
 * Renders markdown summary to plain text by stripping all formatting and HTML.
 * Preserves newlines while ensuring zero HTML tags remain.
 */
export declare function renderSummaryToHtml(content: string): string;
export {};
//# sourceMappingURL=to-html-renderer.d.ts.map