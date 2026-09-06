import type { PageObjectResponse } from '@notionhq/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HookEvent, Hook } from './types.js';
import type { DatabaseBlueprint, DatabasePage } from '../types.js';
/**
 * Hook Registry manages registration and execution of hooks.
 *
 * Execution is determined by the event's composition strategy:
 * - 'first-wins': Stop at first non-null result
 * - 'collect': Accumulate all results (merge objects, concat arrays)
 * - 'or-all': Run all; true if any returns true
 * - 'and-all': Run all; false if any returns false
 * - 'run-all': Run all; ignore return values
 */
export declare class HookRegistry {
    private hooks;
    /** Per-page mutable store, reset at the start of each page via beginPage(). */
    private pageStore;
    /**
     * Sync-scoped mutable store: persists for the entire sync (never reset between pages).
     * Lives as long as this registry instance (one per datasource sync invocation).
     * Use for sync-level caches, e.g. the slug-conflict map.
     */
    private syncStore;
    private logger;
    private config;
    private services;
    constructor(logger: {
        debug: (data: any) => void;
        info: (data: any) => void;
        warn: (data: any) => void;
        error: (data: any) => void;
    }, config: DatabaseBlueprint, services: {
        notionClient?: any;
        supabase?: SupabaseClient;
        [key: string]: unknown;
    });
    /**
     * Register a hook for an event.
     * Hooks are automatically sorted by priority.
     *
     * @param hook - The hook to register
     */
    register(hook: Hook): void;
    /**
     * Register multiple hooks at once.
     *
     * @param hooks - Array of hooks to register
     */
    registerMany(hooks: Hook[]): void;
    /**
     * Unregister a hook by name.
     *
     * @param hookName - Name of the hook to remove
     */
    unregister(hookName: string): void;
    /**
     * Execute all hooks for a given event.
     *
     * The execution strategy is determined by the event's composition strategy.
     * After composition, writes result to output[field] if field is defined.
     *
     * @param event - The hook event to execute
     * @param output - Mutable output object being assembled
     * @param page - The Notion page being processed
     * @param input - Optional pipeline input (for Pipeline events, slug:conflict, content:preprocess)
     * @returns Composed result from all hooks
     */
    execute<E extends HookEvent>(event: E, output: Partial<DatabasePage>, page: PageObjectResponse, input?: unknown): Promise<unknown>;
    /**
     * Execute hooks with first-wins strategy.
     * Stop at first non-null result.
     * Returning `false` is a stop-with-null sentinel: the chain is halted and
     * the composed result is `null` (output field is left unset).
     */
    private executeFirstWins;
    /**
     * Execute hooks with collect strategy.
     * Accumulate all results; infer merge (objects) or concat (arrays).
     */
    private executeCollect;
    /**
     * Execute hooks with or-all strategy.
     * Run all; true if any returns true, null = no opinion.
     */
    private executeOrAll;
    /**
     * Execute hooks with and-all strategy.
     * Run all; false if any returns false, null = no opinion.
     */
    private executeAndAll;
    /**
     * Execute hooks with run-all strategy.
     * Run all; ignore return values.
     */
    private executeRunAll;
    /**
     * Execute hooks with pipeline strategy.
     * Chain: each hook's return becomes next hook's input; null = pass-through.
     */
    private executePipeline;
    /**
     * Reset the per-page store. Call this at the start of each page's transform run.
     */
    beginPage(): void;
    /**
     * Build hook context.
     * Freezes output to make it read-only for hooks.
     */
    private buildContext;
    /**
     * Handle hook error.
     * Returns true if error was handled (continue), false if should throw.
     */
    private handleHookError;
    /**
     * Throw abort error.
     */
    private throwAbort;
    /**
     * Map named priority to number.
     */
    private mapPriority;
    /**
     * Get all hooks registered for an event.
     *
     * @param event - The hook event
     * @returns Array of hooks (sorted by priority)
     */
    getHooks(event: HookEvent): Hook[];
    /**
     * Get all registered hooks across all events.
     *
     * @returns Map of event to hooks array
     */
    getAllHooks(): Map<HookEvent, Hook[]>;
    /**
     * Clear all registered hooks.
     * Useful for testing.
     */
    clear(): void;
    /**
     * Get count of hooks for an event.
     *
     * @param event - The hook event
     * @returns Number of hooks registered for this event
     */
    getHookCount(event: HookEvent): number;
}
//# sourceMappingURL=registry.d.ts.map