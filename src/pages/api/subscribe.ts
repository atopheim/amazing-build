import type { APIRoute } from 'astro';
import {
  readEnv,
  createWaitlistRecord,
  countWaitlistRecords,
  findByReferralId,
  findByEmail,
  generateReferralId,
  isValidEmail,
} from '../../lib/airtable';

export const prerender = false;

// In-memory rate limiter: 5 req/min per IP. Resets on cold start — acceptable for serverless.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count += 1;
  return true;
}

function json(status: number, body: unknown, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let payload: { email?: string; ref?: string; botcheck?: string };
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  // Honeypot — bots fill this.
  if (payload.botcheck) {
    return json(200, { ok: true, position: 0, referralId: '' });
  }

  if (!checkRateLimit(getIp(request))) {
    return json(429, { ok: false, error: 'rate_limited' }, { 'Retry-After': '60' });
  }

  const email = (payload.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return json(400, { error: 'invalid_email' });
  }

  const env = readEnv();
  if (!env) {
    // Soft-fail so the form stays usable before Airtable is wired up.
    return json(503, {
      error: 'waitlist_not_configured',
      message: 'Waitlist backend not yet connected. Check back shortly.',
    });
  }

  const ref = (payload.ref ?? '').trim().toLowerCase().slice(0, 16);

  try {
    // Idempotent: return existing record if email already registered.
    const existing = await findByEmail(env, email);
    if (existing) {
      let position = Number(existing.fields.Position ?? 0);
      if (!position) {
        try { position = await countWaitlistRecords(env); } catch { position = 0; }
      }
      return json(200, { ok: true, position, referralId: existing.fields.ReferralId ?? '' });
    }

    // Resolve referrer if ref provided.
    let referredBy = '';
    if (ref) {
      const referrer = await findByReferralId(env, ref);
      if (referrer) referredBy = referrer.id;
    }

    const referralId = generateReferralId();

    const record = await createWaitlistRecord(env, {
      Email: email,
      ReferralId: referralId,
      ReferredBy: referredBy || undefined,
      Source: referredBy ? 'referral' : 'direct',
    });

    // Position: prefer Airtable autonumber if present, else live count.
    let position = Number(record.fields.Position ?? 0);
    if (!position) {
      try {
        position = await countWaitlistRecords(env);
      } catch {
        position = 0;
      }
    }

    return json(200, { ok: true, position, referralId });
  } catch (err) {
    console.error('subscribe error', err);
    return json(500, { error: 'internal' });
  }
};
