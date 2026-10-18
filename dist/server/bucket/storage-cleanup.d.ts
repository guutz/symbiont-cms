/**
 * Media storage cleanup utilities.
 *
 * Scans the `media` bucket and deletes any file that is not referenced by any
 * row in the `pages` table -- in `content`, `cover`, `summary` or anywhere in
 * `meta`.
 *
 * It used to read `content` and `cover` only. Apps keep media URLs in `meta`
 * too (an archive cover, a PDF thumbnail) and summaries can carry images, so
 * those files looked unreferenced and would have been deleted while live. Err
 * towards keeping: a stray file costs storage, a wrong deletion breaks a page.
 *
 * Should be run after a full sync — never during incremental/per-page syncs
 * because partial runs don't have a complete picture of what's in use.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export interface MediaCleanupResult {
    /** Number of files deleted (or that would be deleted in a dry run) */
    deleted: number;
    /** Paths deleted (or that would be deleted in a dry run) */
    deletedPaths: string[];
    referencedCount: number;
    totalInBucket: number;
    /** True when no files were actually removed (dry run) */
    dryRun: boolean;
}
/**
 * Collect all media paths referenced in a string (markdown, a bare URL, or
 * serialised JSON).
 *
 * Both the path as written and its URL-decoded form are kept: markdown has to
 * percent-encode a space or parenthesis in a file name, but the object is
 * stored under the decoded name, and comparing only the encoded form would
 * delete it.
 */
export declare function extractReferencedPaths(text: string, out: Set<string>): void;
/**
 * Delete all files in the `media` bucket that are not referenced by any page.
 *
 * Handles both the legacy `{pageId}/{filename}` layout and the current flat layout.
 *
 * Files under `issues/` are always excluded — those are explicitly-pathed uploads
 * (e.g. issue PDFs) that are not referenced via content or cover URLs. Apps add
 * their own (uploads that no page references yet, like an unsent draft's
 * images) through `excludePrefixes`, or once for every caller through
 * `createSymbiontServer(..., { media: { protectedPrefixes } })`.
 *
 * @param supabase - Service role Supabase client (needs storage delete + pages read)
 * @param options.dryRun - When true, compute the unreferenced set but skip deletion.
 *   The result still reports what would have been deleted.
 * @param options.excludePrefixes - Additional path prefixes to never delete beyond
 *   the built-in `issues/` exclusion.
 */
export declare function cleanupUnusedMedia(supabase: SupabaseClient, options?: {
    dryRun?: boolean;
    excludePrefixes?: string[];
}): Promise<MediaCleanupResult>;
//# sourceMappingURL=storage-cleanup.d.ts.map