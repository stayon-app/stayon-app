// Real place photos via Wikipedia's REST summary endpoint (keyless, CORS-ok).
// Shows the fallback instantly, then swaps in the real image once fetched.
import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const cache = new Map<string, string>();

export function WikiImage({ title, fallback, style }: { title?: string; fallback: string; style?: StyleProp<ImageStyle> }) {
  const [uri, setUri] = useState(fallback);
  useEffect(() => {
    setUri(fallback);
    if (!title) return;
    if (cache.has(title)) { setUri(cache.get(title)!); return; }
    let alive = true;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d && (d.originalimage?.source || d.thumbnail?.source);
        if (u) { cache.set(title, u); if (alive) setUri(u); }
      })
      .catch(() => { /* keep fallback */ });
    return () => { alive = false; };
  }, [title, fallback]);
  return <Image source={{ uri }} style={style} resizeMode="cover" />;
}
