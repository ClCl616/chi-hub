import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CHI Toolbox',
    short_name: 'CHI Toolbox',
    description: '모든 것을 한 곳에서. 편리하게.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f2ec',
    theme_color: '#171916',
    lang: 'ko',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
