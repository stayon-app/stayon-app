// Listing-wizard data, mirrored 1:1 from the host app
// (host/src/data/listings.ts) so the website's "list your place" flow matches
// the app's three-phase experience exactly. Icons are keys into WizIcon.

export const PLACE_TYPES: { id: string; label: string; icon: string }[] = [
  { id: 'House', label: 'House', icon: 'home' },
  { id: 'Flat', label: 'Flat / apartment', icon: 'building' },
  { id: 'Barn', label: 'Barn', icon: 'storefront' },
  { id: 'Bnb', label: 'Bed & breakfast', icon: 'cafe' },
  { id: 'Boat', label: 'Boat', icon: 'boat' },
  { id: 'Cabin', label: 'Cabin', icon: 'leaf' },
  { id: 'Camper', label: 'Campervan', icon: 'bus' },
  { id: 'Castle', label: 'Castle', icon: 'shield' },
  { id: 'Cave', label: 'Cave', icon: 'triangle' },
  { id: 'Container', label: 'Container', icon: 'cube' },
  { id: 'Dome', label: 'Dome', icon: 'dome' },
  { id: 'Farm', label: 'Farm', icon: 'flower' },
  { id: 'Guesthouse', label: 'Guest house', icon: 'people' },
  { id: 'Hotel', label: 'Hotel', icon: 'bed' },
  { id: 'Houseboat', label: 'Houseboat', icon: 'boat' },
  { id: 'Loft', label: 'Loft', icon: 'albums' },
  { id: 'Tinyhome', label: 'Tiny home', icon: 'cube' },
  { id: 'Villa', label: 'Villa', icon: 'home' },
];

export const PLACE_KINDS: { id: 'entire' | 'room' | 'shared'; label: string; sub: string; icon: string }[] = [
  { id: 'entire', label: 'An entire place', sub: 'Guests have the whole place to themselves.', icon: 'home' },
  { id: 'room', label: 'A room', sub: 'Guests have their own room in a home, plus shared spaces.', icon: 'bed' },
  { id: 'shared', label: 'A shared room', sub: 'Guests sleep in a room or common area that may be shared.', icon: 'people' },
];

export const WHO_ELSE_OPTIONS: { id: string; label: string; icon: string }[] = [
  { id: 'me', label: 'Me', icon: 'person' },
  { id: 'family', label: 'My family', icon: 'people' },
  { id: 'other_guests', label: 'Other guests', icon: 'people' },
  { id: 'flatmates', label: 'Flatmates', icon: 'people' },
];

export const HIGHLIGHTS: { id: string; label: string; icon: string }[] = [
  { id: 'charming', label: 'Charming', icon: 'heart' },
  { id: 'hip', label: 'Hip', icon: 'camera' },
  { id: 'stylish', label: 'Stylish', icon: 'diamond' },
  { id: 'upscale', label: 'Upscale', icon: 'sparkles' },
  { id: 'central', label: 'Central', icon: 'location' },
  { id: 'unique', label: 'Unique', icon: 'star' },
];

export const DISCOUNT_OPTIONS: { id: 'newListing' | 'lastMinute' | 'weekly' | 'monthly'; pct: string; title: string; sub: string }[] = [
  { id: 'newListing', pct: '20%', title: 'New listing promotion', sub: 'Offer 20% off your first 3 bookings' },
  { id: 'lastMinute', pct: '1%', title: 'Last-minute discount', sub: 'For stays booked 14 days or less before arrival' },
  { id: 'weekly', pct: '10%', title: 'Weekly discount', sub: 'For stays of 7 nights or more' },
  { id: 'monthly', pct: '25%', title: 'Monthly discount', sub: 'For stays of 28 nights or more' },
];

// Amenities, grouped exactly as the app groups them.
export const AMENITY_CATEGORY_ORDER = [
  'Essentials', 'Kitchen & dining', 'Bathroom', 'Bedroom & laundry', 'Entertainment',
  'Heating & cooling', 'Internet & workspace', 'Outdoor', 'Parking & facilities',
  'Family', 'Services', 'Location', 'Accessibility',
];

