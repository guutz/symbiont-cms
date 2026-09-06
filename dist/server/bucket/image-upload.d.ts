/**
 * Image upload pipeline for Symbiont CMS.
 * Uploads images to Supabase Storage during Notion sync.
 *
 * Storage layout: flat bucket — media/{sha256_of_bytes[:12]}.{ext}
 *
 * Flat layout means:
 * - Same image used across multiple pages is stored exactly once.
 * - Content hash is the filename: same bytes → same name, always.
 * - Original source URL preserved in file metadata for reference.
 *
 * Exception: uploadFileToSupabase with an explicit storagePath (e.g.
 * issues/2024-10-21.pdf) bypasses this scheme and uses the caller-specified
 * path directly.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export interface UploadImageOptions {
    supabase: SupabaseClient;
}
export interface UploadFileOptions extends UploadImageOptions {
    /** Override content type instead of inferring from response headers (e.g. 'application/pdf') */
    contentType?: string;
    /**
     * Override the full storage path (e.g. 'issues/2024-10-21.pdf').
     * When set, pageId and hash-based filename generation are bypassed entirely.
     */
    storagePath?: string;
}
export interface UploadBufferOptions {
    supabase: SupabaseClient;
    /** Filename including extension, e.g. 'thumb_abc123.png' */
    filename: string;
    contentType: string;
}
export interface UploadImageResult {
    originalUrl: string;
    newUrl: string;
    path: string;
    filename: string;
}
/**
 * Detect if a URL needs to be uploaded to Supabase Storage
 */
export declare function needsUploadToSupabase(url: string): boolean;
/**
 * Upload an image to Supabase Storage.
 *
 * Filename is the SHA-256 hash of the image bytes — same content always
 * produces the same name, regardless of the source URL. This handles the
 * interrupted-sync edge case (upload completed but Supabase URL wasn't
 * written back to Notion) without any pre-download storage check.
 *
 * Already-synced images never reach this function: needsUploadToSupabase()
 * returns false for Supabase URLs, so they're filtered out upstream.
 */
export declare function uploadImageToSupabase(url: string, options: UploadImageOptions): Promise<UploadImageResult>;
/**
 * Upload any file to Supabase Storage from a URL.
 * Like uploadImageToSupabase but with an explicit contentType override so
 * non-image files (PDFs, etc.) get the correct extension and MIME type instead
 * of falling back to 'jpg'.
 */
export declare function uploadFileToSupabase(url: string, options: UploadFileOptions): Promise<UploadImageResult>;
/**
 * Upload a pre-loaded Buffer to Supabase Storage.
 * Use this when you already have the file bytes in memory (e.g. a generated
 * thumbnail) and don't have a source URL to fetch from.
 */
export declare function uploadBufferToSupabase(buffer: Buffer, options: UploadBufferOptions): Promise<UploadImageResult>;
/**
 * Get image URL with optional transformations (Pro plan feature)
 * Falls back to original URL on free tier
 */
export declare function getImageUrl(supabase: any, path: string, transform?: {
    width?: number;
    height?: number;
    quality?: number;
    resize?: 'cover' | 'contain' | 'fill';
}): string;
//# sourceMappingURL=image-upload.d.ts.map