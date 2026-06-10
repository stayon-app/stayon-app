// Feature flags — the Ops team toggles product features live (Ops portal →
// Feature flags). The apps read them here and gate features. Flags default to
// ON so a slow/offline load never hides a working feature.

import { Api } from '../api';

let flags: Record<string, boolean> = {};
let loaded = false;
const listeners = new Set<() => void>();

export async function loadFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const r: any = await Api.featureFlags();
    flags = r?.flags || {};
    loaded = true;
    listeners.forEach((l) => l());
  } catch { /* keep defaults */ }
  return flags;
}

/** Is a feature on? Unknown/not-yet-loaded keys default to `true`. */
export function isFeatureEnabled(key: string, fallback = true): boolean {
  if (!loaded) return fallback;
  return key in flags ? flags[key] : fallback;
}

export function onFlagsChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