export const AMENITY_OPTIONS: { id: string; label: string; category: string }[] = [
  { id: 'wifi', label: 'Wi-Fi', category: 'Essentials' },
  { id: 'tv', label: 'TV', category: 'Essentials' },
  { id: 'hot_water', label: 'Hot water', category: 'Essentials' },
  { id: 'hair_dryer', label: 'Hair dryer', category: 'Essentials' },
  { id: 'iron', label: 'Iron', category: 'Essentials' },
  { id: 'hangers', label: 'Hangers', category: 'Essentials' },
  { id: 'bed_linens', label: 'Bed linens', category: 'Essentials' },
  { id: 'extra_blankets', label: 'Extra pillows & blankets', category: 'Essentials' },
  { id: 'cleaning_products', label: 'Cleaning products', category: 'Essentials' },
  { id: 'kitchen', label: 'Kitchen', category: 'Kitchen & dining' },
  { id: 'refrigerator', label: 'Refrigerator', category: 'Kitchen & dining' },
  { id: 'microwave', label: 'Microwave', category: 'Kitchen & dining' },
  { id: 'stove', label: 'Stove', category: 'Kitchen & dining' },
  { id: 'oven', label: 'Oven', category: 'Kitchen & dining' },
  { id: 'dishwasher', label: 'Dishwasher', category: 'Kitchen & dining' },
  { id: 'cooking_basics', label: 'Cooking basics', category: 'Kitchen & dining' },
  { id: 'dishes', label: 'Dishes & silverware', category: 'Kitchen & dining' },
  { id: 'coffee_maker', label: 'Coffee maker', category: 'Kitchen & dining' },
  { id: 'kettle', label: 'Kettle', category: 'Kitchen & dining' },
  { id: 'toaster', label: 'Toaster', category: 'Kitchen & dining' },
  { id: 'dining_table', label: 'Dining table', category: 'Kitchen & dining' },
  { id: 'freezer', label: 'Freezer', category: 'Kitchen & dining' },
  { id: 'wine_glasses', label: 'Wine glasses', category: 'Kitchen & dining' },
  { id: 'bathtub', label: 'Bathtub', category: 'Bathroom' },
  { id: 'shampoo', label: 'Shampoo', category: 'Bathroom' },
  { id: 'body_soap', label: 'Body soap', category: 'Bathroom' },
  { id: 'shower_gel', label: 'Shower gel', category: 'Bathroom' },
  { id: 'washer', label: 'Washer', category: 'Bedroom & laundry' },
  { id: 'dryer', label: 'Dryer', category: 'Bedroom & laundry' },
  { id: 'drying_rack', label: 'Drying rack', category: 'Bedroom & laundry' },
  { id: 'clothing_storage', label: 'Clothing storage', category: 'Bedroom & laundry' },
  { id: 'sound_system', label: 'Sound system', category: 'Entertainment' },
  { id: 'streaming', label: 'Streaming services', category: 'Entertainment' },
  { id: 'game_console', label: 'Game console', category: 'Entertainment' },
  { id: 'books', label: 'Books & reading', category: 'Entertainment' },
  { id: 'board_games', label: 'Board games', category: 'Entertainment' },
  { id: 'ac', label: 'Air conditioning', category: 'Heating & cooling' },
  { id: 'heating', label: 'Heating', category: 'Heating & cooling' },
  { id: 'ceiling_fan', label: 'Ceiling fan', category: 'Heating & cooling' },
  { id: 'fireplace', label: 'Fireplace', category: 'Heating & cooling' },
  { id: 'workspace', label: 'Dedicated workspace', category: 'Internet & workspace' },
  { id: 'ethernet', label: 'Ethernet connection', category: 'Internet & workspace' },
  { id: 'pool', label: 'Pool', category: 'Outdoor' },
  { id: 'hottub', label: 'Hot tub', category: 'Outdoor' },
  { id: 'patio', label: 'Patio or balcony', category: 'Outdoor' },
  { id: 'backyard', label: 'Backyard', category: 'Outdoor' },
  { id: 'outdoor_furniture', label: 'Outdoor furniture', category: 'Outdoor' },
  { id: 'outdoor_dining', label: 'Outdoor dining', category: 'Outdoor' },
  { id: 'bbq', label: 'BBQ grill', category: 'Outdoor' },
  { id: 'firepit', label: 'Fire pit', category: 'Outdoor' },
  { id: 'garden', label: 'Garden', category: 'Outdoor' },
  { id: 'hammock', label: 'Hammock', category: 'Outdoor' },
  { id: 'parking', label: 'Free parking', category: 'Parking & facilities' },
  { id: 'paid_parking', label: 'Paid parking', category: 'Parking & facilities' },
  { id: 'ev_charger', label: 'EV charger', category: 'Parking & facilities' },
  { id: 'gym', label: 'Gym', category: 'Parking & facilities' },
  { id: 'elevator', label: 'Elevator', category: 'Parking & facilities' },
  { id: 'crib', label: 'Crib', category: 'Family' },
  { id: 'high_chair', label: 'High chair', category: 'Family' },
  { id: 'baby_gates', label: 'Baby safety gates', category: 'Family' },
  { id: 'kids_toys', label: "Children's toys", category: 'Family' },
  { id: 'breakfast', label: 'Breakfast', category: 'Services' },
  { id: 'self_checkin', label: 'Self check-in', category: 'Services' },
  { id: 'smart_lock', label: 'Smart lock', category: 'Services' },
  { id: 'luggage_dropoff', label: 'Luggage drop-off', category: 'Services' },
  { id: 'long_term', label: 'Long-term stays', category: 'Services' },
  { id: 'pets', label: 'Pets allowed', category: 'Services' },
  { id: 'beachfront', label: 'Beachfront', category: 'Location' },
  { id: 'waterfront', label: 'Waterfront', category: 'Location' },
  { id: 'lake_access', label: 'Lake access', category: 'Location' },
  { id: 'ski_in_out', label: 'Ski-in/out', category: 'Location' },
  { id: 'step_free', label: 'Step-free entrance', category: 'Accessibility' },
  { id: 'wide_doorway', label: 'Wide doorway', category: 'Accessibility' },
  { id: 'accessible_bathroom', label: 'Accessible bathroom', category: 'Accessibility' },
  { id: 'grab_rails', label: 'Grab rails', category: 'Accessibility' },
];

export const SAFETY_OPTIONS: { id: string; label: string }[] = [
  { id: 'smoke_alarm', label: 'Smoke alarm' },
  { id: 'co_alarm', label: 'Carbon monoxide alarm' },
  { id: 'first_aid', label: 'First aid kit' },
  { id: 'extinguisher', label: 'Fire extinguisher' },
  { id: 'camera', label: 'Exterior security camera' },
];

export const MIN_PHOTOS = 6;
