// Curated, tagged stay dataset that powers StayBot's recommendations.
// USD only, USA/UK/Europe only. Each stay carries vibe + amenity tags so the
// bot can match a user's free-text request to real, bookable listings.

export interface BotStay {
  id: string;
  title: string;
  city: string;
  country: string;
  location: string;       // "City, Country/State"
  price: number;          // USD / night
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  type: string;           // Villa, Apartment, Cabin, Loft...
  maxGuests: number;
  beds: number;
  baths: number;
  vibes: string[];        // romantic, beach, city, mountain, luxury, budget, family, pet, wellness, adventure, ski, lake, nature, work
  amenities: string[];    // pool, wifi, kitchen, parking, hottub, gym, beachfront, ac, fireplace, pet, workspace, ev
  latitude: number;
  longitude: number;
  instantBook: boolean;
  hostListingId?: string; // set for REAL backend stays → opens the real detail page
  city_?: string;         // raw city (real stays)
}

// High-res for Retina (≈3× display). 1600px @ q80 — crisp on Apple screens.
const img = (id: string) => `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

export const BOT_STAYS: BotStay[] = [
  {
    id: 'bs1', title: 'Malibu Beachfront Villa', city: 'Malibu', country: 'CA, USA', location: 'Malibu, CA',
    price: 420, rating: 4.96, reviews: 184, image: img('photo-1499793983690-e29da59ef1c2'),
    images: [img('photo-1499793983690-e29da59ef1c2'), img('photo-1613490493576-7fde63acd811')],
    type: 'Villa', maxGuests: 6, beds: 3, baths: 3,
    vibes: ['beach', 'luxury', 'romantic'], amenities: ['pool', 'wifi', 'beachfront', 'ac', 'parking', 'kitchen'],
    latitude: 34.0259, longitude: -118.7798, instantBook: true,
  },
  {
    id: 'bs2', title: 'Manhattan Skyline Loft', city: 'New York', country: 'NY, USA', location: 'New York, NY',
    price: 350, rating: 4.92, reviews: 312, image: img('photo-1502672260266-1c1ef2d93688'),
    images: [img('photo-1502672260266-1c1ef2d93688'), img('photo-1545324418-cc1a3fa10c00')],
    type: 'Loft', maxGuests: 4, beds: 2, baths: 2,
    vibes: ['city', 'luxury', 'work'], amenities: ['wifi', 'kitchen', 'ac', 'gym', 'workspace'],
    latitude: 40.7484, longitude: -73.9857, instantBook: true,
  },
  {
    id: 'bs3', title: 'Aspen Alpine Chalet', city: 'Aspen', country: 'CO, USA', location: 'Aspen, CO',
    price: 540, rating: 4.98, reviews: 96, image: img('photo-1449158743715-0a90ebb6d2d8'),
    images: [img('photo-1449158743715-0a90ebb6d2d8'), img('photo-1517320964276-a002fa203177')],
    type: 'Chalet', maxGuests: 8, beds: 4, baths: 3,
    vibes: ['mountain', 'ski', 'luxury', 'family'], amenities: ['hottub', 'wifi', 'fireplace', 'parking', 'kitchen'],
    latitude: 39.1911, longitude: -106.8175, instantBook: false,
  },
  {
    id: 'bs4', title: 'Lake Tahoe Pinewood Cabin', city: 'Lake Tahoe', country: 'CA, USA', location: 'Lake Tahoe, CA',
    price: 185, rating: 4.89, reviews: 142, image: img('photo-1542718610-a1d656d1884c'),
    images: [img('photo-1542718610-a1d656d1884c'), img('photo-1518780664697-55e3ad937233')],
    type: 'Cabin', maxGuests: 6, beds: 3, baths: 2,
    vibes: ['lake', 'nature', 'family', 'adventure'], amenities: ['fireplace', 'wifi', 'parking', 'kitchen', 'pet'],
    latitude: 39.0968, longitude: -120.0324, instantBook: true,
  },
  {
    id: 'bs5', title: 'Miami South Beach Suite', city: 'Miami', country: 'FL, USA', location: 'Miami, FL',
    price: 240, rating: 4.85, reviews: 268, image: img('photo-1520250497591-112f2f40a3f4'),
    images: [img('photo-1520250497591-112f2f40a3f4'), img('photo-1566073771259-6a8506099945')],
    type: 'Apartment', maxGuests: 4, beds: 2, baths: 2,
    vibes: ['beach', 'city', 'romantic'], amenities: ['pool', 'wifi', 'ac', 'gym', 'beachfront'],
    latitude: 25.7826, longitude: -80.1340, instantBook: true,
  },
  {
    id: 'bs6', title: 'Austin Hill Country Bungalow', city: 'Austin', country: 'TX, USA', location: 'Austin, TX',
    price: 95, rating: 4.87, reviews: 203, image: img('photo-1568605114967-8130f3a36994'),
    images: [img('photo-1568605114967-8130f3a36994'), img('photo-1505691938895-1758d7feb511')],
    type: 'Bungalow', maxGuests: 4, beds: 2, baths: 1,
    vibes: ['budget', 'city', 'pet'], amenities: ['wifi', 'kitchen', 'parking', 'pet', 'workspace'],
    latitude: 30.2672, longitude: -97.7431, instantBook: true,
  },
  {
    id: 'bs7', title: 'San Diego Coastal Studio', city: 'San Diego', country: 'CA, USA', location: 'San Diego, CA',
    price: 88, rating: 4.83, reviews: 176, image: img('photo-1502005229762-cf1b2da7c5d6'),
    images: [img('photo-1502005229762-cf1b2da7c5d6'), img('photo-1512917774080-9991f1c4c750')],
    type: 'Studio', maxGuests: 2, beds: 1, baths: 1,
    vibes: ['budget', 'beach', 'romantic'], amenities: ['wifi', 'kitchen', 'ac', 'beachfront'],
    latitude: 32.7157, longitude: -117.1611, instantBook: true,
  },
  {
    id: 'bs8', title: 'London Notting Hill Flat', city: 'London', country: 'United Kingdom', location: 'London, UK',
    price: 310, rating: 4.91, reviews: 224, image: img('photo-1513635269975-59663e0ac1ad'),
    images: [img('photo-1513635269975-59663e0ac1ad'), img('photo-1522708323590-d24dbb6b0267')],
    type: 'Flat', maxGuests: 4, beds: 2, baths: 1,
    vibes: ['city', 'luxury', 'romantic', 'work'], amenities: ['wifi', 'kitchen', 'workspace', 'fireplace'],
    latitude: 51.5152, longitude: -0.2010, instantBook: true,
  },
  {
    id: 'bs9', title: 'Edinburgh Old Town Apartment', city: 'Edinburgh', country: 'United Kingdom', location: 'Edinburgh, UK',
    price: 145, rating: 4.9, reviews: 158, image: img('photo-1506377585622-bedcbb027afc'),
    images: [img('photo-1506377585622-bedcbb027afc'), img('photo-1518780664697-55e3ad937233')],
    type: 'Apartment', maxGuests: 4, beds: 2, baths: 1,
    vibes: ['city', 'budget', 'nature'], amenities: ['wifi', 'kitchen', 'fireplace', 'workspace'],
    latitude: 55.9486, longitude: -3.1999, instantBook: true,
  },
  {
    id: 'bs10', title: 'Paris Le Marais Loft', city: 'Paris', country: 'France', location: 'Paris, France',
    price: 290, rating: 4.94, reviews: 271, image: img('photo-1502602898657-3e91760cbb34'),
    images: [img('photo-1502602898657-3e91760cbb34'), img('photo-1549638441-b787d2e11f14')],
    type: 'Loft', maxGuests: 3, beds: 1, baths: 1,
    vibes: ['romantic', 'city', 'luxury'], amenities: ['wifi', 'kitchen', 'ac', 'workspace'],
    latitude: 48.8590, longitude: 2.3580, instantBook: true,
  },
  {
    id: 'bs11', title: 'Provence Vineyard Mas', city: 'Provence', country: 'France', location: 'Provence, France',
    price: 265, rating: 4.95, reviews: 88, image: img('photo-1518780664697-55e3ad937233'),
    images: [img('photo-1518780664697-55e3ad937233'), img('photo-1499793983690-e29da59ef1c2')],
    type: 'Farmhouse', maxGuests: 8, beds: 4, baths: 3,
    vibes: ['wellness', 'nature', 'family', 'romantic'], amenities: ['pool', 'wifi', 'kitchen', 'parking', 'fireplace'],
    latitude: 43.9352, longitude: 5.0510, instantBook: false,
  },
  {
    id: 'bs12', title: 'Rome Trastevere Terrace', city: 'Rome', country: 'Italy', location: 'Rome, Italy',
    price: 175, rating: 4.88, reviews: 210, image: img('photo-1531572753322-ad063cecc140'),
    images: [img('photo-1531572753322-ad063cecc140'), img('photo-1552832230-c0197dd311b5')],
    type: 'Apartment', maxGuests: 4, beds: 2, baths: 1,
    vibes: ['romantic', 'city', 'budget'], amenities: ['wifi', 'kitchen', 'ac'],
    latitude: 41.8896, longitude: 12.4696, instantBook: true,
  },
  {
    id: 'bs13', title: 'Barcelona Beachside Penthouse', city: 'Barcelona', country: 'Spain', location: 'Barcelona, Spain',
    price: 230, rating: 4.9, reviews: 245, image: img('photo-1512917774080-9991f1c4c750'),
    images: [img('photo-1512917774080-9991f1c4c750'), img('photo-1520250497591-112f2f40a3f4')],
    type: 'Penthouse', maxGuests: 5, beds: 3, baths: 2,
    vibes: ['beach', 'city', 'luxury', 'family'], amenities: ['pool', 'wifi', 'ac', 'beachfront', 'gym'],
    latitude: 41.3851, longitude: 2.1734, instantBook: true,
  },
  {
    id: 'bs14', title: 'Amsterdam Canal House', city: 'Amsterdam', country: 'Netherlands', location: 'Amsterdam, Netherlands',
    price: 260, rating: 4.93, reviews: 199, image: img('photo-1558551649-e44c8f992010'),
    images: [img('photo-1558551649-e44c8f992010'), img('photo-1512917774080-9991f1c4c750')],
    type: 'Townhouse', maxGuests: 6, beds: 3, baths: 2,
    vibes: ['city', 'family', 'romantic', 'work'], amenities: ['wifi', 'kitchen', 'workspace', 'pet'],
    latitude: 52.3676, longitude: 4.9041, instantBook: true,
  },
];

// Map a BotStay into the shape PropertyDetails / Booking expect.
export function botStayToProperty(s: BotStay) {
  return {
    id: s.id,
    title: s.title,
    location: s.location,
    price: s.price,
    rating: s.rating,
    reviews: s.reviews,
    images: s.images,
    image: s.image,
    type: s.type,
    guests: s.maxGuests,
    bedrooms: s.beds,
    beds: s.beds,
    bathrooms: s.baths,
    latitude: s.latitude,
    longitude: s.longitude,
    instantBook: s.instantBook,
    amenities: s.amenities,
    // real stays carry these so the detail page shows REAL host data, not mock
    hostListingId: s.hostListingId,
    city: s.city_ || s.city,
    country: s.country,
  };
}
