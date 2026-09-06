/**
 * Markdown Migration Utilities
 *
 * Core utilities for processing markdown content during migration.
 * File I/O operations are handled by the migration script itself.
 */
export interface ImageReference {
    url: string;
    alt: string;
    fullMatch: string;
    isLocal: boolean;
}
/**
 * Extract all image URLs from markdown content
 */
export declare function extractImageUrls(content: string): ImageReference[];
/**
 * Update markdown content with new image URLs
 */
export declare function replaceImageUrls(content: string, replacements: Map<string, string>): string;
//# sourceMappingURL=image-url-extractor.d.ts.map