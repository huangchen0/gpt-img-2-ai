'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, CircleHelp, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SmartIcon } from '@/shared/blocks/common';
import { PaymentModal } from '@/shared/blocks/payment/payment-modal';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useAppContext } from '@/shared/contexts/app';
import { getCookie } from '@/shared/lib/cookie';
import {
  getFlashSaleWindow,
  getSavingsPercent,
  isFlashSaleEnabled,
  parseFlashSaleDurationHours,
  parseFlashSaleStartedAtMs,
} from '@/shared/lib/flash-sale';
import {
  GtmItem,
  toMajorUnitAmount,
  trackGtmAddToCart,
  trackGtmBeginCheckout,
  trackGtmSelectItem,
} from '@/shared/lib/gtm';
import { cn } from '@/shared/lib/utils';
import { Subscription } from '@/shared/models/subscription';
import {
  PricingCurrency,
  PricingFeature,
  PricingItem,
  PricingSection,
  Pricing as PricingType,
} from '@/shared/types/blocks/pricing';

function buildPricingGtmItem(item: PricingItem): GtmItem {
  return {
    item_id: item.product_id,
    item_name:
      item.product_name || item.plan_name || item.title || item.product_id,
    item_category: item.interval === 'one-time' ? 'one-time' : 'subscription',
    item_variant: item.currency.toUpperCase(),
    price: toMajorUnitAmount(item.amount),
    quantity: 1,
  };
}

function trackPricingSelectItem({
  listName,
  item,
}: {
  listName: string;
  item: PricingItem;
}) {
  trackGtmSelectItem({
    listName,
    currency: item.currency.toUpperCase(),
    value: toMajorUnitAmount(item.amount),
    items: [buildPricingGtmItem(item)],
  });
}

function trackPricingAddToCart(
  item: PricingItem,
  configs?: Record<string, string>
) {
  trackGtmAddToCart({
    currency: item.currency.toUpperCase(),
    value: toMajorUnitAmount(item.amount),
    items: [buildPricingGtmItem(item)],
    paymentType: item.interval === 'one-time' ? 'one-time' : 'subscription',
    group: item.group || '',
    productId: item.product_id,
    productName:
      item.product_name || item.plan_name || item.title || item.product_id,
    amount: item.amount,
    configs,
  });
}

function trackPricingBeginCheckout({
  item,
  paymentProvider,
  configs,
}: {
  item: PricingItem;
  paymentProvider?: string;
  configs?: Record<string, string>;
}) {
  trackGtmBeginCheckout({
    currency: item.currency.toUpperCase(),
    value: toMajorUnitAmount(item.amount),
    items: [buildPricingGtmItem(item)],
    paymentProvider: paymentProvider || '',
    paymentType: item.interval === 'one-time' ? 'one-time' : 'subscription',
    productId: item.product_id,
    configs,
  });
}

function getCurrenciesFromItem(item: PricingItem | null): PricingCurrency[] {
  if (!item) {
    return [];
  }

  const defaultCurrency: PricingCurrency = {
    currency: item.currency,
    amount: item.amount,
    price: item.price || '',
    original_price: item.original_price || '',
  };

  if (item.currencies && item.currencies.length > 0) {
    return [defaultCurrency, ...item.currencies];
  }

  return [defaultCurrency];
}

function getInitialCurrency(
  currencies: PricingCurrency[],
  locale: string,
  defaultCurrency: string
): string {
  if (currencies.length === 0) {
    return defaultCurrency;
  }

  if (locale === 'zh') {
    const cnyCurrency = currencies.find(
      (currency) => currency.currency.toLowerCase() === 'cny'
    );
    if (cnyCurrency) {
      return cnyCurrency.currency;
    }
  }

  return defaultCurrency;
}

function getGridColumnsClass(count: number) {
  if (count <= 1) return 'md:grid-cols-1';
  if (count === 2) return 'md:grid-cols-2';
  if (count === 3) return 'md:grid-cols-3';
  return 'md:grid-cols-4';
}

function normalizeFeature(feature: string | PricingFeature): PricingFeature {
  return typeof feature === 'string' ? { text: feature } : feature;
}

function PricingFeatureNote({
  note,
  ariaLabel,
}: {
  note: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? noteId : undefined}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-4 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <CircleHelp className="size-3.5" strokeWidth={2.2} />
      </button>

      {open && (
        <span
          id={noteId}
          role="tooltip"
          className="border-border/70 bg-background/95 text-foreground absolute top-full right-0 z-30 mt-2 w-64 max-w-[min(18rem,calc(100vw-3rem))] rounded-xl border px-3 py-2 text-xs leading-relaxed shadow-xl shadow-black/10 backdrop-blur-sm"
        >
          <span className="border-border/70 bg-background/95 pointer-events-none absolute -top-1 right-2 size-2 rotate-45 border-t border-l" />
          <span className="relative block">{note}</span>
        </span>
      )}
    </span>
  );
}

