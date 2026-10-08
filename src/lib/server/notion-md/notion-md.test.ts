import { describe, it, expect } from 'vitest';
import { convertMarkdownToNotionBlocks } from './markdown-to-blocks.js';
import { richTextToMarkdown } from './rich-text.js';
import { blocksToMarkdown } from './blocks-to-markdown.js';

describe('convertMarkdownToNotionBlocks (markdown-to-blocks)', () => {
	describe('block equations', () => {
		it('converts a standalone $$...$$ paragraph to an equation block', () => {
			const md = `$$\nE = mc^2\n$$`;
			const blocks = convertMarkdownToNotionBlocks(md);
			expect(blocks).toHaveLength(1);
			expect(blocks[0].type).toBe('equation');
			expect(blocks[0].equation.expression).toBe('E = mc^2');
		});

		it('converts inline $$...$$ alongside other text as equation rich_text', () => {
			const md = `The formula $$E = mc^2$$ is well known.`;
			const blocks = convertMarkdownToNotionBlocks(md);
			expect(blocks).toHaveLength(1);
			expect(blocks[0].type).toBe('paragraph');
			const rt = blocks[0].paragraph.rich_text;
			const eqRt = rt.find((r: any) => r.type === 'equation');
			expect(eqRt).toBeDefined();
			expect(eqRt.equation.expression).toBe('E = mc^2');
		});

		it('does NOT treat single $ as math (currency)', () => {
			const md = `The price is $5.00 and $10.00`;
			const blocks = convertMarkdownToNotionBlocks(md);
			expect(blocks).toHaveLength(1);
			expect(blocks[0].type).toBe('paragraph');
			const rt = blocks[0].paragraph.rich_text;
			// All text, no equation types
			expect(rt.every((r: any) => r.type === 'text')).toBe(true);
			const text = rt.map((r: any) => r.text?.content ?? '').join('');
			expect(text).toContain('$5.00');
			expect(text).toContain('$10.00');
		});

		it('handles multiline equation expressions', () => {
			const md = `$$\n\\begin{align}\n  F &= ma \\\\\\\\\n  E &= mc^2\n\\end{align}\n$$`;
			const blocks = convertMarkdownToNotionBlocks(md);
			expect(blocks).toHaveLength(1);
			expect(blocks[0].type).toBe('equation');
			expect(blocks[0].equation.expression).toContain('\\begin{align}');
		});
	});

	describe('inline formatting', () => {
		it('converts bold text', () => {
			const blocks = convertMarkdownToNotionBlocks('**bold**');
			const rt = blocks[0].paragraph.rich_text;
			expect(rt[0].annotations.bold).toBe(true);
			expect(rt[0].text.content).toBe('bold');
		});

		it('converts italic text', () => {
			const blocks = convertMarkdownToNotionBlocks('_italic_');
			const rt = blocks[0].paragraph.rich_text;
			expect(rt[0].annotations.italic).toBe(true);
		});

		it('converts inline code', () => {
			const blocks = convertMarkdownToNotionBlocks('`code`');
			const rt = blocks[0].paragraph.rich_text;
			expect(rt[0].annotations.code).toBe(true);
		});

		it('converts links', () => {
			const blocks = convertMarkdownToNotionBlocks('[text](https://example.com)');
			const rt = blocks[0].paragraph.rich_text;
			expect(rt[0].text.link?.url).toBe('https://example.com');
		});
	});

	describe('headings', () => {
		it('converts h1', () => {
			const blocks = convertMarkdownToNotionBlocks('# Heading 1');
			expect(blocks[0].type).toBe('heading_1');
		});
		it('converts h2', () => {
			const blocks = convertMarkdownToNotionBlocks('## Heading 2');
			expect(blocks[0].type).toBe('heading_2');
		});
		it('converts h3+', () => {
			const blocks = convertMarkdownToNotionBlocks('### Heading 3');
			expect(blocks[0].type).toBe('heading_3');
			const blocks4 = convertMarkdownToNotionBlocks('#### Heading 4');
			expect(blocks4[0].type).toBe('heading_3');
		});
	});

	describe('lists', () => {
		it('converts bulleted list', () => {
			const blocks = convertMarkdownToNotionBlocks('- item 1\n- item 2');
			expect(blocks[0].type).toBe('bulleted_list_item');
			expect(blocks[1].type).toBe('bulleted_list_item');
		});

		it('converts numbered list', () => {
			const blocks = convertMarkdownToNotionBlocks('1. first\n2. second');
			expect(blocks[0].type).toBe('numbered_list_item');
			expect(blocks[1].type).toBe('numbered_list_item');
		});

		it('converts checkboxes', () => {
			const blocks = convertMarkdownToNotionBlocks('- [x] done\n- [ ] todo');
			expect(blocks[0].type).toBe('to_do');
			expect(blocks[0].to_do.checked).toBe(true);
			expect(blocks[1].to_do.checked).toBe(false);
		});
	});

	describe('code blocks', () => {
		it('converts fenced code block with language', () => {
			const blocks = convertMarkdownToNotionBlocks('```typescript\nconst x = 1;\n```');
			expect(blocks[0].type).toBe('code');
			expect(blocks[0].code.language).toBe('typescript');
		});

		it('normalizes language aliases', () => {
			const blocks = convertMarkdownToNotionBlocks('```ts\nconst x = 1;\n```');
			expect(blocks[0].code.language).toBe('typescript');
		});
	});

	describe('GFM alerts', () => {
		it('converts [!NOTE] to callout with blue background', () => {
			const blocks = convertMarkdownToNotionBlocks('> [!NOTE]\n> This is a note');
			expect(blocks[0].type).toBe('callout');
			expect(blocks[0].callout.icon.emoji).toBe('📘');
			expect(blocks[0].callout.color).toBe('blue_background');
		});

		it('converts [!WARNING] to callout with yellow background', () => {
			const blocks = convertMarkdownToNotionBlocks('> [!WARNING]\n> Be careful');
			expect(blocks[0].type).toBe('callout');
			expect(blocks[0].callout.icon.emoji).toBe('⚠️');
		});
	});

	describe('divider', () => {
		it('converts --- to divider', () => {
			const blocks = convertMarkdownToNotionBlocks('---');
			expect(blocks[0].type).toBe('divider');
		});
	});

	describe('tables', () => {
		it('converts GFM tables', () => {
			const md = '| Col1 | Col2 |\n|------|------|\n| A    | B    |';
			const blocks = convertMarkdownToNotionBlocks(md);
			expect(blocks[0].type).toBe('table');
			expect(blocks[0].table.table_width).toBe(2);
		});
	});
});

