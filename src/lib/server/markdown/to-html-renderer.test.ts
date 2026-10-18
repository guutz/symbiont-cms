import { describe, expect, it } from 'vitest';
import { renderMarkdownToHtml } from './to-html-renderer.js';

describe('renderMarkdownToHtml', () => {
	it('renders mailto links as written (they used to be double-escaped and broken)', async () => {
		const { html } = await renderMarkdownToHtml('Write to tech@caltech.edu or [us](mailto:tech@caltech.edu).', undefined);
		expect(html).toContain('<a href="mailto:tech@caltech.edu">tech@caltech.edu</a>');
		expect(html).toContain('<a href="mailto:tech@caltech.edu">us</a>');
		expect(html).not.toContain('&amp;#');
	});

	it('escapes text, so a literal < or & in prose stays text', async () => {
		// Entity-escaped in the source, so it is text, not raw HTML.
		const { html } = await renderMarkdownToHtml('AT&amp;T says 1 &lt; 2 and &lt;b&gt;not bold&lt;/b&gt;', undefined);
		expect(html).toContain('AT&amp;T says 1 &lt; 2 and &lt;b&gt;not bold&lt;/b&gt;');
		expect(html).not.toContain('<b>');
	});

	it('still passes deliberate raw HTML through (html: true)', async () => {
		const { html } = await renderMarkdownToHtml('<iframe src="https://example.com/embed"></iframe>', undefined);
		expect(html).toContain('<iframe src="https://example.com/embed"></iframe>');
	});

	it('applies {color}(text) only when textColors is on', async () => {
		const md = 'A {red}(warning) here';
		expect((await renderMarkdownToHtml(md, { extensions: { textColors: true } })).html).toContain(
			'<span class="text-red">warning</span>'
		);
		expect((await renderMarkdownToHtml(md, undefined)).html).toContain('{red}(warning)');
	});
});

describe('renderMarkdownToHtml embeds', () => {
	const box = {
		name: 'box',
		render: (url: URL) => (url.hostname === 'embed.example' ? `<div class="box">${url.pathname}</div>` : null),
	};

	it('replaces a standalone link, written either way, with the provider HTML', async () => {
		const md = '[anything](https://embed.example/a)\n\nhttps://embed.example/b';
		const { html } = await renderMarkdownToHtml(md, { embeds: [box] });
		expect(html).toContain('<div class="box">/a</div>');
		expect(html).toContain('<div class="box">/b</div>');
		expect(html).not.toContain('<p><a');
	});

	it('leaves links inside prose, and URLs no provider wants, as links', async () => {
		const md = 'See [this](https://embed.example/a) here.\n\n[other](https://other.example/x)';
		const { html } = await renderMarkdownToHtml(md, { embeds: [box] });
		expect(html).not.toContain('class="box"');
		expect(html).toContain('<a href="https://embed.example/a">this</a>');
		expect(html).toContain('<a href="https://other.example/x">other</a>');
	});

	it('keeps the link when a provider throws', async () => {
		const broken = { name: 'broken', render: () => { throw new Error('boom'); } };
		const { html } = await renderMarkdownToHtml('https://embed.example/a', { embeds: [broken, box] });
		expect(html).toContain('<div class="box">/a</div>');
	});

	it('does nothing without providers', async () => {
		const { html } = await renderMarkdownToHtml('https://embed.example/a', undefined);
		expect(html).toContain('<a href="https://embed.example/a">');
	});
});
