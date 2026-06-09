# StayOn Mobile - Backend Integration Guide

## 🌍 Fully Dynamic, Worldwide Location Support

This app is built as a **production-ready, backend-driven platform** that works worldwide with any location: cities, streets, states, countries, or landmarks.

---

## 📋 Architecture Overview

### Current State: **Development Mode** ✅
- Using mock data generators for development
- All UI components, states, and error handling in place
- Ready for backend integration

### Production State: **Backend-Driven** 🚀
- All data fetched dynamically from backend API
- AI/ML powered recommendations
- Real-time location detection
- Worldwide location support
- Smart error handling and empty states

---

## 🗂️ File Structure

```
mobile/
├── src/
│   ├── services/
│   │   └── api.ts                 # ✅ Complete API service layer
│   ├── hooks/
│   │   └── useExploreData.ts      # ✅ Custom React hooks for data fetching
│   ├── screens/
│   │   └── ExploreScreen.tsx      # ✅ Dynamic UI with loading/error/empty states
│   └── components/
│       ├── PropertyCardLarge.tsx   # Property card component
│       └── ExploreSection.tsx      # Section container component
└── BACKEND_INTEGRATION.md         # This file
```

---

## 🔧 Setup Instructions

### Step 1: Environment Configuration

Create `.env` file in the root of mobile folder:

```env
EXPO_PUBLIC_API_URL=https://api.stayon.com
EXPO_PUBLIC_API_TIMEOUT=15000
```

### Step 2: Enable Backend Integration

In `src/screens/ExploreScreen.tsx`, uncomment these lines:

```typescript
// Currently commented out (lines 54-56):
import { useExploreData, useLocationDetection, useFavorites } from '../hooks/useExploreData';
import { API } from '../services/api';
```

### Step 3: Replace Mock Data with Hooks

Replace the state declarations with custom hooks:

```typescript
// CURRENT (Development):
const [currentLocation, setCurrentLocation] = useState('Dubai');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// REPLACE WITH (Production):
const { location, setLocation, loading: locationLoading } = useLocationDetection();
const { sections, loading, error, refreshing, refresh } = useExploreData(location, activeTab);
const { favorites, toggleFavorite, isFavorite } = useFavorites(userId);
```

### Step 4: Remove Mock Functions

Delete or comment out these mock data generator functions:
- `generateProperties()`
- `generateExperiences()`
- `generateBlogs()`
- `PLACEHOLDER_IMAGES` array

---

## 🌐 Required Backend API Endpoints

### 1. Location Services

#### Detect User Location
```
GET /api/location/detect
```
**Response:**
```json
{
  "city": "Dubai",
  "state": "Dubai",
  "country": "UAE",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "formattedAddress": "Dubai, UAE"
}
```

#### Search Locations
```
GET /api/location/search?q={query}
```
**Response:**
```json
{
  "locations": [
    {
      "city": "Dubai",
      "country": "UAE",
      "latitude": 25.2048,
      "longitude": 55.2708,
      "formattedAddress": "Dubai, UAE"
    }
  ]
}
```

---

### 2. Property Services (Stays)

#### Search Properties
```
POST /api/properties/search
```
**Request Body:**
```json
{
  "location": "Dubai",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "radius": 50,
  "checkIn": "2026-06-01",
  "checkOut": "2026-06-05",
  "guests": 2,
  "minPrice": 100,
  "maxPrice": 500,
  "propertyType": ["apartment", "villa"],
  "amenities": ["wifi", "pool"],
  "sortBy": "popular",
  "page": 1,
  "limit": 20
}
```

**Response:**
```json
{
  "properties": [
    {
      "id": "prop-123",
      "title": "Luxury Beachfront Villa",
      "description": "Beautiful villa with ocean views",
      "images": [
        "https://cdn.stayon.com/properties/prop-123/img1.jpg",
        "https://cdn.stayon.com/properties/prop-123/img2.jpg"
      ],
      "location": {
        "address": "123 Beach Road",
        "city": "Dubai",
        "state": "Dubai",
        "country": "UAE",
        "latitude": 25.2048,
        "longitude": 55.2708
      },
      "price": {
        "amount": 250,
        "currency": "USD",
        "period": "night"
      },
      "rating": {
        "average": 4.8,
        "count": 156
      },
      "amenities": ["wifi", "pool", "parking", "kitchen"],
      "propertyType": "villa",
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuests": 6,
      "isGuestFavourite": true,
      "hasFreeCancel": true,
      "hostId": "host-456",
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-05-20T14:45:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "hasMore": true,
  "suggestedLocations": ["Abu Dhabi", "Sharjah"]
}
```

