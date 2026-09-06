import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types.js';
import type { DatabasePage } from '../../types.js';
/**
 * DatabasePageCRUD - Database CRUD operations via Supabase Postgres
 *
 * Responsibilities:
 * - CRUD operations for pages table
 * - Slug uniqueness checks
 * - Batch operations (delete all for source)
 *
 * Does NOT contain business logic - just database queries.
 *
 * **Supabase Client Pattern**:
 * - Receives service role Supabase client from coordinator (admin access)
 * - Service role key required for write operations (upsert, delete)
 * - Separate from user's public client (which is read-only)
 */
export declare class DatabasePageCRUD {
    private logger;
    private supabase;
    private static readonly PAGE_ID_CHUNK_SIZE;
    /**
     * @param supabase - Supabase client with service role key (admin access)
     */
    constructor(supabase: SupabaseClient<Database>);
    /**
     * Get page by Notion page ID
     * Note: Page IDs are globally unique across Notion, no need to filter by datasource
     */
    getByNotionPageId(pageId: string): Promise<DatabasePage | null>;
    /**
     * Get sync reference timestamps for a set of Notion page IDs.
     * Uses `last_synced_at` when present, falling back to `updated_at`.
     */
    getSyncRefsByPageIds(pageIds: string[]): Promise<Map<string, string>>;
    /**
     * Get page by slug and datasource ID
     */
    getBySlug(slug: string, datasourceId: string): Promise<DatabasePage | null>;
    /**
     * Get all pages for a datasource
     */
    getAllForSource(datasourceId: string): Promise<DatabasePage[]>;
    /**
     * Upsert (insert or update) a page
     */
    upsert(page: DatabasePage): Promise<void>;
    /**
     * Delete all pages for a datasource
     */
    deleteForSource(datasourceId: string): Promise<number>;
}
//# sourceMappingURL=page-crud.d.ts.map