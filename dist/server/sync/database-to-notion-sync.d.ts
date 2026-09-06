import type { DatabaseBlueprint } from '../../types.js';
import type { NotionClient } from '../notion/client.js';
import type { DatabasePageCRUD } from '../database/page-crud.js';
export interface PublishToNotionOptions {
    /** Only log what would happen, don't actually update Notion */
    dryRun?: boolean;
    /** Convert invalid image URLs to text instead of failing (default: false) */
    strictImageUrls?: boolean;
    /** Auto-truncate when exceeding Notion limits (default: true) */
    truncate?: boolean;
}
/**
 * Publish a page from the database to Notion
 *
 * Reverse sync workflow (DB → Notion):
 * 1. Fetch page from database
 * 2. Convert markdown content to Notion blocks
 * 3. Find corresponding Notion page
 * 4. Update Notion page content
 *
 * This is a simple orchestration function - all the heavy lifting
 * is done by NotionClient and markdown-to-blocks utilities.
 *
 * @param pageId - UUID of page in database
 * @param config - Database blueprint for Notion connection
 * @param notionClient - Notion API client
 * @param pageCrud - Database page CRUD operations
 * @param options - Publishing options
 */
export declare function publishPostToNotion(pageId: string, config: DatabaseBlueprint, notionClient: NotionClient, databaseCrud: DatabasePageCRUD, options?: PublishToNotionOptions): Promise<void>;
//# sourceMappingURL=database-to-notion-sync.d.ts.map