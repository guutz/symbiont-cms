import type { PageObjectResponse } from '@notionhq/client';
import { json, type RequestEvent } from '@sveltejs/kit';
import { requireEnvVar } from './utils/env.js';
import type { SymbiontClient } from '../client.js';
import { createLogger } from './utils/logger.js';
import { createNotionToDatabaseSyncCoordinator } from './sync/coordinator.js';
import type { SyncResult } from './sync/notion-to-database-sync.js';
import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { cleanupUnusedMedia, type MediaCleanupResult } from './bucket/storage-cleanup.js';
import type { Hook } from '../hooks/types.js';
import type { SymbiontSyncClient } from './sync-client.js';

const CRON_SECRET = requireEnvVar('CRON_SECRET', 'Set CRON_SECRET for authenticating scheduled jobs.');

function resolveHooksForDatabase(client: SymbiontClient, alias: string, dataSourceId: string, explicitHooks?: Hook[]): Hook[] {
	if (explicitHooks && explicitHooks.length > 0) {
		return explicitHooks;
	}

	const syncClient = client as SymbiontSyncClient;
	if (!syncClient.syncHooksByAlias) {
		return [];
	}

	return syncClient.syncHooksByAlias[alias] ?? syncClient.syncHooksByAlias[dataSourceId] ?? [];
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
export async function syncFromNotion(
	client: SymbiontClient,
	options: {
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
	} = {}
): Promise<SyncFromNotionResult> {
	const logger = createLogger({ operation: 'sync_from_notion' });

	// Determine which databases to sync
	const dbConfigs = options.databaseId
		? client.config.databases.filter((db: any) => db.alias === options.databaseId || db.dataSourceId === options.databaseId)
		: client.config.databases;

	if (dbConfigs.length === 0 && !options.cleanupOnly) {
		logger.warn({ event: 'no_databases_found', databaseId: options.databaseId });
		return { summaries: [] };
	}

	// Single service role client shared across all coordinators and cleanup.
	const adminSupabase = createClient<Database>(
		client.config.supabase.url,
		requireEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
		{ auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
	);

	// Sync each database (skipped when cleanupOnly)
	const summaries: SyncResult[] = [];
	if (!options.cleanupOnly) {
		for (const dbConfig of dbConfigs) {
			const hooksForDatabase = resolveHooksForDatabase(client, dbConfig.alias, dbConfig.dataSourceId, options.hooks);
			const sync = createNotionToDatabaseSyncCoordinator(client, dbConfig, adminSupabase, hooksForDatabase);
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
	let mediaCleanup: MediaCleanupResult | undefined;
	if (options.cleanupMedia || options.cleanupOnly) {
		try {
			mediaCleanup = await cleanupUnusedMedia(adminSupabase, { dryRun: options.cleanupDryRun });
			logger.info({ event: 'media_cleanup_complete', ...mediaCleanup });
		} catch (err: any) {
			logger.error({ event: 'media_cleanup_failed', error: err?.message });
			// Non-fatal — don't fail the whole sync response over cleanup
			mediaCleanup = { deleted: 0, deletedPaths: [], referencedCount: 0, totalInBucket: 0, dryRun: options.cleanupDryRun ?? false };
		}
	}

	return { summaries, ...(mediaCleanup !== undefined && { mediaCleanup }) };
} 

/**
 * Handle Notion webhook requests for page updates
 * 
 * Refactored to use new SyncOrchestrator architecture
 * 
 * @param client - Symbiont client instance
 * @param event - SvelteKit RequestEvent
 */
export async function handleNotionWebhookRequest(client: SymbiontClient, event: RequestEvent, hooks: Hook[] = []) {
	const logger = createLogger({ operation: 'webhook' });

	try {
		const providedSecret = event.request.headers.get('x-symbiont-webhook-secret') ?? '';
		const webhookSecret = requireEnvVar(
			'NOTION_WEBHOOK_SECRET',
			'Set NOTION_WEBHOOK_SECRET for authenticating Notion webhooks.'
		);

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
		const dbConfig = config.databases.find((db: any) => db.dataSourceId === notionDataSourceId);

		if (!dbConfig) {
			logger.warn({ 
				event: 'webhook_database_not_found', 
				notionDataSourceId 
			});
			return json({ message: `Database ID ${notionDataSourceId} not configured` }, { status: 404 });
		}

		logger.info({ 
			event: 'webhook_received', 
			pageId, 
			alias: dbConfig.alias,
			dataSourceId: dbConfig.dataSourceId 
		});

		// Get Notion token from environment
		const notionToken = requireEnvVar('NOTION_TOKEN');
		
		// Fetch page from Notion
		const notion = new Client({ auth: notionToken });
		const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse;

		// Create sync coordinator and process page
		const hooksForDatabase = resolveHooksForDatabase(client, dbConfig.alias, dbConfig.dataSourceId, hooks);
		const sync = createNotionToDatabaseSyncCoordinator(client, dbConfig, undefined, hooksForDatabase);
		await sync.processPage(page);

		logger.info({ event: 'webhook_processed_successfully', pageId });
		return json({ message: `Successfully processed page ${pageId}` }, { status: 200 });
	} catch (error: any) {
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
 * @param event - SvelteKit RequestEvent
 */
export async function handlePollBlogRequest(client: SymbiontClient, event: RequestEvent, hooks: Hook[] = []) {
	const logger = createLogger({ operation: 'poll_sync' });

	try {
		const providedSecret =
			event.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
			event.url.searchParams.get('secret') ??
			'';

		if (providedSecret !== CRON_SECRET) {
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
	} catch (error: any) {
		logger.error({ 
			event: 'poll_sync_failed', 
			error: error?.message,
			stack: error?.stack
		});
		return json({ error: error.message ?? 'Unknown error' }, { status: 500 });
	}
}
