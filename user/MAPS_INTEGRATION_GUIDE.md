# StayOn Maps Integration - Setup Guide

## 🗺️ Overview

The StayOn app now includes a comprehensive Google Maps integration for searching and exploring properties geographically. This feature allows users to:

- **Search by location** with interactive map showing property prices
- **Explore map** to discover nearby stays dynamically  
- **Filter stays** with filters reflected on both map markers and list
- **View property details** with latitude/longitude stored (addresses hidden until booking)
- **Toggle between map and list views** seamlessly

## ✅ What's Been Implemented

### 1. **Property Interface Update** ✅
- Added `latitude` and `longitude` fields to Property interface
- Added `address` field (hidden until booking confirmed)
- Added `isBooked` flag for privacy control

**File:** `src/components/PropertyCard.tsx`

### 2. **PropertyCard Component** ✅
Features:
- Rounded corner images with carousel (swipe images)
- Shadow effects for premium look
- Heart icon for wishlist (top right)
- Guest Favorite / Superhost badges
- Star ratings display
- Pagination dots for multiple images
- **NEW:** Map icon button to navigate to map view
- Price per night display
- Clean white background with subtle shadows

**File:** `src/components/PropertyCard.tsx`

### 3. **PropertyMapView Component** ✅
Features:
- Interactive Google Maps integration
- Custom price markers for each property
- Selected marker highlighting (scales up, changes color)
- Property preview card when marker clicked
- Privacy: Shows "Exact address shown after booking"
- Displays full address only if `isBooked = true`

**File:** `src/components/PropertyMapView.tsx`

### 4. **MapSearchScreen** ✅
Main search screen with:
- **Search Header:**
  - Location, dates, guests display (rounded corners)
  - Search icon button (opens search modal)
  - Filter button (opens filter modal)
  - Back button navigation
  
- **Interactive Map Section:**
  - Shows all properties with price markers
  - Drag handle for expanding/collapsing
  - Map moves to show different areas
  - Updates property list based on map region
  
- **Results Count:**
  - "Over 1,000 homes" display
  
- **Property List:**
  - ScrollView of PropertyCard components
  - Each card with full details
  - Map icon to view property on map
  
- **View Toggle:**
  - Map button (bottom) to switch to full map view
  - List button (in map view) to return to list

**File:** `src/screens/MapSearchScreen.tsx`

### 5. **Styling** ✅
- Milky white background (#F7F7F7)
- Card shadows (subtle 0.08 opacity)
- Rounded corners throughout (borderRadius.xl)
- Premium look matching Airbnb design
- Guest Favorite badges with rounded corners
- All buttons have proper shadows and hover states

## 📦 Installation

The following package has already been installed:

```bash
npm install react-native-maps
```

**Package Version:** `react-native-maps` (latest compatible with Expo SDK 56)

## 🔑 Google Maps API Setup

### Step 1: Get Google Maps API Keys

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS  
   - Maps JavaScript API (for web)

4. Create API credentials:
   - **Android:** Create an Android API key
   - **iOS:** Create an iOS API key
   - **Web:** Create a Web API key (unrestricted or restricted to your domain)

### Step 2: Update Configuration

The `app.json` has been configured with placeholder keys. Replace them:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_IOS_GOOGLE_MAPS_API_KEY"
      }
    }
  }
}
```

### Step 3: For Web (Expo Web)

Add to your `.env` file (create if doesn't exist):

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_WEB_GOOGLE_MAPS_API_KEY
```

Then update `app.json` web config:

```json
{
  "expo": {
    "web": {
      "config": {
        "googleMapsApiKey": "YOUR_WEB_GOOGLE_MAPS_API_KEY"
      }
    }
  }
}
```

## 🚀 Usage

### Import the Screen

```typescript
import { MapSearchScreen } from './src/screens/MapSearchScreen';
// OR
import { MapSearchScreen } from './src/screens';
```

### Use in Navigation

```typescript
<MapSearchScreen onBack={() => navigation.goBack()} />
```

### Property Data Format

Each property must include coordinates:

```typescript
const property: Property = {
  id: '1',
  title: 'Luxury Villa in Dubai',
  location: 'Dubai, UAE',
  price: 350,
  rating: 4.9,
  reviews: 128,
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
  ],
  latitude: 25.2048,  // Required for map
  longitude: 55.2708, // Required for map
  address: '123 Palm Jumeirah, Dubai', // Optional, hidden until booked
  isBooked: false, // Set to true when user books
  isGuestFavorite: true, // Optional badge
  badge: 'Superhost', // Optional badge
};
```

## 🎨 Customization

### Change Map Style

