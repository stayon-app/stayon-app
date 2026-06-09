// Airbnb-style Google Maps theming — desaturated land, light-green parks, light
// blue water, muted roads/labels, hidden POI clutter. Shared by every map
// (web PropertyMapWeb + LocationPickerMap, and native react-native-maps via
// customMapStyle).

export const LIGHT_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f2' }] },          // land
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },       // hide label icons
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a7a72' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },               // hide POIs/clutter
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e2efe0' }] }, // light green
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f0f0ec' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e2' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe6ee' }] },     // light blue
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9fc5d2' }] },
];

export const DARK_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#1f2421' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa6a0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2421' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#26312b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#33403a' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0f0d' }] },
];
