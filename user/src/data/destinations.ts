// Shared destination index — powers search autocomplete + map centering.
// Covers countries, states/regions, and cities across every country offered
// at login. Each destination has a center coordinate + zoom delta, a `type`
// so we can label it, and a `hasStays` flag: true when StayOn has live
// inventory there, false when the area is "coming soon".

export type DestinationType = 'country' | 'state' | 'city';

export interface Destination {
  id: string;
  name: string;        // display name e.g. "Hyderabad, Telangana"
  short: string;       // matching token e.g. "hyderabad"
  country: string;     // "India"
  countryCode: string; // ISO "IN"
  region?: string;     // state / province, e.g. "Telangana"
  type: DestinationType;
  landmark: string;    // subtitle hint shown in search
  lat: number;
  lng: number;
  delta: number;       // map zoom span
  hasStays: boolean;
  aliases?: string[];  // extra search terms
}

// Compact authoring row. type defaults to 'city'.
type Row = {
  n: string;
  lat: number;
  lng: number;
  type?: DestinationType;
  region?: string;
  stays?: boolean;
  landmark?: string;
  delta?: number;
  aliases?: string[];
  // Neighborhoods / landmarks / areas inside this city. Each becomes its own
  // searchable destination that re-centers on the parent city (e.g. searching
  // "Times Square" → "Times Square, New York").
  areas?: string[];
};

