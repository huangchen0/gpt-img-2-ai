import { ReactNode } from 'react';
import Script from 'next/script';

import { AnalyticsConfigs, AnalyticsProvider } from '.';

/**
 * Google Tag Manager configs
 * @docs https://tagmanager.google.com/
 */
export interface GoogleTagManagerConfigs extends AnalyticsConfigs {
  gtmId: string; // GTM container ID
}

/**
 * Google Tag Manager provider
 * @website https://tagmanager.google.com/
 */
export class GoogleTagManagerProvider implements AnalyticsProvider {
  readonly name = 'google-tag-manager';

  configs: GoogleTagManagerConfigs;

  constructor(configs: GoogleTagManagerConfigs) {
    this.configs = configs;
  }

  getHeadScripts(): ReactNode {
    return (
      <Script
        id={this.name}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${this.configs.gtmId}');
          `,
        }}
      />
    );
  }

  getBodyScripts(): ReactNode {
    return (
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${this.configs.gtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    );
  }
}
