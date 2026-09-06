/**
 * blocks-to-markdown.ts
 *
 * Converts Notion block objects to a markdown string.
 * Replaces notion-to-md in the Notion → DB sync direction.
 *
 * Equation convention: both inline and block equations use `$$expr$$`.
 * Inline vs block is structural: a paragraph whose entire content is a single
 * equation becomes a standalone `$$\nexpr\n$$` block; otherwise the equation
 * is rendered inline as `$$expr$$` within the paragraph text.
 */
import type { BlockTransformerFn } from './types.js';
/**
 * Register a custom transformer for a Notion block type.
 * The transformer receives the raw block object and a `fetchChildren` callback.
 * Return a markdown string to override default behavior, or `false` to use default.
 *
 * @example
 * setBlockTransformer('image', async (block) => {
 *   const url = block.image?.external?.url ?? block.image?.file?.url ?? '';
 *   const caption = block.image?.caption?.map((c: any) => c.plain_text).join('').trim();
 *   return `![${caption ?? ''}](${url})`;
 * });
 */
export declare function setBlockTransformer(type: string, fn: BlockTransformerFn): void;
export declare function clearBlockTransformers(): void;
/**
 * Callback that fetches the direct children of a Notion block by its ID.
 *
 * `blocksToMarkdown` calls this whenever it encounters a block that may have
 * children (lists, quotes, callouts, toggles, tables, column layouts, synced
 * blocks). The caller is responsible for pagination — the callback must return
 * **all** children for the given blockId in a single call.
 *
 * `NotionClient.getBlocks(blockId)` already handles pagination and is the
 * intended implementation for production use.
 *
 * `blocksToMarkdown` is intentionally recursive: child blocks are processed
 * with `depth + 1` and their markdown is indented/prefixed accordingly. The
 * recursion depth is bounded by the Notion block nesting limit (~3 levels for
 * most block types).
 */
type FetchChildrenFn = (blockId: string) => Promise<any[]>;
/**
 * Convert an array of Notion blocks to a markdown string.
 *
 * Recursively fetches and converts child blocks via `fetchChildren`.
 *
 * @param blocks - Notion block objects (top-level or already-fetched children)
 * @param fetchChildren - Async callback to fetch child blocks for a block ID.
 *   Called for any block where `has_children: true`. Must return all children
 *   (handle pagination internally). Pass `async () => []` in tests.
 * @param depth - Current nesting depth (internal, default 0; drives indentation)
 */
export declare function blocksToMarkdown(blocks: any[], fetchChildren: FetchChildrenFn, depth?: number): Promise<string>;
export {};
//# sourceMappingURL=blocks-to-markdown.d.ts.map