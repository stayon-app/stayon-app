// Curated "Popular Destinations" for the website (mirrors the shape of the app's
// user/src/data/homeContent.ts — kept web-side since the Expo/Next boundary can't
// be imported cleanly). `stays` counts are illustrative browsing hints, not live.
const img = (id: string) => `https://images.unsplash.com/${id}?w=800&h=600&fit=crop`;

export type Destination = {
  city: string;
  country: string;
  tagline: string;
  image: string;
  stays: string;
};

export const POPULAR_DESTINATIONS: Destination[] = [
  { city: 'Los Angeles', country: 'USA', tagline: 'Sunshine & city glamour', image: img('photo-1444723121867-7a241cacace9'), stays: '128' },
  { city: 'Miami', country: 'USA', tagline: 'Beaches & art deco', image: img('photo-1535498730771-e735b998cd64'), stays: '96' },
  { city: 'New York', country: 'USA', tagline: 'The city that never sleeps', image: img('photo-1496442226666-8d4d0e62e6e9'), stays: '142' },
  { city: 'Paris', country: 'France', tagline: 'The city of lights', image: img('photo-1502602898657-3e91760cbb34'), stays: '110' },
  { city: 'Santorini', country: 'Greece', tagline: 'Sunsets & blue domes', image: img('photo-1570077188670-e3a8d69ac5ff'), stays: '64' },
  { city: 'Bali', country: 'Indonesia', tagline: 'Rice terraces & beaches', image: img('photo-1537953773345-d172ccf13cf1'), stays: '88' },
  { city: 'Dubai', country: 'UAE', tagline: 'Skyline & desert', image: img('photo-1512453979798-5ea266f8880c'), stays: '73' },
  { city: 'Tokyo', country: 'Japan', tagline: 'Neon & tradition', image: img('photo-1540959733332-eab4deabeeaf'), stays: '105' },
];
