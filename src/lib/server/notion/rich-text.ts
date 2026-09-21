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
	text: { content: string; link?: { url: string } | null };
	annotations: NotionAnnotations;
}

/** Notion rejects rich_text items longer than this. */
export const MAX_RICH_TEXT_ITEM_LENGTH = 2000;

const PLAIN_ANNOTATIONS: NotionAnnotations = {
	bold: false,
	italic: false,
	strikethrough: false,
	underline: false,
	code: false,
	color: 'default'
} as NotionAnnotations;

/** Re-send existing content unchanged, so an update does not flatten it. */
export function toRichTextRequest(items: RichTextItemResponse[]): RichTextRequestItem[] {
	return items.map((item) => ({
		type: 'text' as const,
		text: { content: item.plain_text, link: item.href ? { url: item.href } : null },
		annotations: item.annotations
	}));
}

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
export function appendOrReplaceTaggedLine(
	existing: RichTextItemResponse[],
	line: string,
	options: TaggedLineOptions
): RichTextRequestItem[] {
	const startsWithTag = (item: { plain_text: string }) =>
		item.plain_text.replace(/^[\s ]+/, '').startsWith(options.tag);

	const kept = [...existing];

	let removed = false;
	while (kept.length > 0 && startsWithTag(kept[kept.length - 1]!)) {
		kept.pop();
		removed = true;
	}
	if (removed) {
		while (kept.length > 0 && kept[kept.length - 1]!.plain_text.trim() === '') {
			kept.pop();
		}
	}

	const hasPriorText = kept.some((item) => item.plain_text.trim() !== '');

	return [
		...toRichTextRequest(kept),
		{
			type: 'text' as const,
			text: { content: hasPriorText ? `\n${line}` : line },
			annotations: {
				...PLAIN_ANNOTATIONS,
				italic: options.italic ?? true,
				color: options.color ?? 'default'
			}
		}
	];
}
