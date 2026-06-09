// Single shared datastore for ALL three clients (User app, Host app, Ops portal).
// One source of truth → this is what lets host, user and ops communicate.
// File-backed JSON for the dev build (swap for PostgreSQL in production).

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');

function seed() {
  // Curated, already-approved catalogue so the guest app is backend-driven from
  // first run. (In production these come from real hosts via the publish flow.)
  const img = (id) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;
  const mk = (i, o) => ({
    id: `l_seed${i}`, hostId: 'u_seedhost', hostName: o.host || 'StayOn Host',
    type: o.type || 'Entire home', currency: 'USD',
    amenities: o.amenities || ['wifi', 'kitchen', 'ac'], vibes: o.vibes || [],
    instantBook: o.instant ?? true, status: 'published',
    ratingAvg: o.rating ?? 4.8, ratingCount: o.reviews ?? 24, createdAt: Date.now() - i * 1000,
    guests: o.guests ?? 4, bedrooms: o.bedrooms ?? 2, beds: o.beds ?? 2, bathrooms: o.bathrooms ?? 1,
    cleaningFeeUSD: o.cleaning ?? 15,
    images: o.images, title: o.title, address: o.address || '', city: o.city, state: o.state || '',
    country: o.country, zipcode: o.zip || '', lat: o.lat, lng: o.lng, priceUSD: o.price,
  });
  const listings = [
    mk(1, { title: 'Sunlit Loft by the Beach', type: 'Loft', city: 'Goa', country: 'India', lat: 15.4909, lng: 73.8278, price: 110, vibes: ['beach'], images: [img('photo-1502672260266-1c1ef2d93688'), img('photo-1522708323590-d24dbb6b0267')], rating: 4.9, reviews: 132, host: 'Asha R' }),
    mk(2, { title: 'Palm Garden Villa', type: 'Villa', city: 'Bali', country: 'Indonesia', lat: -8.4095, lng: 115.1889, price: 240, guests: 8, bedrooms: 4, vibes: ['pool', 'nature'], images: [img('photo-1613490493576-7fde63acd811'), img('photo-1582719478250-c89cae4dc85b')], rating: 4.95, reviews: 210 }),
    mk(3, { title: 'Skyline Studio', type: 'Apartment', city: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777, price: 95, guests: 2, bedrooms: 1, vibes: ['city'], images: [img('photo-1502005229762-cf1b2da7c5d6'), img('photo-1493809842364-78817add7ffb')], rating: 4.7, reviews: 88 }),
    mk(4, { title: 'Montmartre Artist Loft', type: 'Loft', city: 'Paris', country: 'France', lat: 48.8867, lng: 2.3431, price: 180, guests: 3, vibes: ['city', 'romantic'], images: [img('photo-1502602898657-3e91760cbb34'), img('photo-1549638441-b787d2e11f14')], rating: 4.88, reviews: 156 }),
    mk(5, { title: 'SoHo Cozy Studio', type: 'Studio', city: 'New York', state: 'NY', country: 'USA', lat: 40.7233, lng: -74.0030, price: 220, guests: 2, bedrooms: 1, vibes: ['city'], images: [img('photo-1560448204-e02f11c3d0e2'), img('photo-1505691938895-1758d7feb511')], rating: 4.75, reviews: 142 }),
    mk(6, { title: 'Lake Como Stone Villa', type: 'Villa', city: 'Como', country: 'Italy', lat: 45.9876, lng: 9.2572, price: 320, guests: 6, bedrooms: 3, vibes: ['lake', 'luxury'], images: [img('photo-1564013799919-ab600027ffc6'), img('photo-1512917774080-9991f1c4c750')], rating: 4.97, reviews: 98 }),
    mk(7, { title: 'Royal Haveli Suite', type: 'Heritage home', city: 'Jaipur', state: 'Rajasthan', country: 'India', lat: 26.9124, lng: 75.7873, price: 130, guests: 4, vibes: ['heritage'], images: [img('photo-1566073771259-6a8506099945'), img('photo-1582719508461-905c673771fd')], rating: 4.85, reviews: 76 }),
    mk(8, { title: 'Marina Skyview Apartment', type: 'Apartment', city: 'Dubai', country: 'UAE', lat: 25.0805, lng: 55.1403, price: 200, guests: 4, vibes: ['city', 'luxury'], images: [img('photo-1512453979798-5ea266f8880c'), img('photo-1518684079-3c830dcef090')], rating: 4.8, reviews: 119 }),
    mk(9, { title: 'Notting Hill Townhouse', type: 'Townhouse', city: 'London', country: 'UK', lat: 51.5152, lng: -0.2058, price: 260, guests: 5, bedrooms: 3, vibes: ['city'], images: [img('photo-1568605114967-8130f3a36994'), img('photo-1502672023488-70e25813eb80')], rating: 4.82, reviews: 134 }),
    mk(10, { title: 'Shibuya Micro-Apartment', type: 'Apartment', city: 'Tokyo', country: 'Japan', lat: 35.6595, lng: 139.7005, price: 140, guests: 2, bedrooms: 1, vibes: ['city'], images: [img('photo-1480796927426-f609979314bd'), img('photo-1540541338287-41700207dee6')], rating: 4.78, reviews: 167 }),
  ];
  return {
    users: [],
    // Ops team accounts (RBAC roles)
    staff: [
      { id: 's1', email: 'ops@stayon.com', name: 'Ops Admin', role: 'super_admin' },
    ],
    listings,
    bookings: [],
    reservations: [],
    threads: [],
    messages: [],
    reviews: [],
    reels: [],
    reports: [],
    identities: [],
    notifications: [],
    payoutChangeRequests: [],
    payoutMethods: [],
    wishlists: [],
    audit: [],
  };
}

let data;
function load() {
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    data = seed();
    save();
  }
}
function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

load();

module.exports = { db: () => data, save };
