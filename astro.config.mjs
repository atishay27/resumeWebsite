import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://atishay-resume.pages.dev',
  // applyBaseStyles:false because we import our own global.css with the
  // @tailwind directives (prevents duplicate base styles).
  integrations: [tailwind({ applyBaseStyles: false })],
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
