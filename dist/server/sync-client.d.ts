import type { SymbiontClient } from '../client.js';
import type { DatabaseBlueprint } from '../types.js';
import type { Hook, HookFunction } from '../hooks/types.js';
type SyncBehaviorConfig = Omit<Partial<DatabaseBlueprint>, 'alias' | 'dataSourceId' | 'hooks'>;
/**
 * Named slot API for common sync behavior.
 *
 * Slots are hook sugar over core events and are compiled to `priority: 'override'`
 * hooks internally with no additional execution model.
 */
export interface SyncSlotConfig {
    /**
     * Wraps `page:should-sync`.
     * Return `true` to include, `false` to skip, `null` to abstain and use defaults.
     */
    shouldSync?: HookFunction<boolean>;
    /**
     * Wraps `publish:check`.
     * Return `true` to publish, `false` to keep dark draft, `null` to abstain.
     */
    isPublished?: HookFunction<boolean>;
    /**
     * Wraps `publish:date`.
     * Return `null` to abstain and allow default publish date behavior.
     */
    publishDate?: HookFunction<string | Date>;
    /** Wraps `metadata:add`. Return object to merge into `meta`, or `null` to abstain. */
    addMetadata?: HookFunction<Record<string, unknown>>;
    /** Wraps `content:postprocess`. Return transformed markdown or `null` to abstain. */
    transformContent?: HookFunction<string>;
}
export interface SyncDatabaseConfig extends SyncBehaviorConfig, SyncSlotConfig {
    /** Optional redundant alias when using defineDatabase(). */
    alias?: string;
    /** Escape hatch for custom hooks/side-effects. */
    hooks?: Hook[];
}
/**
 * Server-side sync configuration keyed by database alias.
 */
export type SyncConfigMap = Record<string, SyncDatabaseConfig>;
export interface ResolvedSyncDatabase {
    config: DatabaseBlueprint;
    hooks: Hook[];
}
export interface SymbiontSyncServer extends SymbiontClient {
    syncConfigByAlias: SyncConfigMap;
}
/**
 * Typed helper for large per-database sync config objects.
 */
export declare function defineDatabase<T extends SyncDatabaseConfig>(database: T): T;
/**
 * Resolve one database into the runtime sync blueprint + concrete hooks list.
 *
 * Resolution order:
 * 1. Look up alias in syncConfigByAlias
 * 2. Validate no slot/hook event conflict
 * 3. Compile slots to hooks
 * 4. Append custom hooks
 */
export declare function resolveSyncDatabase(client: SymbiontClient, queryDatabase: Pick<DatabaseBlueprint, 'alias' | 'dataSourceId'>): ResolvedSyncDatabase;
/**
 * Wrap a standard Symbiont client with server-only sync config.
 *
 * Named slots are hook sugar over core events. The `hooks` array remains the
 * escape hatch for side effects and event-level customization.
 *
 * Keys must match configured database aliases.
 */
export declare function createSymbiontServer(client: SymbiontClient, syncConfigByAlias: SyncConfigMap): SymbiontSyncServer;
export {};
//# sourceMappingURL=sync-client.d.ts.map