import type { RichTextItemResponse } from '@notionhq/client';
/**
 * Editing a Notion rich_text property without destroying what is already there.
 *
 * Notion's page update replaces the whole rich_text array, so anything already
 * in the property has to be sent back verbatim -- annotations and links
 * included, or a write would quietly strip the bold out of someone's notes.
 * That round-trip is fiddly enough to be worth having in one place.
 *
 * This module is mechanism only. What the line says, what tags it, and which
 * property it goes in are decisions for whoever is calling; see the
 * `sync:result` hook.
 */
type NotionColor = RichTextItemResponse['annotations']['color'];
type NotionAnnotations = RichTextItemResponse['annotations'];
export interface RichTextRequestItem {
    type: 'text';
    text: {
        content: string;
        link?: {
            url: string;
        } | null;
    };
    annotations: NotionAnnotations;
}
/** Notion rejects rich_text items longer than this. */
export declare const MAX_RICH_TEXT_ITEM_LENGTH = 2000;
/** Re-send existing content unchanged, so an update does not flatten it. */
export declare function toRichTextRequest(items: RichTextItemResponse[]): RichTextRequestItem[];
export interface TaggedLineOptions {
    /** Prefix identifying a line as machine-written, so it can be found again. */
    tag: string;
    /** Colour for the appended line. */
    color?: NotionColor;
    italic?: boolean;
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
export declare function appendOrReplaceTaggedLine(existing: RichTextItemResponse[], line: string, options: TaggedLineOptions): RichTextRequestItem[];
export {};
//# sourceMappingURL=rich-text.d.ts.map