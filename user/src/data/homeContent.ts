// Geo-personalised home content — Popular Destinations & Travel Stories per country.
// Picked from the visitor's detected country (useLocationDetection). Falls back to a
// global mix. Swap for live tourism/CMS APIs once the backend is wired.

const img = (id: string) => `https://images.unsplash.com/${id}?w=800&h=600&fit=crop`;

export type HomeDest = { id: string; city: string; country: string; image: string; properties: string; description: string };
export type HomeStory = { id: string; title: string; category: string; excerpt: string; author: string; date: string; image: string };
export type HomeContent = { name: string; destinations: HomeDest[]; stories: HomeStory[] };

const CONTENT: Record<string, HomeContent> = {
  IN: {
    name: 'India',
    destinations: [
      { id: 'in1', city: 'Agra', country: 'India', image: img('photo-1564507592333-c60657eea523'), properties: '1,400+', description: 'Home of the Taj Mahal' },
      { id: 'in2', city: 'Jaipur', country: 'India', image: img('photo-1477587458883-47145ed94245'), properties: '2,100+', description: 'The Pink City' },
      { id: 'in3', city: 'Goa', country: 'India', image: img('photo-1512343879784-a960bf40e7f2'), properties: '3,000+', description: 'Beaches & nightlife' },
      { id: 'in4', city: 'Kerala', country: 'India', image: img('photo-1602216056096-3b40cc0c9944'), properties: '1,800+', description: 'Backwaters & houseboats' },
      { id: 'in5', city: 'Udaipur', country: 'India', image: img('photo-1609920658906-8223bd289001'), properties: '900+', description: 'City of lakes' },
      { id: 'in6', city: 'Varanasi', country: 'India', image: img('photo-1561361513-2d000a50f0dc'), properties: '700+', description: 'Ghats on the Ganges' },
    ],
    stories: [
      { id: 'ins1', title: '10 Days Across Royal Rajasthan', category: 'ITINERARY', excerpt: 'From Jaipur’s forts to Udaipur’s lakes — the desert state’s grandest circuit...', author: 'Priya Nair', date: '3 days ago', image: img('photo-1609920658906-8223bd289001') },
      { id: 'ins2', title: 'A Street-Food Crawl Through Old Delhi', category: 'FOOD & CULTURE', excerpt: 'Chaat, parathas and jalebis in the lanes of Chandni Chowk...', author: 'Arjun Rao', date: '1 week ago', image: img('photo-1556910103-1c02745aae4d') },
      { id: 'ins3', title: 'Chasing the Monsoon Greens of Kerala', category: 'NATURE', excerpt: 'Tea hills, backwaters and elephants — why the rains are the best time...', author: 'Maya Iyer', date: '2 weeks ago', image: img('photo-1602216056096-3b40cc0c9944') },
    ],
  },
  US: {
    name: 'the USA',
    destinations: [
      { id: 'us1', city: 'New York', country: 'USA', image: img('photo-1496442226666-8d4d0e62e6e9'), properties: '5,600+', description: 'The city that never sleeps' },
      { id: 'us2', city: 'Grand Canyon', country: 'USA', image: img('photo-1474044159687-1ee9f3a51722'), properties: '600+', description: 'A mile-deep wonder' },
      { id: 'us3', city: 'San Francisco', country: 'USA', image: img('photo-1501594907352-04cda38ebc29'), properties: '890+', description: 'Bay views & cable cars' },
      { id: 'us4', city: 'Miami', country: 'USA', image: img('photo-1535498730771-e735b998cd64'), properties: '3,200+', description: 'Beaches & art deco' },
      { id: 'us5', city: 'Los Angeles', country: 'USA', image: img('photo-1444723121867-7a241cacace9'), properties: '2,400+', description: 'Sunshine & glamour' },
    ],
    stories: [
      { id: 'uss1', title: 'Down the Pacific Coast Highway', category: 'ROAD TRIP', excerpt: 'Big Sur cliffs, secret coves and clifftop diners on the greatest drive...', author: 'Sarah Chen', date: '2 days ago', image: img('photo-1449824913935-59a10b8d2000') },
      { id: 'uss2', title: '48 Hours in New York', category: 'CITY GUIDE', excerpt: 'How to do the highlights — and a few hidden gems — in one weekend...', author: 'James Okoro', date: '6 days ago', image: img('photo-1496442226666-8d4d0e62e6e9') },
      { id: 'uss3', title: 'National Parks of the American West', category: 'NATURE', excerpt: 'Zion, Yosemite, the Grand Canyon — planning the ultimate parks loop...', author: 'Emma Wilson', date: '2 weeks ago', image: img('photo-1474044159687-1ee9f3a51722') },
    ],
  },
  GB: {
    name: 'the UK',
    destinations: [
      { id: 'gb1', city: 'London', country: 'UK', image: img('photo-1513635269975-59663e0ac1ad'), properties: '4,800+', description: 'Timeless & buzzing' },
      { id: 'gb2', city: 'Edinburgh', country: 'UK', image: img('photo-1506377585622-bedcbb027afc'), properties: '1,200+', description: 'Castles & closes' },
      { id: 'gb3', city: 'Bath', country: 'UK', image: img('photo-1599757287374-9c3e9b5c0b0e'), properties: '700+', description: 'Roman baths & Georgian streets' },
      { id: 'gb4', city: 'Lake District', country: 'UK', image: img('photo-1465056836041-7f43ac27dcb5'), properties: '900+', description: 'Fells & lakes' },
      { id: 'gb5', city: 'York', country: 'UK', image: img('photo-1513635269975-59663e0ac1ad'), properties: '600+', description: 'Medieval walls & minster' },
    ],
    stories: [
      { id: 'gbs1', title: 'A Weekend in Edinburgh', category: 'CITY GUIDE', excerpt: 'Closes, castles and cosy pubs — the perfect two days in the capital...', author: 'James Okoro', date: '4 days ago', image: img('photo-1506377585622-bedcbb027afc') },
      { id: 'gbs2', title: 'Afternoon Tea, Done Right', category: 'FOOD & CULTURE', excerpt: 'Where to find the best scones and a proper pot of tea in London...', author: 'Olivia Rossi', date: '1 week ago', image: img('photo-1556910103-1c02745aae4d') },
      { id: 'gbs3', title: 'Walking the Lake District', category: 'NATURE', excerpt: 'A first-timer’s guide to the fells, from gentle strolls to Scafell Pike...', author: 'Lucas Müller', date: '2 weeks ago', image: img('photo-1465056836041-7f43ac27dcb5') },
    ],
  },
  AE: {
    name: 'the UAE',
    destinations: [
      { id: 'ae1', city: 'Dubai', country: 'UAE', image: img('photo-1512453979798-5ea266f8880c'), properties: '4,200+', description: 'Skyline, souks & superlatives' },
      { id: 'ae2', city: 'Abu Dhabi', country: 'UAE', image: img('photo-1512632578888-169bbbc64f33'), properties: '2,100+', description: 'Grand mosque & islands' },
      { id: 'ae3', city: 'Sharjah', country: 'UAE', image: img('photo-1518684079-3c830dcef090'), properties: '700+', description: 'Heritage & arts' },
      { id: 'ae4', city: 'Ras Al Khaimah', country: 'UAE', image: img('photo-1547234935-80c7145ec969'), properties: '500+', description: 'Mountains & desert' },
      { id: 'ae5', city: 'Al Ain', country: 'UAE', image: img('photo-1518684079-3c830dcef090'), properties: '400+', description: 'Oases & the garden city' },
    ],
    stories: [
      { id: 'aes1', title: 'Dubai in Three Days', category: 'CITY GUIDE', excerpt: 'Skyline to souk — balancing the futuristic and the traditional...', author: 'Aisha Khan', date: '3 days ago', image: img('photo-1512453979798-5ea266f8880c') },
      { id: 'aes2', title: 'Beyond the Skyline: Emirati Heritage', category: 'CULTURE', excerpt: 'Wind-tower houses, pearl-diving history and the quiet side of the Emirates...', author: 'Omar Saeed', date: '1 week ago', image: img('photo-1518684079-3c830dcef090') },
      { id: 'aes3', title: 'A Night in the Arabian Desert', category: 'ADVENTURE', excerpt: 'Falconry, dunes and a sky full of stars an hour from the city...', author: 'Diego Torres', date: '2 weeks ago', image: img('photo-1547234935-80c7145ec969') },
    ],
  },
  FR: {
    name: 'France',
    destinations: [
      { id: 'fr1', city: 'Paris', country: 'France', image: img('photo-1502602898657-3e91760cbb34'), properties: '4,100+', description: 'The city of light' },
      { id: 'fr2', city: 'Nice', country: 'France', image: img('photo-1491166617655-0723a0999cfc'), properties: '1,300+', description: 'Riviera beaches' },
      { id: 'fr3', city: 'Provence', country: 'France', image: img('photo-1499678329028-101435549a4e'), properties: '900+', description: 'Lavender & hilltop towns' },
      { id: 'fr4', city: 'Bordeaux', country: 'France', image: img('photo-1506377585622-bedcbb027afc'), properties: '700+', description: 'World-famous vineyards' },
      { id: 'fr5', city: 'Mont-Saint-Michel', country: 'France', image: img('photo-1467269204594-9661b134dd2b'), properties: '300+', description: 'An abbey in the sea' },
    ],
    stories: [
      { id: 'frs1', title: 'A Perfect Day in Paris', category: 'CITY GUIDE', excerpt: 'Croissants, the Seine and a sunset from Montmartre...', author: 'Olivia Rossi', date: '2 days ago', image: img('photo-1502602898657-3e91760cbb34') },
      { id: 'frs2', title: 'The French Riviera by Train', category: 'ITINERARY', excerpt: 'Nice to Menton, hopping the coastal towns of the Côte d’Azur...', author: 'Marcus Lee', date: '1 week ago', image: img('photo-1491166617655-0723a0999cfc') },
      { id: 'frs3', title: 'Châteaux of the Loire Valley', category: 'CULTURE', excerpt: 'Fairy-tale castles and vineyards, a short ride from Paris...', author: 'Lucas Müller', date: '2 weeks ago', image: img('photo-1467269204594-9661b134dd2b') },
    ],
  },
  JP: {
    name: 'Japan',
    destinations: [
      { id: 'jp1', city: 'Tokyo', country: 'Japan', image: img('photo-1540959733332-eab4deabeeaf'), properties: '5,000+', description: 'Neon & tradition' },
      { id: 'jp2', city: 'Kyoto', country: 'Japan', image: img('photo-1545569341-9eb8b30979d9'), properties: '1,900+', description: 'Temples & gardens' },
      { id: 'jp3', city: 'Mount Fuji', country: 'Japan', image: img('photo-1490806843957-31f4c9a91c65'), properties: '600+', description: 'Japan’s sacred peak' },
      { id: 'jp4', city: 'Osaka', country: 'Japan', image: img('photo-1590559899731-a382839e5549'), properties: '2,200+', description: 'Street food & nightlife' },
      { id: 'jp5', city: 'Hiroshima', country: 'Japan', image: img('photo-1493976040374-85c8e12f0c0e'), properties: '500+', description: 'Peace & island shrines' },
    ],
    stories: [
      { id: 'jps1', title: 'Cherry Blossoms in Kyoto', category: 'SEASONAL', excerpt: 'Where and when to catch the sakura at their fleeting peak...', author: 'Maya Iyer', date: '3 days ago', image: img('photo-1545569341-9eb8b30979d9') },
      { id: 'jps2', title: 'Tokyo After Dark', category: 'CITY GUIDE', excerpt: 'Izakaya alleys, skyline bars and the city that comes alive at night...', author: 'Marcus Lee', date: '1 week ago', image: img('photo-1540959733332-eab4deabeeaf') },
      { id: 'jps3', title: 'Riding the Shinkansen', category: 'TRAVEL TIPS', excerpt: 'How to make the most of the rail pass and see Japan at 300 km/h...', author: 'Sarah Chen', date: '2 weeks ago', image: img('photo-1490806843957-31f4c9a91c65') },
    ],
  },
  SG: {
    name: 'Singapore',
    destinations: [
      { id: 'sg1', city: 'Marina Bay', country: 'Singapore', image: img('photo-1525625293386-3f8f99389edd'), properties: '1,200+', description: 'Iconic skyline' },
      { id: 'sg2', city: 'Gardens by the Bay', country: 'Singapore', image: img('photo-1559681113-3a3c0b6e0f0e'), properties: '400+', description: 'Supertrees & domes' },
      { id: 'sg3', city: 'Sentosa', country: 'Singapore', image: img('photo-1565967511849-76a60a516170'), properties: '600+', description: 'Beaches & theme parks' },
      { id: 'sg4', city: 'Chinatown', country: 'Singapore', image: img('photo-1533628635777-112b2239b1c7'), properties: '800+', description: 'Temples & hawkers' },
      { id: 'sg5', city: 'Little India', country: 'Singapore', image: img('photo-1533628635777-112b2239b1c7'), properties: '500+', description: 'Colour & spice' },
    ],
    stories: [
      { id: 'sgs1', title: 'Eating Your Way Through Singapore', category: 'FOOD & CULTURE', excerpt: 'A hawker-stall guide to the dishes you can’t leave without trying...', author: 'Priya Nair', date: '4 days ago', image: img('photo-1533628635777-112b2239b1c7') },
      { id: 'sgs2', title: '24 Hours in the Lion City', category: 'CITY GUIDE', excerpt: 'Gardens, skyline and street food packed into one perfect day...', author: 'James Okoro', date: '1 week ago', image: img('photo-1525625293386-3f8f99389edd') },
      { id: 'sgs3', title: 'Singapore with Kids', category: 'FAMILY', excerpt: 'Sentosa, the zoo and Gardens by the Bay — the family highlights...', author: 'Emma Wilson', date: '2 weeks ago', image: img('photo-1565967511849-76a60a516170') },
    ],
  },
  global: {
    name: 'the world',
    destinations: [
      { id: 'g1', city: 'Santorini', country: 'Greece', image: img('photo-1570077188670-e3a8d69ac5ff'), properties: '1,200+', description: 'Sunsets & blue domes' },
      { id: 'g2', city: 'Bali', country: 'Indonesia', image: img('photo-1537953773345-d172ccf13cf1'), properties: '3,400+', description: 'Rice terraces & beaches' },
      { id: 'g3', city: 'Rome', country: 'Italy', image: img('photo-1552832230-c0197dd311b5'), properties: '1,500+', description: 'Ruins & dolce vita' },
      { id: 'g4', city: 'Barcelona', country: 'Spain', image: img('photo-1562883676-8c7feb83f09b'), properties: '2,800+', description: 'Gaudí & beaches' },
      { id: 'g5', city: 'Dubai', country: 'UAE', image: img('photo-1512453979798-5ea266f8880c'), properties: '4,200+', description: 'Skyline & desert' },
      { id: 'g6', city: 'New York', country: 'USA', image: img('photo-1496442226666-8d4d0e62e6e9'), properties: '5,600+', description: 'The city that never sleeps' },
    ],
    stories: [
      { id: 'gs1', title: 'Island-Hopping the Greek Isles', category: 'ITINERARY', excerpt: 'From Santorini to Naxos without ever feeling rushed...', author: 'James Okoro', date: '5 days ago', image: img('photo-1533105079780-92b9be482077') },
      { id: 'gs2', title: 'A First-Timer’s Rome', category: 'CITY GUIDE', excerpt: 'How to see the icons and still find time for gelato...', author: 'Olivia Rossi', date: '1 week ago', image: img('photo-1552832230-c0197dd311b5') },
      { id: 'gs3', title: 'Southeast Asia on a Budget', category: 'BUDGET TIPS', excerpt: 'Weeks of beaches, temples and street food without breaking the bank...', author: 'Diego Torres', date: '2 weeks ago', image: img('photo-1537953773345-d172ccf13cf1') },
    ],
  },
};

const NAME_KEY: Record<string, string> = {
  india: 'IN',
  'united states': 'US', usa: 'US', 'united states of america': 'US', america: 'US',
  'united kingdom': 'GB', uk: 'GB', england: 'GB', scotland: 'GB', wales: 'GB', britain: 'GB',
  'united arab emirates': 'AE', uae: 'AE', emirates: 'AE',
  france: 'FR', japan: 'JP', singapore: 'SG',
};

export function homeContentFor(countryName?: string): HomeContent {
  const key = NAME_KEY[(countryName || '').toLowerCase().trim()] || 'global';
  return CONTENT[key] || CONTENT.global;
}
