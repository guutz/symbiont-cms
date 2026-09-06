/**
 * Structured logging utilities for Symbiont CMS
 *
 * Provides context-aware logging with metrics tracking and log levels.
 * Uses Pino for fast, structured JSON logging.
 *
 * @example
 * const logger = createLogger({ databaseId: 'blog' });
 * logger.info({ event: 'sync_started', pageCount: 10 });
 * logger.error({ event: 'sync_failed', error: err.message });
 */
import pino from 'pino';
export declare const baseLogger: pino.Logger<never, boolean>;
/**
 * Context for scoped loggers
 */
export interface LoggerContext {
    /** Database short ID (e.g., 'blog', 'docs') */
    databaseId?: string;
    /** Notion page ID */
    pageId?: string;
    /** Request ID for tracing */
    requestId?: string;
    /** Operation being performed */
    operation?: string;
    /** Additional context fields */
    [key: string]: any;
}
/**
 * Structured logger with context
 */
export interface Logger {
    /** Log debug information (development only) */
    debug(msg: string | object, ...args: any[]): void;
    /** Log informational messages (normal operations) */
    info(msg: string | object, ...args: any[]): void;
    /** Log warnings (recoverable issues) */
    warn(msg: string | object, ...args: any[]): void;
    /** Log errors (failures requiring attention) */
    error(msg: string | object, ...args: any[]): void;
    /** Create a child logger with additional context */
    child(context: LoggerContext): Logger;
}
/**
 * Create a logger with optional context
 *
 * @param context - Context fields to include in all log entries
 * @returns Logger instance
 *
 * @example
 * const logger = createLogger({ databaseId: 'blog', operation: 'sync' });
 * logger.info({ event: 'sync_started', pageCount: 10 });
 * // Output: { level: 'info', service: 'symbiont-cms', databaseId: 'blog', operation: 'sync', event: 'sync_started', pageCount: 10 }
 */
export declare function createLogger(context?: LoggerContext): Logger;
/**
 * Metrics tracker for monitoring sync operations
 */
export declare class SyncMetrics {
    private startTime;
    private pageCount;
    private successCount;
    private errorCount;
    private errors;
    constructor();
    /** Record a successful page sync */
    recordSuccess(): void;
    /** Record a failed page sync */
    recordError(pageId: string, error: string): void;
    /** Get sync duration in milliseconds */
    getDuration(): number;
    /** Get metrics summary */
    getSummary(): {
        duration_ms: number;
        pages_processed: number;
        success_count: number;
        error_count: number;
        success_rate: number;
        errors: {
            pageId: string;
            error: string;
        }[];
    };
    /** Log final metrics */
    logSummary(logger: Logger): void;
}
/**
 * Measure execution time of an async operation
 *
 * @param fn - Async function to measure
 * @returns Object with result and duration
 *
 * @example
 * const { result, duration } = await measureTime(async () => {
 *   return await fetchFromNotion();
 * });
 * logger.info({ event: 'fetch_completed', duration_ms: duration });
 */
export declare function measureTime<T>(fn: () => Promise<T>): Promise<{
    result: T;
    duration: number;
}>;
/**
 * Default logger instance (no context)
 * Use createLogger() for context-aware logging
 */
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map