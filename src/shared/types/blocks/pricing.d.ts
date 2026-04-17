import { Button } from '@/types/blocks/base/button';

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  is_featured?: boolean;
}

export interface PricingSection {
  id: string;
  title?: string;
  description?: string;
  group_names?: string[];
  default_group?: string;
}

export interface PricingUsageExample {
  title: string;
  description: string;
}

export interface PricingCurrency {
  currency: string; // currency code
  amount: number; // price amount
  price: string; // price text
  original_price: string; // original price text
  payment_product_id?: string;
  payment_providers?: string[];
}

export interface PricingFeature {
  text: string;
  note?: string;
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;

  currency: string; // default currency
  amount: number; // default price amount
  price?: string; // default price text
  original_price?: string; // default original price text
  currencies?: PricingCurrency[]; // alternative currencies with different prices

  unit?: string;
  features_title?: string;
  features?: Array<string | PricingFeature>;
  button?: Button;
  tip?: string;
  is_featured?: boolean;
  interval: 'one-time' | 'day' | 'week' | 'month' | 'year';
  product_id: string;
  legacy_product_ids?: string[];
  payment_product_id?: string;
  payment_providers?: string[];
  product_name?: string;
  plan_name?: string;

  credits?: number;
  valid_days?: number;
  group?: string;
}

export interface TrustBadge {
  icon?: string;
  title: string;
  description: string;
}

export interface Pricing {
  id?: string;
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  messages?: Record<string, string>;
  trust_badges?: TrustBadge[];
  items?: PricingItem[];
  groups?: PricingGroup[];
  sections?: PricingSection[];
  usage_examples_title?: string;
  usage_examples_description?: string;
  usage_examples?: PricingUsageExample[];
  className?: string;
  sr_only_title?: string;
}
