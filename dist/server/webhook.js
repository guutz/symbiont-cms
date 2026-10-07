import { requireEnvVar } from './utils/env.js';
import { createLogger } from './utils/logger.js';
import { createNotionToDatabaseSyncCoordinator } from './sync/coordinator.js';
import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { cleanupUnusedMedia } from './bucket/storage-cleanup.js';
import { resolveSyncDatabase } from './sync-client.js';
/**
 * Local stand-in for SvelteKit's `json()` helper. Same shape, no framework.
 */
function json(data, init) {
    const headers = new Headers(init?.headers);
    if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
    }
    return new Response(JSON.stringify(data), { status: init?.status ?? 200, headers });
}
/**
 * Read lazily, at request time -- NOT at module scope.
 *
 * This was previously a module-level `const CRON_SECRET = requireEnvVar(...)`,
 * which threw during import. Because `server.ts` re-exports from this file,
 * that made CRON_SECRET a hard requirement for importing *anything* from
 * `symbiont-cms/server` -- including `renderMarkdownToHtml`. A consumer
 * rendering an article page would fail with a missing-CRON_SECRET error, even
 * though nothing on that path syncs anything.
 *
 * Keep env reads inside the handler that needs them so a missing variable fails
 * the one endpoint that requires it, at the moment it is called.
 */
