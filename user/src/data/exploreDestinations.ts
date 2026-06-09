// Curated destinations for the Explore → Destinations tab. Each card shows a
// hero photo, a one-line "why go", the best season to visit, and how many stays
// StayOn has there. Tapping opens the destination page (its stays + things to do).

export interface ExploreDestination {
  id: string;
  city: string;
  country: string;
  image: string;
  why: string;          // one-line hook
  bestSeason: string;   // e.g. "Apr–Jun"
  stays: number;        // live stay count
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

export const EXPLORE_DESTINATIONS: ExploreDestination[] = [
  { id: 'dest1', city: 'Los Angeles', country: 'USA', image: img('photo-1444723121867-7a241cacace9'), why: 'Sunshine & city glamour', bestSeason: 'Mar–Jun', stays: 128 },
  { id: 'dest2', city: 'Miami', country: 'USA', image: img('photo-1535498730771-e735b998cd64'), why: 'Beaches & art deco', bestSeason: 'Nov–Apr', stays: 96 },
  { id: 'dest3', city: 'London', country: 'UK', image: img('photo-1513635269975-59663e0ac1ad'), why: 'Timeless & elegant', bestSeason: 'May–Sep', stays: 142 },
  { id: 'dest4', city: 'Paris', country: 'France', image: img('photo-1502602898657-3e91760cbb34'), why: 'The city of lights', bestSeason: 'Apr–Jun', stays: 110 },
  { id: 'dest5', city: 'Santorini', country: 'Greece', image: img('photo-1570077188670-e3a8d69ac5ff'), why: 'Stunning sunsets & blue domes', bestSeason: 'May–Oct', stays: 64 },
  { id: 'dest6', city: 'New York', country: 'USA', image: img('photo-1496442226666-8d4d0e62e6e9'), why: 'The city that never sleeps', bestSeason: 'Sep–Nov', stays: 173 },
  { id: 'dest7', city: 'San Francisco', country: 'USA', image: img('photo-1501594907352-04cda38ebc29'), why: 'Bay views & cable cars', bestSeason: 'Sep–Nov', stays: 88 },
  { id: 'dest8', city: 'Barcelona', country: 'Spain', image: img('photo-1562883676-8c7feb83f09b'), why: 'Art, culture & beaches', bestSeason: 'May–Jul', stays: 102 },
  { id: 'dest9', city: 'Rome', country: 'Italy', image: img('photo-1552832230-c0197dd311b5'), why: 'Ancient history & charm', bestSeason: 'Apr–Jun', stays: 119 },
  { id: 'dest10', city: 'Vancouver', country: 'Canada', image: img('photo-1559511260-66a654ae982a'), why: 'Mountains meet the sea', bestSeason: 'Jun–Sep', stays: 71 },
  { id: 'dest11', city: 'Goa', country: 'India', image: img('photo-1512343879784-a960bf40e7f2'), why: 'Golden beaches & nightlife', bestSeason: 'Nov–Feb', stays: 84 },
  { id: 'dest12', city: 'Dubai', country: 'UAE', image: img('photo-1512453979798-5ea266f8880c'), why: 'Skyline luxury & desert', bestSeason: 'Nov–Mar', stays: 95 },
];
