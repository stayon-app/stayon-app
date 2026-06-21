// Tourist attractions per destination — powers the Destination page (places to
// visit, not stays). Real photos are fetched by name via WikiImage. Mirrors the
// website's attractions dataset.

export type Attraction = { name: string; blurb: string };

export const ATTRACTIONS: Record<string, Attraction[]> = {
  Agra: [{ name: 'Taj Mahal', blurb: 'The marble wonder at sunrise' }, { name: 'Agra Fort', blurb: 'Red-sandstone Mughal fortress' }, { name: 'Fatehpur Sikri', blurb: 'Abandoned imperial city' }, { name: 'Mehtab Bagh', blurb: 'Garden views of the Taj' }],
  Jaipur: [{ name: 'Amber Fort', blurb: 'Hilltop fort & mirror halls' }, { name: 'Hawa Mahal', blurb: 'The Palace of Winds' }, { name: 'City Palace, Jaipur', blurb: 'Royal courtyards & museums' }, { name: 'Jantar Mantar, Jaipur', blurb: 'Giant astronomical instruments' }],
  Goa: [{ name: 'Calangute Beach', blurb: 'The "Queen of Beaches"' }, { name: 'Basilica of Bom Jesus', blurb: 'UNESCO baroque church' }, { name: 'Fort Aguada', blurb: 'Clifftop Portuguese fort' }, { name: 'Dudhsagar Falls', blurb: 'Four-tiered jungle waterfall' }],
  Kerala: [{ name: 'Alappuzha', blurb: 'Backwater houseboat cruises' }, { name: 'Munnar', blurb: 'Rolling tea-plantation hills' }, { name: 'Fort Kochi', blurb: 'Chinese nets & colonial lanes' }, { name: 'Periyar National Park', blurb: 'Lakeside wildlife reserve' }],
  Udaipur: [{ name: 'Lake Pichola', blurb: 'Palaces on a shimmering lake' }, { name: 'City Palace, Udaipur', blurb: 'Sprawling lakeside palace' }, { name: 'Jag Mandir', blurb: 'Island palace retreat' }, { name: 'Sajjangarh Palace', blurb: 'The Monsoon Palace viewpoint' }],
  'New York': [{ name: 'Statue of Liberty', blurb: 'The icon in the harbour' }, { name: 'Central Park', blurb: '843 acres of green' }, { name: 'Times Square', blurb: 'Neon heart of the city' }, { name: 'Empire State Building', blurb: 'Art-deco skyline view' }],
  'Grand Canyon': [{ name: 'Grand Canyon South Rim', blurb: 'The classic canyon overlook' }, { name: 'Grand Canyon Skywalk', blurb: 'Glass bridge over the void' }, { name: 'Bright Angel Trail', blurb: 'Descend into the canyon' }],
  'San Francisco': [{ name: 'Golden Gate Bridge', blurb: 'The world-famous span' }, { name: 'Alcatraz Island', blurb: 'The legendary island prison' }, { name: "Fisherman's Wharf", blurb: 'Sea lions & seafood' }, { name: 'Lombard Street', blurb: 'The crookedest street' }],
  Miami: [{ name: 'South Beach', blurb: 'Sand, surf & people-watching' }, { name: 'Wynwood Walls', blurb: 'Open-air street-art museum' }, { name: 'Vizcaya Museum and Gardens', blurb: 'Italian-style estate' }],
  'Los Angeles': [{ name: 'Hollywood Sign', blurb: 'The hillside icon' }, { name: 'Santa Monica Pier', blurb: 'Ferris wheel by the sea' }, { name: 'Griffith Observatory', blurb: 'City & cosmos views' }, { name: 'Venice Beach', blurb: 'Boardwalk & muscle beach' }],
  London: [{ name: 'Tower of London', blurb: 'Crown Jewels & history' }, { name: 'Big Ben', blurb: 'The iconic clock tower' }, { name: 'British Museum', blurb: 'Treasures of the world' }, { name: 'London Eye', blurb: 'Giant riverside wheel' }],
  Edinburgh: [{ name: 'Edinburgh Castle', blurb: 'Fortress on a volcanic rock' }, { name: 'Royal Mile', blurb: "The old town's spine" }, { name: "Arthur's Seat", blurb: 'Hike to city-wide views' }],
  Bath: [{ name: 'Roman Baths', blurb: 'Ancient thermal spa' }, { name: 'Bath Abbey', blurb: 'Soaring Gothic church' }, { name: 'Royal Crescent', blurb: 'Sweeping Georgian terrace' }],
  'Lake District': [{ name: 'Windermere', blurb: "England's largest lake" }, { name: 'Scafell Pike', blurb: 'The highest English peak' }, { name: 'Derwentwater', blurb: 'Serene island-dotted lake' }],
  York: [{ name: 'York Minster', blurb: 'Magnificent Gothic cathedral' }, { name: 'The Shambles', blurb: 'Medieval cobbled lane' }, { name: 'York city walls', blurb: 'Walk the ancient ramparts' }],
  Dubai: [{ name: 'Burj Khalifa', blurb: "The world's tallest tower" }, { name: 'Dubai Mall', blurb: 'Shopping, aquarium & fountains' }, { name: 'Palm Jumeirah', blurb: 'The palm-shaped island' }, { name: 'Dubai Marina', blurb: 'Glittering waterfront walk' }],
  'Abu Dhabi': [{ name: 'Sheikh Zayed Mosque', blurb: 'Gleaming white marble' }, { name: 'Louvre Abu Dhabi', blurb: 'Art under a domed sky' }, { name: 'Ferrari World Abu Dhabi', blurb: 'Record-breaking coasters' }],
  Sharjah: [{ name: 'Sharjah Art Museum', blurb: 'The emirate of culture' }, { name: 'Al Noor Mosque', blurb: 'Ottoman-style landmark' }, { name: 'Blue Souk', blurb: 'Traditional covered market' }],
  'Ras Al Khaimah': [{ name: 'Jebel Jais', blurb: "UAE's highest peak & zipline" }, { name: 'Dhayah Fort', blurb: 'Hilltop historic fort' }, { name: 'Al Marjan Island', blurb: 'Man-made beach island' }],
  'Al Ain': [{ name: 'Al Ain Oasis', blurb: 'UNESCO palm oasis' }, { name: 'Jebel Hafeet', blurb: 'Mountain switchback drive' }, { name: 'Al Jahili Fort', blurb: '19th-century mud-brick fort' }],
  Paris: [{ name: 'Eiffel Tower', blurb: 'The symbol of Paris' }, { name: 'Louvre', blurb: 'The world’s greatest museum' }, { name: 'Notre-Dame de Paris', blurb: 'Gothic masterpiece' }, { name: 'Montmartre', blurb: 'Artists’ hilltop quarter' }],
  Nice: [{ name: 'Promenade des Anglais', blurb: 'Seafront strolling' }, { name: 'Castle Hill, Nice', blurb: 'Panorama over the bay' }, { name: 'Vieux Nice', blurb: 'Old town lanes & markets' }],
  Provence: [{ name: 'Gordes', blurb: 'Hilltop stone village' }, { name: 'Pont du Gard', blurb: 'Roman aqueduct wonder' }, { name: 'Avignon', blurb: 'City of the Popes' }],
  Bordeaux: [{ name: 'Place de la Bourse', blurb: 'Mirror-pool grandeur' }, { name: 'La Cité du Vin', blurb: 'Wine culture museum' }],
  'Mont-Saint-Michel': [{ name: 'Mont-Saint-Michel', blurb: 'Abbey rising from the sea' }],
  Tokyo: [{ name: 'Sensō-ji', blurb: "Tokyo's oldest temple" }, { name: 'Shibuya Crossing', blurb: 'The famous scramble' }, { name: 'Tokyo Tower', blurb: 'Red-and-white icon' }, { name: 'Meiji Shrine', blurb: 'Forest shrine in the city' }],
  Kyoto: [{ name: 'Fushimi Inari-taisha', blurb: 'Thousands of torii gates' }, { name: 'Kinkaku-ji', blurb: 'The Golden Pavilion' }, { name: 'Arashiyama Bamboo Grove', blurb: 'Towering green corridor' }],
  'Mount Fuji': [{ name: 'Lake Kawaguchi', blurb: 'Classic Fuji reflections' }, { name: 'Chureito Pagoda', blurb: 'Pagoda + Fuji view' }],
  Osaka: [{ name: 'Osaka Castle', blurb: 'Majestic moated castle' }, { name: 'Dōtonbori', blurb: 'Neon food paradise' }, { name: 'Universal Studios Japan', blurb: 'Blockbuster theme park' }],
  Hiroshima: [{ name: 'Hiroshima Peace Memorial', blurb: 'Moving memorial park' }, { name: 'Itsukushima Shrine', blurb: 'The floating torii gate' }],
  'Marina Bay': [{ name: 'Marina Bay Sands', blurb: 'Rooftop infinity pool' }, { name: 'Merlion', blurb: 'The city’s mascot' }, { name: 'ArtScience Museum', blurb: 'Lotus-shaped museum' }],
  'Gardens by the Bay': [{ name: 'Supertree Grove', blurb: 'Nightly light show' }, { name: 'Cloud Forest', blurb: 'Indoor mountain & mist' }, { name: 'Flower Dome', blurb: 'Vast glass greenhouse' }],
  Sentosa: [{ name: 'Universal Studios Singapore', blurb: 'Island theme park' }, { name: 'S.E.A. Aquarium', blurb: 'Vast ocean tanks' }, { name: 'Siloso Beach', blurb: 'Resort-island sands' }],
  Chinatown: [{ name: 'Buddha Tooth Relic Temple', blurb: 'Ornate Buddhist temple' }, { name: 'Maxwell Food Centre', blurb: 'Legendary hawker stalls' }],
  'Little India': [{ name: 'Sri Veeramakaliamman Temple', blurb: 'Colourful Hindu temple' }, { name: 'Tekka Centre', blurb: 'Spice market & food' }],
  Santorini: [{ name: 'Oia', blurb: 'Blue domes & sunsets' }, { name: 'Fira', blurb: 'Cliffside capital' }, { name: 'Red Beach', blurb: 'Striking volcanic cove' }],
  Bali: [{ name: 'Ubud', blurb: 'Rice terraces & temples' }, { name: 'Tanah Lot', blurb: 'Sea temple on a rock' }, { name: 'Uluwatu Temple', blurb: 'Clifftop sunset temple' }],
  Rome: [{ name: 'Colosseum', blurb: 'The ancient arena' }, { name: 'Vatican City', blurb: "St Peter's & the museums" }, { name: 'Trevi Fountain', blurb: 'Toss a coin' }],
  Barcelona: [{ name: 'Sagrada Família', blurb: "Gaudí's basilica" }, { name: 'Park Güell', blurb: 'Mosaic-tiled park' }, { name: 'La Rambla', blurb: 'The famous boulevard' }],
};

export function attractionsFor(place: string): Attraction[] {
  return ATTRACTIONS[place] || [];
}