function getCronSecret() {
    return requireEnvVar('CRON_SECRET', 'Set CRON_SECRET for authenticating scheduled jobs.');
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
export async function syncFromNotion(client, options = {}) {
    const logger = createLogger({ operation: 'sync_from_notion' });
    // Determine which databases to sync
    const dbConfigs = options.databaseId
        ? client.config.databases.filter((db) => db.alias === options.databaseId || db.dataSourceId === options.databaseId)
        : client.config.databases;
    if (dbConfigs.length === 0 && !options.cleanupOnly) {
        logger.warn({ event: 'no_databases_found', databaseId: options.databaseId });
        return { summaries: [] };
    }
    // Single service role client shared across all coordinators and cleanup.
    const adminSupabase = createClient(client.config.supabase.url, requireEnvVar('SUPABASE_SERVICE_ROLE_KEY'), { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    // Sync each database (skipped when cleanupOnly)
    const summaries = [];
    if (!options.cleanupOnly) {
        for (const db of dbConfigs) {
            const resolved = resolveSyncDatabase(client, db);
            const hooksForDatabase = options.hooks && options.hooks.length > 0
                ? options.hooks
                : resolved.hooks;
            const sync = createNotionToDatabaseSyncCoordinator(client, resolved.config, adminSupabase, hooksForDatabase);
            const result = await sync.syncDataSource({
                since: options.since,
                syncAll: options.syncAll,
                wipe: options.wipe,
                limit: options.limit
            });
            summaries.push(result);
        }
    }
    // Media cleanup — runs after all databases are synced so the full
    // reference set is known. Also runs standalone when cleanupOnly is set.
    let mediaCleanup;
    if (options.cleanupMedia || options.cleanupOnly) {
        try {
            mediaCleanup = await cleanupUnusedMedia(adminSupabase, { dryRun: options.cleanupDryRun });
            logger.info({ event: 'media_cleanup_complete', ...mediaCleanup });
        }
        catch (err) {
            logger.error({ event: 'media_cleanup_failed', error: err?.message });
            // Non-fatal — don't fail the whole sync response over cleanup
            mediaCleanup = { deleted: 0, deletedPaths: [], referencedCount: 0, totalInBucket: 0, dryRun: options.cleanupDryRun ?? false };
        }
    }
    return { summaries, ...(mediaCleanup !== undefined && { mediaCleanup }) };
}
/**
 * Fetch one page from Notion and run it through the sync, as the webhook does.
 * Shared by handleNotionWebhookRequest and syncPage so there is one path.
 */
async function processOnePage(client, dbConfig, pageId, hooks = [], expectDataSourceId) {
    const notion = new Client({ auth: requireEnvVar('NOTION_TOKEN') });
    const page = (await notion.pages.retrieve({ page_id: pageId }));
    if (expectDataSourceId) {
        const parent = page.parent;
        if (parent?.data_source_id && parent.data_source_id !== expectDataSourceId) {
            throw new Error(`syncPage: page ${pageId} belongs to data source ${parent.data_source_id}, not ${expectDataSourceId}.`);
        }
    }
    const resolved = resolveSyncDatabase(client, dbConfig);
    const hooksForDatabase = hooks.length > 0 ? hooks : resolved.hooks;
    const sync = createNotionToDatabaseSyncCoordinator(client, resolved.config, undefined, hooksForDatabase);
    /*
     * trustEvent: the caller knows something changed. Re-deriving that from
     * last_edited_time cannot work -- Notion rounds it down to the minute, so a
     * second property edit within the same minute is indistinguishable from the
     * first and used to be dropped silently.
     */
    return sync.processPage(page, undefined, { trustEvent: true });
}
/**
 * Sync a single page, now, without waiting for the webhook or the cron.
 *
 * For code that has just created or changed a page in Notion and needs the
 * database row to reflect it before it continues -- e.g. a form that creates a
 * Notion page and then has to work with the resulting `pages` row. It runs the
 * same pipeline and hooks as every other sync, so the app never hand-writes a
 * row into symbiont's table.
 *
 * @param database - the datasource alias or dataSourceId the page belongs to
 * @returns true if the page was processed, false if a hook skipped it
 * @throws if the database is not configured, or the page belongs to a
 *   different data source -- syncing it under the wrong alias would file it in
 *   the wrong place
 */
export async function syncPage(client, database, pageId, options = {}) {
    const dbConfig = client.config.databases.find((db) => db.alias === database || db.dataSourceId === database);
    if (!dbConfig) {
        throw new Error(`syncPage: database "${database}" is not configured.`);
    }
    return processOnePage(client, dbConfig, pageId, options.hooks ?? [], dbConfig.dataSourceId);
}
/**
 * Handle Notion webhook requests for page updates
 *
 * Refactored to use new SyncOrchestrator architecture
 *
 * @param client - Symbiont client instance
 * @param event - A SvelteKit RequestEvent, or anything with { url, request }
 */
export async function handleNotionWebhookRequest(client, event, hooks = []) {
    const logger = createLogger({ operation: 'webhook' });
    try {
        const providedSecret = event.request.headers.get('x-symbiont-webhook-secret') ?? '';
        const webhookSecret = requireEnvVar('NOTION_WEBHOOK_SECRET', 'Set NOTION_WEBHOOK_SECRET for authenticating Notion webhooks.');
        if (providedSecret !== webhookSecret) {
            logger.warn({ event: 'webhook_unauthorized_attempt' });
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = await event.request.json();
        const pageId = payload?.data?.id;
        const notionDataSourceId = payload?.data?.parent?.data_source_id;
        const isValidAutomationPagePayload = payload?.source?.type === 'automation' && payload?.data?.object === 'page' && pageId && notionDataSourceId;
        if (!isValidAutomationPagePayload) {
            logger.debug({
                event: 'webhook_ignored',
                reason: 'non_automation_page_or_invalid_payload',
                sourceType: payload?.source?.type,
                dataObject: payload?.data?.object
            });
            return json({ message: 'Ignoring non-page automation payload' }, { status: 200 });
        }
        // Find database config by dataSourceId (Notion database UUID)
        const config = client.config;
        const queryDbConfig = config.databases.find((db) => db.dataSourceId === notionDataSourceId);
        if (!queryDbConfig) {
            logger.warn({
                event: 'webhook_database_not_found',
                notionDataSourceId
            });
            return json({ message: `Database ID ${notionDataSourceId} not configured` }, { status: 404 });
        }
        logger.info({
            event: 'webhook_received',
            pageId,
            alias: queryDbConfig.alias,
            dataSourceId: queryDbConfig.dataSourceId
        });
        await processOnePage(client, queryDbConfig, pageId, hooks);
        logger.info({ event: 'webhook_processed_successfully', pageId });
        return json({ message: `Successfully processed page ${pageId}` }, { status: 200 });
    }
    catch (error) {
        logger.error({
            event: 'webhook_processing_failed',
            error: error?.message,
            stack: error?.stack
        });
        return json({ error: error.message ?? 'Unknown error' }, { status: 500 });
    }
}
/**
 * Handle polling/cron sync requests
 *
 * @param client - Symbiont client instance
 * @param event - A SvelteKit RequestEvent, or anything with { url, request }
 */
export async function handlePollBlogRequest(client, event, hooks = []) {
    const logger = createLogger({ operation: 'poll_sync' });
    try {
        const providedSecret = event.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
            event.url.searchParams.get('secret') ??
            '';
        if (providedSecret !== getCronSecret()) {
            logger.warn({ event: 'unauthorized_sync_attempt' });
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        const limitParam = event.url.searchParams.get('limit');
        const result = await syncFromNotion(client, {
            databaseId: event.url.searchParams.get('database'),
            since: event.url.searchParams.get('since'),
            syncAll: event.url.searchParams.get('syncAll') === 'true',
            wipe: event.url.searchParams.get('wipe') === 'true',
            limit: limitParam ? parseInt(limitParam, 10) : undefined,
            cleanupMedia: event.url.searchParams.get('cleanup') === 'true',
            cleanupDryRun: event.url.searchParams.get('cleanupDryRun') === 'true',
            cleanupOnly: event.url.searchParams.get('cleanupOnly') === 'true',
            hooks
        });
        const hasError = result.summaries.some((s) => s.status === 'error');
        return json(result, { status: hasError ? 500 : 200 });
    }
    catch (error) {
        logger.error({
            event: 'poll_sync_failed',
            error: error?.message,
            stack: error?.stack
        });
        return json({ error: error.message ?? 'Unknown error' }, { status: 500 });
    }
}
//# sourceMappingURL=webhook.js.map