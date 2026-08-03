// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://theresalevalue.com',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    react(),
    mdx(),
    sitemap({
      // Keep placeholder author pages out of the sitemap until real writer
      // profiles land. /logo-concepts is an internal preview, never indexed.
      filter: (page) =>
        !page.includes('/logo-concepts') &&
        !page.includes('/authors/'),
    }),
  ],
});