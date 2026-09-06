import { Client, type PageObjectResponse } from '@notionhq/client';
import type { DiffResult } from './blocks-diff.js';
import type { BlockTransformerFn } from '../notion-md/types.js';
/**
 * Strip fields from block content that the Notion `blocks.update` endpoint
 * does not accept (but that `blocks.children.append` / create does accept).
 *
 * Two concrete constraints:
 * 1. `children` — child blocks are separate API resources; they cannot be
 *    modified via a block update.  Any block type can carry children when
 *    created, but the update endpoint always rejects them.
 * 2. `image.type` — image blocks carry a discriminant `type: "external"` field
 *    that is only accepted during creation; the update endpoint rejects it.
 */
export declare function sanitizeContentForUpdate(blockType: string, content: any): any;
/**
 * NotionClient - Pure Notion API interactions
 *
 * Responsibilities:
 * - Talk to Notion API (query databases, fetch pages, update properties)
 * - Convert Notion pages to markdown via the built-in notion-md module
 * - Extract property values from Notion pages
 *
 * Does NOT contain business logic - just API calls and data extraction.
 */
export declare class NotionClient {
    private notion;
    private logger;
    private writePolicy;
    constructor(notion: Client);
    setWritesEnabled(enabled: boolean): void;
    setWritePolicy(policy: {
        content?: boolean;
        properties?: boolean;
    }): void;
    private shouldSkipWrite;
    /**
     * Register a custom block transformer.
     * The transformer receives the raw Notion block and a fetchChildren callback.
     * Return a markdown string to override default behavior, or `false` to use default.
     */
    setBlockTransformer(type: string, fn: BlockTransformerFn): void;
    /** Remove all registered custom block transformers. */
    clearBlockTransformers(): void;
    /**
     * Wrap a single Notion API call with retry logic for 429 (rate-limited)
     * responses. Reads the `Retry-After` header when present and falls back to
     * exponential backoff (1 s, 2 s, 4 s) for up to 3 attempts.
     *
     * All other errors are re-thrown immediately.
     */
    private withRetry;
    /**
     * Fetch a single page by ID
     */
    getPage(pageId: string): Promise<PageObjectResponse>;
    /**
     * Query a Notion database (with optional filtering and pagination)
     */
    queryDataSource(dataSourceId: string, filter?: any, cursor?: string): Promise<{
        pages: PageObjectResponse[];
        nextCursor: string | null;
    }>;
    /**
     * Update a property on a Notion page
     */
    updateProperty(pageId: string, propertyName: string, value: string): Promise<void>;
    /**
     * Update a URL property on a Notion page
     * Used to sync public CDN/storage URLs back to Notion url-type properties
     */
    updateUrlProperty(pageId: string, propertyName: string, url: string): Promise<void>;
    /**
     * Update a number property on a Notion page.
     * Used for derived metrics like word counts.
     */
    updateNumberProperty(pageId: string, propertyName: string, value: number | null): Promise<void>;
    /**
     * Update a file property on a Notion page with an external URL
     * Used to sync uploaded image URLs (Supabase Storage) back to Notion
     */
    updateFileProperty(pageId: string, propertyName: string, url: string): Promise<void>;
    /**
     * Replace all blocks in a Notion page
     *
     * Note: Notion doesn't have a "replace all" operation, so this:
     * 1. Deletes all existing blocks
     * 2. Appends new blocks in chunks of 100 (Notion API limit)
     */
    updatePageBlocks(pageId: string, blocks: any[]): Promise<void>;
    /**
     * Apply a surgical diff edit script to a Notion page.
     *
     * Operations are applied in an atomicity-safe order:
     * 1. Updates  — non-destructive, page always coherent.
     * 2. Inserts  — additive; no data loss if interrupted.
     * 3. Replaces — insert new block, then delete old block (paired).
     * 4. Deletes  — soft-deletes; stale blocks cleaned up on next sync if
     *               interrupted.
     *
     * Each operation is individually try/caught: a failure in one operation
     * logs a warning and continues, leaving the page in a superset state that
     * is safe and will be corrected on the next sync.
     *
     * Adjacent inserts that share the same `afterId` anchor are batched into a
     * single append call (up to 100 blocks per request).
     *
     * @returns `{ applied, failed }` counts for observability.
     */
    patchPageBlocks(pageId: string, diff: DiffResult): Promise<{
        applied: number;
        failed: number;
    }>;
    /**
     * Find a page by a specific property value
     * Generic version of finding by any property type
     */
    findPageByProperty(dataSourceId: string, propertyName: string, propertyType: 'number' | 'rich_text' | 'select', value: number | string): Promise<string | null>;
    /**
     * Convert a Notion page's blocks to markdown.
     * Uses the built-in notion-md module; respects registered custom block transformers.
     */
    pageToMarkdown(pageId: string): Promise<string>;
    /**
     * Extract property values from a Notion page
     * Handles multi_select, select, people, rich_text, etc.
     */
    getPropertyValues(page: PageObjectResponse, propertyName: string): string[];
    /**
     * Auto-detect title property (type: 'title')
     */
    getTitleProperty(page: PageObjectResponse): string;
    /**
     * Auto-detect unique_id property (type: 'unique_id')
     */
    getUniqueIdProperty(page: PageObjectResponse): string | null;
    /**
     * Get raw blocks from a Notion page (paginated — fetches all blocks).
     * Returns BlockObjectResponse[] for content:preprocess hook.
     */
    getBlocks(pageId: string): Promise<any[]>;
    /**
     * Get database schema (for publish:check hook to find Status property).
     * Returns the full database object with properties definition.
     */
    getDatabaseSchema(databaseId: string): Promise<any>;
}
//# sourceMappingURL=client.d.ts.map