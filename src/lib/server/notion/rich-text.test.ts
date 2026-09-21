import { describe, expect, it } from 'vitest';
import type { RichTextItemResponse } from '@notionhq/client';
import { appendOrReplaceTaggedLine, toRichTextRequest } from './rich-text.js';

const PLAIN = {
	bold: false,
	italic: false,
	strikethrough: false,
	underline: false,
	code: false,
	color: 'default'
} as RichTextItemResponse['annotations'];

function item(text: string, overrides: Partial<RichTextItemResponse> = {}): RichTextItemResponse {
	return {
		type: 'text',
		text: { content: text, link: null },
		annotations: PLAIN,
		plain_text: text,
		href: null,
		...overrides
	} as RichTextItemResponse;
}

const TAG = '[sync]';
const LINE = `${TAG} 2026-09-17 14:32 — ok`;
const opts = { tag: TAG };
const contents = (r: ReturnType<typeof appendOrReplaceTaggedLine>) => r.map((x) => x.text.content);

describe('appendOrReplaceTaggedLine', () => {
	it('writes the bare line into an empty property, with no leading blank', () => {
		expect(contents(appendOrReplaceTaggedLine([], LINE, opts))).toEqual([LINE]);
	});

	it("appends below existing prose", () => {
		expect(contents(appendOrReplaceTaggedLine([item('check the byline')], LINE, opts))).toEqual([
			'check the byline',
			`\n${LINE}`
		]);
	});

	it('replaces rather than stacks, and does not accumulate blank lines', () => {
		let current = [item('notes')];
		for (let run = 0; run < 5; run++) {
			current = appendOrReplaceTaggedLine(current, `${TAG} run ${run}`, opts).map((r) =>
				item(r.text.content)
			);
		}
		expect(contents(appendOrReplaceTaggedLine(current, LINE, opts))).toEqual([
			'notes',
			`\n${LINE}`
		]);
	});

	it('leaves the tag alone when it appears mid-prose rather than last', () => {
		const notes = [item(`${TAG} is what the robot writes`), item('\nreal note')];
		expect(contents(appendOrReplaceTaggedLine(notes, LINE, opts))).toEqual([
			`${TAG} is what the robot writes`,
			'\nreal note',
			`\n${LINE}`
		]);
	});

	it('honours the requested colour', () => {
		const red = appendOrReplaceTaggedLine([], LINE, { tag: TAG, color: 'red' });
		expect(red.at(-1)!.annotations.color).toBe('red');
	});
});

describe('toRichTextRequest', () => {
	it("preserves the author's formatting and links, which an update would otherwise flatten", () => {
		const bold = { ...PLAIN, bold: true };
		const [converted] = toRichTextRequest([
			item('see', { annotations: bold, href: 'https://example.com' })
		]);

		expect(converted!.annotations.bold).toBe(true);
		expect(converted!.text.link).toEqual({ url: 'https://example.com' });
	});
});
