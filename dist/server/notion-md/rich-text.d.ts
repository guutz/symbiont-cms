/**
 * Shared Notion RichText utilities.
 *
 * Used by both conversion directions:
 * - blocks-to-markdown: richTextToMarkdown() serializes Notion RT → markdown inline
 * - markdown-to-blocks: richText() creates Notion RT objects from parsed AST
 */
import type { NotionRichText, RichTextOptions } from './types.js';
/**
 * Convert a Notion rich_text array to a markdown inline string.
 *
 * Equation delimiters: both block and inline equations are emitted as `$$expr$$`.
 * Distinction between block and inline is structural (a paragraph that contains
 * only a single equation becomes a block equation; otherwise inline).
 */
export declare function richTextToMarkdown(richTexts: NotionRichText[]): string;
/**
 * Create a Notion rich_text text or equation object.
 */
export declare function richText(content: string, options?: RichTextOptions): any;
/**
 * Split a text string into multiple richText objects if needed
 * (Notion limits each rich_text content to 2000 chars).
 */
export declare function ensureLength(text: string, options?: RichTextOptions): any[];
//# sourceMappingURL=rich-text.d.ts.map