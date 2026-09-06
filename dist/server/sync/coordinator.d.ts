import { type SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseBlueprint } from '../../types.js';
import type { Database } from '../../database.types.js';
import type { SymbiontClient } from '../../client.js';
import { NotionToDatabaseSync } from './notion-to-database-sync.js';
import type { Hook } from '../../hooks/types.js';
/**
 * Factory function to create a fully-wired NotionToDatabaseSync coordinator
 *
 * This handles all the dependency injection:
 * - Notion client initialization (with token resolution)
 * - Database client setup
 * - Class instantiation in the correct order
 *
 * **Supabase Client Pattern**:
 * - User's SymbiontClient contains a public/anon Supabase client (read-only)
 * - Coordinator creates a service role Supabase client (admin, write access)
 * - Service role client is used for:
 *   - Image uploads to storage
 *   - Database mutations (upsert/delete pages)
 *   - Sync operations requiring write access
 *
 * @param client - Symbiont client instance (contains public Supabase client)
 * @param config - Database configuration blueprint
 * @param adminSupabase - Optional pre-created service role Supabase client.
 *   Pass this when the caller already holds an admin client (e.g. syncFromNotion)
 *   to avoid creating redundant client instances.
 *
 * @example
 * const sync = createNotionToDatabaseSyncCoordinator(client, dbConfig);
 * await sync.syncDataSource({ syncAll: true });
 */
export declare function createNotionToDatabaseSyncCoordinator(client: SymbiontClient, config: DatabaseBlueprint, adminSupabase?: SupabaseClient<Database>, extraHooks?: Hook[]): NotionToDatabaseSync;
//# sourceMappingURL=coordinator.d.ts.map