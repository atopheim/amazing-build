import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const builds = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/builds' }),
  schema: z.object({
    title: z.string(),
    builder: z.string(),
    builderUrl: z.string().url().optional(),
    url: z.string().url(),
    screenshot: z.string(),
    edition: z.number(),
    tags: z.array(z.string()).default([]),
    editorial: z.string(),
    date: z.coerce.date(),
  }),
});

const editions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/editions' }),
  schema: z.object({
    number: z.number(),
    title: z.string(),
    date: z.coerce.date(),
    intro: z.string(),
  }),
});

export const collections = { builds, editions };
