import type { SymbiontClient } from '../client.js';
import type { SyncResult } from './sync/notion-to-database-sync.js';
import { type MediaCleanupResult } from './bucket/storage-cleanup.js';
import type { Hook } from '../hooks/types.js';
/**
 * The parts of a request this module actually uses.
 *
 * Previously typed as SvelteKit's `RequestEvent`, which meant
 * `import { json, type RequestEvent } from '@sveltejs/kit'` -- a *runtime* import
 * (`json` is a value, not a type) of a package that was only ever a
 * devDependency here. Nothing declared it, so `symbiont-cms/server` had a hidden
 * runtime dependency that happened to resolve because consumers are SvelteKit
 * apps. Importing it from plain Node failed outright.
 *
 * Both fields are web standards, so a SvelteKit `RequestEvent` satisfies this
 * structurally and callers need no changes. Keeps this package framework-
 * agnostic, in line with the same decoupling done in client/utils/env.ts.
 */
export interface SymbiontRequestEvent {
    url: URL;
    request: Request;
}
export interface SyncFromNotionResult {
    summaries: SyncResult[];
    mediaCleanup?: MediaCleanupResult;
}
/**
 * Sync one or more databases from Notion
 *
 * @param options.cleanupMedia - After syncing, delete media bucket files not
 *   referenced by any page. Only meaningful when all pages have been processed
 *   (syncAll or wipe). Safe to skip on incremental runs.
 * @param options.cleanupOnly - Skip syncing entirely and just run media cleanup.
 *   Use this when you've already synced and just want to purge unused files.
 */
export declare function syncFromNotion(client: SymbiontClient, options?: {
    databaseId?: string | null;
    since?: string | null;
    syncAll?: boolean;
    wipe?: boolean;
    limit?: number;
    cleanupMedia?: boolean;
    /** When true, compute unused media but skip actual deletion */
    cleanupDryRun?: boolean;
    /** Skip syncing and only run media cleanup */
    cleanupOnly?: boolean;
    /** Optional user hooks injected only for sync/webhook paths */
    hooks?: Hook[];
}): Promise<SyncFromNotionResult>;
/**
 * Handle Notion webhook requests for page updates
 *
 * Refactored to use new SyncOrchestrator architecture
 *
 * @param client - Symbiont client instance
 * @param event - A SvelteKit RequestEvent, or anything with { url, request }
 */
export declare function handleNotionWebhookRequest(client: SymbiontClient, event: SymbiontRequestEvent, hooks?: Hook[]): Promise<Response>;
/**
 * Handle polling/cron sync requests
 *
 * @param client - Symbiont client instance
 * @param event - A SvelteKit RequestEvent, or anything with { url, request }
 */
export declare function handlePollBlogRequest(client: SymbiontClient, event: SymbiontRequestEvent, hooks?: Hook[]): Promise<Response>;
//# sourceMappingURL=webhook.d.ts.map