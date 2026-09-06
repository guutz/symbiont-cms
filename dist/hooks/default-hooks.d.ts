import type { Hook } from './types.js';
/**
 * Default hooks implementing Symbiont's opinionated behavior.
 * Aligned with design memo (2026-02-21-hook-events-design-memo.md).
 *
 * All hooks use default priority unless specified.
 */
export declare const defaultPageBeforeHook: Hook<void>;
export declare const defaultPageShouldSyncHook: Hook<boolean>;
export declare const defaultPageAfterHook: Hook<void>;
/**
 * Cache for Notion database schema lookups (per sync run).
 * Key: dataSourceId, Value: status property definition
 */
export declare const defaultPublishCheckHook: Hook<boolean>;
export declare const defaultPublishDateHook: Hook<string | Date>;
export declare const defaultSlugExtractHook: Hook<string>;
export declare const defaultSlugGenerateHook: Hook<string>;
export declare const defaultSlugConflictHook: Hook<string>;
export declare const defaultSlugSyncHook: Hook<void>;
export declare const defaultTitleExtractHook: Hook<string>;
export declare const defaultTagsExtractHook: Hook<string[]>;
export declare const defaultAuthorsExtractHook: Hook<string[]>;
export declare const defaultSummaryExtractHook: Hook<string>;
export declare const defaultCustomMetadataHook: Hook<Record<string, unknown>>;
export declare const defaultContentPreprocessHook: Hook<string>;
export declare const defaultContentTextHook: Hook<string>;
export declare const defaultContentMediaHook: Hook<string>;
export declare const defaultContentPostprocessHook: Hook<string>;
export declare const defaultContentSyncHook: Hook<void>;
export declare const defaultCoverExtractHook: Hook<string>;
export declare const defaultCoverProcessHook: Hook<string>;
export declare const defaultCoverSyncHook: Hook<void>;
export declare const defaultHooks: Hook[];
//# sourceMappingURL=default-hooks.d.ts.map