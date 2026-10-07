import { describe, expect, it, vi } from 'vitest';
import { NotionPageToDatabasePageTransformer } from './page-transformer.js';
import type { DatabaseBlueprint } from '../../types.js';

describe('NotionPageToDatabasePageTransformer', () => {
	it('keeps publish_at explicitly null when publish:date resolves to no value', async () => {
		const config: DatabaseBlueprint = {
			alias: 'test-source',
			dataSourceId: 'test-datasource',
			hooks: [
				{
					name: 'test:publish:check',
					event: 'publish:check',
					priority: 'override',
					fn: async () => true,
				},
				{
					name: 'test:publish:date:none',
					event: 'publish:date',
					priority: 'override',
					fn: async () => false,
					},
					{
						name: 'test:slug:conflict:passthrough',
						event: 'slug:conflict',
						priority: 'override',
						fn: async (ctx) => ctx.input as string,
				},
			],
		};

		const notionClient = {
			pageToMarkdown: vi.fn().mockResolvedValue(''),
				getDatabaseSchema: vi.fn().mockResolvedValue({
					properties: {
						Status: {
							type: 'status',
							status: {
								groups: [
									{ name: 'Complete', option_ids: ['published-status-id'] },
								],
							},
						},
					},
				}),
		} as any;
		const pageCrud = {
			upsert: vi.fn().mockResolvedValue(undefined),
		} as any;
		const supabase = {} as any;

		const transformer = new NotionPageToDatabasePageTransformer(
			config,
			notionClient,
			pageCrud,
			supabase,
		);

		const page = {
			id: 'page-123',
			last_edited_time: '2026-03-12T12:00:00.000Z',
			properties: {
				Title: {
					type: 'title',
					title: [{ plain_text: 'Print Only Draft' }],
				},
				Status: {
					type: 'status',
					status: { id: 'published-status-id', name: 'Published' },
				},
			},
		} as any;

		const result = await transformer.transformPage(page);

		expect(result).not.toBeNull();
		expect(result?.publish_at).toBeNull();
		expect(pageCrud.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				page_id: 'page-123',
				publish_at: null,
			})
		);
	});

	describe('content:should-sync', () => {
		const page = {
			id: 'page-456',
			last_edited_time: '2026-10-06T12:00:00.000Z',
			properties: {
				Title: { type: 'title', title: [{ plain_text: 'Web Draft' }] },
			},
		} as any;

		function build(contentShouldSync: Array<boolean | null>) {
			const contentSync = vi.fn().mockResolvedValue(undefined);
			const config: DatabaseBlueprint = {
				alias: 'test-source',
				dataSourceId: 'test-datasource',
				hooks: [
					{
						name: 'test:slug:conflict:passthrough',
						event: 'slug:conflict',
						priority: 'override',
						fn: async (ctx) => ctx.input as string,
					},
					{ name: 'test:content:sync:spy', event: 'content:sync', fn: contentSync },
					...contentShouldSync.map((vote, i) => ({
						name: `test:content:should-sync:${i}`,
						event: 'content:should-sync' as const,
						fn: async () => vote,
					})),
				],
			};
			const notionClient = { pageToMarkdown: vi.fn().mockResolvedValue('# Notion body') } as any;
			const pageCrud = { upsert: vi.fn().mockResolvedValue(undefined) } as any;
			const transformer = new NotionPageToDatabasePageTransformer(config, notionClient, pageCrud, {} as any);
			return { transformer, notionClient, pageCrud, contentSync };
		}

		it('false: never reads the body, never writes it back, and upserts with no content key at all', async () => {
			const { transformer, notionClient, pageCrud, contentSync } = build([false]);
			const result = await transformer.transformPage(page);

			expect(result).not.toBeNull();
			expect(notionClient.pageToMarkdown).not.toHaveBeenCalled();
			expect(contentSync).not.toHaveBeenCalled();
			const upserted = pageCrud.upsert.mock.calls[0][0];
			// Absent, not undefined-but-present: the column must be left alone.
			expect(Object.prototype.hasOwnProperty.call(upserted, 'content')).toBe(false);
			expect(upserted).toMatchObject({ page_id: 'page-456', title: 'Web Draft' });
		});

		it('no opinion (null) syncs content as usual', async () => {
			const { transformer, notionClient, pageCrud } = build([null]);
			await transformer.transformPage(page);

			expect(notionClient.pageToMarkdown).toHaveBeenCalledWith('page-456');
			expect(pageCrud.upsert.mock.calls[0][0].content).toBe('# Notion body');
		});

		it('one false among several trues still skips (AndAll)', async () => {
			const { transformer, notionClient } = build([true, false, true]);
			await transformer.transformPage(page);
			expect(notionClient.pageToMarkdown).not.toHaveBeenCalled();
		});
	});
});

