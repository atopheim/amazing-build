import type { APIRoute } from 'astro';
export const prerender = false;
export const GET: APIRoute = async () => {
  const token = process.env.AIRTABLE_API_KEY ?? '(unset)';
  const baseId = process.env.AIRTABLE_BASE_ID ?? '(unset)';
  const tableName = process.env.AIRTABLE_TABLE_NAME ?? '(unset)';
  return new Response(JSON.stringify({
    hasToken: token !== '(unset)',
    tokenPrefix: token.slice(0, 8),
    baseId,
    tableName,
  }), { headers: { 'Content-Type': 'application/json' } });
};
