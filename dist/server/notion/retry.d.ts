/**
 * Notion allows roughly three requests per second per integration, averaged,
 * with short bursts tolerated. Total volume is not the constraint; concurrency
 * is -- and on a serverless host every webhook is its own invocation, so there
 * is no shared token bucket to ration against. Honouring Retry-After after the
 * fact is the only control available from inside a single invocation.
 */
export declare function withNotionRetry<T>(fn: () => Promise<T>, attempts?: number): Promise<T>;
//# sourceMappingURL=retry.d.ts.map