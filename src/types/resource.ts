export type ResourceType = 'DOCUMENT' | 'SLIDE_DECK' | 'GRAPHIC' | 'INTERACTIVE_HTML' | 'VIDEO';

export type ResourceCategory = 'MARKETING' | 'SALES' | 'PRODUCT' | 'OPERATIONS';

export interface ResourceMetadata {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: ResourceCategory;
  type: ResourceType;
  pageCount: number;
  assetPaths: string[];
  thumbnailPath: string;
  historicalId: string;
  originalSource: string;
  tags: string[];
  isInteractive?: boolean;
}
