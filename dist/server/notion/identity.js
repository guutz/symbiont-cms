import { createLogger } from '../utils/logger.js';
import { withNotionRetry } from './retry.js';
let botUserIdPromise = null;
/**
 * The integration's own user id, cached for the life of the process.
 *
 * A *failure* is deliberately not cached. The call needs the integration to
 * have the "read user information" capability, and callers treat a null answer
 * as a reason not to write to Notion at all -- so caching one transient failure
 * would disable write-back until the next cold start.
 */
export async function getBotUserId(notion) {
    botUserIdPromise ??= withNotionRetry(() => notion.users.me({}))
        .then((user) => user?.id ?? null)
        .catch((error) => {
        createLogger({ operation: 'notion_identity' }).warn({
            event: 'bot_user_lookup_failed',
            error: error?.message,
            hint: 'Anything that writes back to Notion stays off without this. The integration needs the "read user information" capability.'
        });
        botUserIdPromise = null;
        return null;
    });
    return botUserIdPromise;
}
/**
 * Whether the most recent edit to this page was made by the integration itself.
 *
 * Any write-back is a loop unless something checks this: writing to a page
 * edits it, which fires the automation, which syncs, which writes again.
 * Returns false when the bot id is unknown, so callers must treat "unknown" as
 * unsafe rather than relying on this to say no -- see `writeBackSafe` on the
 * sync:result hook context, which folds both conditions into one answer.
 */
export function wasLastEditedByBot(page, botUserId) {
    if (!botUserId)
        return false;
    return page.last_edited_by?.id === botUserId;
}
//# sourceMappingURL=identity.js.map