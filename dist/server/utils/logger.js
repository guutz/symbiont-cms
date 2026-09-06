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
import { readEnvVar } from './env.js';
// Default log level (can be overridden by LOG_LEVEL env var)
const LOG_LEVEL = readEnvVar('LOG_LEVEL') || 'info';
/**
 * Defaults to 'production', NOT 'development'.
 *
 * It used to default to 'development', which made the pino-pretty transport the
 * default rather than the exception. `pino-pretty` is only a devDependency here,
 * so in any context that does not set NODE_ENV -- a tsx script, a test runner, a
 * fresh consumer install -- constructing the logger threw at module load:
 *
 *   unable to determine transport target for "pino-pretty"
 *
 * And because server.ts re-exports this module, that broke importing *anything*
 * from `symbiont-cms/server`. Consumers were papering over it by adding
 * pino-pretty to their own dependencies.
 *
 * Plain JSON logging works everywhere, so it is the correct default. `vite dev`
 * sets NODE_ENV=development, so local development still gets pretty output.
 */
const NODE_ENV = readEnvVar('NODE_ENV') || 'production';
/**
 * Base Pino logger instance.
 * - development, with pino-pretty available: pretty-printed colored output
 * - otherwise: JSON output for log aggregators
 *
 * `pino-pretty` is an OPTIONAL runtime dependency. It is not listed in
 * `dependencies` on purpose -- shipping a development pretty-printer to every
 * consumer's production bundle is not worth it -- so the transport is attempted
 * defensively and degrades to JSON if the package is not installed. Never let
 * logging configuration break module import.
 */
function createBaseLogger() {
    const baseOptions = {
        level: LOG_LEVEL,
        base: {
            service: 'symbiont-cms',
            env: NODE_ENV
        }
    };
    if (NODE_ENV !== 'development') {
        return pino(baseOptions);
    }
    try {
        return pino({
            ...baseOptions,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                    singleLine: false
                }
            }
        });
    }
    catch {
        // pino-pretty not installed. Fall back rather than taking down the import.
        const fallback = pino(baseOptions);
        fallback.debug({ event: 'pretty_logging_unavailable' });
        return fallback;
    }
}
export const baseLogger = createBaseLogger();
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
export function createLogger(context) {
    const childLogger = context ? baseLogger.child(context) : baseLogger;
    return {
        debug(msg, ...args) {
            if (typeof msg === 'string') {
                childLogger.debug(msg, ...args);
            }
            else {
                childLogger.debug(msg);
            }
        },
        info(msg, ...args) {
            if (typeof msg === 'string') {
                childLogger.info(msg, ...args);
            }
            else {
                childLogger.info(msg);
            }
        },
        warn(msg, ...args) {
            if (typeof msg === 'string') {
                childLogger.warn(msg, ...args);
            }
            else {
                childLogger.warn(msg);
            }
        },
        error(msg, ...args) {
            if (typeof msg === 'string') {
                childLogger.error(msg, ...args);
            }
            else {
                childLogger.error(msg);
            }
        },
        child(childContext) {
            return createLogger({ ...context, ...childContext });
        }
    };
}
/**
 * Metrics tracker for monitoring sync operations
 */
export class SyncMetrics {
    startTime;
    pageCount = 0;
    successCount = 0;
    errorCount = 0;
    errors = [];
    constructor() {
        this.startTime = Date.now();
    }
    /** Record a successful page sync */
    recordSuccess() {
        this.pageCount++;
        this.successCount++;
    }
    /** Record a failed page sync */
    recordError(pageId, error) {
        this.pageCount++;
        this.errorCount++;
        this.errors.push({ pageId, error });
    }
    /** Get sync duration in milliseconds */
    getDuration() {
        return Date.now() - this.startTime;
    }
    /** Get metrics summary */
    getSummary() {
        return {
            duration_ms: this.getDuration(),
            pages_processed: this.pageCount,
            success_count: this.successCount,
            error_count: this.errorCount,
            success_rate: this.pageCount > 0 ? (this.successCount / this.pageCount) : 1,
            errors: this.errors
        };
    }
    /** Log final metrics */
    logSummary(logger) {
        const summary = this.getSummary();
        if (summary.error_count > 0) {
            logger.warn({
                event: 'sync_completed_with_errors',
                ...summary
            });
        }
        else {
            logger.info({
                event: 'sync_completed',
                ...summary
            });
        }
    }
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
export async function measureTime(fn) {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
}
/**
 * Default logger instance (no context)
 * Use createLogger() for context-aware logging
 */
export const logger = createLogger();
