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

export const partnerListings: PartnerListing[] = [];
