import { prisma } from '@/lib/prisma';

export const VISIT_EVENT_TYPES = ['page_view', 'buy_click', 'checkout_submit', 'purchase', 'newsletter', 'story'] as const;
export type VisitEventType = (typeof VISIT_EVENT_TYPES)[number];

/** How each event reads in the owner's activity feed. */
export const VISIT_EVENT_LABELS: Record<VisitEventType, string> = {
  page_view: 'Viewed',
  buy_click: 'Clicked buy',
  checkout_submit: 'Went to payment',
  purchase: 'Paid',
  newsletter: 'Joined the newsletter',
  story: 'Shared a testimony',
};

export interface RecordVisitParams {
  visitorId: string;
  sessionId: string;
  type: VisitEventType;
  path: string;
  label?: string;
  source?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
}

/** Events older than this are cleared out now and then so the table stays small. */
const KEEP_DAYS = 180;

const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|vercel-screenshot/i;

export function isBot(userAgent: string) {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/** A rough device and browser name from the user agent, enough for the owner's breakdown. */
export function describeUserAgent(userAgent: string) {
  const device = /ipad|tablet/i.test(userAgent) ? 'Tablet' : /mobi|android|iphone/i.test(userAgent) ? 'Phone' : 'Computer';
  const browser = /edg\//i.test(userAgent)
    ? 'Edge'
    : /opr\/|opera/i.test(userAgent)
      ? 'Opera'
      : /samsungbrowser/i.test(userAgent)
        ? 'Samsung Internet'
        : /chrome|crios/i.test(userAgent)
          ? 'Chrome'
          : /firefox|fxios/i.test(userAgent)
            ? 'Firefox'
            : /safari/i.test(userAgent)
              ? 'Safari'
              : 'Other';
  return { device, browser };
}

export interface VisitorActivity {
  visitorId: string;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  source: string | null;
  firstSeen: string;
  lastSeen: string;
  events: Array<{ id: string; type: VisitEventType; path: string; label: string | null; at: string }>;
}

function countBy<T>(rows: T[], key: (row: T) => string | null | undefined, limit = 8) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row) || 'Unknown';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export class VisitService {
  static async record(params: RecordVisitParams) {
    await prisma.visitEvent.create({ data: params });

    // About once in 200 writes, drop old events. Cheap thanks to the createdAt index.
    if (Math.random() < 0.005) {
      const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000);
      await prisma.visitEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => undefined);
    }
  }

  /** Everything the owner's Visitors page shows for the last `days` days (1 = today so far). */
  static async getSummary(days: number) {
    const now = new Date();
    const since = new Date(now);
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [events, liveNow, daily] = await Promise.all([
      prisma.visitEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20_000,
        select: {
          id: true,
          visitorId: true,
          sessionId: true,
          type: true,
          path: true,
          label: true,
          source: true,
          country: true,
          city: true,
          device: true,
          browser: true,
          createdAt: true,
        },
      }),
      prisma.visitEvent.findMany({
        where: { createdAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) } },
        distinct: ['visitorId'],
        select: { visitorId: true },
      }),
      prisma.$queryRaw<Array<{ day: Date; visitors: bigint; views: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day,
               COUNT(DISTINCT "visitorId") AS visitors,
               COUNT(*) FILTER (WHERE "type" = 'page_view') AS views
        FROM "VisitEvent"
        WHERE "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1`,
    ]);

    // One entry per day in the range, including days nobody came.
    const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
    const series = Array.from({ length: days }, (_, i) => {
      const date = new Date(since);
      date.setUTCDate(since.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      const row = byDay.get(key);
      return { date: key, visitors: Number(row?.visitors ?? 0), views: Number(row?.views ?? 0) };
    });

    const pageViews = events.filter((e) => e.type === 'page_view');
    const actions = Object.fromEntries(VISIT_EVENT_TYPES.map((t) => [t, 0])) as Record<VisitEventType, number>;
    for (const e of events) {
      if (e.type in actions) actions[e.type as VisitEventType] += 1;
    }

    // The first event of each visitor (oldest) carries where they came from and their device.
    const visitors = new Map<string, VisitorActivity>();
    for (const e of [...events].reverse()) {
      let v = visitors.get(e.visitorId);
      if (!v) {
        v = {
          visitorId: e.visitorId,
          country: e.country,
          city: e.city,
          device: e.device,
          browser: e.browser,
          source: e.source,
          firstSeen: e.createdAt.toISOString(),
          lastSeen: e.createdAt.toISOString(),
          events: [],
        };
        visitors.set(e.visitorId, v);
      }
      v.lastSeen = e.createdAt.toISOString();
      v.events.push({ id: e.id, type: e.type as VisitEventType, path: e.path, label: e.label, at: e.createdAt.toISOString() });
    }
    const visitorList = [...visitors.values()];

    const recentVisitors = visitorList
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 40)
      .map((v) => ({ ...v, events: v.events.slice(-30).reverse() }));

    return {
      days,
      uniqueVisitors: visitors.size,
      sessions: new Set(events.map((e) => e.sessionId)).size,
      pageViews: pageViews.length,
      liveNow: liveNow.length,
      actions,
      series,
      topPages: countBy(pageViews, (e) => e.path),
      sources: countBy(visitorList, (v) => v.source || 'Direct'),
      countries: countBy(visitorList, (v) => v.country),
      devices: countBy(visitorList, (v) => v.device),
      recentVisitors,
      truncated: events.length >= 20_000,
    };
  }
}
