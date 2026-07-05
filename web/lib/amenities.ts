// Shared listing vocabulary — ids mirror the mobile host app's canonical lists
// (user/src/host/data/listings.ts AMENITY_OPTIONS/HIGHLIGHTS/SAFETY_OPTIONS,
// and the SETTING_TAGS/VIBE_TAGS in user/src/host/screens/ListingWizardScreen.tsx)
// so a web-created listing's ids resolve to the same labels everywhere, and a
// mobile-created listing's ids render correctly on the website too. `vibes`
// especially must stay id-for-id identical with the mobile app: the guest app's
// "Match your vibe" filter keys off these exact ids.

// Full id → label map, used to DISPLAY any listing's amenities regardless of
// which app created it.
export const AMENITY_LABELS: Record<string, string> = {
  pool: 'Pool',
  hot_tub: 'Hot tub',
  patio: 'Patio or balcony',
  bbq: 'BBQ grill',
  fire_pit: 'Fire pit',
  indoor_fireplace: 'Indoor fireplace',
  pool_table: 'Pool table',
  piano: 'Piano',
  gym: 'Gym equipment',
  lake_access: 'Lake access',
  beach_access: 'Beach access',
  ski_in_out: 'Ski-in / ski-out',
  outdoor_shower: 'Outdoor shower',
  waterfront: 'Waterfront',
  rare_find: 'Rare find',
  bathtub: 'Bathtub',
  hair_dryer: 'Hair dryer',
  cleaning_products: 'Cleaning products',
  shampoo: 'Shampoo',
  conditioner: 'Conditioner',
  body_soap: 'Body soap',
  hot_water: 'Hot water',
  bidet: 'Bidet',
  shower: 'Shower',
  washer: 'Washer',
  dryer: 'Dryer',
  essentials: 'Essentials',
  hangers: 'Hangers',
  bed_linens: 'Bed linens',
  pillows: 'Extra pillows & blankets',
  shades: 'Room-darkening shades',
  iron: 'Iron',
  drying_rack: 'Drying rack',
  clothing_storage: 'Clothing storage',
  mosquito_net: 'Mosquito net',
  safe: 'Safe',
  tv: 'TV',
  hdtv: 'HDTV',
  sound_system: 'Sound system',
  game_console: 'Game console',
  books: 'Books',
  ethernet: 'Ethernet',
  exercise: 'Exercise equipment',
  record_player: 'Record player',
  board_games: 'Board games',
  crib: 'Crib',
  travel_crib: 'Travel crib',
  high_chair: 'High chair',
  toys: "Children's toys",
  child_dinnerware: "Children's dinnerware",
  baby_monitor: 'Baby monitor',
  safety_gates: 'Safety gates',
  outlet_covers: 'Outlet covers',
  ac: 'Air conditioning',
  heating: 'Heating',
  ceiling_fan: 'Ceiling fan',
  portable_fan: 'Portable fans',
  smoke_alarm: 'Smoke alarm',
  co_alarm: 'CO alarm',
  fire_extinguisher: 'Fire extinguisher',
  first_aid: 'First aid kit',
  security_cameras: 'Security cameras',
  noise_monitor: 'Noise monitor',
  wifi: 'Wifi',
  workspace: 'Dedicated workspace',
  pocket_wifi: 'Pocket wifi',
  kitchen: 'Kitchen',
  refrigerator: 'Refrigerator',
  microwave: 'Microwave',
  cooking_basics: 'Cooking basics',
  dishes: 'Dishes & silverware',
  freezer: 'Freezer',
  dishwasher: 'Dishwasher',
  stove: 'Stove',
  oven: 'Oven',
  kettle: 'Kettle',
  coffee_maker: 'Coffee maker',
  wine_glasses: 'Wine glasses',
  dining_table: 'Dining table',
  private_entrance: 'Private entrance',
  laundromat: 'Laundromat nearby',
  resort_access: 'Resort access',
  backyard: 'Backyard',
  outdoor_furniture: 'Outdoor furniture',
  outdoor_dining: 'Outdoor dining',
  hammock: 'Hammock',
  beach_essentials: 'Beach essentials',
  free_parking: 'Free parking',
  street_parking: 'Street parking',
  paid_parking: 'Paid parking',
  ev_charger: 'EV charger',
  sauna: 'Sauna',
  single_level: 'Single-level home',
  elevator: 'Elevator',
  pets: 'Pets allowed',
  long_term: 'Long-term stays',
  luggage: 'Luggage dropoff',
  cleaning: 'Cleaning during stay',
  breakfast: 'Breakfast',
  host_greets: 'Host greets you',
  self_checkin: 'Self check-in',
  step_free_entrance: 'Step-free entrance',
  wide_entrance: 'Wide entrance',
  accessible_parking: 'Accessible parking',
  grab_rails: 'Grab rails',
  shower_chair: 'Shower chair',
  hoist: 'Ceiling hoist',
};