interface CountryBlock {
  country: string;
  code: string;
  items: Row[];
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const DEFAULT_DELTA: Record<DestinationType, number> = {
  country: 6,
  state: 2.2,
  city: 0.3,
};

// ── Raw data, grouped by login country ──────────────────────────────────────
const BLOCKS: CountryBlock[] = [
  {
    country: 'United States', code: 'US', items: [
      { n: 'United States', lat: 39.5, lng: -98.35, type: 'country', aliases: ['usa', 'us', 'america'] },
      // States
      { n: 'California', lat: 36.7783, lng: -119.4179, type: 'state', aliases: ['ca'] },
      { n: 'Florida', lat: 27.6648, lng: -81.5158, type: 'state', aliases: ['fl'] },
      { n: 'New York State', lat: 42.9, lng: -75.5, type: 'state', aliases: ['ny'] },
      { n: 'Texas', lat: 31.0, lng: -100.0, type: 'state', aliases: ['tx'] },
      { n: 'Hawaii', lat: 20.7984, lng: -156.3319, type: 'state', aliases: ['hi'] },
      { n: 'Nevada', lat: 38.8026, lng: -116.4194, type: 'state' },
      { n: 'Illinois', lat: 40.0, lng: -89.0, type: 'state' },
      { n: 'Washington', lat: 47.4, lng: -120.5, type: 'state' },
      { n: 'Colorado', lat: 39.0, lng: -105.5, type: 'state' },
      { n: 'Massachusetts', lat: 42.4, lng: -71.4, type: 'state' },
      // Cities (with live inventory where stays:true)
      { n: 'New York', region: 'NY', lat: 40.7128, lng: -74.006, stays: true, landmark: 'Times Square · Statue of Liberty', aliases: ['nyc', 'manhattan'], areas: ['Times Square', 'Manhattan', 'Central Park', 'SoHo', 'Statue of Liberty', 'Empire State Building', 'Wall Street', 'Greenwich Village', 'Upper East Side'] },
      { n: 'Brooklyn', region: 'NY', lat: 40.6782, lng: -73.9442, stays: true },
      { n: 'Los Angeles', region: 'CA', lat: 34.0522, lng: -118.2437, stays: true, landmark: 'Hollywood · Santa Monica', aliases: ['la'], areas: ['Hollywood', 'Santa Monica', 'Beverly Hills', 'Venice Beach', 'Downtown LA'] },
      { n: 'Malibu', region: 'CA', lat: 34.0259, lng: -118.7798, stays: true },
      { n: 'San Francisco', region: 'CA', lat: 37.7749, lng: -122.4194, stays: true, landmark: 'Golden Gate Bridge', aliases: ['sf'] },
      { n: 'Napa Valley', region: 'CA', lat: 38.2975, lng: -122.2869, stays: true, landmark: 'Wine Country', aliases: ['napa'] },
      { n: 'Miami', region: 'FL', lat: 25.7617, lng: -80.1918, stays: true, landmark: 'South Beach · Art Deco' },
      { n: 'Orlando', region: 'FL', lat: 28.5383, lng: -81.3792 },
      { n: 'Tampa', region: 'FL', lat: 27.9506, lng: -82.4572 },
      { n: 'Chicago', region: 'IL', lat: 41.8781, lng: -87.6298, landmark: 'The Bean · Willis Tower' },
      { n: 'Las Vegas', region: 'NV', lat: 36.1699, lng: -115.1398 },
      { n: 'Seattle', region: 'WA', lat: 47.6062, lng: -122.3321 },
      { n: 'Austin', region: 'TX', lat: 30.2672, lng: -97.7431 },
      { n: 'Boston', region: 'MA', lat: 42.3601, lng: -71.0589 },
      { n: 'Denver', region: 'CO', lat: 39.7392, lng: -104.9903 },
      { n: 'Honolulu', region: 'HI', lat: 21.3069, lng: -157.8583 },
    ],
  },
  {
    country: 'India', code: 'IN', items: [
      { n: 'India', lat: 22.0, lng: 79.0, type: 'country', aliases: ['bharat'] },
      // States / UTs
      { n: 'Telangana', lat: 17.9, lng: 79.6, type: 'state' },
      { n: 'Maharashtra', lat: 19.7515, lng: 75.7139, type: 'state' },
      { n: 'Karnataka', lat: 15.3173, lng: 75.7139, type: 'state' },
      { n: 'Tamil Nadu', lat: 11.1271, lng: 78.6569, type: 'state' },
      { n: 'Kerala', lat: 10.8505, lng: 76.2711, type: 'state' },
      { n: 'Goa', lat: 15.2993, lng: 74.124, type: 'state', stays: true, landmark: 'Beaches · Nightlife', aliases: ['calangute', 'anjuna', 'baga', 'panaji', 'candolim'] },
      { n: 'Rajasthan', lat: 27.0238, lng: 74.2179, type: 'state' },
      { n: 'Delhi', lat: 28.7041, lng: 77.1025, type: 'state', aliases: ['ncr'] },
      { n: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, type: 'state' },
      { n: 'West Bengal', lat: 22.9868, lng: 87.855, type: 'state' },
      { n: 'Gujarat', lat: 22.2587, lng: 71.1924, type: 'state' },
      { n: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, type: 'state' },
      { n: 'Uttarakhand', lat: 30.0668, lng: 79.0193, type: 'state' },
      // Cities
      { n: 'Hyderabad', region: 'Telangana', lat: 17.385, lng: 78.4867, landmark: 'Charminar · HITEC City' },
      { n: 'Mumbai', region: 'Maharashtra', lat: 19.076, lng: 72.8777, landmark: 'Gateway of India', aliases: ['bombay'], areas: ['Bandra', 'Colaba', 'Andheri', 'Juhu', 'Gateway of India', 'Marine Drive', 'Powai'] },
      { n: 'Pune', region: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
      { n: 'Bengaluru', region: 'Karnataka', lat: 12.9716, lng: 77.5946, landmark: 'Tech hub', aliases: ['bangalore'], areas: ['Koramangala', 'Indiranagar', 'Whitefield', 'MG Road', 'HSR Layout', 'Electronic City'] },
      { n: 'Mysuru', region: 'Karnataka', lat: 12.2958, lng: 76.6394, aliases: ['mysore'] },
      { n: 'Chennai', region: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, aliases: ['madras'] },
      { n: 'Kochi', region: 'Kerala', lat: 9.9312, lng: 76.2673, aliases: ['cochin'] },
      { n: 'Munnar', region: 'Kerala', lat: 10.0889, lng: 77.0595, landmark: 'Tea gardens' },
      { n: 'New Delhi', region: 'Delhi', lat: 28.6139, lng: 77.209, landmark: 'India Gate · Red Fort', areas: ['Connaught Place', 'Hauz Khas', 'India Gate', 'Red Fort', 'Chandni Chowk', 'Karol Bagh', 'Saket'] },
      { n: 'Jaipur', region: 'Rajasthan', lat: 26.9124, lng: 75.7873, landmark: 'Pink City' },
      { n: 'Udaipur', region: 'Rajasthan', lat: 24.5854, lng: 73.7125, landmark: 'City of Lakes' },
      { n: 'Jodhpur', region: 'Rajasthan', lat: 26.2389, lng: 73.0243 },
      { n: 'Kolkata', region: 'West Bengal', lat: 22.5726, lng: 88.3639, aliases: ['calcutta'] },
      { n: 'Darjeeling', region: 'West Bengal', lat: 27.041, lng: 88.2663 },
      { n: 'Ahmedabad', region: 'Gujarat', lat: 23.0225, lng: 72.5714 },
      { n: 'Agra', region: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, landmark: 'Taj Mahal' },
      { n: 'Varanasi', region: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
      { n: 'Shimla', region: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
      { n: 'Manali', region: 'Himachal Pradesh', lat: 32.2432, lng: 77.1892 },
      { n: 'Rishikesh', region: 'Uttarakhand', lat: 30.0869, lng: 78.2676 },
    ],
  },
  {
    country: 'United Kingdom', code: 'GB', items: [
      { n: 'United Kingdom', lat: 55.3781, lng: -3.436, type: 'country', aliases: ['uk', 'britain', 'england'] },
      { n: 'London', lat: 51.5074, lng: -0.1278, stays: true, landmark: 'Big Ben · Tower Bridge', aliases: ['chelsea'], areas: ['Soho', 'Camden', 'Notting Hill', 'Shoreditch', 'Westminster', 'Covent Garden', 'Kensington', 'Big Ben', 'Tower Bridge'] },
      { n: 'Cotswolds', lat: 51.833, lng: -1.8433, stays: true, landmark: 'Historic villages', aliases: ['bourton'] },
      { n: 'Edinburgh', lat: 55.9533, lng: -3.1883, region: 'Scotland' },
      { n: 'Manchester', lat: 53.4808, lng: -2.2426 },
      { n: 'Liverpool', lat: 53.4084, lng: -2.9916 },
      { n: 'Bath', lat: 51.3811, lng: -2.3590 },
      { n: 'Oxford', lat: 51.752, lng: -1.2577 },
    ],
  },
  {
    country: 'France', code: 'FR', items: [
      { n: 'France', lat: 46.2276, lng: 2.2137, type: 'country' },
      { n: 'Paris', lat: 48.8566, lng: 2.3522, stays: true, landmark: 'Eiffel Tower · Louvre', areas: ['Le Marais', 'Montmartre', 'Champs-Élysées', 'Eiffel Tower', 'Louvre', 'Latin Quarter'] },
      { n: 'Nice', lat: 43.7102, lng: 7.262, region: 'Côte d\'Azur' },
      { n: 'Lyon', lat: 45.764, lng: 4.8357 },
      { n: 'Marseille', lat: 43.2965, lng: 5.3698 },
      { n: 'Bordeaux', lat: 44.8378, lng: -0.5792 },
      { n: 'Cannes', lat: 43.5528, lng: 7.0174 },
    ],
  },
  {
    country: 'Italy', code: 'IT', items: [
      { n: 'Italy', lat: 41.8719, lng: 12.5674, type: 'country' },
      { n: 'Rome', lat: 41.9028, lng: 12.4964, stays: true, landmark: 'Colosseum · Trevi Fountain' },
      { n: 'Venice', lat: 45.4408, lng: 12.3155, landmark: 'Canals' },
      { n: 'Florence', lat: 43.7696, lng: 11.2558, aliases: ['firenze'] },
      { n: 'Milan', lat: 45.4642, lng: 9.19 },
      { n: 'Amalfi Coast', lat: 40.634, lng: 14.6027 },
      { n: 'Naples', lat: 40.8518, lng: 14.2681 },
    ],
  },
  {
    country: 'Spain', code: 'ES', items: [
      { n: 'Spain', lat: 40.4637, lng: -3.7492, type: 'country' },
      { n: 'Barcelona', lat: 41.3851, lng: 2.1734, stays: true, landmark: 'Sagrada Familia' },
      { n: 'Madrid', lat: 40.4168, lng: -3.7038 },
      { n: 'Seville', lat: 37.3891, lng: -5.9845 },
      { n: 'Valencia', lat: 39.4699, lng: -0.3763 },
      { n: 'Ibiza', lat: 38.9067, lng: 1.4206 },
      { n: 'Granada', lat: 37.1773, lng: -3.5986 },
    ],
  },
  {
    country: 'Germany', code: 'DE', items: [
      { n: 'Germany', lat: 51.1657, lng: 10.4515, type: 'country' },
      { n: 'Berlin', lat: 52.52, lng: 13.405 },
      { n: 'Munich', lat: 48.1351, lng: 11.582, aliases: ['münchen'] },
      { n: 'Hamburg', lat: 53.5511, lng: 9.9937 },
      { n: 'Frankfurt', lat: 50.1109, lng: 8.6821 },
      { n: 'Cologne', lat: 50.9375, lng: 6.9603 },
    ],
  },
  {
    country: 'Netherlands', code: 'NL', items: [
      { n: 'Netherlands', lat: 52.1326, lng: 5.2913, type: 'country', aliases: ['holland'] },
      { n: 'Amsterdam', lat: 52.3676, lng: 4.9041, stays: true, landmark: 'Canals · Van Gogh Museum' },
      { n: 'Rotterdam', lat: 51.9244, lng: 4.4777 },
      { n: 'The Hague', lat: 52.0705, lng: 4.3007 },
      { n: 'Utrecht', lat: 52.0907, lng: 5.1214 },
    ],
  },
  {
    country: 'Greece', code: 'GR', items: [
      { n: 'Greece', lat: 39.0742, lng: 21.8243, type: 'country' },
      { n: 'Santorini', lat: 36.3932, lng: 25.4615, stays: true, landmark: 'Oia Sunset · Caldera', aliases: ['oia'] },
      { n: 'Athens', lat: 37.9838, lng: 23.7275, landmark: 'Acropolis' },
      { n: 'Mykonos', lat: 37.4467, lng: 25.3289 },
      { n: 'Crete', lat: 35.2401, lng: 24.8093 },
    ],
  },
  {
    country: 'Canada', code: 'CA', items: [
      { n: 'Canada', lat: 56.1304, lng: -106.3468, type: 'country' },
      { n: 'Vancouver', region: 'BC', lat: 49.2827, lng: -123.1207, stays: true, landmark: 'Stanley Park' },
      { n: 'Toronto', region: 'ON', lat: 43.6532, lng: -79.3832, stays: true, landmark: 'CN Tower' },
      { n: 'Montreal', region: 'QC', lat: 45.5017, lng: -73.5673 },
      { n: 'Banff', region: 'AB', lat: 51.1784, lng: -115.5708, landmark: 'Rockies' },
      { n: 'Calgary', region: 'AB', lat: 51.0447, lng: -114.0719 },
    ],
  },
  {
    country: 'Australia', code: 'AU', items: [
      { n: 'Australia', lat: -25.2744, lng: 133.7751, type: 'country' },
      { n: 'Sydney', region: 'NSW', lat: -33.8688, lng: 151.2093, landmark: 'Opera House' },
      { n: 'Melbourne', region: 'VIC', lat: -37.8136, lng: 144.9631 },
      { n: 'Gold Coast', region: 'QLD', lat: -28.0167, lng: 153.4 },
      { n: 'Brisbane', region: 'QLD', lat: -27.4698, lng: 153.0251 },
      { n: 'Perth', region: 'WA', lat: -31.9523, lng: 115.8613 },
    ],
  },
  {
    country: 'United Arab Emirates', code: 'AE', items: [
      { n: 'United Arab Emirates', lat: 23.4241, lng: 53.8478, type: 'country', aliases: ['uae'] },
      { n: 'Dubai', lat: 25.2048, lng: 55.2708, landmark: 'Burj Khalifa · Palm Jumeirah', areas: ['Palm Jumeirah', 'Downtown Dubai', 'Dubai Marina', 'Burj Khalifa', 'Jumeirah Beach', 'Deira'] },
      { n: 'Abu Dhabi', lat: 24.4539, lng: 54.3773 },
      { n: 'Sharjah', lat: 25.3463, lng: 55.4209 },
    ],
  },
  {
    country: 'Japan', code: 'JP', items: [
      { n: 'Japan', lat: 36.2048, lng: 138.2529, type: 'country' },
      { n: 'Tokyo', lat: 35.6762, lng: 139.6503, landmark: 'Shibuya · Skytree' },
      { n: 'Kyoto', lat: 35.0116, lng: 135.7681, landmark: 'Temples · Gardens' },
      { n: 'Osaka', lat: 34.6937, lng: 135.5023 },
      { n: 'Hokkaido', lat: 43.0642, lng: 141.3469, type: 'state' },
    ],
  },
  {
    country: 'China', code: 'CN', items: [
      { n: 'China', lat: 35.8617, lng: 104.1954, type: 'country' },
      { n: 'Shanghai', lat: 31.2304, lng: 121.4737 },
      { n: 'Beijing', lat: 39.9042, lng: 116.4074, landmark: 'Great Wall · Forbidden City' },
      { n: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
      { n: 'Shenzhen', lat: 22.5431, lng: 114.0579 },
    ],
  },
  {
    country: 'Singapore', code: 'SG', items: [
      { n: 'Singapore', lat: 1.3521, lng: 103.8198, type: 'country', landmark: 'Marina Bay Sands' },
    ],
  },
  {
    country: 'Thailand', code: 'TH', items: [
      { n: 'Thailand', lat: 15.87, lng: 100.9925, type: 'country' },
      { n: 'Bangkok', lat: 13.7563, lng: 100.5018 },
      { n: 'Phuket', lat: 7.8804, lng: 98.3923, landmark: 'Beaches' },
      { n: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
      { n: 'Krabi', lat: 8.0863, lng: 98.9063 },
    ],
  },
  {
    country: 'Indonesia', code: 'ID', items: [
      { n: 'Indonesia', lat: -0.7893, lng: 113.9213, type: 'country' },
      { n: 'Bali', lat: -8.3405, lng: 115.092, landmark: 'Beaches · Rice terraces', areas: ['Seminyak', 'Kuta', 'Canggu', 'Uluwatu', 'Nusa Dua'] },
      { n: 'Jakarta', lat: -6.2088, lng: 106.8456 },
      { n: 'Ubud', lat: -8.5069, lng: 115.2625 },
    ],
  },
  {
    country: 'Malaysia', code: 'MY', items: [
      { n: 'Malaysia', lat: 4.2105, lng: 101.9758, type: 'country' },
      { n: 'Kuala Lumpur', lat: 3.139, lng: 101.6869, landmark: 'Petronas Towers', aliases: ['kl'] },
      { n: 'Penang', lat: 5.4164, lng: 100.3327 },
      { n: 'Langkawi', lat: 6.3500, lng: 99.8000 },
    ],
  },
  {
    country: 'South Korea', code: 'KR', items: [
      { n: 'South Korea', lat: 35.9078, lng: 127.7669, type: 'country', aliases: ['korea'] },
      { n: 'Seoul', lat: 37.5665, lng: 126.978 },
      { n: 'Busan', lat: 35.1796, lng: 129.0756 },
      { n: 'Jeju', lat: 33.4996, lng: 126.5312 },
    ],
  },
  {
    country: 'Mexico', code: 'MX', items: [
      { n: 'Mexico', lat: 23.6345, lng: -102.5528, type: 'country' },
      { n: 'Cancún', lat: 21.1619, lng: -86.8515, landmark: 'Beaches', aliases: ['cancun'] },
      { n: 'Mexico City', lat: 19.4326, lng: -99.1332 },
      { n: 'Tulum', lat: 20.2114, lng: -87.4654 },
      { n: 'Cabo San Lucas', lat: 22.8905, lng: -109.9167, aliases: ['cabo'] },
    ],
  },
  {
    country: 'Brazil', code: 'BR', items: [
      { n: 'Brazil', lat: -14.235, lng: -51.9253, type: 'country' },
      { n: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, landmark: 'Christ the Redeemer', aliases: ['rio'] },
      { n: 'São Paulo', lat: -23.5505, lng: -46.6333, aliases: ['sao paulo'] },
      { n: 'Salvador', lat: -12.9777, lng: -38.5016 },
    ],
  },
  {
    country: 'South Africa', code: 'ZA', items: [
      { n: 'South Africa', lat: -30.5595, lng: 22.9375, type: 'country' },
      { n: 'Cape Town', lat: -33.9249, lng: 18.4241, landmark: 'Table Mountain' },
      { n: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
    ],
  },
  {
    country: 'Turkey', code: 'TR', items: [
      { n: 'Turkey', lat: 38.9637, lng: 35.2433, type: 'country' },
      { n: 'Istanbul', lat: 41.0082, lng: 28.9784, landmark: 'Hagia Sophia' },
      { n: 'Cappadocia', lat: 38.6431, lng: 34.8307, landmark: 'Hot-air balloons' },
      { n: 'Antalya', lat: 36.8969, lng: 30.7133 },
    ],
  },
  {
    country: 'New Zealand', code: 'NZ', items: [
      { n: 'New Zealand', lat: -40.9006, lng: 174.886, type: 'country' },
      { n: 'Auckland', lat: -36.8485, lng: 174.7633 },
      { n: 'Queenstown', lat: -45.0312, lng: 168.6626, landmark: 'Adventure capital' },
      { n: 'Wellington', lat: -41.2865, lng: 174.7762 },
    ],
  },
  {
    country: 'Switzerland', code: 'CH', items: [
      { n: 'Switzerland', lat: 46.8182, lng: 8.2275, type: 'country' },
      { n: 'Zurich', lat: 47.3769, lng: 8.5417 },
      { n: 'Geneva', lat: 46.2044, lng: 6.1432 },
      { n: 'Interlaken', lat: 46.6863, lng: 7.8632, landmark: 'Alps' },
      { n: 'Zermatt', lat: 46.0207, lng: 7.7491, landmark: 'Matterhorn' },
    ],
  },
  {
    country: 'Portugal', code: 'PT', items: [
      { n: 'Portugal', lat: 39.3999, lng: -8.2245, type: 'country' },
      { n: 'Lisbon', lat: 38.7223, lng: -9.1393 },
      { n: 'Porto', lat: 41.1579, lng: -8.6291 },
      { n: 'Algarve', lat: 37.0179, lng: -7.9307, landmark: 'Beaches' },
    ],
  },
  {
    country: 'Ireland', code: 'IE', items: [
      { n: 'Ireland', lat: 53.4129, lng: -8.2439, type: 'country' },
      { n: 'Dublin', lat: 53.3498, lng: -6.2603 },
      { n: 'Galway', lat: 53.2707, lng: -9.0568 },
    ],
  },
  {
    country: 'Austria', code: 'AT', items: [
      { n: 'Austria', lat: 47.5162, lng: 14.5501, type: 'country' },
      { n: 'Vienna', lat: 48.2082, lng: 16.3738 },
      { n: 'Salzburg', lat: 47.8095, lng: 13.055 },
      { n: 'Innsbruck', lat: 47.2692, lng: 11.4041 },
    ],
  },
  {
    country: 'Belgium', code: 'BE', items: [
      { n: 'Belgium', lat: 50.5039, lng: 4.4699, type: 'country' },
      { n: 'Brussels', lat: 50.8503, lng: 4.3517 },
      { n: 'Bruges', lat: 51.2093, lng: 3.2247 },
    ],
  },
  {
    country: 'Sweden', code: 'SE', items: [
      { n: 'Sweden', lat: 60.1282, lng: 18.6435, type: 'country' },
      { n: 'Stockholm', lat: 59.3293, lng: 18.0686 },
      { n: 'Gothenburg', lat: 57.7089, lng: 11.9746 },
    ],
  },
  {
    country: 'Denmark', code: 'DK', items: [
      { n: 'Denmark', lat: 56.2639, lng: 9.5018, type: 'country' },
      { n: 'Copenhagen', lat: 55.6761, lng: 12.5683 },
    ],
  },
  {
    country: 'Norway', code: 'NO', items: [
      { n: 'Norway', lat: 60.472, lng: 8.4689, type: 'country' },
      { n: 'Oslo', lat: 59.9139, lng: 10.7522 },
      { n: 'Bergen', lat: 60.3913, lng: 5.3221, landmark: 'Fjords' },
    ],
  },
  {
    country: 'Finland', code: 'FI', items: [
      { n: 'Finland', lat: 61.9241, lng: 25.7482, type: 'country' },
      { n: 'Helsinki', lat: 60.1699, lng: 24.9384 },
      { n: 'Rovaniemi', lat: 66.5039, lng: 25.7294, landmark: 'Lapland · Northern Lights' },
    ],
  },
  {
    country: 'Poland', code: 'PL', items: [
      { n: 'Poland', lat: 51.9194, lng: 19.1451, type: 'country' },
      { n: 'Warsaw', lat: 52.2297, lng: 21.0122 },
      { n: 'Kraków', lat: 50.0647, lng: 19.945, aliases: ['krakow'] },
    ],
  },
  {
    country: 'Czech Republic', code: 'CZ', items: [
      { n: 'Czech Republic', lat: 49.8175, lng: 15.473, type: 'country', aliases: ['czechia'] },
      { n: 'Prague', lat: 50.0755, lng: 14.4378, landmark: 'Old Town · Charles Bridge' },
    ],
  },
];

// ── Expand raw blocks into Destination[] ─────────────────────────────────────
function buildDestinations(): Destination[] {
  const out: Destination[] = [];
  for (const block of BLOCKS) {
    for (const r of block.items) {
      const type: DestinationType = r.type ?? 'city';
      const display =
        type === 'country'
          ? r.n
          : r.region
          ? `${r.n}, ${r.region}`
          : `${r.n}, ${block.country}`;
      out.push({
        id: `${block.code.toLowerCase()}-${slug(r.n)}`,
        name: display,
        short: r.n.toLowerCase(),
        country: block.country,
        countryCode: block.code,
        region: r.region,
        type,
        landmark: r.landmark ?? (r.region ? `${r.region}, ${block.country}` : block.country),
        lat: r.lat,
        lng: r.lng,
        delta: r.delta ?? DEFAULT_DELTA[type],
        hasStays: r.stays ?? false,
        aliases: r.aliases,
      });

      // Expand neighborhoods / landmarks into their own searchable rows that
      // re-center on the parent city and inherit its inventory.
      for (const area of r.areas ?? []) {
        out.push({
          id: `${block.code.toLowerCase()}-${slug(r.n)}-${slug(area)}`,
          name: `${area}, ${r.n}`,
          short: area.toLowerCase(),
          country: block.country,
          countryCode: block.code,
          region: r.region,
          type: 'city',
          landmark: `${r.n}, ${r.region ?? block.country}`,
          lat: r.lat,
          lng: r.lng,
          delta: 0.12,
          hasStays: r.stays ?? false,
          aliases: [r.n.toLowerCase()],
        });
      }
    }
  }
  return out;
}

export const DESTINATIONS: Destination[] = buildDestinations();

// ── Search ───────────────────────────────────────────────────────────────────
// Normalize: lowercase, strip punctuation/accents-ish, collapse whitespace.
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Score a destination against a query, contact-search style. 0 = no match.
// Handles partials, multi-word, reordering, and minor differences like
// "time square" → "Times Square" (token "time" is a prefix of word "times").
function scoreDestination(d: Destination, qRaw: string): number {
  const q = norm(qRaw);
  if (!q) return 0;
  const qTokens = q.split(' ');

  // Strong-signal fields (the place's own name + aliases).
  const primary = [norm(d.short), ...(d.aliases ?? []).map(norm)];

  // Full searchable text — includes region, country, and landmark/area hints.
  const text = norm(
    [d.name, d.short, d.region ?? '', d.country, d.landmark, ...(d.aliases ?? [])].join(' ')
  );
  const words = text.split(' ');

  let best = 0;
  for (const f of primary) {
    if (!f) continue;
    if (f === q) best = Math.max(best, 100);
    else if (f.startsWith(q)) best = Math.max(best, 85);
  }
  if (norm(d.name).startsWith(q)) best = Math.max(best, 80);
  // Every query token is the prefix of some word → contact-style match.
  if (qTokens.every((qt) => words.some((w) => w.startsWith(qt)))) {
    best = Math.max(best, 62);
  }
  if (text.includes(q)) best = Math.max(best, 55);

  if (best === 0) return 0;
  // Prefer cities/areas, then states, then countries; nudge live-stay places up.
  const typeBonus = d.type === 'city' ? 3 : d.type === 'state' ? 2 : 1;
  return best + typeBonus + (d.hasStays ? 1 : 0);
}

/** Autocomplete suggestions for a partial query, best matches first. */
export function suggestDestinations(query: string, limit = 8): Destination[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Empty query → a spread of marquee destinations with live inventory.
    return DESTINATIONS.filter((d) => d.hasStays).slice(0, limit);
  }
  return DESTINATIONS.map((d) => ({ d, s: scoreDestination(d, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.d.name.length - b.d.name.length)
    .slice(0, limit)
    .map((x) => x.d);
}

/**
 * Resolve a free-text query to the single best destination for map centering.
 * Returns null if nothing matches.
 */
export function resolveDestination(query: string): Destination | null {
  const matches = suggestDestinations(query, 1);
  return matches[0] ?? null;
}
