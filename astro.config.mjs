// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { blogLastmod } from './src/data/blog-lastmod.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.theresalevalue.com',
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
      // Per-page lastmod: blogs carry their real revision date from the
      // blog-lastmod registry; everything else falls back to build date.
      serialize(item) {
        const buildDate = new Date().toISOString().split('T')[0];
        const path = new URL(item.url).pathname;
        item.lastmod = blogLastmod[path] ?? buildDate;
        return item;
      },
    }),
  ],
});