const YEARLY_MONTHLY_COMPARISON_PRODUCT_IDS: Record<string, string> = {
  'premium-yearly': 'starter-monthly',
  'studio-yearly-v2': 'creator-monthly-v2',
};

function getNormalizedOriginalPrice(item: PricingItem) {
  if (item.currency.toUpperCase() !== 'USD') {
    return item.original_price;
  }

  if (item.product_id === 'premium-yearly') {
    return '$29.9';
  }

  if (item.product_id === 'studio-yearly-v2') {
    return '$49.9';
  }

  return item.original_price;
}

function normalizePricingItem(item: PricingItem): PricingItem {
  const original_price = getNormalizedOriginalPrice(item);

  if (original_price === item.original_price) {
    return item;
  }

  return {
    ...item,
    original_price,
  };
}

function formatPerHundredCredits(item: PricingItem, locale: string) {
  const credits = item.credits;

  if (!credits || credits <= 0) {
    return null;
  }

  const amount = toMajorUnitAmount(item.amount) || 0;
  const pricePerHundredCredits = (amount / credits) * 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: item.currency.toUpperCase(),
      maximumFractionDigits: 2,
      minimumFractionDigits: pricePerHundredCredits < 1 ? 2 : 0,
    }).format(pricePerHundredCredits);
  } catch {
    return `${pricePerHundredCredits.toFixed(2)} ${item.currency.toUpperCase()}`;
  }
}

function formatPerVideoPrice(item: PricingItem, locale: string) {
  const credits = item.credits;

  if (!credits || credits <= 0) {
    return null;
  }

  const estimatedVideos =
    item.interval === 'year'
      ? Math.round(credits / 12 / 40)
      : Math.round(credits / 40);

  if (!estimatedVideos || estimatedVideos <= 0) {
    return null;
  }

  const normalizedAmountInMinorUnit =
    item.interval === 'year' ? Math.round(item.amount / 12) : item.amount;
  const amount = toMajorUnitAmount(normalizedAmountInMinorUnit);

  if (amount === undefined) {
    return null;
  }

  const pricePerVideo = amount / estimatedVideos;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: item.currency.toUpperCase(),
      maximumFractionDigits: 2,
      minimumFractionDigits: pricePerVideo < 1 ? 2 : 0,
    }).format(pricePerVideo);
  } catch {
    return `${pricePerVideo.toFixed(2)} ${item.currency.toUpperCase()}`;
  }
}

function formatCreditsCount(credits: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale).format(credits);
  } catch {
    return String(credits);
  }
}