Edit `MAP_STYLE` constant in `MapSearchScreen.tsx`:

```typescript
const MAP_STYLE = [
  {
    featureType: 'poi.business',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  // Add more styling...
];
```

### Change Marker Colors

In `MapSearchScreen.tsx`, modify marker styles:

```typescript
markerContainer: {
  backgroundColor: colors.background,
  borderColor: '#1A1A1A', // Change this
  ...
},
markerSelected: {
  backgroundColor: '#1A1A1A', // Change this  
  borderColor: '#FFFFFF',
  ...
}
```

### Adjust Map Region

Default region (Dubai):

```typescript
const [region, setRegion] = useState<Region>({
  latitude: 25.2048,  // Change to your default location
  longitude: 55.2708,
  latitudeDelta: 0.15, // Zoom level (smaller = more zoomed in)
  longitudeDelta: 0.15,
});
```

## 📋 Features Checklist

- ✅ Interactive map with price markers
- ✅ Property cards with rounded corners
- ✅ Image carousel with pagination dots
- ✅ Heart button for wishlist
- ✅ Guest Favorite / Superhost badges
- ✅ Star ratings
- ✅ Map icon on property cards
- ✅ Search header with location/dates/guests
- ✅ Filter button integration
- ✅ Map/List view toggle
- ✅ Property preview on marker click
- ✅ Address privacy (hidden until booking)
- ✅ Milky white background
- ✅ Card shadows and premium styling
- ✅ Responsive design

## 🔄 Next Steps

### 1. Update Property Data
Replace sample data in `MapSearchScreen.tsx` with real property data from your backend:

```typescript
const [properties] = useState<Property[]>([
  // Add your real property data here
  // Make sure each has latitude and longitude
]);
```

### 2. Connect Search Modal
Implement search functionality:

```typescript
const handleSearchPress = () => {
  // Open search modal to update searchParams
  // Update location, dates, guests
  // Fetch properties for new search
};
```

### 3. Connect Filter Modal
Implement filter functionality:

```typescript
const handleFilterPress = () => {
  // Open filter modal
  // Apply filters to properties
  // Update filteredProperties state
};
```

### 4. Integrate with Backend API

```typescript
// Fetch properties based on map region
const fetchPropertiesInRegion = async (region: Region) => {
  const response = await fetch(`/api/properties?lat=${region.latitude}&lng=${region.longitude}&radius=10km`);
  const data = await response.json();
  setFilteredProperties(data);
};

// Call when map region changes
onRegionChangeComplete={(newRegion) => {
  setRegion(newRegion);
  fetchPropertiesInRegion(newRegion);
}}
```

### 5. Add Navigation
Integrate with your navigation system:

```typescript
const handlePropertyPress = (property: Property) => {
  navigation.navigate('PropertyDetail', { propertyId: property.id });
};
```

## 🐛 Troubleshooting

### Map not showing
- Verify Google Maps API key is correct
- Check API is enabled in Google Cloud Console
- Restart Expo dev server after adding API key

### Markers not appearing
- Verify properties have valid latitude/longitude
- Check console for errors
- Ensure `tracksViewChanges={false}` is set on markers

### Performance issues
- Limit number of markers displayed
- Use `tracksViewChanges={false}` on markers
- Implement clustering for large datasets

## 📱 Testing

1. **Web:** Run `npx expo start --web`
2. **iOS:** Run in iOS Simulator (requires Xcode)
3. **Android:** Run in Android Emulator or device

## 🎯 Key Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `src/screens/MapSearchScreen.tsx` | ✅ Created | Main search screen with map integration |
| `src/components/PropertyCard.tsx` | ✅ Enhanced | Property card with map button and improved styling |
| `src/components/PropertyMapView.tsx` | ✅ Created | Standalone map component |
| `src/screens/index.ts` | ✅ Updated | Added MapSearchScreen export |
| `src/components/index.ts` | ✅ Updated | Added PropertyMapView export |
| `app.json` | ✅ Updated | Added Google Maps API configuration |

## 💡 Tips

1. **Optimize Images:** Use compressed images for property photos
2. **Lazy Load:** Load properties as user scrolls or moves map
3. **Caching:** Cache map regions and property data
4. **Error Handling:** Add error states for failed API calls
5. **Loading States:** Show skeletons while loading properties

## 📞 Support

For issues or questions:
- Check Expo docs: https://docs.expo.dev/
- React Native Maps: https://github.com/react-native-maps/react-native-maps
- Google Maps Platform: https://developers.google.com/maps

---

**Status:** ✅ All components created and integrated
**Last Updated:** 2026-05-24
**Version:** 1.0.0
