import slugify from 'slugify';
/**
 * Create a URL-safe slug from text
 */
export const createSlug = (text) => slugify.default?.(text, { lower: true, strict: true }) ??
    slugify(text, { lower: true, strict: true });
//# sourceMappingURL=slug.js.map