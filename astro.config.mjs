import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: 'https://atishay.dev',

  // applyBaseStyles:false because we import our own global.css with the
  // @tailwind directives (prevents duplicate base styles).
  integrations: [tailwind({ applyBaseStyles: false })],

  build: {
    inlineStylesheets: 'auto',
  },

  compressHTML: true,
  output: "hybrid",
  adapter: cloudflare()
});