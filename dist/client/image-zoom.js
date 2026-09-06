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
/**
 * Initialize medium-zoom on images in markdown content
 *
 * Note: You need to install medium-zoom separately:
 * ```bash
 * pnpm add medium-zoom
 * ```
 */
export function initializeImageZoom(
// Accept medium-zoom as a parameter to avoid bundling it in symbiont-cms
mediumZoom, options = {}) {
    const { selector = 'img', background = 'rgba(25, 18, 25, 0.9)', scrollOffset = 0, container } = options;
    // Find all images in the container (or document)
    const images = container
        ? container.querySelectorAll(selector)
        : document.querySelectorAll(selector);
    if (images.length === 0) {
        return { destroy: () => { } };
    }
    // Initialize medium-zoom
    const zoom = mediumZoom(images, {
        background,
        scrollOffset,
    });
    // Return cleanup function
    return {
        destroy: () => {
            zoom.detach();
        }
    };
}
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
export function imageZoom(node, options) {
    const { mediumZoom: mz, ...restOptions } = options;
    if (!mz) {
        console.warn('imageZoom action: mediumZoom not provided');
        return {};
    }
    const zoom = initializeImageZoom(mz, {
        ...restOptions,
        container: node
    });
    return {
        destroy: zoom.destroy
    };
}
