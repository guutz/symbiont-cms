import { createClient } from '@supabase/supabase-js';
const PAGES_TABLE = 'pages';
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
 * import { symbiont } from '$lib/symbiont';
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
export function createSymbiontClient(config) {
    // Create Supabase client with public credentials
    const supabase = createClient(config.supabase.url, config.supabase.publishableKey);
    /**
     * Helper to resolve alias (uses first configured database if not specified)
     */
    function resolveAlias(alias) {
        const resolvedAlias = alias ?? config.databases[0]?.alias;
        if (!resolvedAlias) {
            throw new Error('No database alias configured or provided. Please either:\n' +
                '  1. Configure at least one database, or\n' +
                '  2. Provide an explicit alias in the query options');
        }
        return resolvedAlias;
    }
    /**
     * Create a Supabase client with optional custom fetch for SSR
     */
    function getClient(customFetch, supabaseKey) {
        if (!customFetch && !supabaseKey)
            return supabase;
        // Create a new client with custom fetch for SSR
        return createClient(config.supabase.url, supabaseKey ?? config.supabase.publishableKey, {
            global: { fetch: customFetch },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    }
    return {
        config,
        supabase,
        getSSRClient: getClient,
        async getPageBySlug(slug, options = {}) {
            const client = getClient(options.fetch);
            const sourceAlias = resolveAlias(options.alias);
            const { data, error } = await client.from(PAGES_TABLE)
                .select('*')
                .like('datasource_alias', sourceAlias)
                .like('slug', slug)
                .maybeSingle();
            if (error) {
                throw new Error(`Query error: ${error.message}`);
            }
            return data;
        },
        async getAllPages(options = {}) {
            const client = getClient(options.fetch);
            const sourceAlias = resolveAlias(options.alias);
            const offset = options.offset ?? 0;
            const limit = options.limit ?? 100;
            const { data, error } = await client.from(PAGES_TABLE)
                .select('*')
                .like('datasource_alias', sourceAlias)
                .order('publish_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                throw new Error(`Query error: ${error.message}`);
            }
            return data;
        }
    };
}
//# sourceMappingURL=client.js.map