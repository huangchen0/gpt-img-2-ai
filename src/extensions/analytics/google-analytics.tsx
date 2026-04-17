import { ReactNode } from 'react';
import Script from 'next/script';

import { AnalyticsConfigs, AnalyticsProvider } from '.';

/**
 * Google analytics configs
 * @docs https://marketingplatform.google.com/about/analytics/
 */
export interface GoogleAnalyticsConfigs extends AnalyticsConfigs {
  tagIds: string[]; // google tag ids, e.g. GA4 or Google Ads AW ids
}

/**
 * Google analytics provider
 * @website https://marketingplatform.google.com/about/analytics/
 */
export class GoogleAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'google-analytics';

  configs: GoogleAnalyticsConfigs;

  constructor(configs: GoogleAnalyticsConfigs) {
    this.configs = configs;
  }

  getHeadScripts(): ReactNode {
    const tagIds = Array.from(
      new Set(this.configs.tagIds.map((tagId) => tagId.trim()).filter(Boolean))
    );

    if (!tagIds.length) {
      return null;
    }

    return (
      <>
        {/* Google tag (gtag.js) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${tagIds[0]}`}
          strategy="afterInteractive"
          async
        />
        <Script
          id={this.name}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${tagIds.map((tagId) => `gtag('config', '${tagId}');`).join('\n')}
            `,
          }}
        />
      </>
    );
  }
}
