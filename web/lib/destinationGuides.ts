// Editorial destination guides — "popular places to visit" per destination
// (attractions, not stays), with facts and imagery. Curated content so it's
// fast and reliable with no external API/key. To swap in a live source later
// (Google Places / TripAdvisor / etc.), keep `getGuide(slug)`'s shape and fetch
// inside it — the pages don't change.
const img = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

export interface Attraction {
  name: string;
  category: string;
  blurb: string;
  image: string;
}
export interface DestinationGuide {
  slug: string;
  city: string;
  country: string;
  tagline: string;
  hero: string;
  about: string;
  population: string;
  bestTime: string;
  language: string;
  currency: string;
  knownFor: string[];
  attractions: Attraction[];
}

export const DESTINATION_GUIDES: DestinationGuide[] = [
  {
    slug: 'agra',
    city: 'Agra', country: 'India', tagline: 'Home of the Taj Mahal',
    hero: img('photo-1564507592333-c60657eea523'),
    about:
      'Agra, on the banks of the Yamuna in Uttar Pradesh, was the capital of the Mughal Empire and is home to three UNESCO World Heritage Sites. Beyond the world-famous Taj Mahal, it is a city of grand forts, marble craftsmanship and rich Mughlai cuisine.',
    population: '≈ 1.7 million',
    bestTime: 'October to March (cool, clear)',
    language: 'Hindi, Urdu, English', currency: 'Indian Rupee (₹)',
    knownFor: ['Taj Mahal', 'Mughal history', 'Marble inlay craft', 'Petha sweets'],
    attractions: [
      { name: 'Taj Mahal', category: 'Monument', blurb: 'The 17th-century white-marble mausoleum built by Shah Jahan — one of the New Seven Wonders of the World.', image: img('photo-1564507592333-c60657eea523', 600, 450) },
      { name: 'Agra Fort', category: 'Fort · UNESCO', blurb: 'A vast red-sandstone Mughal fortress with palaces, halls and a view of the Taj across the river.', image: img('photo-1585506942812-e72b29cef752', 600, 450) },
      { name: 'Fatehpur Sikri', category: 'Heritage city', blurb: 'A perfectly preserved Mughal city of red sandstone, once Akbar’s capital, 40 km from Agra.', image: img('photo-1524492412937-b28074a5d7da', 600, 450) },
      { name: 'Mehtab Bagh', category: 'Garden', blurb: 'The “moonlight garden” directly across the Yamuna — the classic sunset view of the Taj.', image: img('photo-1548013146-72479768bada', 600, 450) },
      { name: "Itmad-ud-Daulah", category: 'Monument', blurb: 'The “Baby Taj” — an exquisite marble tomb that inspired the Taj Mahal’s design.', image: img('photo-1477587458883-47145ed94245', 600, 450) },
    ],
  },
  {
    slug: 'paris',
    city: 'Paris', country: 'France', tagline: 'The City of Lights',
    hero: img('photo-1502602898657-3e91760cbb34'),
    about:
      'The capital of France and a global centre of art, fashion, gastronomy and culture. Paris pairs grand boulevards and iconic monuments with intimate cafés and the slow-flowing Seine.',
    population: '≈ 2.1 million (11M metro)',
    bestTime: 'April–June, September–October',
    language: 'French', currency: 'Euro (€)',
    knownFor: ['Eiffel Tower', 'Louvre', 'Cafés & pâtisserie', 'Fashion'],
    attractions: [
      { name: 'Eiffel Tower', category: 'Landmark', blurb: 'The 330 m iron icon of Paris — climb it or picnic beneath it on the Champ de Mars.', image: img('photo-1511739001486-6bfe10ce785f', 600, 450) },
      { name: 'Louvre Museum', category: 'Museum', blurb: 'The world’s most-visited museum, home to the Mona Lisa and 35,000 works of art.', image: img('photo-1565099824688-e93eb20fe622', 600, 450) },
      { name: 'Notre-Dame & Île de la Cité', category: 'Cathedral', blurb: 'The Gothic heart of Paris on an island in the Seine.', image: img('photo-1478391679764-b2d8b3cd1e94', 600, 450) },
      { name: 'Montmartre & Sacré-Cœur', category: 'Neighbourhood', blurb: 'A hilltop artists’ quarter crowned by a white basilica with sweeping city views.', image: img('photo-1550340499-a6c60fc8287c', 600, 450) },
      { name: 'Champs-Élysées & Arc de Triomphe', category: 'Avenue', blurb: 'The grandest avenue in the world, ending at Napoleon’s triumphal arch.', image: img('photo-1520939817895-060bdaf4bc05', 600, 450) },
    ],
  },
  {
    slug: 'tokyo',
    city: 'Tokyo', country: 'Japan', tagline: 'Neon & tradition',
    hero: img('photo-1540959733332-eab4deabeeaf'),
    about:
      'Japan’s dazzling capital blends ultra-modern skylines and neon districts with centuries-old temples, tranquil gardens and the world’s finest food scene.',
    population: '≈ 14 million (37M metro)',
    bestTime: 'March–May (blossom), Oct–Nov',
    language: 'Japanese', currency: 'Japanese Yen (¥)',
    knownFor: ['Shibuya Crossing', 'Sushi & ramen', 'Cherry blossom', 'Anime & tech'],
    attractions: [
      { name: 'Shibuya Crossing', category: 'Landmark', blurb: 'The world’s busiest pedestrian scramble, lit by giant screens and neon.', image: img('photo-1542051841857-5f90071e7989', 600, 450) },
      { name: 'Senso-ji Temple', category: 'Temple', blurb: 'Tokyo’s oldest temple in Asakusa, approached through a lantern-lit market street.', image: img('photo-1583400821527-5f66f5f04831', 600, 450) },
      { name: 'Meiji Shrine', category: 'Shrine', blurb: 'A serene forest shrine in the middle of the city, dedicated to Emperor Meiji.', image: img('photo-1528360983277-13d401cdc186', 600, 450) },
      { name: 'Shinjuku Gyo-en', category: 'Garden', blurb: 'A vast landscaped park famous for cherry blossoms and autumn colour.', image: img('photo-1522547902298-51566e4fb383', 600, 450) },
      { name: 'Tokyo Skytree', category: 'Tower', blurb: 'At 634 m, the tallest tower in the world, with observation decks over the metropolis.', image: img('photo-1536098561742-ca998e48cbcc', 600, 450) },
    ],
  },
  {
    slug: 'dubai',
    city: 'Dubai', country: 'UAE', tagline: 'Skyline & desert',
    hero: img('photo-1512453979798-5ea266f8880c'),
    about:
      'A futuristic city risen from the desert, Dubai is known for record-breaking architecture, luxury shopping, golden beaches and thrilling desert adventures.',
    population: '≈ 3.6 million',
    bestTime: 'November to March (mild)',
    language: 'Arabic, English', currency: 'UAE Dirham (د.إ)',
    knownFor: ['Burj Khalifa', 'Desert safari', 'Luxury malls', 'Beaches'],
    attractions: [
      { name: 'Burj Khalifa', category: 'Skyscraper', blurb: 'The tallest building on Earth at 828 m, with observation decks near the clouds.', image: img('photo-1518684079-3c830dcef090', 600, 450) },
      { name: 'The Dubai Mall & Fountain', category: 'Shopping', blurb: 'One of the world’s largest malls beside a choreographed fountain show.', image: img('photo-1546412414-e1885259563a', 600, 450) },
      { name: 'Palm Jumeirah', category: 'Island', blurb: 'A palm-shaped man-made archipelago lined with resorts and beach clubs.', image: img('photo-1512453979798-5ea266f8880c', 600, 450) },
      { name: 'Desert Safari', category: 'Adventure', blurb: 'Dune-bashing, camel rides and Bedouin dinners under the stars.', image: img('photo-1451337516015-6b6e9a44a8a3', 600, 450) },
      { name: 'Dubai Marina', category: 'Waterfront', blurb: 'A glittering canal district of yachts, towers and waterfront dining.', image: img('photo-1526495124232-a04e1849168c', 600, 450) },
    ],
  },
  {
    slug: 'bali',
    city: 'Bali', country: 'Indonesia', tagline: 'Rice terraces & beaches',
    hero: img('photo-1537953773345-d172ccf13cf1'),
    about:
      'The “Island of the Gods” is famed for emerald rice terraces, volcanic peaks, surf beaches, ancient temples and a deeply spiritual Hindu culture.',
    population: '≈ 4.3 million (island)',
    bestTime: 'April to October (dry)',
    language: 'Indonesian, Balinese', currency: 'Indonesian Rupiah (Rp)',
    knownFor: ['Rice terraces', 'Temples', 'Surfing', 'Wellness & yoga'],
    attractions: [
      { name: 'Tegallalang Rice Terraces', category: 'Nature', blurb: 'Sculpted emerald paddies near Ubud, a classic Bali panorama.', image: img('photo-1531592937781-344ad608fabf', 600, 450) },
      { name: 'Uluwatu Temple', category: 'Temple', blurb: 'A clifftop sea temple with sunset Kecak fire dances over the Indian Ocean.', image: img('photo-1518548419970-58e3b4079ab2', 600, 450) },
      { name: 'Mount Batur', category: 'Volcano', blurb: 'A sunrise trek up an active volcano rewarded with caldera views.', image: img('photo-1604999333679-b86d54738315', 600, 450) },
      { name: 'Ubud', category: 'Town', blurb: 'Bali’s cultural heart — art markets, the Monkey Forest and yoga retreats.', image: img('photo-1552733407-5d5c46c3bb3b', 600, 450) },
      { name: 'Seminyak Beach', category: 'Beach', blurb: 'Sunset beach clubs, surf and stylish dining on the west coast.', image: img('photo-1537996194471-e657df975ab4', 600, 450) },
    ],
  },
  {
    slug: 'santorini',
    city: 'Santorini', country: 'Greece', tagline: 'Sunsets & blue domes',
    hero: img('photo-1570077188670-e3a8d69ac5ff'),
    about:
      'A crescent of whitewashed villages perched on volcanic cliffs above a flooded caldera, Santorini is famed for blue-domed churches, black-sand beaches and the world’s most celebrated sunsets.',
    population: '≈ 15,500',
    bestTime: 'May–June, September',
    language: 'Greek', currency: 'Euro (€)',
    knownFor: ['Caldera sunsets', 'Blue domes', 'Wine', 'Volcanic beaches'],
    attractions: [
      { name: 'Oia Village', category: 'Village', blurb: 'The postcard village of blue domes and cliffside cafés, famous for sunset.', image: img('photo-1570077188670-e3a8d69ac5ff', 600, 450) },
      { name: 'Fira', category: 'Town', blurb: 'The clifftop capital with caldera views, shops and cable car to the old port.', image: img('photo-1613395877344-13d4a8e0d49e', 600, 450) },
      { name: 'Red Beach', category: 'Beach', blurb: 'Dramatic red volcanic cliffs meeting clear Aegean water.', image: img('photo-1601581875309-fafbf2d3ed3a', 600, 450) },
      { name: 'Ancient Akrotiri', category: 'Archaeology', blurb: 'A Bronze-Age Minoan town preserved by volcanic ash — a “Greek Pompeii”.', image: img('photo-1533105079780-92b9be482077', 600, 450) },
      { name: 'Caldera Boat Tour', category: 'Experience', blurb: 'Sail to the volcano, hot springs and Thirassia island.', image: img('photo-1571406252241-db0280bd36cd', 600, 450) },
    ],
  },
  {
    slug: 'new-york',
    city: 'New York', country: 'USA', tagline: 'The city that never sleeps',
    hero: img('photo-1496442226666-8d4d0e62e6e9'),
    about:
      'The cultural capital of the world — a dense, electric city of skyscrapers, world-class museums, Broadway theatre, iconic parks and every cuisine on Earth.',
    population: '≈ 8.3 million',
    bestTime: 'April–June, Sept–early Nov',
    language: 'English', currency: 'US Dollar ($)',
    knownFor: ['Times Square', 'Central Park', 'Broadway', 'Museums'],
    attractions: [
      { name: 'Statue of Liberty', category: 'Landmark', blurb: 'The symbol of freedom on Liberty Island, reached by ferry from Battery Park.', image: img('photo-1605130284535-11dd9eedc58a', 600, 450) },
      { name: 'Central Park', category: 'Park', blurb: '340 hectares of lakes, meadows and trails in the middle of Manhattan.', image: img('photo-1534804064477-1b7e1e5e3e5f', 600, 450) },
      { name: 'Times Square', category: 'Landmark', blurb: 'The neon-lit crossroads of the world and Broadway’s theatre district.', image: img('photo-1560807707-8cc77767d783', 600, 450) },
      { name: 'The Met', category: 'Museum', blurb: 'The Metropolitan Museum of Art — 5,000 years of art on Museum Mile.', image: img('photo-1518998053901-5348d3961a04', 600, 450) },
      { name: 'Brooklyn Bridge', category: 'Landmark', blurb: 'Walk the historic span for skyline views of Lower Manhattan.', image: img('photo-1543716091-a840c05249ec', 600, 450) },
    ],
  },
  {
    slug: 'los-angeles',
    city: 'Los Angeles', country: 'USA', tagline: 'Sunshine & city glamour',
    hero: img('photo-1444723121867-7a241cacace9'),
    about:
      'The entertainment capital of the world, LA sprawls from Pacific beaches to the Hollywood Hills, mixing celebrity glamour, art, diverse neighbourhoods and year-round sun.',
    population: '≈ 3.9 million',
    bestTime: 'March–May, September–November',
    language: 'English, Spanish', currency: 'US Dollar ($)',
    knownFor: ['Hollywood', 'Beaches', 'Griffith Observatory', 'Food'],
    attractions: [
      { name: 'Hollywood Sign & Walk of Fame', category: 'Landmark', blurb: 'The iconic hillside sign and star-studded boulevard of cinema.', image: img('photo-1580655653885-65763b2597d0', 600, 450) },
      { name: 'Griffith Observatory', category: 'Viewpoint', blurb: 'City and sign views by day, planetarium and stars by night.', image: img('photo-1518533954129-7774297db60f', 600, 450) },
      { name: 'Santa Monica Pier', category: 'Beach', blurb: 'A classic California boardwalk with a Ferris wheel over the Pacific.', image: img('photo-1534190760961-74e8c1b5c3da', 600, 450) },
      { name: 'Getty Center', category: 'Museum', blurb: 'Hilltop galleries, gardens and architecture with sweeping views.', image: img('photo-1605833556294-ea5c7a74f57d', 600, 450) },
      { name: 'Venice Beach', category: 'Neighbourhood', blurb: 'Bohemian boardwalk, skate park, canals and street performers.', image: img('photo-1503152394-c571994fd383', 600, 450) },
    ],
  },
  {
    slug: 'miami',
    city: 'Miami', country: 'USA', tagline: 'Beaches & art deco',
    hero: img('photo-1535498730771-e735b998cd64'),
    about:
      'A sun-soaked coastal city where Latin American energy meets pastel Art-Deco streets, turquoise beaches, world-class nightlife and cutting-edge art.',
    population: '≈ 450,000 (6M metro)',
    bestTime: 'November to April',
    language: 'English, Spanish', currency: 'US Dollar ($)',
    knownFor: ['South Beach', 'Art Deco', 'Little Havana', 'Nightlife'],
    attractions: [
      { name: 'South Beach', category: 'Beach', blurb: 'Iconic white sand, lifeguard towers and the Art-Deco Ocean Drive.', image: img('photo-1506966953602-c20cc11f75e3', 600, 450) },
      { name: 'Art Deco Historic District', category: 'Architecture', blurb: 'Hundreds of pastel 1930s buildings — the largest Art-Deco district on Earth.', image: img('photo-1533106418989-88406c7cc8ca', 600, 450) },
      { name: 'Wynwood Walls', category: 'Art', blurb: 'An open-air museum of giant street-art murals and galleries.', image: img('photo-1567002260466-3a15c1e1a3f7', 600, 450) },
      { name: 'Little Havana', category: 'Neighbourhood', blurb: 'Cuban cafés, cigar shops and salsa along Calle Ocho.', image: img('photo-1571003123894-1f0594d2b5d9', 600, 450) },
      { name: 'Vizcaya Museum & Gardens', category: 'Estate', blurb: 'An Italian-Renaissance villa with formal gardens on Biscayne Bay.', image: img('photo-1605723517503-3cadb5818a0c', 600, 450) },
    ],
  },
];

export function getGuide(slug: string): DestinationGuide | undefined {
  return DESTINATION_GUIDES.find((g) => g.slug === slug);
}
export function guideSlugForCity(city: string): string | undefined {
  return DESTINATION_GUIDES.find((g) => g.city.toLowerCase() === city.toLowerCase())?.slug;
}
