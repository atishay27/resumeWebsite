import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://atishay.dev',
  // 'hybrid' = every page is prerendered to static HTML by default; only routes
  // that opt out (export const prerender = false) run server-side. Here that's just
  // the /api/send endpoint, which deploys as part of the Cloudflare Worker.
  output: 'hybrid',
  adapter: cloudflare({
    // Emulate Cloudflare bindings/secrets locally from a .dev.vars file so the
    // endpoint can read RESEND_API_KEY etc. during `astro dev`.
    platformProxy: { enabled: true },
  }),
  // applyBaseStyles:false because we import our own global.css with the
  // @tailwind directives (prevents duplicate base styles).
  integrations: [tailwind({ applyBaseStyles: false })],
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
