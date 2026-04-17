import { ReactNode } from 'react';

import type { TOCItemType } from '@/core/docs/toc';

import { Button } from './common';

export interface Blog {
  id?: string;
  sr_only_title?: string;
  title?: string;
  description?: string;
  buttons?: Button[];
  categories?: Category[];
  currentCategory?: Category;
  posts: Post[];
  className?: string;
}

export interface Post {
  id?: string;
  slug?: string;
  locale?: string;
  canonical_locale?: string;
  available_locales?: string[];
  title?: string;
  description?: string;
  image?: string;
  content?: string;
  created_at?: string;
  published_at?: string;
  date?: string;
  version?: string;
  author_name?: string;
  author_role?: string;
  author_image?: string;
  url?: string;
  target?: string;
  categories?: Category[];
  body?: ReactNode;
  toc?: TOCItemType[];
  tags?: string[];
  seo_keywords?: string[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  how_to_steps?: {
    name: string;
    text: string;
  }[];
  video?: {
    name: string;
    description: string;
    thumbnailUrl: string;
    uploadDate: string;
    contentUrl?: string;
    embedUrl?: string;
    duration?: string;
    width?: number;
    height?: number;
  };
}

export interface Category {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  target?: string;
}
