import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

/** Name and icon used when a buyer adds the shop to their phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: env.NEXT_PUBLIC_APP_NAME,
    short_name: env.NEXT_PUBLIC_APP_NAME,
    start_url: '/',
    display: 'standalone',
    background_color: '#021648',
    theme_color: '#021648',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
