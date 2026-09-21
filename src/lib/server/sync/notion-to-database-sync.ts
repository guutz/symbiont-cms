import type { PageObjectResponse } from '@notionhq/client';
import type { DatabaseBlueprint, DatabasePage } from '../../types.js';
import { wasLastEditedByBot } from '../notion/identity.js';
import type { SyncResultReport } from '../../hooks/types.js';
import { NotionClient } from '../notion/client.js';
import { DatabasePageCRUD } from '../database/page-crud.js';
import { NotionPageToDatabasePageTransformer } from '../notion/page-transformer.js';
import { createLogger } from '../utils/logger.js';

export interface SyncOptions {
	/** Only sync pages modified since this timestamp */
	since?: string | null;
	
	/** Sync all pages regardless of last_edited_time */
	syncAll?: boolean;
	
	/** Delete all existing pages before syncing */
	wipe?: boolean;
	
	/** Maximum number of pages to process (stops early if reached) */
	limit?: number;
}

export interface ProcessPageOptions {
	/**
	 * The caller knows something changed, so do not re-derive that from
	 * timestamps. Set on the webhook path.
	 */
	trustEvent?: boolean;
}

/**
 * Columns that change on every sync by construction, so comparing them would
 * make every page look modified. `updated_at` mirrors Notion's
 * last_edited_time, which moves even when nothing we store has changed.
 */
/**
 * Notion rounds last_edited_time down to the minute, so two timestamps can only
 * be meaningfully ordered when they are more than a minute apart.
 * https://developers.notion.com/changelog/last-edited-time-is-now-rounded-to-the-nearest-minute
 */
const NOTION_TIMESTAMP_GRANULARITY_MS = 60_000;

const VOLATILE_FIELDS = new Set(['id', 'created_at', 'updated_at', 'last_synced_at']);

/** Key order in JSONB round-trips is not stable, so sort before comparing. */
function stableStringify(value: unknown): string {
	return (
		JSON.stringify(value, (_key, inner) =>
			inner && typeof inner === 'object' && !Array.isArray(inner)
				? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b)))
				: inner
		) ?? 'null'
	);
}

/**
 * Whether this page would write the same row it already has.
 *
 * This is the real guard on whether a sync does anything, replacing the
 * timestamp comparison that used to serve that purpose. Notion rounds
 * last_edited_time *down to the minute*, so two edits in the same minute are
 * indistinguishable by timestamp -- which silently dropped the second and third
 * of a run of property changes. Comparing the rows themselves has no such blind
 * spot, and it makes the sync idempotent, which is also what stops a status
 * write-back from looping.
 */
function isContentUnchanged(existing: DatabasePage, next: DatabasePage): boolean {
	for (const [key, value] of Object.entries(next)) {
		if (VOLATILE_FIELDS.has(key)) continue;
		if (stableStringify((existing as unknown as Record<string, unknown>)[key]) !== stableStringify(value)) {
			return false;
		}
	}
	return true;
}

export interface SyncResult {
	alias: string;
	dataSourceId: string;
	processed: number;
	skipped: number;
	failed: number;
	status: 'success' | 'error';
	details?: string;
	duration_ms?: number;
}

/**
 * NotionToDatabaseSync - High-level sync coordination
 * 
 * Responsibilities:
 * - Coordinate full database sync (query → transform → upsert)
 * - Handle pagination (Notion returns max 100 pages per query)
 * - Process individual pages (webhook handler)
 * - Collect metrics and errors
 * - Wipe operations (delete all pages for a source)
 * 
 * This is the entry point for all sync operations.
 */
export class NotionToDatabaseSync {
	private logger = createLogger({ operation: 'notion_to_database_sync' });

	constructor(
		private notionClient: NotionClient,
		private pageTransformer: NotionPageToDatabasePageTransformer,
		private pageCrud: DatabasePageCRUD,
		private config: DatabaseBlueprint
	) {}