function formatDisplayCurrencyAmount(
  amountInMinorUnit: number,
  currency: string,
  locale: string
) {
  const amount = toMajorUnitAmount(amountInMinorUnit);

  if (amount === undefined) {
    return `${Number((amountInMinorUnit / 100).toFixed(2))} ${currency.toUpperCase()}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 1,
    }).format(amount);
  } catch {
    return `${amount} ${currency.toUpperCase()}`;
  }
}

function interpolateTemplate(
  template: string,
  values?: Record<string, string | number>
) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatCountdownDeadline(timestamp: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

export function Pricing({
  pricing,
  className,
  currentSubscription,
}: {
  pricing: PricingType;
  className?: string;
  currentSubscription?: Subscription;
}) {
  const locale = useLocale();
  const t = useTranslations('pages.pricing.messages');
  const tCommon = useTranslations('common');
  const {
    user,
    setIsShowSignModal,
    setIsShowPaymentModal,
    configs,
    hasFetchedConfigs,
    fetchConfigs,
  } = useAppContext();
  const [resolvedSubscription, setResolvedSubscription] = useState<
    Subscription | undefined
  >(currentSubscription);
  const pricingMessages = pricing.messages || {};

  const tm = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>
  ) => {
    const message = pricingMessages[key];

    if (typeof message === 'string') {
      return interpolateTemplate(message, values);
    }

    return t.has(key) ? t(key as any, values as any) : fallback;
  };

  const tc = (key: string, fallback: string) =>
    tCommon.has(`actions.${key}`)
      ? tCommon(`actions.${key}` as any)
      : tCommon.has(`sign.${key}`)
        ? tCommon(`sign.${key}` as any)
        : fallback;

  const matchesSubscriptionProduct = (
    item: Pick<PricingItem, 'product_id' | 'legacy_product_ids'>,
    subscriptionProductId?: string | null
  ) => {
    if (!subscriptionProductId) {
      return false;
    }

    return (
      item.product_id === subscriptionProductId ||
      item.legacy_product_ids?.includes(subscriptionProductId) === true
    );
  };

  const getDisplayedPricingItem = (
    item: PricingItem,
    preferredCurrency?: string
  ) => {
    if (preferredCurrency) {
      const matchedCurrency = getCurrenciesFromItem(item).find(
        (currency) =>
          currency.currency.toLowerCase() === preferredCurrency.toLowerCase()
      );

      if (matchedCurrency) {
        return normalizePricingItem({
          ...item,
          currency: matchedCurrency.currency,
          amount: matchedCurrency.amount,
          price: matchedCurrency.price,
          original_price: matchedCurrency.original_price,
          payment_product_id:
            matchedCurrency.payment_product_id || item.payment_product_id,
          payment_providers:
            matchedCurrency.payment_providers || item.payment_providers,
        });
      }
    }

    return normalizePricingItem(
      itemCurrencies[item.product_id]?.displayedItem || item
    );
  };

  const getComparisonPricing = (
    item: PricingItem,
    preferredCurrency?: string
  ) => {
    if (item.interval === 'year') {
      const comparisonProductId =
        YEARLY_MONTHLY_COMPARISON_PRODUCT_IDS[item.product_id];
      if (!comparisonProductId) {
        return null;
      }

      const comparisonItem = pricing.items?.find(
        (pricingItemValue) =>
          pricingItemValue.product_id === comparisonProductId
      );
      if (!comparisonItem) {
        return null;
      }

      const displayedComparisonItem = getDisplayedPricingItem(
        comparisonItem,
        preferredCurrency
      );

      return displayedComparisonItem.price
        ? {
            price: displayedComparisonItem.price,
            unit: displayedComparisonItem.unit || '',
          }
        : null;
    }

    return item.original_price
      ? {
          price: item.original_price,
          unit: item.unit || '',
        }
      : null;
  };

  const findDefaultGroup = (section?: PricingSection) => {
    const sectionGroupNames = section?.group_names;

    const sectionGroups =
      sectionGroupNames && sectionGroupNames.length > 0
        ? pricing.groups?.filter(
            (groupItem) =>
              groupItem.name && sectionGroupNames.includes(groupItem.name)
          )
        : pricing.groups;

    const currentItem = pricing.items?.find(
      (item) =>
        matchesSubscriptionProduct(item, resolvedSubscription?.productId) &&
        (!sectionGroupNames ||
          !item.group ||
          sectionGroupNames.includes(item.group))
    );

    if (section?.default_group) {
      return section.default_group;
    }

    const featuredGroup = sectionGroups?.find(
      (groupItem) => groupItem.is_featured
    );

    return (
      currentItem?.group ||
      featuredGroup?.name ||
      sectionGroups?.[0]?.name ||
      pricing.groups?.[0]?.name ||
      ''
    );
  };

  const [group, setGroup] = useState(() => findDefaultGroup());
  const [sectionGroups, setSectionGroups] = useState<Record<string, string>>(
    () =>
      (pricing.sections || []).reduce<Record<string, string>>(
        (acc, section) => {
          acc[section.id] = findDefaultGroup(section);
          return acc;
        },
        {}
      )
  );
  const [pricingItem, setPricingItem] = useState<PricingItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [itemCurrencies, setItemCurrencies] = useState<
    Record<string, { selectedCurrency: string; displayedItem: PricingItem }>
  >({});
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!hasFetchedConfigs) {
      void fetchConfigs();
    }
  }, [fetchConfigs, hasFetchedConfigs]);

  useEffect(() => {
    if (currentSubscription) {
      setResolvedSubscription(currentSubscription);
      return;
    }

    let cancelled = false;
    const loadSubscription = async () => {
      try {
        const resp = await fetch('/api/subscription/current', {
          method: 'POST',
        });
        if (!resp.ok) return;
        const { code, data } = await resp.json();
        if (code !== 0 || !data) return;
        if (!cancelled) {
          setResolvedSubscription(data);
        }
      } catch {
        // silent
      }
    };

    loadSubscription();
    return () => {
      cancelled = true;
    };
  }, [currentSubscription]);

  useEffect(() => {
    if (!resolvedSubscription || !pricing.items?.length) return;
    const currentItem = pricing.items.find((item) =>
      matchesSubscriptionProduct(item, resolvedSubscription.productId)
    );
    if (currentItem?.group) {
      setGroup(currentItem.group);
    }
  }, [resolvedSubscription, pricing.items]);

  useEffect(() => {
    if (!pricing.sections || pricing.sections.length === 0) {
      return;
    }

    const pricingSections = pricing.sections;
    setSectionGroups((prev) => {
      const next = { ...prev };
      pricingSections.forEach((section) => {
        const currentItem = pricing.items?.find(
          (item) =>
            matchesSubscriptionProduct(item, resolvedSubscription?.productId) &&
            (!section.group_names ||
              !item.group ||
              section.group_names.includes(item.group))
        );

        if (currentItem?.group) {
          next[section.id] = currentItem.group;
          return;
        }

        if (!next[section.id]) {
          next[section.id] = findDefaultGroup(section);
        }
      });
      return next;
    });
  }, [pricing.sections, pricing.items, resolvedSubscription]);

  useEffect(() => {
    if (pricing.items && pricing.items.length > 0) {
      const initialCurrencyStates: Record<
        string,
        { selectedCurrency: string; displayedItem: PricingItem }
      > = {};

      pricing.items.forEach((item) => {
        const currencies = getCurrenciesFromItem(item);
        const selectedCurrency = getInitialCurrency(
          currencies,
          locale,
          item.currency
        );
        const currencyData = currencies.find(
          (currency) =>
            currency.currency.toLowerCase() === selectedCurrency.toLowerCase()
        );

        const displayedItem = normalizePricingItem(
          currencyData
            ? {
                ...item,
                currency: currencyData.currency,
                amount: currencyData.amount,
                price: currencyData.price,
                original_price: currencyData.original_price,
                payment_product_id:
                  currencyData.payment_product_id || item.payment_product_id,
                payment_providers:
                  currencyData.payment_providers || item.payment_providers,
              }
            : item
        );

        initialCurrencyStates[item.product_id] = {
          selectedCurrency,
          displayedItem,
        };
      });

      setItemCurrencies(initialCurrencyStates);
    }
  }, [pricing.items, locale]);

  const handleCurrencyChange = (
    selectedProductId: string,
    currency: string
  ) => {
    const item = pricing.items?.find(
      (pricingItemValue) => pricingItemValue.product_id === selectedProductId
    );
    if (!item) {
      return;
    }

    const currencies = getCurrenciesFromItem(item);
    const currencyData = currencies.find(
      (currencyItem) =>
        currencyItem.currency.toLowerCase() === currency.toLowerCase()
    );

    if (currencyData) {
      const displayedItem = normalizePricingItem({
        ...item,
        currency: currencyData.currency,
        amount: currencyData.amount,
        price: currencyData.price,
        original_price: currencyData.original_price,
        payment_product_id:
          currencyData.payment_product_id || item.payment_product_id,
        payment_providers:
          currencyData.payment_providers || item.payment_providers,
      });

      setItemCurrencies((prev) => ({
        ...prev,
        [selectedProductId]: {
          selectedCurrency: currency,
          displayedItem,
        },
      }));
    }
  };

  const handlePayment = async (item: PricingItem) => {
    const displayedItem = normalizePricingItem(
      itemCurrencies[item.product_id]?.displayedItem || item
    );

    trackPricingSelectItem({
      listName: pricing.title || 'pricing',
      item: displayedItem,
    });
    trackPricingAddToCart(displayedItem, configs);

    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (configs.select_payment_enabled === 'true') {
      setPricingItem(displayedItem);
      setIsShowPaymentModal(true);
    } else {
      handleCheckout(displayedItem, configs.default_payment_provider);
    }
  };

  const getAffiliateMetadata = ({
    paymentProvider,
  }: {
    paymentProvider: string;
  }) => {
    const affiliateMetadata: Record<string, string> = {};

    if (
      configs.affonso_enabled === 'true' &&
      ['stripe', 'creem'].includes(paymentProvider)
    ) {
      affiliateMetadata.affonso_referral = getCookie('affonso_referral') || '';
    }

    if (
      configs.promotekit_enabled === 'true' &&
      ['stripe'].includes(paymentProvider)
    ) {
      affiliateMetadata.promotekit_referral =
        typeof window !== 'undefined' && (window as any).promotekit_referral
          ? (window as any).promotekit_referral
          : getCookie('promotekit_referral') || '';
    }

    return affiliateMetadata;
  };

  const handleCheckout = async (
    item: PricingItem,
    paymentProvider?: string
  ) => {
    try {
      if (!user) {
        setIsShowSignModal(true);
        return;
      }

      const affiliateMetadata = getAffiliateMetadata({
        paymentProvider: paymentProvider || '',
      });

      const params = {
        product_id: item.product_id,
        currency: item.currency,
        locale: locale || 'en',
        payment_provider: paymentProvider || '',
        metadata: affiliateMetadata,
      };

      setIsLoading(true);
      setProductId(item.product_id);

      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setIsLoading(false);
        setProductId(null);
        setPricingItem(null);
        setIsShowSignModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const { code, message, data } = await response.json();
      if (code !== 0) {
        throw new Error(message);
      }

      const { checkoutUrl } = data;
      if (!checkoutUrl) {
        throw new Error('checkout url not found');
      }

      trackPricingBeginCheckout({
        item,
        paymentProvider: paymentProvider || configs.default_payment_provider,
        configs,
      });

      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.log('checkout failed: ', error);
      toast.error('checkout failed: ' + error.message);

      setIsLoading(false);
      setProductId(null);
    }
  };

  useEffect(() => {
    if (pricing.items) {
      const featuredItem = pricing.items.find((item) => item.is_featured);
      setProductId(featuredItem?.product_id || pricing.items[0]?.product_id);
      setIsLoading(false);
    }
  }, [pricing.items]);

  const flashSaleEnabled = isFlashSaleEnabled(
    configs.pricing_flash_sale_enabled
  );
  const flashSaleDurationHours = parseFlashSaleDurationHours(
    configs.pricing_flash_sale_duration_hours
  );
  const flashSaleStartedAtMs = parseFlashSaleStartedAtMs(
    configs.pricing_flash_sale_started_at
  );
  const flashSaleEndsAtMs =
    flashSaleEnabled &&
    flashSaleDurationHours !== null &&
    flashSaleStartedAtMs !== null
      ? flashSaleStartedAtMs + flashSaleDurationHours * 60 * 60 * 1000
      : null;
  const flashSaleWindow =
    nowMs !== null
      ? getFlashSaleWindow({
          enabled: flashSaleEnabled,
          durationHours: flashSaleDurationHours,
          startedAt: flashSaleStartedAtMs,
          nowMs,
        })
      : null;
  const flashSaleRemainingMs = flashSaleWindow?.remainingMs ?? null;
  const showFlashSale =
    flashSaleWindow?.isConfigured === true && flashSaleWindow.isActive;
  const countdownText =
    flashSaleRemainingMs !== null
      ? formatCountdown(flashSaleRemainingMs)
      : '00:00:00';
  const [
    countdownHours = '00',
    countdownMinutes = '00',
    countdownSeconds = '00',
  ] = countdownText.split(':');
  const displayedPricingItems = (pricing.items || []).map((item) =>
    normalizePricingItem(itemCurrencies[item.product_id]?.displayedItem || item)
  );
  const maxSavingsPercent = displayedPricingItems.reduce((max, item) => {
    const comparisonPricing = getComparisonPricing(
      item,
      itemCurrencies[item.product_id]?.selectedCurrency || item.currency
    );
    const savingsPercent = comparisonPricing?.price
      ? getSavingsPercent({
          price: item.price,
          originalPrice: comparisonPricing.price,
        })
      : null;
    return savingsPercent && savingsPercent > max ? savingsPercent : max;
  }, 0);

  useEffect(() => {
    if (flashSaleEndsAtMs === null) {
      setNowMs(null);
      return;
    }

    let timerId: number | null = null;

    const tick = () => {
      const nextNowMs = Date.now();
      setNowMs(nextNowMs);

      if (nextNowMs >= flashSaleEndsAtMs && timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };

    tick();

    if (Date.now() < flashSaleEndsAtMs) {
      timerId = window.setInterval(tick, 1000);
    }

    return () => {
      if (timerId !== null) {
        window.clearInterval(timerId);
      }
    };
  }, [flashSaleEndsAtMs]);

  const renderPricingCard = (item: PricingItem, idx: number) => {
    const isCurrentPlan =
      resolvedSubscription !== undefined &&
      matchesSubscriptionProduct(item, resolvedSubscription.productId);
    const currencyState = itemCurrencies[item.product_id];
    const normalizedDisplayedItem = normalizePricingItem(
      currencyState?.displayedItem || item
    );
    const selectedCurrency = currencyState?.selectedCurrency || item.currency;
    const currencies = getCurrenciesFromItem(item);
    const isFeatured = item.is_featured === true;
    const isYearlyBilling = normalizedDisplayedItem.interval === 'year';
    const currentPriceUnit = normalizedDisplayedItem.unit || '';
    const comparisonPricing = getComparisonPricing(
      normalizedDisplayedItem,
      selectedCurrency
    );
    const comparisonPriceWithUnit = [
      comparisonPricing?.price,
      comparisonPricing?.unit || currentPriceUnit,
    ]
      .filter(Boolean)
      .join(' ');
    const annualTotalLabel = isYearlyBilling
      ? tm(
          'billed_annually_total',
          `Billed annually at ${formatDisplayCurrencyAmount(
            normalizedDisplayedItem.amount,
            normalizedDisplayedItem.currency,
            locale
          )}`,
          {
            amount: formatDisplayCurrencyAmount(
              normalizedDisplayedItem.amount,
              normalizedDisplayedItem.currency,
              locale
            ),
          }
        )
      : null;
    const yearlyComparisonLabel =
      isYearlyBilling && comparisonPricing?.price
        ? tm('vs_monthly_price', `vs monthly ${comparisonPriceWithUnit}`, {
            price: comparisonPriceWithUnit,
          })
        : null;
    const perHundredCredits = formatPerHundredCredits(
      normalizedDisplayedItem,
      locale
    );
    const creditsCount = normalizedDisplayedItem.credits || item.credits;
    const creditsCountLabel =
      creditsCount && creditsCount > 0
        ? tm(
            'credits_count',
            `${formatCreditsCount(creditsCount, locale)} credits`,
            {
              credits: formatCreditsCount(creditsCount, locale),
            }
          )
        : null;
    const perVideoPrice = formatPerVideoPrice(normalizedDisplayedItem, locale);
    const perVideoPriceLabel = perVideoPrice
      ? tm('per_video_price', `~${perVideoPrice} / video`, {
          amount: perVideoPrice,
        })
      : null;
    const creditsMetaParts = [
      creditsCountLabel,
      perHundredCredits
        ? tm('per_100_credits', `~${perHundredCredits} per 100 credits`, {
            amount: perHundredCredits,
          })
        : null,
    ].filter(Boolean);
    const savingsPercent = comparisonPricing?.price
      ? getSavingsPercent({
          price: normalizedDisplayedItem.price,
          originalPrice: comparisonPricing.price,
        })
      : null;
    const flashSaleCtaPercent = savingsPercent ?? maxSavingsPercent;
    const ctaTitle = item.button?.title || tc('continue', 'Continue');
    const yearlySummaryLabel = isYearlyBilling && item.tip ? item.tip : null;
    const shouldShowLegacyYearlyLabels = !yearlySummaryLabel;
    const shouldShowInlineTip = !isYearlyBilling;
    const shouldShowProGlow = item.product_id === 'premium-yearly';
    const featureNoteLabel = tm('feature_note_label', 'Show feature details');

    return (
      <Card
        key={`${item.product_id}-${idx}`}
        className={cn(
          'relative mx-auto w-full overflow-visible',
          isFeatured &&
            'border-primary/50 bg-primary/5 shadow-primary/10 ring-primary/20 shadow-lg ring-1',
          shouldShowProGlow &&
            'border-sky-400/35 shadow-[0_0_36px_rgba(59,130,246,0.18),0_0_60px_rgba(124,58,237,0.12)] ring-sky-400/20'
        )}
      >
        {item.label && (
          <span className="absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full bg-linear-to-r from-sky-400/85 via-violet-400/80 to-fuchsia-400/80 px-3 py-1 text-xs font-medium text-slate-950 ring-1 ring-white/25 ring-offset-1 ring-offset-gray-950/5 backdrop-blur-sm">
            {item.label}
          </span>
        )}

        <CardHeader>
          <CardTitle className="font-medium">
            <h3 className="text-sm font-medium">{item.title}</h3>
          </CardTitle>

          {!isYearlyBilling && normalizedDisplayedItem.original_price && (
            <div className="text-muted-foreground mt-3 text-sm">
              <span>{tm('original_price_label', 'Original')}</span>{' '}
              <span className="line-through">
                {normalizedDisplayedItem.original_price}
              </span>
              {currentPriceUnit && <span>{` ${currentPriceUnit}`}</span>}
            </div>
          )}

          <div className="my-3 flex items-baseline gap-2">
            <div className="my-3 block text-2xl font-semibold">
              <span className="text-primary">
                {normalizedDisplayedItem.price}
              </span>{' '}
              {normalizedDisplayedItem.unit ? (
                <span className="text-muted-foreground text-sm font-normal">
                  {normalizedDisplayedItem.unit}
                </span>
              ) : (
                ''
              )}
            </div>

            {showFlashSale && savingsPercent && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {tm('flash_sale_save_percent', `Save ${savingsPercent}%`, {
                  percent: savingsPercent,
                })}
              </span>
            )}

            {currencies.length > 1 && (
              <Select
                value={selectedCurrency}
                onValueChange={(currency) =>
                  handleCurrencyChange(item.product_id, currency)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="border-muted-foreground/30 bg-background/50 h-6 min-w-[60px] px-2 text-xs"
                >
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem
                      key={currency.currency}
                      value={currency.currency}
                      className="text-xs"
                    >
                      {currency.currency.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {yearlySummaryLabel && (
            <div className="text-primary/85 -mt-1 text-xs font-medium">
              {yearlySummaryLabel}
            </div>
          )}
          {shouldShowLegacyYearlyLabels && annualTotalLabel && (
            <div className="text-muted-foreground -mt-1 text-xs font-medium">
              {annualTotalLabel}
            </div>
          )}
          {shouldShowLegacyYearlyLabels && yearlyComparisonLabel && (
            <div className="text-primary/80 mt-1 text-xs font-medium">
              {yearlyComparisonLabel}
            </div>
          )}
          {perVideoPriceLabel && (
            <div className="text-muted-foreground/80 mt-1 text-[11px]">
              {perVideoPriceLabel}
            </div>
          )}

          <CardDescription className="text-sm">
            {item.description}
          </CardDescription>
          {creditsMetaParts.length > 0 && (
            <div className="text-primary/80 mt-2 text-xs font-medium">
              {creditsMetaParts.join(' · ')}
            </div>
          )}
          {shouldShowInlineTip && item.tip && (
            <span className="text-muted-foreground text-sm">{item.tip}</span>
          )}

          {isCurrentPlan ? (
            <Button
              disabled
              className={cn(
                'focus-visible:ring-ring bg-primary text-primary-foreground mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border-[0.5px] border-white/25 px-4 py-2 text-sm font-medium whitespace-nowrap opacity-50 shadow-md shadow-black/20 transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none'
              )}
            >
              <span className="text-sm">
                {tm('current_plan', 'Current Plan')}
              </span>
            </Button>
          ) : (
            <>
              {showFlashSale && (
                <p className="text-muted-foreground/80 mt-4 text-[11px] leading-relaxed">
                  {tm(
                    'flash_sale_cta_note',
                    'Early-bird pricing is available this month only. Standard pricing returns after the promotion ends.'
                  )}
                </p>
              )}
              <Button
                onClick={() => handlePayment(item)}
                disabled={isLoading}
                className={cn(
                  'focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border-[0.5px] border-white/25 px-4 py-2 text-sm font-medium whitespace-nowrap shadow-md shadow-black/20 transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50'
                )}
              >
                {isLoading && item.product_id === productId ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span className="block">
                      {tm('processing', 'Processing...')}
                    </span>
                  </>
                ) : (
                  <>
                    {item.button?.icon && (
                      <SmartIcon
                        name={item.button.icon as string}
                        className="size-4"
                      />
                    )}
                    <span className="block">{ctaTitle}</span>
                  </>
                )}
              </Button>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <hr className="border-dashed" />

          {item.features_title && (
            <p className="text-sm font-medium">{item.features_title}</p>
          )}
          <ul className="list-outside space-y-3 text-sm">
            {item.features?.map((feature, index) => {
              const normalizedFeature = normalizeFeature(feature);

              return (
                <li key={index} className="flex items-start gap-2">
                  <Check className="mt-1 size-3 shrink-0" />
                  <span className="flex min-w-0 flex-1 items-start gap-1.5">
                    <span className="min-w-0 flex-1 leading-relaxed">
                      {normalizedFeature.text}
                    </span>
                    {normalizedFeature.note && (
                      <PricingFeatureNote
                        note={normalizedFeature.note}
                        ariaLabel={featureNoteLabel}
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    );
  };

  const renderPricingGrid = ({
    items,
    activeGroup,
  }: {
    items: PricingItem[];
    activeGroup?: string;
  }) => {
    const visibleItems = items.filter(
      (item) => !item.group || !activeGroup || item.group === activeGroup
    );

    return (
      <div
        className={cn(
          'mx-auto mt-0 grid w-full gap-6',
          getGridColumnsClass(visibleItems.length)
        )}
      >
        {visibleItems.map((item, idx) => renderPricingCard(item, idx))}
      </div>
    );
  };

  const renderSection = (section: PricingSection) => {
    const sectionItemGroups = section.group_names || [];
    const sectionItems = (pricing.items || []).filter((item) => {
      if (sectionItemGroups.length === 0) {
        return true;
      }
      return item.group ? sectionItemGroups.includes(item.group) : false;
    });

    if (sectionItems.length === 0) {
      return null;
    }

    const availableGroups = (pricing.groups || []).filter((groupItem) =>
      groupItem.name ? sectionItemGroups.includes(groupItem.name) : false
    );
    const activeGroup = sectionGroups[section.id] || findDefaultGroup(section);

    return (
      <div key={section.id} className="mb-20 last:mb-0">
        {(section.title || section.description) && (
          <div className="mx-auto mb-10 max-w-3xl text-center">
            {section.title && (
              <h3 className="text-2xl font-semibold tracking-tight">
                {section.title}
              </h3>
            )}
            {section.description && (
              <p className="text-muted-foreground mt-3 text-base lg:text-lg">
                {section.description}
              </p>
            )}
          </div>
        )}

        {availableGroups.length > 1 && (
          <div className="mx-auto mt-8 mb-12 flex w-full justify-center md:max-w-lg">
            <Tabs
              value={activeGroup}
              onValueChange={(value) =>
                setSectionGroups((prev) => ({
                  ...prev,
                  [section.id]: value,
                }))
              }
            >
              <TabsList>
                {availableGroups.map((groupItem, index) => (
                  <TabsTrigger key={index} value={groupItem.name || ''}>
                    {groupItem.title}
                    {groupItem.label && (
                      <Badge className="ml-2">{groupItem.label}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {renderPricingGrid({
          items: sectionItems,
          activeGroup: availableGroups.length > 0 ? activeGroup : undefined,
        })}
      </div>
    );
  };

  return (
    <section
      id={pricing.id}
      className={cn('py-24 md:py-36', pricing.className, className)}
    >
      <div className="mx-auto mb-12 px-4 text-center md:px-8">
        {pricing.sr_only_title && (
          <h1 className="sr-only">{pricing.sr_only_title}</h1>
        )}
        <h2 className="mb-6 text-3xl font-bold text-pretty lg:text-4xl">
          {pricing.title}
        </h2>
        <p className="text-muted-foreground mx-auto mb-4 max-w-xl lg:max-w-none lg:text-lg">
          {pricing.description}
        </p>
        {showFlashSale &&
          flashSaleEndsAtMs !== null &&
          flashSaleRemainingMs !== null && (
            <div className="via-primary/10 relative mx-auto mt-5 max-w-4xl overflow-hidden rounded-2xl border border-amber-400/30 bg-linear-to-br from-amber-500/15 to-transparent px-5 py-5 text-left shadow-lg shadow-amber-500/10">
              <div className="absolute -top-8 -right-8 size-24 rounded-full bg-amber-400/20 blur-2xl" />
              <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-700 dark:text-amber-300">
                    24H
                  </div>
                  <div className="text-foreground text-base font-semibold md:text-lg">
                    {maxSavingsPercent > 0
                      ? tm(
                          'flash_sale_title_with_savings',
                          `Flash Sale: Save Up To ${maxSavingsPercent}% Right Now`,
                          {
                            percent: maxSavingsPercent,
                          }
                        )
                      : tm('flash_sale_title', 'Flash Sale Active')}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {tm(
                      'flash_sale_description',
                      'This price disappears when the timer hits zero. Lock it in now or pay full price tomorrow.'
                    )}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {tm(
                      'flash_sale_price_note',
                      'Prices shown are already discounted. What you see is what you pay at checkout.'
                    )}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs font-medium">
                    {tm(
                      'flash_sale_ends_at',
                      `Sale ends: ${formatCountdownDeadline(
                        flashSaleEndsAtMs,
                        locale
                      )}`,
                      {
                        date: formatCountdownDeadline(
                          flashSaleEndsAtMs,
                          locale
                        ),
                      }
                    )}
                  </p>
                </div>

                <div className="shrink-0">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border-primary/20 bg-background/70 rounded-lg border px-3 py-2 text-center">
                      <div className="text-foreground text-lg font-bold tabular-nums">
                        {countdownHours}
                      </div>
                      <div className="text-muted-foreground text-[10px]">H</div>
                    </div>
                    <div className="border-primary/20 bg-background/70 rounded-lg border px-3 py-2 text-center">
                      <div className="text-foreground text-lg font-bold tabular-nums">
                        {countdownMinutes}
                      </div>
                      <div className="text-muted-foreground text-[10px]">M</div>
                    </div>
                    <div className="border-primary/20 bg-background/70 rounded-lg border px-3 py-2 text-center">
                      <div className="text-foreground text-lg font-bold tabular-nums">
                        {countdownSeconds}
                      </div>
                      <div className="text-muted-foreground text-[10px]">S</div>
                    </div>
                  </div>
                  <p className="text-foreground mt-2 text-center text-xs font-semibold">
                    {tm('flash_sale_countdown', `Ends in ${countdownText}`, {
                      time: countdownText,
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

        {pricing.trust_badges && pricing.trust_badges.length > 0 && (
          <div className="mx-auto mt-8 flex flex-wrap justify-center gap-4 md:gap-6">
            {pricing.trust_badges.map((badge, idx) => (
              <div
                key={idx}
                className="border-primary/20 bg-primary/5 flex items-center gap-2 rounded-lg border px-4 py-3 backdrop-blur-sm"
              >
                {badge.icon && (
                  <SmartIcon
                    name={badge.icon}
                    className="text-primary size-5 shrink-0"
                  />
                )}
                <div className="text-left">
                  <div className="text-sm font-semibold">{badge.title}</div>
                  <div className="text-muted-foreground text-xs">
                    {badge.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="container">
        {pricing.sections && pricing.sections.length > 0 ? (
          pricing.sections.map((section) => renderSection(section))
        ) : (
          <>
            {pricing.groups && pricing.groups.length > 0 && (
              <div className="mx-auto mt-8 mb-16 flex w-full justify-center md:max-w-lg">
                <Tabs value={group} onValueChange={setGroup}>
                  <TabsList>
                    {pricing.groups.map((item, index) => (
                      <TabsTrigger key={index} value={item.name || ''}>
                        {item.title}
                        {item.label && (
                          <Badge className="ml-2">{item.label}</Badge>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {renderPricingGrid({
              items: pricing.items || [],
              activeGroup: group,
            })}
          </>
        )}

        {pricing.usage_examples && pricing.usage_examples.length > 0 && (
          <div className="mx-auto mt-20 max-w-5xl">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              {pricing.usage_examples_title && (
                <h3 className="text-2xl font-semibold tracking-tight">
                  {pricing.usage_examples_title}
                </h3>
              )}
              {pricing.usage_examples_description && (
                <p className="text-muted-foreground mt-3 text-base lg:text-lg">
                  {pricing.usage_examples_description}
                </p>
              )}
            </div>

            <div
              className={cn(
                'grid gap-4',
                getGridColumnsClass(pricing.usage_examples.length)
              )}
            >
              {pricing.usage_examples.map((example, index) => (
                <Card key={`${example.title}-${index}`} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      {example.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-6">
                      {example.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        isLoading={isLoading}
        pricingItem={pricingItem}
        onCheckout={(item, paymentProvider) =>
          handleCheckout(item, paymentProvider)
        }
      />
    </section>
  );
}
