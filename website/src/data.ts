// Demo catalogue. Structured so it can be swapped for the backend (/v1) later —
// each section is just { title, items[] }. Images are high-quality Unsplash crops.
export type Listing = {
  id: string;
  title: string;
  images: string[];
  price: number;          // per night, in the section's currency
  nights: number;         // for the "x for N nights" line
  rating: number;
  guestFavourite?: boolean;
  badge?: string;         // e.g. "NEW"
};

export type Section = {
  id: string;
  title: string;
  currency: '₹' | '$';
  items: Listing[];
};

const img = (id: string, ...extra: string[]) => [
  `https://images.unsplash.com/${id}?w=900&h=860&fit=crop&q=80`,
  ...extra.map((e) => `https://images.unsplash.com/${e}?w=900&h=860&fit=crop&q=80`),
];

export const SECTIONS: Section[] = [
  {
    id: 'goa',
    title: 'Popular homes in North Goa',
    currency: '₹',
    items: [
      { id: 'g1', title: 'Villa in Vagator', price: 5741, nights: 2, rating: 4.92, guestFavourite: true, images: img('photo-1522708323590-d24dbb6b0267', 'photo-1505693416388-ac5ce068fe85') },
      { id: 'g2', title: 'Home in Assagao', price: 20006, nights: 2, rating: 5.0, guestFavourite: true, images: img('photo-1564013799919-ab600027ffc6', 'photo-1583608205776-bfd35f0d9f83') },
      { id: 'g3', title: 'Apartment in Anjuna', price: 7820, nights: 2, rating: 5.0, images: img('photo-1502672260266-1c1ef2d93688', 'photo-1493809842364-78817add7ffb') },
      { id: 'g4', title: 'Flat in Vagator', price: 5849, nights: 2, rating: 5.0, guestFavourite: true, images: img('photo-1560448204-e02f11c3d0e2', 'photo-1484154218962-a197022b5858') },
      { id: 'g5', title: 'Poolside villa in Siolim', price: 14230, nights: 2, rating: 4.88, badge: 'NEW', images: img('photo-1613490493576-7fde63acd811', 'photo-1576941089067-2de3c901e126') },
      { id: 'g6', title: 'Studio in Morjim', price: 4120, nights: 2, rating: 4.79, images: img('photo-1505691938895-1758d7feb511', 'photo-1522771739844-6a9f6d5f14af') },
    ],
  },
  {
    id: 'lonavala',
    title: 'Available in Lonavala this weekend',
    currency: '₹',
    items: [
      { id: 'l1', title: 'Cottage in Lonavala', price: 9100, nights: 2, rating: 4.91, guestFavourite: true, images: img('photo-1518780664697-55e3ad937233', 'photo-1449158743715-0a90ebb6d2d8') },
      { id: 'l2', title: 'Bungalow in Khandala', price: 12750, nights: 2, rating: 4.85, guestFavourite: true, images: img('photo-1570129477492-45c003edd2be', 'photo-1512917774080-9991f1c4c750') },
      { id: 'l3', title: 'Hilltop home in Tungarli', price: 8400, nights: 2, rating: 4.7, images: img('photo-1600585154340-be6161a56a0c', 'photo-1600596542815-ffad4c1539a9') },
      { id: 'l4', title: 'Glass villa in Pawna', price: 18900, nights: 2, rating: 5.0, images: img('photo-1600607687939-ce8a6c25118c', 'photo-1600566753086-00f18fb6b3ea') },
      { id: 'l5', title: 'Farm stay in Kamshet', price: 6300, nights: 2, rating: 4.83, images: img('photo-1501594907352-04cda38ebc29', 'photo-1518883218081-6b07b3a26d50') },
      { id: 'l6', title: 'Loft in Lonavala', price: 7700, nights: 2, rating: 4.9, badge: 'NEW', images: img('photo-1556912173-3bb406ef7e77', 'photo-1556909114-f6e7ad7d3136') },
    ],
  },
  {
    id: 'world',
    title: 'Stay anywhere — guest favourites',
    currency: '$',
    items: [
      { id: 'w1', title: 'Manhattan Luxury Loft', price: 285, nights: 2, rating: 4.95, guestFavourite: true, images: img('photo-1555636222-cae831e670b3', 'photo-1493809842364-78817add7ffb') },
      { id: 'w2', title: 'Malibu Beachfront Villa', price: 495, nights: 2, rating: 4.97, badge: 'NEW', images: img('photo-1520250497591-112f2f40a3f4', 'photo-1564013799919-ab600027ffc6') },
      { id: 'w3', title: 'Cotswolds Country Cottage', price: 195, nights: 2, rating: 4.92, guestFavourite: true, images: img('photo-1518780664697-55e3ad937233', 'photo-1449158743715-0a90ebb6d2d8') },
      { id: 'w4', title: 'Amsterdam Canal House', price: 225, nights: 2, rating: 4.96, images: img('photo-1512470876302-972faa2aa9a4', 'photo-1577495508326-19a1b3cf65b7') },
      { id: 'w5', title: 'Santorini Cliff Suite', price: 410, nights: 2, rating: 4.99, guestFavourite: true, images: img('photo-1570077188670-e3a8d69ac5ff', 'photo-1571896349842-33c89424de2d') },
      { id: 'w6', title: 'Kyoto Garden Machiya', price: 260, nights: 2, rating: 4.94, images: img('photo-1545569341-9eb8b30979d9', 'photo-1493809842364-78817add7ffb') },
    ],
  },
];

export const CATEGORIES = [
  { id: 'all', label: 'Homes', icon: '🏠' },
  { id: 'beach', label: 'Beachfront', icon: '🏖️' },
  { id: 'pool', label: 'Amazing pools', icon: '🏊' },
  { id: 'cabin', label: 'Cabins', icon: '🛖' },
  { id: 'city', label: 'City', icon: '🏙️' },
  { id: 'mountain', label: 'Mountain', icon: '⛰️' },
  { id: 'luxe', label: 'Luxe', icon: '💎' },
  { id: 'farm', label: 'Farms', icon: '🌾' },
  { id: 'lake', label: 'Lakefront', icon: '🛶' },
  { id: 'design', label: 'Design', icon: '🎨' },
];