// Curated subset for the web "Create listing" form's checkbox grid — the most
// broadly useful amenities; the full set above still applies for display of
// any listing (mobile-created listings can use any id from AMENITY_LABELS).
export const AMENITY_FORM_IDS: string[] = [
  'wifi', 'tv', 'kitchen', 'ac', 'heating', 'hot_water', 'workspace',
  'free_parking', 'paid_parking', 'pool', 'hot_tub', 'washer', 'dryer',
  'self_checkin', 'elevator', 'pets', 'breakfast', 'bbq', 'patio', 'fire_pit',
];

// Fixed vocab — up to 2 selected per listing (mirrors mobile's HIGHLIGHTS).
export const HIGHLIGHT_OPTIONS: { id: string; label: string }[] = [
  { id: 'charming', label: 'Charming' },
  { id: 'hip', label: 'Hip' },
  { id: 'stylish', label: 'Stylish' },
  { id: 'upscale', label: 'Upscale' },
  { id: 'central', label: 'Central' },
  { id: 'unique', label: 'Unique' },
];
export const HIGHLIGHTS_MAX = 2;

// Fixed vocab, two groups — MUST stay id-identical with the mobile app's
// SETTING_TAGS/VIBE_TAGS (user/src/host/screens/ListingWizardScreen.tsx),
// since the guest app's "Match your vibe" filter keys off these exact ids.
export const VIBE_OPTIONS: { id: string; label: string; group: 'setting' | 'vibe' }[] = [
  { id: 'beach', label: 'Beachfront', group: 'setting' },
  { id: 'mountain', label: 'Mountain', group: 'setting' },
  { id: 'city', label: 'City', group: 'setting' },
  { id: 'nature', label: 'Countryside / Nature', group: 'setting' },
  { id: 'lake', label: 'Lakefront', group: 'setting' },
  { id: 'ski', label: 'Ski / Snow', group: 'setting' },
  { id: 'romantic', label: 'Romantic', group: 'vibe' },
  { id: 'adventure', label: 'Adventure', group: 'vibe' },
  { id: 'wellness', label: 'Wellness', group: 'vibe' },
  { id: 'family', label: 'Family-friendly', group: 'vibe' },
  { id: 'work', label: 'Work-friendly', group: 'vibe' },
  { id: 'luxury', label: 'Luxury', group: 'vibe' },
  { id: 'budget', label: 'Budget-friendly', group: 'vibe' },
  { id: 'pet', label: 'Pet-friendly', group: 'vibe' },
];

// Display-only — a listing's separate safety disclosures (user/src/host/data/listings.ts SAFETY_OPTIONS).
export const SAFETY_LABELS: Record<string, string> = {
  smoke_alarm: 'Smoke alarm',
  co_alarm: 'Carbon monoxide alarm',
  first_aid: 'First aid kit',
  extinguisher: 'Fire extinguisher',
  camera: 'Exterior security camera',
};

// Fallback for any id not present in the maps above (e.g. a future mobile-app
// addition not yet mirrored here) — never crash, just humanize the id.
export function prettifyId(id: string): string {
  return id
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
