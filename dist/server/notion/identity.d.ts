import type { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client';
/**
 * The integration's own user id, cached for the life of the process.
 *
 * A *failure* is deliberately not cached. The call needs the integration to
 * have the "read user information" capability, and callers treat a null answer
 * as a reason not to write to Notion at all -- so caching one transient failure
 * would disable write-back until the next cold start.
 */
export declare function getBotUserId(notion: Client): Promise<string | null>;
/**
 * Whether the most recent edit to this page was made by the integration itself.
 *
 * Any write-back is a loop unless something checks this: writing to a page
 * edits it, which fires the automation, which syncs, which writes again.
 * Returns false when the bot id is unknown, so callers must treat "unknown" as
 * unsafe rather than relying on this to say no -- see `writeBackSafe` on the
 * sync:result hook context, which folds both conditions into one answer.
 */
export declare function wasLastEditedByBot(page: PageObjectResponse, botUserId: string | null): boolean;
//# sourceMappingURL=identity.d.ts.map