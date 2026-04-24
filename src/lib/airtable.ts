/**
 * Minimal server-side Airtable client.
 * All calls go through a Vercel serverless endpoint — the token never reaches the browser.
 */

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export interface AirtableEnv {
  token: string;
  baseId: string;
  tableName: string;
}

export function readEnv(): AirtableEnv | null {
  const token = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;
  if (!token || !baseId || !tableName) return null;
  return { token, baseId, tableName };
}

function tableUrl(env: AirtableEnv, query?: Record<string, string>) {
  const url = new URL(`${AIRTABLE_API_BASE}/${env.baseId}/${encodeURIComponent(env.tableName)}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }
  return url.toString();
}

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface WaitlistFields {
  Email: string;
  Position?: number;
  ReferralId?: string;
  ReferredBy?: string;
  CreatedAt?: string;
  Source?: 'direct' | 'referral';
}

export async function createWaitlistRecord(
  env: AirtableEnv,
  fields: WaitlistFields
): Promise<AirtableRecord<WaitlistFields>> {
  const res = await fetch(tableUrl(env), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`airtable create failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { records: AirtableRecord<WaitlistFields>[] };
  return data.records[0];
}

export async function countWaitlistRecords(env: AirtableEnv): Promise<number> {
  // Airtable has no count endpoint — page through records, IDs only.
  let count = 0;
  let offset: string | undefined;
  do {
    const url: Record<string, string> = { pageSize: '100', 'fields[]': 'Email' };
    if (offset) url.offset = offset;
    const res = await fetch(tableUrl(env, url), {
      headers: { Authorization: `Bearer ${env.token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`airtable count failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as {
      records: AirtableRecord[];
      offset?: string;
    };
    count += data.records.length;
    offset = data.offset;
  } while (offset);
  return count;
}

export async function findByEmail(
  env: AirtableEnv,
  email: string
): Promise<AirtableRecord<WaitlistFields> | null> {
  const escaped = email.replace(/"/g, '\\"');
  const formula = `{Email} = "${escaped}"`;
  const res = await fetch(
    tableUrl(env, { filterByFormula: formula, maxRecords: '1' }),
    { headers: { Authorization: `Bearer ${env.token}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { records: AirtableRecord<WaitlistFields>[] };
  return data.records[0] ?? null;
}

export async function findByReferralId(
  env: AirtableEnv,
  refId: string
): Promise<AirtableRecord<WaitlistFields> | null> {
  const escaped = refId.replace(/"/g, '\\"');
  const formula = `{ReferralId} = "${escaped}"`;
  const res = await fetch(
    tableUrl(env, {
      filterByFormula: formula,
      maxRecords: '1',
    }),
    { headers: { Authorization: `Bearer ${env.token}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { records: AirtableRecord<WaitlistFields>[] };
  return data.records[0] ?? null;
}

const REF_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function generateReferralId(length = 7): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}
