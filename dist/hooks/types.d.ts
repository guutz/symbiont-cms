import type { PageObjectResponse } from '@notionhq/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseBlueprint, DatabasePage } from '../types.js';
import type { Database } from '../database.types.js';
/**
 * Composition strategy for hook execution.
 */
export declare enum CompositionStrategy {
    /** Stop at first non-null result (strings, numbers, dates) */
    FirstWins = 0,
    /** Accumulate all results; registry infers merge (objects) or concat (arrays) */
    Collect = 1,
    /** Run all; true if any hook returns true (boolean OR) */
    OrAll = 2,
    /** Run all; false if any hook returns false (boolean AND) */
    AndAll = 3,
    /** Run all; ignore return values entirely (side effects) */
    RunAll = 4,
    /** Chain: each hook's return becomes next hook's input; null = pass-through */
    Pipeline = 5
}
/**
 * Hook event definitions - THE SINGLE SOURCE OF TRUTH
 *
 * Each event has:
 * - output: Type of value returned by hooks (TReturn)
 * - strategy: How to compose results from multiple hooks
 * - field: Optional keyof DatabasePage where result is written
 *
 * Events are fired in order by the transformer. See Event Ordering Contract in design memo.
 */
export declare const HOOK_EVENTS: {
    readonly 'page:before': {
        output: void;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'page:should-sync': {
        output: boolean;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'page:after': {
        output: void;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'publish:check': {
        output: boolean;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'publish:date': {
        output: string | Date;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'slug:extract': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'slug:generate': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'slug:conflict': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'slug:sync': {
        output: void;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'metadata:title': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'metadata:tags': {
        output: string[];
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'metadata:authors': {
        output: string[];
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'metadata:summary': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'metadata:add': {
        output: Record<string, unknown>;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'content:preprocess': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'content:text': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'content:media': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'content:postprocess': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'content:sync': {
        output: void;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'cover:extract': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'cover:process': {
        output: string;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
    readonly 'cover:sync': {
        output: void;
        strategy: CompositionStrategy;
        field: keyof DatabasePage | undefined;
    };
};
/**
 * Hook event names derived from HOOK_EVENTS.
 */
export type HookEvent = keyof typeof HOOK_EVENTS;
/**
 * Context object passed to each hook function.
 *
 * Contains everything a hook needs to operate: the page being processed,
 * accumulated output so far, configuration, logging, services, and control flow.
 */
export type HookContext = {
    /** The Notion page being processed (raw source, never mutated) */
    page: PageObjectResponse;
    /** Accumulated output so far (read-only view of DatabasePage being assembled) */
    output: Readonly<Partial<DatabasePage>>;
    /**
     * Pipeline input value (for Pipeline events and slug:conflict).
     * - Pipeline events: current value in the transform chain
     * - slug:conflict: current slug needing validation
     * - content:preprocess: unused (hook fetches via pageToMarkdown internally)
     */
    input?: unknown;
    /** The database configuration */
    config: DatabaseBlueprint;
    /** Logger instance for structured logging */
    logger: {
        debug: (data: any) => void;
        info: (data: any) => void;
        warn: (data: any) => void;
        error: (data: any) => void;
    };
    /**
     * Services for side-effect operations.
     * Always present as an object (individual fields may be undefined).
     *
     * Built-in services:
     * - notionClient: For syncing data back to Notion
     * - supabase: Supabase client for storage operations
     *
     * Custom services can be added via index signature.
     */
    services: {
        notionClient?: any;
        supabase?: SupabaseClient<Database>;
        [key: string]: unknown;
    };
    /** Stop processing this page with a reason */
    abort: (reason: string) => void;
    /**
     * Mutable key-value bag that persists across ALL hook events for a single page's
     * processing run. Use this to pass computed values from one event to a later event
     * without relying on ctx.page being re-fetched.
     *
     * Example: an `archives:pdf` hook on `content:postprocess` uploads a PDF and
     * writes `ctx.store.pdfPublicUrl = result.newUrl`; a later `archives:cover` hook
     * on `cover:extract` reads `ctx.store.pdfPublicUrl` to generate the thumbnail.
     */
    store: Record<string, unknown>;
    /**
     * Mutable key-value bag that persists for the ENTIRE SYNC (across all pages).
     * Unlike `store`, this is NOT reset between pages — it lives as long as the
     * HookRegistry instance (one per datasource sync invocation).
     *
     * Use this for sync-scoped caches, e.g. the slug conflict map so we only
     * query existing slugs from the database once instead of once per page.
     */
    syncStore: Record<string, unknown>;
};
/**
 * Hook function signature.
 *
 * Hooks read from `ctx.page` (and optionally `ctx.input`) and return a value or `null`.
 * - Return your value if you have data to contribute
 * - Return `null` if you have nothing to contribute (continues to next hook)
 *
 * The registry composes results based on the event's composition strategy.
 */
export type HookFunction<TOutput = any> = (context: HookContext) => Promise<TOutput | null> | TOutput | null;
/**
 * Hook definition.
 * Associates a function with an event and priority.
 *
 * Priority values:
 * - 'before': Runs before Symbiont's defaults
 * - 'after': Runs after Symbiont's defaults
 * - 'override': Alias of 'before' (kept for backwards compatibility)
 * - 'fallback': Alias of 'after' (kept for backwards compatibility)
 * - omitted: Same order as built-in defaults
 */
export interface Hook<TOutput = any> {
    /** User-defined name for this hook (for logging/debugging) */
    name: string;
    /** Built-in event type this hook responds to */
    event: HookEvent;
    /**
     * Priority for execution order.
     * - 'before': Runs before defaults
     * - 'after': Runs after defaults
     * - 'override': Alias of 'before'
     * - 'fallback': Alias of 'after'
     * - omitted: Same level as defaults
     */
    priority?: 'before' | 'after' | 'override' | 'fallback';
    /**
     * Whether to continue execution if this hook throws an error.
     * Default: false (stop on error)
     *
     * Set to true for best-effort side effects (notifications, analytics)
     * that shouldn't break the sync if they fail.
     */
    continueOnError?: boolean;
    /** The hook function to execute */
    fn: HookFunction<TOutput>;
}
/**
 * Internal state for tracking control flow within hook execution
 */
export interface HookExecutionState {
    aborted: boolean;
    abortReason?: string;
}
//# sourceMappingURL=types.d.ts.map