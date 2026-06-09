// StayOn — Wishlist seed data & types
// Persisted to AsyncStorage under STORAGE_KEY. Locations are US/UK/EU only, prices in USD.

export interface WishlistStay {
  id: string;
  title: string;
  location: string;
  price: number; // USD per night
  rating: number;
  image: string; // Unsplash URL
}

export interface WishlistCollection {
  id: string;
  name: string;
  stays: WishlistStay[];
}

export const WISHLISTS_STORAGE_KEY = '@stayon_wishlists';

export const SEED_WISHLISTS: WishlistCollection[] = [
  {
    id: 'wl_summer_2026',
    name: 'Summer 2026',
    stays: [
      {
        id: 's_amalfi',
        title: 'Amalfi Coast Cliff Suite',
        location: 'Positano, Italy',
        price: 380,
        rating: 4.98,
        image: 'https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=600&h=600&fit=crop',
      },
      {
        id: 's_santorini',
        title: 'Santorini Whitewashed Villa',
        location: 'Oia, Greece',
        price: 520,
        rating: 4.99,
        image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&h=600&fit=crop',
      },
      {
        id: 's_malibu',
        title: 'Malibu Beachfront Retreat',
        location: 'Malibu, CA, USA',
        price: 495,
        rating: 4.97,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=600&fit=crop',
      },
      {
        id: 's_ibiza',
        title: 'Ibiza Sunset Finca',
        location: 'Ibiza, Spain',
        price: 410,
        rating: 4.94,
        image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&h=600&fit=crop',
      },
    ],
  },
  {
    id: 'wl_dream_pools',
    name: 'Dream Pools',
    stays: [
      {
        id: 's_hollywood',
        title: 'Hollywood Hills Infinity Villa',
        location: 'Los Angeles, CA, USA',
        price: 620,
        rating: 4.95,
        image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=600&fit=crop',
      },
      {
        id: 's_provence',
        title: 'Provence Stone Mas with Pool',
        location: 'Provence, France',
        price: 340,
        rating: 4.96,
        image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=600&fit=crop',
      },
      {
        id: 's_scottsdale',
        title: 'Scottsdale Desert Modern',
        location: 'Scottsdale, AZ, USA',
        price: 290,
        rating: 4.91,
        image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=600&fit=crop',
      },
    ],
  },
  {
    id: 'wl_nyc_trip',
    name: 'NYC Trip',
    stays: [
      {
        id: 's_brooklyn',
        title: 'Brooklyn Brownstone Loft',
        location: 'Brooklyn, NY, USA',
        price: 235,
        rating: 4.86,
        image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=600&h=600&fit=crop',
      },
      {
        id: 's_soho',
        title: 'SoHo Industrial Penthouse',
        location: 'Manhattan, NY, USA',
        price: 540,
        rating: 4.93,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=600&fit=crop',
      },
    ],
  },
];