#### Get Explore Sections (AI/ML Powered)
```
POST /api/explore/sections
```
**Request Body:**
```json
{
  "location": "Dubai",
  "userPreferences": {
    "userId": "user-123",
    "favoriteTypes": ["villa", "apartment"],
    "priceRange": [100, 500],
    "previousBookings": ["prop-456", "prop-789"]
  }
}
```

**Response:**
```json
{
  "sections": [
    {
      "id": "sec-1",
      "title": "Stay near Burj Khalifa",
      "type": "landmark",
      "properties": [...], // Array of Property objects
      "seeAllUrl": "/search?landmark=burj-khalifa"
    },
    {
      "id": "sec-2",
      "title": "Dubai homes with free cancellation",
      "type": "feature",
      "properties": [...],
      "seeAllUrl": "/search?freeCancel=true"
    }
  ]
}
```

---

### 3. Experience Services

#### Search Experiences
```
POST /api/experiences/search
```
**Request Body:**
```json
{
  "location": "Dubai",
  "category": ["adventure", "cultural"],
  "date": "2026-06-01",
  "participants": 2,
  "minPrice": 50,
  "maxPrice": 300,
  "sortBy": "rating",
  "page": 1,
  "limit": 20
}
```

**Response:** Similar structure to properties search

#### Get Experience Sections
```
GET /api/explore/experiences?location=Dubai
```

---

### 4. Blog/Content Services

#### Search Blogs
```
POST /api/blogs/search
```
**Request Body:**
```json
{
  "location": "Dubai",
  "category": ["travel-guide", "food"],
  "tags": ["luxury", "budget"],
  "keyword": "best restaurants",
  "sortBy": "recent",
  "page": 1,
  "limit": 20
}
```

**Response:**
```json
{
  "blogs": [
    {
      "id": "blog-123",
      "title": "Top 10 Hidden Gems in Dubai",
      "slug": "top-10-hidden-gems-dubai",
      "excerpt": "Discover the best kept secrets...",
      "content": "Full article content...",
      "featuredImage": "https://cdn.stayon.com/blogs/blog-123/featured.jpg",
      "images": [...],
      "author": {
        "id": "author-456",
        "name": "John Doe",
        "avatar": "https://cdn.stayon.com/authors/author-456.jpg"
      },
      "category": "travel-guide",
      "tags": ["hidden-gems", "dubai", "travel"],
      "location": {
        "city": "Dubai",
        "country": "UAE"
      },
      "readTime": 8,
      "views": 1250,
      "likes": 89,
      "isLiked": false,
      "publishedAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-20T14:30:00Z"
    }
  ],
  "total": 45,
  "hasMore": true
}
```

#### Get Blog Sections
```
GET /api/explore/blogs?location=Dubai
```

---

### 5. AI/ML Services

#### Get Personalized Recommendations
```
POST /api/ai/recommendations
```
**Request Body:**
```json
{
  "userId": "user-123",
  "location": "Dubai",
  "contentType": "properties",
  "limit": 10
}
```

**How it works:**
- Backend analyzes user behavior (views, clicks, favorites, bookings)
- ML model predicts user preferences
- Returns personalized content recommendations
- Updates in real-time as user interacts with app

#### Track User Interactions
```
POST /api/analytics/track
```
**Request Body:**
```json
{
  "type": "view",
  "contentType": "property",
  "contentId": "prop-123",
  "metadata": {
    "source": "explore_section",
    "position": 2
  },
  "timestamp": "2026-05-24T15:30:00Z"
}
```

**Event Types:**
- `view` - User viewed content
- `click` - User clicked on content
- `favorite` - User added to favorites
- `share` - User shared content
- `book` - User booked property/experience
- `search` - User performed search

---

### 6. User Services

#### Get User Favorites
```
GET /api/users/{userId}/favorites?type=properties
```

**Response:**
```json
{
  "favorites": ["prop-123", "prop-456", "prop-789"]
}
```

#### Toggle Favorite
```
POST /api/users/{userId}/favorites
```
**Request Body:**
```json
{
  "contentId": "prop-123",
  "contentType": "property"
}
```

**Response:**
```json
{
  "isFavorite": true
}
```

---

## 🎨 UI States Implemented

### ✅ Loading State
- Shows spinner with message "Finding {stays/experiences/blogs} in {location}..."
- Displayed during initial data fetch
- Prevents user from interacting with empty sections

### ✅ Error State
- Shows sad emoji 😔
- Displays error message from API
- "Try Again" button to retry request
- Handles network errors, timeouts, server errors

### ✅ Empty State
- Shows appropriate emoji based on tab
- Messages:
  - **Stays**: "No properties available in {location}"
  - **Experiences**: "No experiences found in {location}"
  - **Blogs**: "No travel guides available for {location}"
- "Change Location" button to try different location
- Suggests nearby locations if available

### ✅ Success State
- Displays curated sections with horizontal scrolling
- Each section shows 8 items
- "See all" button for each section
- Pull-to-refresh to update data
- Smooth scrolling and animations

