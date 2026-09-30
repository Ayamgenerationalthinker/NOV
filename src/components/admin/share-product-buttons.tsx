'use client';

import * as React from 'react';
import { Copy, Check, MessageCircle, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { productUrl } from '@/lib/product-url';

export function whatsAppShareUrl(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older mobile browsers / non-secure contexts (e.g. http://192.168.x.x in dev)
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

interface ShareProductButtonsProps {
  slug: string;
  title: string;
  /** Show the link text above the buttons. */
  showUrl?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  /** Extra buttons shown in the same row (e.g. Edit / Unpublish in the product list). */
  extra?: React.ReactNode;
}

export function ShareProductButtons({ slug, title, showUrl = false, size = 'sm', className, extra }: ShareProductButtonsProps) {
  const url = productUrl(slug);
  const [copied, setCopied] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  React.useEffect(() => {
    // navigator is only available after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const onCopy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const btn = cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
  );

  return (
    <div className={cn('space-y-2', className)}>
      {showUrl && (
        <div className="break-all rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 font-mono text-xs text-stone-300">{url}</div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCopy} className={cn(btn, 'border border-stone-700 bg-stone-800 text-stone-100 hover:bg-stone-700')}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <a
          href={whatsAppShareUrl(title, url)}
          target="_blank"
          rel="noreferrer"
          className={cn(btn, 'bg-[#25D366] text-black hover:bg-[#1ebe5a]')}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Share on WhatsApp
        </a>
        {canNativeShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title, url }).catch(() => undefined)}
            aria-label="Share"
            title="Share"
            className={cn(btn, 'border border-stone-700 text-stone-200 hover:bg-stone-800')}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}
        {extra}
      </div>
    </div>
  );
}
