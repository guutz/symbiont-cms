/**
 * Shared type definitions and Notion API limits.
 *
 * @see https://developers.notion.com/reference/request-limits#limits-for-property-values
 * @see https://developers.notion.com/reference/rich-text
 */
export const LIMITS = {
    PAYLOAD_BLOCKS: 1000,
    RICH_TEXT_ARRAYS: 100,
    RICH_TEXT: {
        TEXT_CONTENT: 2000,
        LINK_URL: 1000,
        EQUATION_EXPRESSION: 1000,
    },
};
//# sourceMappingURL=types.js.map