---

## 🌍 Worldwide Location Support

### How It Works:

1. **Auto-Detection**:
   - App calls `API.detectUserLocation()` on launch
   - Uses IP geolocation or GPS (on mobile)
   - Falls back to default location (Dubai) if detection fails

2. **Search/Manual Selection**:
   - User can search for any location worldwide
   - API returns matching cities, streets, landmarks
   - User selects from autocomplete results

3. **Dynamic Content**:
   - Backend checks if content exists for location
   - If YES: Returns curated sections with properties/experiences/blogs
   - If NO: Returns empty response with suggested nearby locations

4. **Smart Fallbacks**:
   - "No stays in {street}" → Suggests nearby streets/neighborhoods
   - "No stays in {city}" → Suggests nearby cities
   - "No stays in {country}" → Suggests popular cities in country

---

## 🤖 AI/ML Integration

### Machine Learning Features:

1. **Personalized Recommendations**:
   - Analyzes user behavior patterns
   - Learns from browsing history, favorites, bookings
   - Generates personalized section content
   - Updates in real-time

2. **Smart Content Curation**:
   - Ranks properties/experiences based on relevance
   - Considers user preferences, budget, past bookings
   - Shows similar properties to liked ones

3. **Interaction Tracking**:
   - Every view, click, favorite tracked via `API.trackInteraction()`
   - Data fed to ML model for training
   - Improves recommendations over time

4. **Predictive Search**:
   - Autocomplete powered by ML
   - Learns popular search patterns
   - Suggests destinations based on trends

---

## 🔐 Security & Authentication

### API Authentication:
```typescript
const getHeaders = () => {
  const token = ''; // TODO: Get from secure storage
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};
```

**To Implement**:
1. Store JWT token in secure storage after login
2. Include token in all API requests
3. Handle 401 (Unauthorized) responses
4. Refresh token when expired

---

## ⚡ Performance Optimization

### Implemented:
- **Request Timeout**: 15 seconds
- **AbortController**: Cancel requests if taking too long
- **Error Boundaries**: Catch and handle errors gracefully
- **Optimistic Updates**: Update UI before API response (favorites)

### Recommended:
- **Caching**: Cache API responses for faster loading
- **Infinite Scroll**: Load more items as user scrolls
- **Image Optimization**: Use CDN with responsive images
- **Debounced Search**: Wait 300ms before searching
- **Pagination**: Load sections incrementally

---

## 🧪 Testing

### Test Scenarios:

1. **Valid Location with Data**:
   - Select "Dubai"
   - Should show 6 sections with properties
   - Pull-to-refresh should work

2. **Valid Location without Data**:
   - Select obscure location (e.g., "Small Town, Antarctica")
   - Should show empty state
   - Should suggest nearby locations

3. **Invalid Location**:
   - API returns error
   - Should show error state
   - "Try Again" button should retry

4. **Network Error**:
   - Disconnect internet
   - Should show error message
   - Reconnect and retry should work

5. **Loading State**:
   - Slow network simulation
   - Should show loading spinner
   - Should not show empty sections

---

## 📝 TODO for Production

### Backend Team:
- [ ] Implement all required API endpoints
- [ ] Set up AI/ML recommendation engine
- [ ] Configure CDN for images
- [ ] Set up analytics database
- [ ] Implement caching strategy
- [ ] Add rate limiting
- [ ] Set up monitoring and logging

### Frontend Team:
- [ ] Set `EXPO_PUBLIC_API_URL` environment variable
- [ ] Uncomment API imports in ExploreScreen
- [ ] Replace mock data with hooks
- [ ] Remove mock generator functions
- [ ] Implement secure token storage
- [ ] Add error tracking (Sentry)
- [ ] Test with real API
- [ ] Performance testing
- [ ] User acceptance testing

---

## 🚀 Deployment Checklist

- [ ] Backend API deployed and accessible
- [ ] Environment variables configured
- [ ] API authentication working
- [ ] Location detection working worldwide
- [ ] Search functionality tested
- [ ] All tabs (Stays/Experiences/Blogs) working
- [ ] Loading/error/empty states tested
- [ ] Pull-to-refresh working
- [ ] Favorites functionality working
- [ ] AI recommendations active
- [ ] Analytics tracking enabled
- [ ] Mobile app submitted to stores
- [ ] Monitoring dashboards set up

---

## 📞 Support

For questions or issues:
- Check API documentation: `src/services/api.ts`
- Check hooks documentation: `src/hooks/useExploreData.ts`
- Review example API responses in this document
- Contact backend team for API issues
- Contact frontend team for UI issues

---

**Remember**: This app is designed to work **worldwide** with **any location**. The backend should handle any location request and return appropriate data or empty states with helpful suggestions.
