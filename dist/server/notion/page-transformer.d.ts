import type { PageObjectResponse } from '@notionhq/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseBlueprint, DatabasePage } from '../../types.js';
import type { Database } from '../../database.types.js';
import { NotionClient } from './client.js';
import { DatabasePageCRUD } from '../database/page-crud.js';
import type { SyncResultReport } from '../../hooks/types.js';
import type { Hook } from '../../hooks/types.js';
/**
 * NotionPageToDatabasePageTransformer
 *
 * Thin event sequencer that fires hooks in order and assembles DatabasePage.
 * Per design memo (2026-02-21-hook-events-design-memo.md).
 *
 * Responsibilities:
 * 1. Maintain mutable output object (DatabasePage being assembled)
 * 2. Fire events in exact order from Event Ordering Contract
 * 3. Handle conditionals: page:should-sync, publish:check
 * 4. Bridge step: convert MdBlock[] to string after content:preprocess
 * 5. Perform final Supabase upsert
 *
 * All business logic lives in hooks. This class just sequences events.
 */
export declare class NotionPageToDatabasePageTransformer {
    private config;
    private notionClient;
    private pageCrud;
    private supabase;
    private extraHooks;
    private logger;
    private hookRegistry;
    constructor(config: DatabaseBlueprint, notionClient: NotionClient, pageCrud: DatabasePageCRUD, supabase: SupabaseClient<Database>, extraHooks?: Hook[]);
    /**
     * Transform a Notion page into a DatabasePage.
     * Follows Event Ordering Contract from design memo.
     *
     * @returns DatabasePage ready for upsert, or null if page should be skipped
     */
    transformPage(page: PageObjectResponse): Promise<DatabasePage | null>;
    /**
     * Fire `sync:result` for a page whose sync has finished.
     *
     * Lives here because the hook registry does, but it is called from the sync
     * coordinator -- the outcome is only known after the upsert, which is
     * outside the transformer. Exposed as this one method rather than by handing
     * out the registry, so the registry stays owned by one object.
     *
     * Reporting must never be able to fail a sync that otherwise worked, so
     * hook errors are logged and swallowed.
     */
    reportSyncResult(page: PageObjectResponse, report: SyncResultReport): Promise<void>;
}
//# sourceMappingURL=page-transformer.d.ts.map