describe('richTextToMarkdown (rich-text)', () => {
	it('serializes plain text', () => {
		const rt = [{ type: 'text', text: { content: 'hello' }, annotations: {} }];
		expect(richTextToMarkdown(rt as any)).toBe('hello');
	});

	it('serializes bold text', () => {
		const rt = [{ type: 'text', text: { content: 'bold' }, annotations: { bold: true } }];
		expect(richTextToMarkdown(rt as any)).toBe('**bold**');
	});

	it('moves whitespace at the edges of a formatted run outside the markers', () => {
		// A real caption: the italic run took the space after it. `_Coffeehouse. _`
		// is not emphasis in CommonMark and rendered with literal underscores.
		const rt = [
			{ type: 'text', text: { content: 'Coffeehouse. ' }, annotations: { italic: true } },
			{ type: 'text', text: { content: '(Credit: The Big T, 1970)' }, annotations: {} },
		];
		expect(richTextToMarkdown(rt as any)).toBe('_Coffeehouse._ (Credit: The Big T, 1970)');

		const both = [{ type: 'text', text: { content: ' both ' }, annotations: { bold: true, italic: true, strikethrough: true } }];
		expect(richTextToMarkdown(both as any)).toBe(' _**~~both~~**_ ');
	});

	it('leaves a formatted run that is only whitespace unformatted', () => {
		const rt = [
			{ type: 'text', text: { content: 'a' }, annotations: {} },
			{ type: 'text', text: { content: ' ' }, annotations: { italic: true } },
			{ type: 'text', text: { content: 'b' }, annotations: {} },
		];
		expect(richTextToMarkdown(rt as any)).toBe('a b');
	});

	it('serializes inline equations as $$expr$$', () => {
		const rt = [{ type: 'equation', equation: { expression: 'E=mc^2' }, annotations: {} }];
		expect(richTextToMarkdown(rt as any)).toBe('$$E=mc^2$$');
	});

	it('serializes links', () => {
		const rt = [{
			type: 'text',
			text: { content: 'link', link: { url: 'https://example.com' } },
			annotations: {}
		}];
		expect(richTextToMarkdown(rt as any)).toBe('[link](https://example.com)');
	});

	it('serializes link preview mentions as markdown links', () => {
		const rt = [{
			type: 'mention',
			plain_text: 'https://example.com/story',
			mention: {
				type: 'link_preview',
				link_preview: { url: 'https://example.com/story' }
			},
			annotations: {}
		}];
		expect(richTextToMarkdown(rt as any)).toBe('[https://example.com/story](https://example.com/story)');
	});
});