	/**
	 * Sync entire database from Notion
	 */
	async syncDataSource(options: SyncOptions = {}): Promise<SyncResult> {
		const startTime = Date.now();
		
		this.logger.info({ 
			event: 'sync_started',
			alias: this.config.alias,
			dataSourceId: this.config.dataSourceId,
			options 
		});

		try {
			// 0. Call onBeforeSync lifecycle callback
			if (this.config.onBeforeSync) {
				this.logger.debug({ event: 'calling_onBeforeSync' });
				await this.config.onBeforeSync();
			}

			// 1. Wipe existing pages if requested
			if (options.wipe) {
				const deletedCount = await this.pageCrud.deleteForSource(this.config.dataSourceId);
				this.logger.info({ 
					event: 'wipe_completed',
					alias: this.config.alias,
					dataSourceId: this.config.dataSourceId,
					deleted: deletedCount 
				});
			}

			// 2. Build filter for incremental sync
			const filter = this.buildSyncFilter(options);

			// 3. Fetch all pages with pagination
			const allPages: PageObjectResponse[] = [];
			let cursor: string | null | undefined = undefined;
			
			do {
				const result = await this.notionClient.queryDataSource(
					this.config.dataSourceId,
					filter,
					cursor
				);
				
				allPages.push(...result.pages);
				cursor = result.nextCursor;
				
				this.logger.debug({ 
					event: 'pages_fetched',
					count: result.pages.length,
					totalSoFar: allPages.length,
					hasMore: !!cursor 
				});
			} while (cursor);
			
			this.logger.info({ 
				event: 'all_pages_fetched',
				totalPages: allPages.length 
			});

			// 4. Process each page (with optional limit)
			let processed = 0;
			let skipped = 0;
			let failed = 0;
			const pagesToProcess = options.limit ? allPages.slice(0, options.limit) : allPages;
			const existingSyncRefs = await this.pageCrud.getSyncRefsByPageIds(pagesToProcess.map((p) => p.id));
			
			if (options.limit && allPages.length > options.limit) {
				this.logger.info({ 
					event: 'applying_limit',
					limit: options.limit,
					totalPages: allPages.length,
					willProcess: pagesToProcess.length
				});
			}
			
			for (const page of pagesToProcess) {
				try {
					const wasProcessed = await this.processPage(page, existingSyncRefs.get(page.id));
					if (wasProcessed) {
						processed++;
					} else {
						skipped++;
					}
				} catch (error: any) {
					this.logger.error({ 
						event: 'page_processing_failed',
						pageId: page.id,
						error: error?.message,
						stack: error?.stack 
					});
					failed++;
				}
			}

			// 5. Call onAfterSync lifecycle callback
			if (this.config.onAfterSync) {
				this.logger.debug({ event: 'calling_onAfterSync' });
				await this.config.onAfterSync();
			}

			const duration = Date.now() - startTime;
			
			this.logger.info({ 
				event: 'sync_completed',
				alias: this.config.alias,
				dataSourceId: this.config.dataSourceId,
				processed,
				skipped,
				failed,
				duration_ms: duration 
			});

			return {
				alias: this.config.alias,
				dataSourceId: this.config.dataSourceId,
				processed,
				skipped,
				failed,
				status: 'success',
			duration_ms: duration
		};

	} catch (error: any) {
		const duration = Date.now() - startTime;
		
		this.logger.error({ 
			event: 'sync_failed',
			alias: this.config.alias,
			dataSourceId: this.config.dataSourceId,
			error: error?.message,
			stack: error?.stack,
			duration_ms: duration 
		});

		return {
			alias: this.config.alias,
			dataSourceId: this.config.dataSourceId,
			processed: 0,
			skipped: 0,
			failed: 0,
			status: 'error',
			details: error?.message,
			duration_ms: duration
		};
	}
}	/**
	 * Process a single page (used by webhook handler)
	 * Returns true if page was processed, false if skipped
	 */
	async processPage(
		page: PageObjectResponse,
		existingSyncRef?: string,
		options: ProcessPageOptions = {}
	): Promise<boolean> {
		this.logger.debug({ event: 'process_page_started', pageId: page.id });

		/*
		 * Whether a sync:result hook may write to this page.
		 *
		 * False when the most recent edit was our own, because a write-back in
		 * reply to our own write-back is an endless loop; and false when the bot id
		 * could not be determined, because then we cannot tell the difference.
		 * Symbiont works this out once and hands down the answer -- it is the sync
		 * engine's business not to fight itself -- but it does not decide whether
		 * anything gets written, which is the app's business.
		 */
		const botUserId = await this.notionClient.getBotUserId();
		const writeBackSafe = Boolean(botUserId) && !wasLastEditedByBot(page, botUserId);

		const report = (fields: Partial<SyncResultReport>): SyncResultReport => ({
			ok: true,
			unchanged: false,
			at: new Date(),
			writeBackSafe,
			...fields
		});

		try {
			const existingPage = await this.pageCrud.getByNotionPageId(page.id);

			/*
			 * A cheap prefilter for the polling path only, and deliberately not the
			 * thing that decides whether work happens -- isContentUnchanged does that.
			 *
			 * The previous condition here was `dbTime >= notionTime - 10_000`, which
			 * skipped any edit whose (minute-rounded) Notion timestamp was within ten
			 * seconds of the last sync. Since a sync completes a second or two after
			 * the edit that triggered it, that swallowed essentially every follow-up
			 * change made in the same minute. The tolerance also had the wrong sign
			 * for its stated purpose: guarding against clock drift should make you
			 * more willing to sync, not less.
			 *
			 * Skipping only when the database is a full minute *ahead* is safe in the
			 * direction that matters: a sync at 10:01:05 fetched the page as it stood
			 * at 10:01:05, so it already contains anything stamped 10:00.
			 */
			const syncRef = existingSyncRef ?? existingPage?.last_synced_at ?? existingPage?.updated_at ?? undefined;
			if (!options.trustEvent && syncRef) {
				const notionTime = new Date(page.last_edited_time).getTime();
				const dbTime = new Date(syncRef).getTime();

				if (dbTime >= notionTime + NOTION_TIMESTAMP_GRANULARITY_MS) {
					this.logger.debug({
						event: 'page_already_up_to_date',
						pageId: page.id,
						notionTime: page.last_edited_time,
						dbTime: syncRef
					});
					return false;
				}
			}

			const pageData = await this.pageTransformer.transformPage(page);

			if (!pageData) {
				this.logger.debug({ event: 'page_skipped', pageId: page.id });
				return false;
			}

			if (existingPage && isContentUnchanged(existingPage, pageData)) {
				this.logger.debug({ event: 'page_unchanged', pageId: page.id, slug: pageData.slug });
				await this.pageTransformer.reportSyncResult(page, report({ unchanged: true }));
				return false;
			}

			await this.pageCrud.upsert(pageData);

			this.logger.debug({
				event: 'page_processed',
				pageId: page.id,
				slug: pageData.slug,
				title: pageData.title
			});

			await this.pageTransformer.reportSyncResult(page, report({}));

			return true;
		} catch (error: any) {
			/*
			 * A failure an editor can see, instead of a 500 in a log nobody reads
			 * -- if the app has registered a hook that surfaces it. reportSyncResult
			 * swallows hook errors, so the original failure is what propagates.
			 */
			await this.pageTransformer.reportSyncResult(page, report({ ok: false, error }));
			throw error;
		}
	}

	/**
	 * Build Notion API filter for incremental sync
	 */
	private buildSyncFilter(options: SyncOptions): any | undefined {
		if (options.syncAll) {
			return undefined; // No filter - fetch everything
		}

		if (options.since) {
			return {
				timestamp: 'last_edited_time',
				last_edited_time: { after: options.since }
			};
		}

		return undefined;
	}
}