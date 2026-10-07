import { describe, expect, it, vi } from 'vitest';
import { createPageFromMarkdown, replacePageMarkdown } from './markdown-pages.js';

const page = { object: 'page', id: 'page-1', url: 'https://www.notion.so/page1', properties: {} };

describe('createPageFromMarkdown', () => {
	it('creates synchronously below the threshold and returns the page Notion sent back', async () => {
		const notion = {
			pages: { create: vi.fn().mockResolvedValue(page), retrieve: vi.fn() },
			asyncTasks: { retrieve: vi.fn() },
		} as any;

		const created = await createPageFromMarkdown(notion, {
			dataSourceId: 'ds-1',
			properties: { Name: { title: [{ text: { content: 'T' } }] } },
			markdown: '# Hello',
		});

		expect(created).toEqual({ id: 'page-1', page });
		const args = notion.pages.create.mock.calls[0][0];
		expect(args.parent).toEqual({ type: 'data_source_id', data_source_id: 'ds-1' });
		expect(args.markdown).toBe('# Hello');
		expect(args.allow_async).toBeUndefined();
		expect(notion.pages.retrieve).not.toHaveBeenCalled();
	});

	it('goes async for large bodies: polls the task, then re-fetches the page it created', async () => {
		const notion = {
			pages: {
				create: vi.fn().mockResolvedValue({ object: 'async_task', id: 'task-1' }),
				retrieve: vi.fn().mockResolvedValue(page),
			},
			asyncTasks: {
				retrieve: vi
					.fn()
					.mockResolvedValueOnce({ status: 'in_progress', poll_after_seconds: 0 })
					.mockResolvedValueOnce({ status: 'succeeded', result: { id: 'page-1' } }),
			},
		} as any;

		const created = await createPageFromMarkdown(notion, {
			dataSourceId: 'ds-1',
			properties: {},
			markdown: 'x'.repeat(400_001),
		});

		expect(notion.pages.create.mock.calls[0][0].allow_async).toBe(true);
		expect(notion.asyncTasks.retrieve).toHaveBeenCalledTimes(2);
		expect(notion.pages.retrieve).toHaveBeenCalledWith({ page_id: 'page-1' });
		expect(created).toEqual({ id: 'page-1', page });
	});

	it('reports a failed async import rather than returning nothing', async () => {
		const notion = {
			pages: { create: vi.fn().mockResolvedValue({ object: 'async_task', id: 'task-1' }), retrieve: vi.fn() },
			asyncTasks: { retrieve: vi.fn().mockResolvedValue({ status: 'failed', error: { message: 'bad markdown' } }) },
		} as any;

		await expect(
			createPageFromMarkdown(notion, { dataSourceId: 'ds-1', properties: {}, markdown: 'x'.repeat(400_001) }),
		).rejects.toThrow(/bad markdown/);
	});
});

describe('replacePageMarkdown', () => {
	it('replaces the whole body, keeping Notion’s guard against deleting child pages by default', async () => {
		const notion = { pages: { updateMarkdown: vi.fn().mockResolvedValue({ object: 'page_markdown' }) } } as any;

		await replacePageMarkdown(notion, 'page-1', 'New body');

		expect(notion.pages.updateMarkdown).toHaveBeenCalledWith({
			page_id: 'page-1',
			type: 'replace_content',
			replace_content: { new_str: 'New body' },
		});
	});

	it('passes allow_deleting_content only when asked to', async () => {
		const notion = { pages: { updateMarkdown: vi.fn().mockResolvedValue({}) } } as any;

		await replacePageMarkdown(notion, 'page-1', 'New body', { allowDeletingContent: true });

		expect(notion.pages.updateMarkdown.mock.calls[0][0].replace_content).toEqual({
			new_str: 'New body',
			allow_deleting_content: true,
		});
	});
});
