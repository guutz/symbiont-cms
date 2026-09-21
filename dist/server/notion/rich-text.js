/** Notion rejects rich_text items longer than this. */
export const MAX_RICH_TEXT_ITEM_LENGTH = 2000;
const PLAIN_ANNOTATIONS = {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: 'default'
};
/** Re-send existing content unchanged, so an update does not flatten it. */
export function toRichTextRequest(items) {
    return items.map((item) => ({
        type: 'text',
        text: { content: item.plain_text, link: item.href ? { url: item.href } : null },
        annotations: item.annotations
    }));
}
/**
 * Put a single tagged line at the end of a property, replacing the previous one.
 *
 * Only *trailing* items are considered, so the same tag appearing in the middle
 * of somebody's prose is left alone. Whitespace-only items immediately before
 * the old line go too, or a blank line accumulates on every write.
 *
 * The result is idempotent in the way that matters: writing N times leaves one
 * line, not N.
 */
export function appendOrReplaceTaggedLine(existing, line, options) {
    const startsWithTag = (item) => item.plain_text.replace(/^[\s ]+/, '').startsWith(options.tag);
    const kept = [...existing];
    let removed = false;
    while (kept.length > 0 && startsWithTag(kept[kept.length - 1])) {
        kept.pop();
        removed = true;
    }
    if (removed) {
        while (kept.length > 0 && kept[kept.length - 1].plain_text.trim() === '') {
            kept.pop();
        }
    }
    const hasPriorText = kept.some((item) => item.plain_text.trim() !== '');
    return [
        ...toRichTextRequest(kept),
        {
            type: 'text',
            text: { content: hasPriorText ? `\n${line}` : line },
            annotations: {
                ...PLAIN_ANNOTATIONS,
                italic: options.italic ?? true,
                color: options.color ?? 'default'
            }
        }
    ];
}
//# sourceMappingURL=rich-text.js.map