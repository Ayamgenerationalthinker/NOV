/**
 * Postgres connection strings from hosted providers (Supabase, Neon, Vercel) end in
 * `sslmode=require`. The `pg` driver treats that as "verify the full certificate chain", which
 * fails against Supabase's own certificate authority ("self-signed certificate in certificate
 * chain"). `uselibpqcompat=true` gives `sslmode` its standard Postgres meaning: `require`
 * encrypts the connection without that check. Stricter modes (verify-ca, verify-full) keep
 * verifying as before.
 */
export function pgConnectionString(url: string): string {
  if (!/[?&]sslmode=/i.test(url) || /[?&]uselibpqcompat=/i.test(url)) return url;
  return `${url}&uselibpqcompat=true`;
}

/** Env values pasted into dashboards often carry stray spaces or quotes: ignore them. */
export function cleanEnvValue(value: string | undefined): string {
  return (value ?? '').trim().replace(/^(['"])(.*)\1$/, '$2');
}
