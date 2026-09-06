import { type SupabaseClient } from '@supabase/supabase-js';
import type { SymbiontConfig, DatabasePage } from './types.js';
import type { Database } from './database.types.js';
/**
 * Options for fetching a single page
 */
export interface GetPageOptions {
    /** Custom fetch function for SSR context */
    fetch?: typeof globalThis.fetch;
    /** Database alias to query */
    alias?: string;
}
/**
 * Options for fetching multiple pages
 */
export interface GetAllPagesOptions {
    /** Custom fetch function for SSR context */
    fetch?: typeof globalThis.fetch;
    /** Maximum number of pages to return */
    limit?: number;
    /** Number of pages to skip */
    offset?: number;
    /** Database alias to query */
    alias?: string;
}
/**
 * The Symbiont client instance.
 * Created by calling createSymbiontClient() with your configuration.
 * Can be used in both client and server code.
 *
 * **Supabase Client Pattern**:
 * - Contains a public/anon Supabase client (read-only access)
 * - Used for querying pages from your frontend/SSR
 * - Service role client (admin) is separate - used only in sync operations
 */
export interface SymbiontClient {
    /** The configuration passed during creation */
    config: SymbiontConfig;
    /** Supabase client instance (public/anon key for read-only queries) */
    supabase: SupabaseClient<Database>;
    getSSRClient(fetch?: typeof globalThis.fetch, supabaseKey?: string): SupabaseClient<Database>;
    /** Fetch a single page by slug */
    getPageBySlug(slug: string, options?: GetPageOptions): Promise<DatabasePage | null>;
    /** Fetch all pages for a database */
    getAllPages(options?: GetAllPagesOptions): Promise<DatabasePage[]>;
}
/**
 * Create a Symbiont CMS client instance.
 *
 * This should be called once in your app, typically in `src/lib/symbiont.ts`:
 *
 * @example
 * ```ts
 * // src/lib/symbiont.ts
 * import { createSymbiontClient } from 'symbiont-cms';
 * import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
 *
 * export const symbiont = createSymbiontClient({
 *   supabase: {
 *     url: PUBLIC_SUPABASE_URL,
 *     publishableKey: PUBLIC_SUPABASE_ANON_KEY
 *   },
 *   databases: [
 *     {
 *       alias: 'blog',
 *       dataSourceId: 'your-notion-database-uuid'
 *     }
 *   ]
 * });
 * ```
 *
 * Then import and use it anywhere:
 * ```ts
 * import { symbiont } from './symbiont';
 *
 * // In +page.server.ts
 * export const load = async ({ params, fetch }) => {
 *   const page = await symbiont.getPageBySlug(params.slug, { fetch });
 *   return { page };
 * };
 * ```
 *
 * @param config - Your Symbiont configuration
 * @returns A Symbiont client instance with config and query methods
 */
export declare function createSymbiontClient(config: SymbiontConfig): SymbiontClient;
//# sourceMappingURL=client.d.ts.map