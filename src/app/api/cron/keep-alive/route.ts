import { NextRequest, NextResponse } from 'next/server';
import { supabaseStorageConfig } from '@/services/storage/supabase.storage';

export const dynamic = 'force-dynamic';

/**
 * Daily keep-alive (see "crons" in vercel.json). Free Supabase projects pause after about a week
 * without activity, and a paused project takes every product cover offline. One tiny read of the
 * bucket each day keeps the project awake. Read-only, and returns nothing sensitive.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = supabaseStorageConfig();
  if (!config) return NextResponse.json({ storage: 'not supabase' });

  try {
    const res = await fetch(`${config.url}/storage/v1/object/list/${config.bucket}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.serviceKey}`,
        apikey: config.serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix: 'media', limit: 1 }),
      cache: 'no-store',
    });
    return NextResponse.json({ storage: res.ok ? 'awake' : `answered ${res.status}` }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ storage: 'unreachable' }, { status: 502 });
  }
}
