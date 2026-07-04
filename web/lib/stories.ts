// Curated "Travel Stories" cards for the website — editorial browsing content,
// clearly illustrative (mirrors user/src/data/homeContent.ts `stories`).
const img = (id: string) => `https://images.unsplash.com/${id}?w=800&h=600&fit=crop`;

export type Story = {
  title: string;
  category: string;
  excerpt: string;
  author: string;
  date: string;
  image: string;
};

export const TRAVEL_STORIES: Story[] = [
  {
    title: 'Island-Hopping the Greek Isles',
    category: 'ITINERARY',
    excerpt: 'From Santorini to Naxos without ever feeling rushed — the slow-travel route.',
    author: 'James Okoro',
    date: '5 days ago',
    image: img('photo-1533105079780-92b9be482077'),
  },
  {
    title: 'Down the Pacific Coast Highway',
    category: 'ROAD TRIP',
    excerpt: 'Big Sur cliffs, secret coves and clifftop diners on the greatest drive in the West.',
    author: 'Sarah Chen',
    date: '1 week ago',
    image: img('photo-1449824913935-59a10b8d2000'),
  },
  {
    title: 'Cherry Blossoms in Kyoto',
    category: 'SEASONAL',
    excerpt: 'Where and when to catch the sakura at their fleeting, once-a-year peak.',
    author: 'Maya Iyer',
    date: '2 weeks ago',
    image: img('photo-1545569341-9eb8b30979d9'),
  },
];
