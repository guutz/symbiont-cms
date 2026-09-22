import { describe, expect, it, vi } from 'vitest';
import { NotionClient } from './client.js';

describe('NotionClient write gate', () => {
	it('skips property writes when sync-back is disabled', async () => {
		const notion = {
			pages: {
				update: vi.fn(),
			},
		} as any;

		const client = new NotionClient(notion);
		client.setWritesEnabled(false);

		await client.updateProperty('page-1', 'Slug', 'example-slug');
		await client.updateUrlProperty('page-1', 'PDF URL', 'https://example.com/file.pdf');
		await client.updateNumberProperty('page-1', 'Word Count', 1234);
		await client.updateFileProperty('page-1', 'Cover', 'https://example.com/cover.jpg');
		await client.updatePageProperties('page-1', { Prominence: { select: { name: 'Lead' } } });

		expect(notion.pages.update).not.toHaveBeenCalled();
	});

	it('sends every property in updatePageProperties as a single request', async () => {
		const notion = { pages: { update: vi.fn() } } as any;
		const client = new NotionClient(notion);

		const properties = {
			Prominence: { select: { name: 'Lead' } },
			'Hide Summary': { checkbox: true },
		};
		const wrote = await client.updatePageProperties('page-1', properties);

		expect(wrote).toBe(true);
		// One call, not one per property: the rate limit counts requests.
		expect(notion.pages.update).toHaveBeenCalledTimes(1);
		expect(notion.pages.update).toHaveBeenCalledWith({ page_id: 'page-1', properties });
	});

	it('does not call Notion when there is nothing to write', async () => {
		const notion = { pages: { update: vi.fn() } } as any;
		const client = new NotionClient(notion);

		expect(await client.updatePageProperties('page-1', {})).toBe(false);
		expect(notion.pages.update).not.toHaveBeenCalled();
	});

	it('skips only property writes when property sync-back is disabled', async () => {
		const notion = {
			pages: {
				update: vi.fn(),
			},
			blocks: {
				children: {
					append: vi.fn(),
					list: vi.fn().mockResolvedValue({ results: [], has_more: false, next_cursor: null }),
				},
				delete: vi.fn(),
				update: vi.fn(),
			},
		} as any;

		const client = new NotionClient(notion);
		client.setWritePolicy({ content: true, properties: false });

		await client.updateProperty('page-1', 'Slug', 'example-slug');
		await client.updatePageBlocks('page-1', []);

		expect(notion.pages.update).not.toHaveBeenCalled();
		expect(notion.blocks.children.list).toHaveBeenCalled();
	});

	it('skips block writes when sync-back is disabled', async () => {
		const notion = {
			blocks: {
				children: {
					append: vi.fn(),
					list: vi.fn(),
				},
				delete: vi.fn(),
				update: vi.fn(),
			},
		} as any;

		const client = new NotionClient(notion);
		client.setWritesEnabled(false);

		await client.updatePageBlocks('page-1', [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } }]);
		const result = await client.patchPageBlocks('page-1', {
			operations: [],
			stats: { kept: 0, updated: 1, inserted: 0, deleted: 0, replaced: 0 },
			forceFullReplace: false,
		});

		expect(notion.blocks.children.append).not.toHaveBeenCalled();
		expect(notion.blocks.children.list).not.toHaveBeenCalled();
		expect(notion.blocks.delete).not.toHaveBeenCalled();
		expect(notion.blocks.update).not.toHaveBeenCalled();
		expect(result).toEqual({ applied: 0, failed: 0 });
	});

	it('skips only block writes when content sync-back is disabled', async () => {
		const notion = {
			pages: {
				update: vi.fn(),
			},
			blocks: {
				children: {
					append: vi.fn(),
					list: vi.fn(),
				},
				delete: vi.fn(),
				update: vi.fn(),
			},
		} as any;

		const client = new NotionClient(notion);
		client.setWritePolicy({ content: false, properties: true });

		await client.updateUrlProperty('page-1', 'PDF URL', 'https://example.com/file.pdf');
		const result = await client.patchPageBlocks('page-1', {
			operations: [],
			stats: { kept: 0, updated: 1, inserted: 0, deleted: 0, replaced: 0 },
			forceFullReplace: false,
		});

		expect(notion.pages.update).toHaveBeenCalledTimes(1);
		expect(notion.blocks.children.append).not.toHaveBeenCalled();
		expect(notion.blocks.children.list).not.toHaveBeenCalled();
		expect(notion.blocks.delete).not.toHaveBeenCalled();
		expect(notion.blocks.update).not.toHaveBeenCalled();
		expect(result).toEqual({ applied: 0, failed: 0 });
	});
});