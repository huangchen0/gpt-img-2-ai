export type PromptLibraryModel = 'gpt-image-2';

export type PromptLibraryMedia = {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string | null;
  r2Url?: string | null;
  r2Thumbnail?: string | null;
  sourceUrl?: string | null;
};

export type PromptLibraryItem = {
  id: string;
  slug: string;
  model: PromptLibraryModel;
  title: string;
  description: string;
  prompt: string;
  language?: string | null;
  featured?: boolean;
  authorName?: string | null;
  authorUrl?: string | null;
  sourceUrl?: string | null;
  publishedAt?: string | null;
  tags?: string[];
  media: PromptLibraryMedia[];
  syncedAt: string;
};

export type PromptLibraryDataset = {
  model: PromptLibraryModel;
  source: string;
  sourceUrl: string;
  total: number;
  syncedAt: string;
  items: PromptLibraryItem[];
};

export type PromptLibraryIndexItem = Omit<PromptLibraryItem, 'prompt' | 'tags'> & {
  promptPreview: string;
  categories: string[];
};

export type PromptLibraryListItem = PromptLibraryIndexItem;

export type PromptLibraryIndexDataset = Omit<PromptLibraryDataset, 'items'> & {
  items: PromptLibraryIndexItem[];
  assetBaseUrl?: string;
};

export type PromptLibraryListDataset = PromptLibraryIndexDataset;
