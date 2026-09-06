import type { PageObjectResponse } from '@notionhq/client';
import type { DatabaseBlueprint } from '../../types.js';
import { NotionClient } from '../notion/client.js';
import { DatabasePageCRUD } from '../database/page-crud.js';
import { NotionPageToDatabasePageTransformer } from '../notion/page-transformer.js';
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
export declare class NotionToDatabaseSync {
    private notionClient;
    private pageTransformer;
    private pageCrud;
    private config;
    private logger;
    constructor(notionClient: NotionClient, pageTransformer: NotionPageToDatabasePageTransformer, pageCrud: DatabasePageCRUD, config: DatabaseBlueprint);
    /**
     * Sync entire database from Notion
     */
    syncDataSource(options?: SyncOptions): Promise<SyncResult>; /**
         * Process a single page (used by webhook handler)
         * Returns true if page was processed, false if skipped
         */
    processPage(page: PageObjectResponse, existingSyncRef?: string): Promise<boolean>;
    /**
     * Build Notion API filter for incremental sync
     */
    private buildSyncFilter;
}
//# sourceMappingURL=notion-to-database-sync.d.ts.map