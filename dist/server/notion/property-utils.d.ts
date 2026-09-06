type NotionLikeProperty = Record<string, any> | null | undefined;
type NotionLikePage = {
    properties?: Record<string, any>;
} | null | undefined;
export declare function getPropertyByName(page: NotionLikePage, propertyName: string): NotionLikeProperty;
export declare function getFirstPropertyByName(page: NotionLikePage, propertyNames: string[]): NotionLikeProperty;
export declare function getPropertyPlainText(property: NotionLikeProperty): string | null;
export declare function getPropertyNamedValue(property: NotionLikeProperty): string | null;
export declare function getPropertyNumberValue(property: NotionLikeProperty): number | null;
export {};
//# sourceMappingURL=property-utils.d.ts.map