export type PartnerLinkRelationship = 'nofollow' | 'sponsored';

export interface PartnerListing {
  name: string;
  url: string;
  description: string;
  category?: string;
  relationship?: PartnerLinkRelationship;
  linkRel?: string;
  openInNewTab?: boolean;
  disableFooterBadgeScaling?: boolean;
  exactBadgeEmbed?: boolean;
  rawBadgeEmbed?: boolean;
  showInPartners?: boolean;
  badgeStyle?: {
    border?: string;
    borderRadius?: string;
    height?: string;
    width?: string;
  };
  badgeImageUrl?: string;
  badgeAlt?: string;
  badgeWidth?: number;
  badgeHeight?: number;
  showInFooter?: boolean;
}

// Add approved outbound partner links here.
// Keep this list intentionally small and manually reviewed.
export const partnerListings: PartnerListing[] = [
  {
    name: 'Dang.ai',
    url: 'https://dang.ai/',
    description:
      'Dang.ai is an AI tools directory for discovering and comparing curated AI products across different workflows and use cases.',
    category: 'AI Directory',
    relationship: 'nofollow',
    badgeImageUrl:
      'https://cdn.prod.website-files.com/63d8afd87da01fb58ea3fbcb/6487e2868c6c8f93b4828827_dang-badge.png',
    badgeAlt: 'Dang.ai Badge',
    badgeWidth: 150,
    badgeHeight: 54,
  },
  {
    name: 'ToolPilot',
    url: 'https://www.toolpilot.ai/',
    description:
      'ToolPilot is an AI tools directory for discovering AI products, resources, and workflows across multiple categories.',
    category: 'AI Directory',
    relationship: 'nofollow',
    badgeImageUrl:
      'https://www.toolpilot.ai/cdn/shop/files/toolpilot-badge-w.png',
    badgeAlt: 'Featured on ToolPilot.ai',
    badgeWidth: 300,
    badgeHeight: 66,
  },
  {
    name: 'Startup Fast',
    url: 'https://startupfa.st',
    description:
      'Startup Fast is a startup directory for launching products, gaining visibility, and earning backlinks from a founder-focused platform.',
    category: 'Startup Directory',
    relationship: 'nofollow',
  },
  {
    name: 'Startup Fame',
    url: 'https://startupfa.me/s/gpt-image-2-ai.org-208?utm_source=gpt-image-2-ai.org',
    description:
      'Startup Fame is a startup showcase and discovery platform that features emerging products and founder projects.',
    category: 'Startup Directory',
    relationship: 'nofollow',
    badgeImageUrl: 'https://startupfa.me/badges/featured-badge-small.webp',
    badgeAlt: 'ChatGPT Image 2 Generator - Featured on Startup Fame',
    badgeWidth: 224,
    badgeHeight: 36,
  },
  {
    name: 'Direct2App',
    url: 'https://www.direct2app.com/item/partners',
    description:
      'Direct2App is an app discovery directory that showcases featured software products and websites.',
    category: 'App Directory',
    relationship: 'nofollow',
    badgeImageUrl: 'https://www.direct2app.com/featured-light.svg',
    badgeAlt: 'Featured badge linking to your listing',
    badgeWidth: 125,
    badgeHeight: 44,
  },
  {
    name: 'DomainRank',
    url: 'https://domainrank.app',
    description:
      'DomainRank provides shareable domain rating badges and SEO authority metrics for websites.',
    category: 'SEO Tool',
    relationship: 'nofollow',
    badgeImageUrl:
      'https://domainrank.app/api/badge/gpt-image-2-ai.org?theme=dark',
    badgeAlt: 'gpt-image-2-ai.org Domain Rating',
    badgeWidth: 360,
    badgeHeight: 80,
  },
  {
    name: 'AI Just Better',
    url: 'https://aijustbetter.com/item/gpt-image-2-ai.org-zh-partners',
    description:
      'AI Just Better publishes AI product reviews, comparisons, and analysis to help users evaluate tools more clearly.',
    category: 'AI Review Site',
    relationship: 'nofollow',
    badgeImageUrl: 'https://cdn.aijustbetter.com/badges/badge-dark.svg',
    badgeAlt: 'Featured on AIJustBetter.com',
    badgeWidth: 212,
    badgeHeight: 55,
  },
  {
    name: 'AIToolFame',
    url: 'https://aitoolfame.com/item/partners',
    description:
      'AIToolFame is an AI tools directory for discovering featured AI products and software.',
    category: 'AI Directory',
    linkRel: 'noopener noreferrer',
    exactBadgeEmbed: true,
    badgeImageUrl: 'https://aitoolfame.com/badge-light.svg',
    badgeAlt: 'Featured on aitoolfame.com',
    badgeWidth: 250,
    badgeHeight: 54,
  },
  {
    name: 'Twelve Tools',
    url: 'https://twelve.tools',
    description:
      'Twelve Tools is a curated tools directory for discovering featured products and software resources.',
    category: 'Tools Directory',
    relationship: 'nofollow',
    exactBadgeEmbed: true,
    rawBadgeEmbed: true,
    badgeImageUrl: 'https://twelve.tools/badge0-white.svg',
    badgeAlt: 'Featured on Twelve Tools',
    badgeWidth: 200,
    badgeHeight: 54,
  },
  {
    name: 'AI Tech Viral',
    url: 'https://aitechviral.com',
    description:
      'AI Tech Viral is a site for discovering and featuring AI products, tools, and industry resources.',
    category: 'AI Media',
    linkRel: '',
    exactBadgeEmbed: true,
    badgeImageUrl: 'https://aitechviral.com/assets/images/badge.png',
    badgeAlt: 'AI Tech Viral',
    badgeWidth: 192,
    badgeHeight: 54,
  },
  {
    name: 'AI Agents Directory',
    url: 'https://aiagentsdirectory.com/agent/happy-horse?utm_source=badge&utm_medium=referral&utm_campaign=free_listing&utm_content=happy-horse',
    description:
      'AI Agents Directory is a discovery platform for browsing and featuring AI agents across different use cases.',
    category: 'AI Directory',
    relationship: 'nofollow',
    badgeImageUrl: 'https://aiagentsdirectory.com/featured-badge.svg?v=2024',
    badgeAlt: 'ChatGPT Image 2 Generator - Featured AI Agent on AI Agents Directory',
    badgeWidth: 200,
    badgeHeight: 50,
  },
  {
    name: 'SaaSFame',
    url: 'https://saasfame.com/item/partners',
    description:
      'SaaSFame is a startup and SaaS discovery platform for showcasing featured products.',
    category: 'SaaS Directory',
    linkRel: 'noopener noreferrer',
    exactBadgeEmbed: true,
    badgeImageUrl: 'https://saasfame.com/badge-light.svg',
    badgeAlt: 'Featured on saasfame.com',
    badgeWidth: 220,
    badgeHeight: 54,
  },
  {
    name: 'AiTop10 Tools',
    url: 'https://aitop10.tools/',
    description:
      'AiTop10 Tools is an AI tools directory and guide for discovering curated tools across different tasks.',
    category: 'AI Directory',
    relationship: 'nofollow',
  },
  {
    name: 'FoundrList',
    url: 'https://www.foundrlist.com/product/happyhorse-2?utm_source=badge&utm_medium=embed',
    description:
      'FoundrList is a startup and product discovery platform for featuring founder-built products.',
    category: 'Startup Directory',
    linkRel: 'noopener',
    exactBadgeEmbed: true,
    rawBadgeEmbed: true,
    showInFooter: true,
    showInPartners: false,
    badgeImageUrl: 'https://www.foundrlist.com/api/badge/happyhorse-2',
    badgeAlt: 'Featured on FoundrList',
    badgeWidth: 150,
    badgeHeight: 48,
  },
  {
    name: 'Dofollow.Tools',
    url: 'https://dofollow.tools',
    description:
      'Dofollow.Tools is a directory for discovering featured products and websites with backlink opportunities.',
    category: 'Directory',
    linkRel: '',
    exactBadgeEmbed: true,
    badgeImageUrl: 'https://dofollow.tools/badge/badge_dark.svg',
    badgeAlt: 'Featured on Dofollow.Tools',
    badgeWidth: 200,
    badgeHeight: 54,
  },
  {
    name: 'Fazier',
    url: 'https://fazier.com',
    description:
      'Fazier is a product launch and discovery platform for featuring newly launched products.',
    category: 'Product Launch',
    linkRel: '',
    exactBadgeEmbed: true,
    rawBadgeEmbed: true,
    showInFooter: true,
    showInPartners: false,
    badgeImageUrl:
      'https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light',
    badgeAlt: 'Fazier badge',
    badgeWidth: 120,
  },
  {
    name: 'Turbo0',
    url: 'https://turbo0.com/item/happy-horse',
    description:
      'Turbo0 is a product discovery platform for listing and featuring software products.',
    category: 'Product Directory',
    linkRel: 'noopener noreferrer',
    exactBadgeEmbed: true,
    rawBadgeEmbed: true,
    showInFooter: true,
    showInPartners: false,
    badgeImageUrl: 'https://img.turbo0.com/badge-listed-light.svg',
    badgeAlt: 'Listed on Turbo0',
    badgeStyle: {
      height: '54px',
      width: 'auto',
    },
  },
  {
    name: 'Acid Tools',
    url: 'https://acidtools.com',
    description:
      'Acid Tools is a site for discovering and featuring AI tools and software products.',
    category: 'AI Directory',
    linkRel: '',
    exactBadgeEmbed: true,
    rawBadgeEmbed: true,
    badgeImageUrl: 'https://acidtools.com/assets/images/badge.png',
    badgeAlt: 'Acid Tools',
    badgeHeight: 54,
  },
  {
    name: 'LaunchIgniter',
    url: 'https://launchigniter.com/product/happy-horse-video?ref=badge-happy-horse-video',
    description:
      'LaunchIgniter is a product discovery platform for showcasing featured software and startup launches.',
    category: 'Product Launch',
    linkRel: '',
    exactBadgeEmbed: true,
    rawBadgeEmbed: true,
    showInFooter: true,
    showInPartners: false,
    badgeImageUrl:
      'https://launchigniter.com/api/badge/happy-horse-video?theme=light',
    badgeAlt: 'Featured on LaunchIgniter',
    badgeWidth: 212,
    badgeHeight: 55,
  },
  {
    name: 'Findly.tools',
    url: 'https://findly.tools/happy-horse-submission?utm_source=happy-horse-submission',
    description:
      'Findly.tools is a discovery platform for featuring AI tools and software products.',
    category: 'AI Directory',
    linkRel: '',
    exactBadgeEmbed: true,
    rawBadgeEmbed: true,
    showInFooter: true,
    showInPartners: false,
    badgeImageUrl: 'https://findly.tools/badges/findly-tools-badge-light.svg',
    badgeAlt: 'Featured on Findly.tools',
    badgeWidth: 150,
  },
  {
    name: 'Artificin',
    url: 'https://artificin.com?utm_source=badge&utm_medium=referral&utm_campaign=featured_badge',
    description:
      'Artificin is a platform for discovering and featuring AI products and tools.',
    category: 'AI Directory',
    linkRel: 'noopener',
    rawBadgeEmbed: true,
    showInFooter: true,
    showInPartners: false,
    badgeImageUrl: 'https://artificin.com/badges/Artificin-badge.png',
    badgeAlt: 'Featured on Artificin',
    badgeWidth: 175,
    badgeHeight: 50,
    badgeStyle: {
      width: '175px',
      height: '50px',
    },
  },
  {
    name: 'TinyLaunch',
    url: 'https://tinylaunch.com',
    description:
      'TinyLaunch is a launch platform for discovering upcoming products and startup releases.',
    category: 'Product Launch',
    linkRel: 'noopener',
    exactBadgeEmbed: true,
    rawBadgeEmbed: true,
    showInFooter: true,
    showInPartners: false,
    badgeImageUrl: 'https://tinylaunch.com/tinylaunch_badge_launching_soon.svg',
    badgeAlt: 'TinyLaunch Badge',
    badgeWidth: 202,
    badgeStyle: {
      width: '202px',
      height: 'auto',
    },
  },
  
];
