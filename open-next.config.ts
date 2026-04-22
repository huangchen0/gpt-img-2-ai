import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

const config = {
  ...defineCloudflareConfig({
    incrementalCache: r2IncrementalCache,
  }),
  buildCommand:
    'env -u NEXT_PRIVATE_STANDALONE -u NEXT_PRIVATE_OUTPUT_TRACE_ROOT pnpm build',
} satisfies OpenNextConfig;

export default config;
