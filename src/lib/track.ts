'use client';

import type { VisitEventType } from '@/services/analytics/visit.service';

const VISITOR_KEY = 'tv_visitor';
const SESSION_KEY = 'tv_session';
/** A visit ends after 30 minutes without activity. */
const SESSION_IDLE_MS = 30 * 60 * 1000;

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Anonymous id kept in this browser so repeat visits count as the same person. */
function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

function sessionId() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as { id: string; at: number } | null;
    const id = saved && Date.now() - saved.at < SESSION_IDLE_MS ? saved.id : randomId();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: Date.now() }));
    return id;
  } catch {
    return randomId();
  }
}

/** Where this visit came from: a utm_source tag, or the other site that linked here. */
function source() {
  try {
    const utm = new URLSearchParams(window.location.search).get('utm_source');
    if (utm) return utm.slice(0, 120);
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host && host !== window.location.hostname.replace(/^www\./, '')) return host;
    }
  } catch {
    // Ignore malformed referrers.
  }
  return undefined;
}

/** Sends one anonymous visit event. Never throws and never delays the page. */
export function trackEvent(type: VisitEventType, label?: string) {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      visitorId: visitorId(),
      sessionId: sessionId(),
      type,
      path: window.location.pathname.slice(0, 300),
      label: label?.slice(0, 160),
      source: source(),
    });
    if (navigator.sendBeacon?.('/api/track', body)) return;
    fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => undefined);
  } catch {
    // Tracking is best-effort.
  }
}
