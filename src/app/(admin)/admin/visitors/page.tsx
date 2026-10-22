import Link from 'next/link';
import { Eye, Users, MousePointerClick, CreditCard, CheckCircle2, Radio, Globe2, Smartphone, Link2, FileText } from 'lucide-react';
import { RBACService } from '@/services/auth/rbac.service';
import { VisitService, VISIT_EVENT_LABELS, type VisitEventType } from '@/services/analytics/visit.service';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

/** Ghana time, which is what the owner reads the dashboard in. */
const TIME_ZONE = 'Africa/Accra';
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const dayTimeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });

const EVENT_STYLES: Record<VisitEventType, string> = {
  page_view: 'text-stone-400',
  buy_click: 'text-amber-300',
  checkout_submit: 'text-blue-300',
  purchase: 'text-emerald-400',
  newsletter: 'text-purple-300',
  story: 'text-pink-300',
};

function pageName(path: string) {
  if (path === '/') return 'Home';
  if (path === '/products') return 'Shop';
  if (path === '/checkout') return 'Checkout';
  if (path.startsWith('/checkout/success')) return 'Receipt';
  return path;
}

function BreakdownCard({ title, icon: Icon, rows, total }: { title: string; icon: typeof Globe2; rows: Array<{ name: string; count: number }>; total: number }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-white">
        <Icon className="h-4 w-4 text-blue-400" />
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-xs text-stone-500">Nothing yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map((row) => (
            <li key={row.name} className="text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-stone-200">{pageName(row.name)}</span>
                <span className="shrink-0 font-mono text-stone-400">{row.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-800">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${total > 0 ? Math.max(3, (row.count / total) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function AdminVisitorsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await RBACService.requireAdminPage('/admin/visitors');
  const params = await searchParams;
  const days = RANGES.find((r) => String(r.days) === params.days)?.days ?? 7;

  let summary: Awaited<ReturnType<typeof VisitService.getSummary>> | null = null;
  try {
    summary = await VisitService.getSummary(days);
  } catch (err) {
    console.error('Error fetching visitor analytics:', err);
  }

  const maxDaily = Math.max(1, ...(summary?.series.map((d) => d.visitors) ?? [0]));

  const kpis = summary
    ? [
        { label: 'People', value: summary.uniqueVisitors, note: `${summary.sessions} visits`, icon: Users, tone: 'text-white' },
        { label: 'Page views', value: summary.pageViews, note: summary.uniqueVisitors ? `${(summary.pageViews / summary.uniqueVisitors).toFixed(1)} per person` : 'No visits yet', icon: Eye, tone: 'text-blue-400' },
        { label: 'Clicked buy', value: summary.actions.buy_click, note: `${summary.actions.checkout_submit} went to payment`, icon: MousePointerClick, tone: 'text-amber-300' },
        { label: 'Paid', value: summary.actions.purchase, note: summary.uniqueVisitors ? `${((summary.actions.purchase / summary.uniqueVisitors) * 100).toFixed(1)}% of people` : '—', icon: CreditCard, tone: 'text-emerald-400' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Visitors</h1>
          <p className="mt-1 text-xs text-stone-400">
            Who came to the shop and what they did. Visitors are anonymous; your own visits are not counted.
          </p>
        </div>
        <nav className="flex gap-1 rounded-xl border border-stone-800 bg-stone-900/60 p-1" aria-label="Time range">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/admin/visitors?days=${r.days}`}
              aria-current={r.days === days ? 'page' : undefined}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-medium whitespace-nowrap',
                r.days === days ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-white'
              )}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      {!summary ? (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-sm text-red-300">
          Visitor data could not be loaded. Please refresh in a moment.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs text-stone-300">
            <Radio className={cn('h-4 w-4', summary.liveNow > 0 ? 'text-emerald-400 animate-pulse' : 'text-stone-600')} />
            <span>
              <strong className="text-white">{summary.liveNow}</strong> {summary.liveNow === 1 ? 'person' : 'people'} on the site in the last 5 minutes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map(({ label, value, note, icon: Icon, tone }) => (
              <div key={label} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-stone-400">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
                <p className={cn('mt-1 text-2xl font-black', tone)}>{value.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-stone-500">{note}</p>
              </div>
            ))}
          </div>

          {days > 1 && (
            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-white">People per day</h2>
              <div className="mt-4 flex h-36 items-end gap-[2px] sm:gap-1">
                {summary.series.map((d) => (
                  <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${dayFormat.format(new Date(d.date))}: ${d.visitors} people, ${d.views} page views`}>
                    <div
                      className="w-full rounded-t bg-blue-500/80 group-hover:bg-blue-400"
                      style={{ height: `${d.visitors > 0 ? Math.max(4, (d.visitors / maxDaily) * 100) : 1}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-stone-500">
                <span>{dayFormat.format(new Date(summary.series[0].date))}</span>
                <span>Most in a day: {maxDaily}</span>
                <span>{dayFormat.format(new Date(summary.series[summary.series.length - 1].date))}</span>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BreakdownCard title="Top pages" icon={FileText} rows={summary.topPages} total={summary.pageViews} />
            <BreakdownCard title="Came from" icon={Link2} rows={summary.sources} total={summary.uniqueVisitors} />
            <BreakdownCard title="Countries" icon={Globe2} rows={summary.countries} total={summary.uniqueVisitors} />
            <BreakdownCard title="Devices" icon={Smartphone} rows={summary.devices} total={summary.uniqueVisitors} />
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 sm:p-5">
            <h2 className="text-sm font-bold text-white">Recent visitors</h2>
            <p className="mt-0.5 text-xs text-stone-400">Newest activity first. Tap a visitor to see everything they did.</p>

            {summary.recentVisitors.length === 0 ? (
              <p className="mt-6 text-center text-xs text-stone-500">No visitors in this period yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-stone-800/70">
                {summary.recentVisitors.map((v) => {
                  const bought = v.events.some((e) => e.type === 'purchase');
                  const actionCount = v.events.filter((e) => e.type !== 'page_view').length;
                  const place = [v.city, v.country].filter(Boolean).join(', ') || 'Unknown place';
                  return (
                    <li key={v.visitorId}>
                      <details className="group py-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-semibold text-white">
                              Visitor {v.visitorId.slice(0, 6)}
                              {bought && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-label="Paid" />}
                            </p>
                            <p className="truncate text-[11px] text-stone-400">
                              {place} · {v.device || 'Unknown device'}
                              {v.browser ? ` · ${v.browser}` : ''} · from {v.source || 'Direct'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-[11px]">
                            <p className="text-stone-300">{dayTimeFormat.format(new Date(v.lastSeen))}</p>
                            <p className="text-stone-500">
                              {v.events.length - actionCount} {v.events.length - actionCount === 1 ? 'view' : 'views'}
                              {actionCount > 0 ? ` · ${actionCount} ${actionCount === 1 ? 'action' : 'actions'}` : ''}
                            </p>
                          </div>
                        </summary>
                        <ol className="mt-3 space-y-1.5 border-l border-stone-800 pl-4">
                          {v.events.map((e) => (
                            <li key={e.id} className="flex gap-3 text-xs">
                              <span className="w-11 shrink-0 font-mono text-stone-500">{timeFormat.format(new Date(e.at))}</span>
                              <span className={cn('min-w-0 break-words', EVENT_STYLES[e.type] ?? 'text-stone-400')}>
                                {VISIT_EVENT_LABELS[e.type] ?? e.type}{' '}
                                <span className="text-stone-300">{e.type === 'page_view' ? pageName(e.path) : e.label || pageName(e.path)}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
            {summary.truncated && (
              <p className="mt-3 text-[11px] text-stone-500">Very busy period: figures use the latest 20,000 events.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
