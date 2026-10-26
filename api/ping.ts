import type { VercelRequest, VercelResponse } from '@vercel/node';

// Keep-alive for cron-job.org. Supabase's free tier pauses a project after ~7 days with no
// DATABASE activity — a ping that only returns "ok" (the old version) keeps Vercel warm but not
// Supabase. So this does one tiny real read (1 approved cafe id) through the public REST API.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ status: "error", error: "Supabase env vars missing" });

  try {
    const r = await fetch(`${url}/rest/v1/cafes?select=id&is_approved=eq.true&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(r.ok ? 200 : 502).json({ status: r.ok ? "ok" : "error", db: r.status, time: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ status: "error", error: String(e) });
  }
}
