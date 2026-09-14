// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { blogLastmod } from './src/data/blog-lastmod.ts';
import { rawArticles } from './src/data/blogs.ts';

const queuedBlogPaths = new Set(
  rawArticles.filter((a) => a.queued).map((a) => `/blogs/${a.slug}/`)
);

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
      // Real author profiles (currently only Vaishnav Mishra) stay in.
      filter: (page) => {
        if (page.includes('/logo-concepts')) return false;
        if (page.includes('/authors/')) {
          return page.includes('/authors/vaishnav-mishra');
        }
        // Hide queued blog URLs from the sitemap until the publish routine
        // unqueues them.
        const path = new URL(page).pathname;
        if (queuedBlogPaths.has(path)) return false;
        return true;
      },
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