/**
 * Notion allows roughly three requests per second per integration, averaged,
 * with short bursts tolerated. Total volume is not the constraint; concurrency
 * is -- and on a serverless host every webhook is its own invocation, so there
 * is no shared token bucket to ration against. Honouring Retry-After after the
 * fact is the only control available from inside a single invocation.
 */
export async function withNotionRetry(fn, attempts = 4) {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            const status = error?.status ?? error?.code;
            const retryable = status === 429 || status === 502 || status === 503 || status === 504;
            if (!retryable || attempt === attempts - 1)
                throw error;
            const headerValue = Number(error?.headers?.['retry-after'] ?? error?.headers?.get?.('retry-after'));
            const waitMs = Number.isFinite(headerValue) && headerValue > 0 ? headerValue * 1000 : 2 ** attempt * 400;
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }
    throw lastError;
}
//# sourceMappingURL=retry.js.map