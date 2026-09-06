/**
 * markdown-to-blocks.ts
 *
 * Converts a markdown string to Notion block objects.
 * Replaces the @tryfabric/martian fork in the DB → Notion sync direction.
 *
 * Key difference from martian: uses a custom `$$...$$` tokenizer instead of
 * remark-math, so single `$` is never treated as math. Block vs inline
 * equation is determined structurally:
 *   - A paragraph whose only content is `$$...$$` → Notion equation block
 *   - `$$...$$` inline with other text → Notion rich_text equation item
 */
import type { BlocksOptions } from './types.js';
/**
 * Convert a markdown string to Notion block objects.
 *
 * Uses `$$...$$` for both inline and block equations (single `$` is never math).
 * GFM alerts (`> [!NOTE]` etc.) are converted to Notion callout blocks.
 *
 * @param markdown - Markdown string to convert
 * @param options - Conversion options
 */
export declare function convertMarkdownToNotionBlocks(markdown: string, options?: BlocksOptions): any[];
//# sourceMappingURL=markdown-to-blocks.d.ts.map