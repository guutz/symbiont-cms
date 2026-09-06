/**
 * Media storage cleanup utilities.
 *
 * Scans the `media` bucket and deletes any file that is not referenced by
 * any row in the `pages` table (in either `content` markdown or `cover` URL).
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
 * Delete all files in the `media` bucket that are not referenced by any page.
 *
 * Handles both the legacy `{pageId}/{filename}` layout and the current flat layout.
 *
 * Files under `issues/` are always excluded — those are explicitly-pathed uploads
 * (e.g. issue PDFs) that are not referenced via content or cover URLs.
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