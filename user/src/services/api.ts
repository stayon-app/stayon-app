// API Service Layer - Backend Integration
// This handles all API calls to the backend

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.stayon.com';
const API_TIMEOUT = 15000; // 15 seconds

// Request headers
const getHeaders = () => {
  const token = ''; // TODO: Get from secure storage
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Generic API call wrapper with error handling
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    console.error('API Call Error:', error);
    return {
      data: null,
      error: error.message || 'Network request failed',
    };
  }
}

// ============================================
// LOCATION SERVICES
// ============================================

export interface LocationData {
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Detect user's current location using IP or GPS
 */
export async function detectUserLocation(): Promise<LocationData | null> {
  // TODO: Integrate with backend location detection API
  // This should call: GET /api/location/detect
  const { data, error } = await apiCall<LocationData>('/api/location/detect');
  
  if (error || !data) {
    // Fallback to default location
    return {
      city: 'Dubai',
      country: 'UAE',
      latitude: 25.2048,
      longitude: 55.2708,
      formattedAddress: 'Dubai, UAE',
    };
  }
  
  return data;
}

/**
 * Search for locations worldwide (cities, streets, landmarks)
 */
export async function searchLocations(query: string): Promise<LocationData[]> {
  // TODO: Integrate with backend location search API
  // This should call: GET /api/location/search?q={query}
  const { data, error } = await apiCall<{ locations: LocationData[] }>(
    `/api/location/search?q=${encodeURIComponent(query)}`
  );
  
  if (error || !data) {
    return [];
  }
  
  return data.locations;
}

// ============================================
// PROPERTY SERVICES (STAYS)
// ============================================

export interface Property {
  id: string;
  title: string;
  description?: string;
  images: string[];
  location: {
    address: string;
    city: string;
    state?: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  price: {
    amount: number;
    currency: string;
    period: 'night' | 'month';
  };
  rating: {
    average: number;
    count: number;
  };
  amenities: string[];
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  isGuestFavourite: boolean;
  hasFreeCancel: boolean;
  hostId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertySearchParams {
  location?: string; // City, state, country, or coordinates
  latitude?: number;
  longitude?: number;
  radius?: number; // Search radius in km
  checkIn?: string; // ISO date
  checkOut?: string; // ISO date
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string[];
  amenities?: string[];
  sortBy?: 'price' | 'rating' | 'distance' | 'popular' | 'newest';
  page?: number;
  limit?: number;
}

export interface PropertyResponse {
  properties: Property[];
  total: number;
  page: number;
  hasMore: boolean;
  suggestedLocations?: string[];
}

/**
 * Search properties by location and filters
 * Supports: cities, streets, states, countries, landmarks
 */
export async function searchProperties(
  params: PropertySearchParams
): Promise<PropertyResponse> {
  // TODO: Integrate with backend property search API
  // This should call: POST /api/properties/search
  const { data, error } = await apiCall<PropertyResponse>(
    '/api/properties/search',
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
  
  if (error || !data) {
    return {
      properties: [],
      total: 0,
      page: 1,
      hasMore: false,
      suggestedLocations: [],
    };
  }
  
  return data;
}

/**
 * Get property details by ID
 */
export async function getPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await apiCall<Property>(`/api/properties/${id}`);
  return error ? null : data;
}

/**
 * Get curated property sections for explore page
 * AI/ML powered recommendations based on user preferences and location
 */
export async function getExploreSections(
  location: string,
  userPreferences?: any
): Promise<{
  sections: Array<{
    id: string;
    title: string;
    type: string;
    properties: Property[];
    seeAllUrl?: string;
  }>;
}> {
  // TODO: Integrate with AI/ML recommendation engine
  // This should call: POST /api/explore/sections
  // Backend uses ML to generate personalized sections
  const { data, error } = await apiCall<any>(
    '/api/explore/sections',
    {
      method: 'POST',
      body: JSON.stringify({ location, userPreferences }),
    }
  );
  
  if (error || !data) {
    return { sections: [] };
  }
  
  return data;
}

// ============================================
// EXPERIENCE SERVICES
// ============================================

export interface Experience {
  id: string;
  title: string;
  description: string;
  images: string[];
  location: {
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  price: {
    amount: number;
    currency: string;
    period: 'person' | 'group';
  };
  rating: {
    average: number;
    count: number;
  };
  duration: string; // e.g., "2 hours", "Full day"
  category: string; // e.g., "Adventure", "Cultural", "Food"
  maxParticipants: number;
  languages: string[];
  highlights: string[];
  hostId: string;
  availability: string[];
  createdAt: string;
}

/**
 * Search experiences by location
 */
export async function searchExperiences(
  params: {
    location?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    category?: string[];
    date?: string;
    participants?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'rating' | 'popular';
    page?: number;
    limit?: number;
  }
): Promise<{
  experiences: Experience[];
  total: number;
  hasMore: boolean;
}> {
  const { data, error } = await apiCall<any>(
    '/api/experiences/search',
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
  
  if (error || !data) {
    return { experiences: [], total: 0, hasMore: false };
  }
  
  return data;
}

/**
 * Get curated experience sections for explore page
 */
export async function getExperienceSections(
  location: string
): Promise<{
  sections: Array<{
    id: string;
    title: string;
    type: string;
    experiences: Experience[];
  }>;
}> {
  const { data, error } = await apiCall<any>(
    `/api/explore/experiences?location=${encodeURIComponent(location)}`
  );
  
  if (error || !data) {
    return { sections: [] };
  }
  
  return data;
}

// ============================================
// BLOG/CONTENT SERVICES
// ============================================

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  featuredImage: string;
  images: string[];
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  category: string;
  tags: string[];
  location?: {
    city: string;
    country: string;
  };
  readTime: number; // minutes
  views: number;
  likes: number;
  isLiked?: boolean;
  publishedAt: string;
  updatedAt: string;
}

/**
 * Search blog posts by location and topics
 */
export async function searchBlogs(
  params: {
    location?: string;
    category?: string[];
    tags?: string[];
    keyword?: string;
    sortBy?: 'recent' | 'popular' | 'trending';
    page?: number;
    limit?: number;
  }
): Promise<{
  blogs: BlogPost[];
  total: number;
  hasMore: boolean;
}> {
  const { data, error } = await apiCall<any>(
    '/api/blogs/search',
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
  
  if (error || !data) {
    return { blogs: [], total: 0, hasMore: false };
  }
  
  return data;
}

/**
 * Get curated blog sections for explore page
 */
export async function getBlogSections(
  location: string
): Promise<{
  sections: Array<{
    id: string;
    title: string;
    type: string;
    blogs: BlogPost[];
  }>;
}> {
  const { data, error } = await apiCall<any>(
    `/api/explore/blogs?location=${encodeURIComponent(location)}`
  );
  
  if (error || !data) {
    return { sections: [] };
  }
  
  return data;
}

// ============================================
// USER PREFERENCES & AI/ML SERVICES
// ============================================

/**
 * Get personalized recommendations using AI/ML
 * This endpoint uses machine learning to analyze user behavior and preferences
 */
export async function getAIRecommendations(
  params: {
    userId?: string;
    location?: string;
    contentType: 'properties' | 'experiences' | 'blogs';
    limit?: number;
  }
): Promise<any[]> {
  // TODO: Integrate with AI/ML recommendation engine
  // Backend analyzes: browsing history, favorites, bookings, ratings, similar users
  const { data, error } = await apiCall<{ recommendations: any[] }>(
    '/api/ai/recommendations',
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
  
  if (error || !data) {
    return [];
  }
  
  return data.recommendations;
}

/**
 * Track user interactions for ML model training
 */
export async function trackInteraction(
  event: {
    type: 'view' | 'click' | 'favorite' | 'share' | 'book' | 'search';
    contentType: 'property' | 'experience' | 'blog';
    contentId: string;
    metadata?: any;
  }
): Promise<void> {
  // Fire and forget - don't block UI
  apiCall('/api/analytics/track', {
    method: 'POST',
    body: JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // Silently fail - analytics shouldn't break app
  });
}

// ============================================
// FAVORITES/WISHLIST
// ============================================

export async function getFavorites(
  userId: string,
  type?: 'properties' | 'experiences' | 'blogs'
): Promise<string[]> {
  const { data } = await apiCall<{ favorites: string[] }>(
    `/api/users/${userId}/favorites?type=${type || 'all'}`
  );
  return data?.favorites || [];
}

export async function toggleFavorite(
  userId: string,
  contentId: string,
  contentType: 'property' | 'experience' | 'blog'
): Promise<boolean> {
  const { data } = await apiCall<{ isFavorite: boolean }>(
    `/api/users/${userId}/favorites`,
    {
      method: 'POST',
      body: JSON.stringify({ contentId, contentType }),
    }
  );
  return data?.isFavorite || false;
}

// ============================================
// EXPORT ALL SERVICES
// ============================================

export const API = {
  // Location
  detectUserLocation,
  searchLocations,
  
  // Properties
  searchProperties,
  getPropertyById,
  getExploreSections,
  
  // Experiences
  searchExperiences,
  getExperienceSections,
  
  // Blogs
  searchBlogs,
  getBlogSections,
  
  // AI/ML
  getAIRecommendations,
  trackInteraction,
  
  // User
  getFavorites,
  toggleFavorite,
};
