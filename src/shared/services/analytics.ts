import {
  AnalyticsManager,
  ClarityAnalyticsProvider,
  GoogleAnalyticsProvider,
  GoogleTagManagerProvider,
  OpenPanelAnalyticsProvider,
  PlausibleAnalyticsProvider,
  VercelAnalyticsProvider,
} from '@/extensions/analytics';
import type { Configs } from '@/shared/models/config';

/**
 * get analytics manager with configs
 */
export function getAnalyticsManagerWithConfigs(configs: Configs) {
  const analytics = new AnalyticsManager();
  const trackingEnabled = configs.tracking_enabled !== 'false';
  if (!trackingEnabled) {
    return analytics;
  }

  const gtmId = String(
    configs.google_tag_manager_id || configs.gtm_id || ''
  ).trim();
  const googleTagIds = Array.from(
    new Set(
      [configs.google_analytics_id, configs.google_ads_tag_id]
        .map((tagId) => String(tagId || '').trim())
        .filter(Boolean)
    )
  );

  // google tag manager
  if (gtmId) {
    analytics.addProvider(new GoogleTagManagerProvider({ gtmId }));
  }

  // google analytics
  // avoid duplicate pageview/event reporting when GTM is enabled.
  if (googleTagIds.length && !gtmId) {
    analytics.addProvider(
      new GoogleAnalyticsProvider({ tagIds: googleTagIds })
    );
  }

  // clarity
  if (configs.clarity_id) {
    analytics.addProvider(
      new ClarityAnalyticsProvider({ clarityId: configs.clarity_id })
    );
  }

  // plausible
  if (configs.plausible_domain && configs.plausible_src) {
    analytics.addProvider(
      new PlausibleAnalyticsProvider({
        domain: configs.plausible_domain,
        src: configs.plausible_src,
      })
    );
  }

  // openpanel
  if (configs.openpanel_client_id) {
    analytics.addProvider(
      new OpenPanelAnalyticsProvider({
        clientId: configs.openpanel_client_id,
      })
    );
  }

  // vercel analytics
  if (configs.vercel_analytics_enabled === 'true') {
    analytics.addProvider(new VercelAnalyticsProvider({ mode: 'auto' }));
  }

  return analytics;
}

/**
 * global analytics service
 */
let analyticsService: AnalyticsManager | null = null;

/**
 * get analytics service instance
 */
export async function getAnalyticsService(
  configs?: Configs
): Promise<AnalyticsManager> {
  if (!configs) {
    const { getAllConfigs } = await import('@/shared/models/config');
    configs = await getAllConfigs();
  }
  analyticsService = getAnalyticsManagerWithConfigs(configs);

  return analyticsService;
}
