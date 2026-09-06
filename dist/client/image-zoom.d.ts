/**
 * Client-side image zoom utility using medium-zoom
 *
 * This module provides a simple interface to initialize medium-zoom on markdown-rendered images.
 * Works perfectly with @mdit/plugin-figure which wraps images in <figure> tags.
 *
 * @example
 * ```typescript
 * import { initializeImageZoom } from 'symbiont-cms/client/image-zoom';
 * import mediumZoom from 'medium-zoom';
 *
 * // In your Svelte component's onMount
 * onMount(() => {
 *   if (features.images) {
 *     initializeImageZoom(mediumZoom, containerElement);
 *   }
 * });
 * ```
 */
export interface ImageZoomOptions {
    /**
     * Selector for images to zoom (default: 'img' to select all images)
     */
    selector?: string;
    /**
     * Background color for the zoom overlay
     * @default 'rgba(25, 18, 25, 0.9)'
     */
    background?: string;
    /**
     * Scroll offset when zoomed
     * @default 0
     */
    scrollOffset?: number;
    /**
     * Container element to search for images in
     * If not provided, searches the entire document
     */
    container?: HTMLElement;
}
/**
 * Initialize medium-zoom on images in markdown content
 *
 * Note: You need to install medium-zoom separately:
 * ```bash
 * pnpm add medium-zoom
 * ```
 */
export declare function initializeImageZoom(mediumZoom: any, options?: ImageZoomOptions): {
    destroy: () => void;
};
/**
 * Svelte action for easy integration with Svelte components
 *
 * @example
 * ```svelte
 * <script>
 *   import { imageZoom } from 'symbiont-cms/client/image-zoom';
 *   import mediumZoom from 'medium-zoom';
 *
 *   export let features;
 * </script>
 *
 * {#if features.images}
 *   <div use:imageZoom={{ mediumZoom }}>
 *     {@html content}
 *   </div>
 * {/if}
 * ```
 */
export declare function imageZoom(node: HTMLElement, options: ImageZoomOptions & {
    mediumZoom: any;
}): {
    destroy?: undefined;
} | {
    destroy: () => void;
};
//# sourceMappingURL=image-zoom.d.ts.map