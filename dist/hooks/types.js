/**
 * Composition strategy for hook execution.
 */
export var CompositionStrategy;
(function (CompositionStrategy) {
    /** Stop at first non-null result (strings, numbers, dates) */
    CompositionStrategy[CompositionStrategy["FirstWins"] = 0] = "FirstWins";
    /** Accumulate all results; registry infers merge (objects) or concat (arrays) */
    CompositionStrategy[CompositionStrategy["Collect"] = 1] = "Collect";
    /** Run all; true if any hook returns true (boolean OR) */
    CompositionStrategy[CompositionStrategy["OrAll"] = 2] = "OrAll";
    /** Run all; false if any hook returns false (boolean AND) */
    CompositionStrategy[CompositionStrategy["AndAll"] = 3] = "AndAll";
    /** Run all; ignore return values entirely (side effects) */
    CompositionStrategy[CompositionStrategy["RunAll"] = 4] = "RunAll";
    /** Chain: each hook's return becomes next hook's input; null = pass-through */
    CompositionStrategy[CompositionStrategy["Pipeline"] = 5] = "Pipeline";
})(CompositionStrategy || (CompositionStrategy = {}));
/** Helper to define a hook event with typed return, composition strategy, and optional field. */
function e(strategy, field) {
    return { output: null, strategy, field };
}
const S = CompositionStrategy;
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
export const HOOK_EVENTS = {
    // ── Page Lifecycle ─────────────────────────────────────────────────
    'page:before': e(S.RunAll),
    'page:should-sync': e(S.AndAll), // flow control — no field
    'page:after': e(S.RunAll),
    /*
     * Fired once per page after the sync has finished, successfully or not.
     * ctx.input is a SyncResultReport. Side effect only -- nothing is written
     * back to the output, which has already been persisted (or has failed to be).
     *
     * This is where reporting belongs. Symbiont knows a sync happened and
     * whether it worked; it does not know whether this particular newsroom wants
     * that in a Notion column, a Slack channel, or nowhere.
     */
    'sync:result': e(S.RunAll),
    // ── Publishing ─────────────────────────────────────────────────────
    'publish:check': e(S.AndAll), // flow control — no field
    'publish:date': e(S.FirstWins, 'publish_at'),
    // ── Slug Pipeline ──────────────────────────────────────────────────
    'slug:extract': e(S.FirstWins, 'slug'),
    'slug:generate': e(S.FirstWins, 'slug'),
    'slug:conflict': e(S.FirstWins, 'slug'), // receives current slug as input, returns resolved slug
    'slug:sync': e(S.RunAll), // side effect — no field
    // ── Metadata Extraction ────────────────────────────────────────────
    'metadata:title': e(S.FirstWins, 'title'),
    'metadata:tags': e(S.Collect, 'tags'),
    'metadata:authors': e(S.Collect, 'authors'),
    'metadata:summary': e(S.FirstWins, 'summary'),
    'metadata:add': e(S.Collect, 'meta'), // merged into output.meta
    // ── Content Pipeline ───────────────────────────────────────────────
    /**
     * Whether this sync reads the page body at all. AndAll: any `false` skips
     * the whole content pipeline below -- preprocess through content:sync -- and
     * the row is upserted WITHOUT a `content` field, so whatever is already in
     * `pages.content` is left exactly as it is. No hooks, or all abstaining
     * (null), means sync content as usual.
     *
     * For pages whose body is owned somewhere other than Notion (a web editor
     * writing `pages.content` directly) while Notion still owns their
     * properties. Omitting the column rather than re-writing the stored value is
     * the point: a sync that read the row before another writer saved and
     * upserted after would otherwise put the old text back.
     */
    'content:should-sync': e(S.AndAll), // flow control — no field
    'content:preprocess': e(S.FirstWins), // hook fetches content itself (pageToMarkdown); ctx.input unused; no field
    'content:text': e(S.Pipeline, 'content'),
    'content:media': e(S.Pipeline, 'content'),
    'content:postprocess': e(S.Pipeline, 'content'),
    'content:sync': e(S.RunAll), // side effect — no field
    // ── Cover Pipeline (config-gated via coverProperty) ────────────────
    'cover:extract': e(S.FirstWins, 'cover'), // default hook falls back to scanning content
    'cover:process': e(S.Pipeline, 'cover'),
    'cover:sync': e(S.RunAll) // side effect — no field
};
//# sourceMappingURL=types.js.map