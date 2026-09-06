/**
 * Block diffing utilities for Notion content sync.
 *
 * Lets us skip the expensive delete-all → re-append cycle inside
 * updatePageBlocks() when the content hasn't actually changed since the last
 * sync.
 *
 * The core challenge is that the Notion API adds metadata to every block it
 * returns (id, timestamps, plain_text, href, color: "default", …) that is
 * absent from the blocks we generate locally.  normalizeBlockForDiff() strips
 * all of that so the two can be compared on equal footing.
 */
/**
 * Normalize a Notion block to a canonical, metadata-free form for diffing.
 *
 * Returns `null` if `block.type` is missing.
 * Returns a sentinel `{ type, _file: true }` for Notion-hosted (file) images —
 *   their signed URLs change on every API call and cannot be compared.
 * Returns a sentinel `{ type, _unknown: true }` for block types we don't know
 *   how to normalize — callers should treat those as "not equal".
 *
 * NOTE: Children are intentionally NOT recursed into.  If an existing block has
 * `has_children: true`, blocksAreEquivalent() detects this and conservatively
 * returns false so a full re-upload is triggered.
 */
export declare function normalizeBlockForDiff(block: any): any | null;
/**
 * Returns `true` if the existing Notion blocks and the newly-generated blocks
 * are semantically equivalent (same content, ignoring API metadata).
 *
 * **Conservative semantics** — returns `false` (i.e. "needs update") when:
 * - Block counts differ.
 * - Any existing block has `has_children: true`.  Comparing nested blocks
 *   would require additional API round-trips; it's cheaper to just re-upload.
 * - Any block is a Notion-hosted file image (ephemeral signed URL).
 * - Any block is of an unknown type.
 *
 * @param existingBlocks - Top-level blocks returned by the Notion API for the page.
 * @param newBlocks      - Blocks produced by convertMarkdownToNotionBlocks().
 */
export declare function blocksAreEquivalent(existingBlocks: any[], newBlocks: any[]): boolean;
/**
 * A lightweight fingerprint of a single block used for diffing.
 *
 * Existing blocks (from Notion API) have an `id`; desired blocks (generated
 * from markdown) do not.
 */
export type BlockFingerprint = {
    id?: string;
    type: string;
    normalized: any;
    hasChildren: boolean;
    raw: any;
};
/**
 * A single operation in the edit script produced by `diffBlocks()`.
 */
export type EditOperation = {
    op: 'keep';
    existingId: string;
} | {
    op: 'update';
    existingId: string;
    existingType: string;
    newContent: any;
} | {
    op: 'insert';
    afterId: string | null;
    block: any;
} | {
    op: 'delete';
    existingId: string;
} | {
    op: 'replace';
    existingId: string;
    newBlock: any;
};
/**
 * The full result of a `diffBlocks()` call.
 *
 * `forceFullReplace` is `true` when the diff is so large that a surgical
 * patch is no cheaper than the nuke-and-repave fallback.
 */
export type DiffResult = {
    operations: EditOperation[];
    stats: {
        kept: number;
        updated: number;
        inserted: number;
        deleted: number;
        replaced: number;
    };
    forceFullReplace: boolean;
};
/**
 * Build a `BlockFingerprint` for `block`.
 *
 * For existing blocks (returned by the Notion API) pass the block as-is —
 * `block.id` will be present.  For desired blocks (generated from markdown)
 * `id` will be `undefined`.
 */
export declare function fingerprintBlock(block: any): BlockFingerprint;
/**
 * Compute a minimal edit script that transforms `existing` into `desired`.
 *
 * Algorithm: single forward pass with a bounded lookahead window.
 * - Same-type blocks at the same position are kept or updated in-place.
 * - On a type mismatch a short lookahead decides whether to emit a delete
 *   (existing has an extra block) or an insert (desired has a new block).
 * - If neither lookahead matches, emit a replace (delete + insert) and
 *   advance both pointers.
 *
 * When the fraction of changed blocks exceeds `forceFullReplaceThreshold`
 * the result has `forceFullReplace: true` and the caller should fall back to
 * `updatePageBlocks()`.
 *
 * @param existing               - Blocks currently in Notion (must have `.id`).
 * @param desired                - Blocks generated from markdown (no `.id`).
 * @param forceFullReplaceThreshold - 0–1 fraction; default 0.6.
 */
export declare function diffBlocks(existing: any[], desired: any[], forceFullReplaceThreshold?: number): DiffResult;
//# sourceMappingURL=blocks-diff.d.ts.map