import type { APIRoute } from 'astro';
import { readEnv, countWaitlistRecords } from '../../lib/airtable';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}

export const GET: APIRoute = async () => {
  const env = readEnv();
  if (!env) {
    return json(200, {
      ok: true,
      subscribers: 0,
      configured: false,
    });
  }

  try {
    const subscribers = await countWaitlistRecords(env);
    return json(200, {
      ok: true,
      subscribers,
      configured: true,
    });
  } catch (err) {
    console.error('source error', err);
    return json(500, { error: 'internal' });
  }
};
