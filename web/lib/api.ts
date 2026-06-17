// Server-side client for the shared StayOn backend. These run in Next.js
// Server Components, so we read the secret-free public API directly.
import type { Listing, SearchResponse, SearchParams } from './types';

export const API_BASE = process.env.API_BASE || 'http://localhost:4000/v1';

/** Browse / search published stays. No params → returns everything published. */
export async function searchStays(params: SearchParams = {}): Promise<SearchResponse> {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][],
  ).toString();
  const url = `${API_BASE}/search${qs ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { results: [], total: 0 };
    return (await res.json()) as SearchResponse;
  } catch {
    // Backend offline — fail soft so the page still renders.
    return { results: [], total: 0 };
  }
}

/** Fetch a single stay by id (public detail). Returns null if not found/offline. */
export async function getStay(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${API_BASE}/listings/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json && json.id ? (json as Listing) : null;
  } catch {
    return null;
  }
}

/** Prices are authored in USD on the backend. */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