describe('blocksToMarkdown (blocks-to-markdown)', () => {
	const noChildren = async (_blockId: string): Promise<any[]> => [];

	it('converts paragraph blocks', async () => {
		const blocks = [{
			id: 'b1',
			type: 'paragraph',
			paragraph: {
				rich_text: [
					{ type: 'text', text: { content: 'Hello world' }, annotations: {} }
				]
			},
			has_children: false
		}];
		const md = await blocksToMarkdown(blocks, noChildren);
		expect(md).toBe('Hello world');
	});

	it('converts equation blocks to $$\\nexpr\\n$$', async () => {
		const blocks = [{
			id: 'b1',
			type: 'equation',
			equation: { expression: 'E = mc^2' },
			has_children: false
		}];
		const md = await blocksToMarkdown(blocks, noChildren);
		expect(md).toBe('$$\nE = mc^2\n$$');
	});

	it('converts inline equation in paragraph to $$expr$$', async () => {
		const blocks = [{
			id: 'b1',
			type: 'paragraph',
			paragraph: {
				rich_text: [
					{ type: 'text', text: { content: 'The formula ' }, annotations: {} },
					{ type: 'equation', equation: { expression: 'E=mc^2' }, annotations: {} },
					{ type: 'text', text: { content: ' is famous.' }, annotations: {} },
				]
			},
			has_children: false
		}];
		const md = await blocksToMarkdown(blocks, noChildren);
		expect(md).toBe('The formula $$E=mc^2$$ is famous.');
	});

	it('converts headings', async () => {
		const blocks = [
			{ id: 'h1', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: 'Title' }, annotations: {} }] }, has_children: false },
			{ id: 'h2', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Subtitle' }, annotations: {} }] }, has_children: false },
		];
		const md = await blocksToMarkdown(blocks, noChildren);
		expect(md).toContain('# Title');
		expect(md).toContain('## Subtitle');
	});

	describe('leading whitespace never makes a code block', () => {
		const text = (content: string, annotations = {}) => ({ type: 'text', text: { content }, annotations });
		const para = (id: string, ...rich_text: any[]) => ({ id, type: 'paragraph', paragraph: { rich_text }, has_children: false });

		it('drops a first-line indent: a tab or four spaces after a blank line is an indented code block', async () => {
			const md = await blocksToMarkdown(
				[para('a', text('First.')), para('b', text('\tTab indent.')), para('c', text('    Space indent.'))],
				noChildren,
			);
			expect(md).toBe('First.\n\nTab indent.\n\nSpace indent.');
		});

		it('drops the indent after a soft line break too, and after an emphasis run moved it outside', async () => {
			const md = await blocksToMarkdown(
				[para('a', text('Line one.\n\n\tLine two.')), para('b', text('\tItalic.', { italic: true }))],
				noChildren,
			);
			expect(md).toBe('Line one.\n\nLine two.\n\n_Italic._');
		});

		it('drops it inside quotes and list items, where it would also start code', async () => {
			const md = await blocksToMarkdown(
				[
					{ id: 'q', type: 'quote', quote: { rich_text: [text('Quote.\n\n    indented')] }, has_children: false },
					{ id: 'l', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text('    item')] }, has_children: false },
				],
				noChildren,
			);
			expect(md).toBe('> Quote.\n> \n> indented\n\n- item');
		});
	});

	describe('children of blocks markdown cannot nest', () => {
		const para = (id: string, content: string, has_children = false) => ({
			id,
			type: 'paragraph',
			paragraph: { rich_text: [{ type: 'text', text: { content }, annotations: {} }] },
			has_children,
		});

		it('keeps a paragraph indented under another with Tab, as the next block (it used to vanish)', async () => {
			const children: Record<string, any[]> = { parent: [para('child', 'Child.')] };
			const md = await blocksToMarkdown(
				[para('parent', 'Parent.', true), para('after', 'After.')],
				async (id) => children[id] ?? [],
			);
			expect(md).toBe('Parent.\n\nChild.\n\nAfter.');
		});

		it('keeps an empty parent paragraph out of the output but not its children', async () => {
			const md = await blocksToMarkdown([para('parent', '', true)], async () => [para('child', 'Child.')]);
			expect(md).toBe('Child.');
		});

		it('keeps the section inside a toggle heading', async () => {
			const heading = {
				id: 'h',
				type: 'heading_2',
				heading_2: { rich_text: [{ type: 'text', text: { content: 'Section' }, annotations: {} }], is_toggleable: true },
				has_children: true,
			};
			const md = await blocksToMarkdown([heading], async () => [para('c', 'Body.')]);
			expect(md).toBe('## Section\n\nBody.');
		});
	});

	it('equation round-trip: Notion equation block → markdown → Notion equation block', async () => {
		// Notion → markdown
		const notionBlocks = [{
			id: 'b1',
			type: 'equation',
			equation: { expression: 'x^2 + y^2 = r^2' },
			has_children: false
		}];
		const md = await blocksToMarkdown(notionBlocks, noChildren);
		expect(md).toBe('$$\nx^2 + y^2 = r^2\n$$');

		// markdown → Notion
		const converted = convertMarkdownToNotionBlocks(md);
		expect(converted).toHaveLength(1);
		expect(converted[0].type).toBe('equation');
		expect(converted[0].equation.expression).toBe('x^2 + y^2 = r^2');
	});

	it('inline equation round-trip: Notion inline eq → markdown → Notion inline eq', async () => {
		const notionBlocks = [{
			id: 'b1',
			type: 'paragraph',
			paragraph: {
				rich_text: [
					{ type: 'text', text: { content: 'See ' }, annotations: {} },
					{ type: 'equation', equation: { expression: 'E=mc^2' }, annotations: {} },
					{ type: 'text', text: { content: ' above.' }, annotations: {} },
				]
			},
			has_children: false
		}];
		const md = await blocksToMarkdown(notionBlocks, noChildren);
		expect(md).toBe('See $$E=mc^2$$ above.');

		const converted = convertMarkdownToNotionBlocks(md);
		expect(converted).toHaveLength(1);
		expect(converted[0].type).toBe('paragraph');
		const rt = converted[0].paragraph.rich_text;
		const eqItem = rt.find((r: any) => r.type === 'equation');
		expect(eqItem).toBeDefined();
		expect(eqItem.equation.expression).toBe('E=mc^2');
	});
});

