import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SeoProps {
  title: string;
  description: string;
  canonicalPath?: string;
  imagePath?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>[];
}

function ensureMeta(attr: 'name' | 'property', key: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

function absolute(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function cleanCanonical(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

export default function Seo({
  title,
  description,
  canonicalPath,
  imagePath = '/logo.png',
  noIndex = false,
  type = 'website',
  jsonLd = [],
}: SeoProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonical = cleanCanonical(canonicalPath ?? pathname);
    const url = absolute(canonical);
    const image = absolute(imagePath);

    document.title = title;
    ensureMeta('name', 'description').setAttribute('content', description);
    ensureMeta('name', 'robots').setAttribute(
      'content',
      noIndex ? 'noindex, nofollow' : 'index, follow',
    );

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;

    ensureMeta('property', 'og:type').setAttribute('content', type);
    ensureMeta('property', 'og:url').setAttribute('content', url);
    ensureMeta('property', 'og:title').setAttribute('content', title);
    ensureMeta('property', 'og:description').setAttribute('content', description);
    ensureMeta('property', 'og:image').setAttribute('content', image);
    ensureMeta('property', 'og:image:alt').setAttribute('content', title);

    ensureMeta('name', 'twitter:title').setAttribute('content', title);
    ensureMeta('name', 'twitter:description').setAttribute('content', description);
    ensureMeta('name', 'twitter:image').setAttribute('content', image);

    document.querySelectorAll('script[data-jsonld]').forEach((s) => s.remove());
    jsonLd.forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-jsonld', 'true');
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });
  }, [title, description, canonicalPath, imagePath, noIndex, type, pathname, jsonLd]);

  return null;
}