describe('notion://page sentinel round-trips', () => {
	const CLEAN_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
	const UUID = 'a1b2c3d4-e5f6-a1b2-c3d4-e5f6a1b2c3d4';

	// ── Fix 2a: standalone link_to_page ──────────────────────────────────────

	it('converts a standalone notion:// sentinel paragraph to a link_to_page block', () => {
		const md = `[Page link](notion://page/${CLEAN_ID})`;
		const blocks = convertMarkdownToNotionBlocks(md);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('link_to_page');
		expect(blocks[0].link_to_page.type).toBe('page_id');
		expect(blocks[0].link_to_page.page_id).toBe(UUID);
	});

	it('round-trips a link_to_page block via markdown', async () => {
		const notionBlocks = [{
			id: 'blk1',
			type: 'link_to_page',
			link_to_page: { type: 'page_id', page_id: UUID },
			has_children: false,
		}];
		const noChildren = async (_: string) => [];
		const md = await blocksToMarkdown(notionBlocks as any, noChildren);
		// Should produce the sentinel
		expect(md).toContain(`notion://page/${CLEAN_ID}`);
		// Round-trip back to Notion
		const converted = convertMarkdownToNotionBlocks(md);
		expect(converted).toHaveLength(1);
		expect(converted[0].type).toBe('link_to_page');
		expect(converted[0].link_to_page.page_id).toBe(UUID);
	});

	// ── Fix 2b: inline page mention ──────────────────────────────────────────

	it('converts an inline notion:// sentinel link to a mention rich_text', () => {
		const md = `See [My Page](notion://page/${CLEAN_ID}) for details.`;
		const blocks = convertMarkdownToNotionBlocks(md);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('paragraph');
		const rt = blocks[0].paragraph.rich_text;
		const mention = rt.find((r: any) => r.type === 'mention');
		expect(mention).toBeDefined();
		expect(mention.mention.type).toBe('page');
		expect(mention.mention.page.id).toBe(UUID);
	});

	it('round-trips an inline page mention via markdown', async () => {
		const notionBlocks = [{
			id: 'blk1',
			type: 'paragraph',
			paragraph: {
				rich_text: [
					{ type: 'text', text: { content: 'See ' }, annotations: {} },
					{
						type: 'mention',
						plain_text: 'My Page',
						mention: { type: 'page', page: { id: UUID } },
						annotations: {},
					},
					{ type: 'text', text: { content: ' for details.' }, annotations: {} },
				],
			},
			has_children: false,
		}];
		const noChildren = async (_: string) => [];
		const md = await blocksToMarkdown(notionBlocks as any, noChildren);
		// Should produce the sentinel inline
		expect(md).toContain(`notion://page/${CLEAN_ID}`);
		// Round-trip back to Notion
		const converted = convertMarkdownToNotionBlocks(md);
		expect(converted).toHaveLength(1);
		expect(converted[0].type).toBe('paragraph');
		const rt = converted[0].paragraph.rich_text;
		const mention = rt.find((r: any) => r.type === 'mention');
		expect(mention).toBeDefined();
		expect(mention.mention.page.id).toBe(UUID);
	});

	// ── Mix: notion:// sentinel should not interfere with normal https links ──

	it('does not affect normal https links', () => {
		const blocks = convertMarkdownToNotionBlocks('[example](https://example.com)');
		expect(blocks[0].type).toBe('paragraph');
		const rt = blocks[0].paragraph.rich_text;
		expect(rt[0].type).toBe('text');
		expect(rt[0].text.link?.url).toBe('https://example.com');
	});

	it('round-trips link preview mentions via markdown', () => {
		const blocks = convertMarkdownToNotionBlocks('[https://example.com/story](https://example.com/story)');
		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('paragraph');
		const rt = blocks[0].paragraph.rich_text;
		expect(rt[0].type).toBe('mention');
		expect(rt[0].mention.type).toBe('link_preview');
		expect(rt[0].mention.link_preview.url).toBe('https://example.com/story');
	});
});
