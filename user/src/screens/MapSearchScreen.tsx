import React from 'react';
import { MapExploreScreen } from './MapExploreScreen';

interface MapSearchScreenProps {
  navigation?: any;
  route?: any;
  onBack?: () => void;
}

// MapSearch delegates to the full interactive map (Apple Maps on iOS, Google on Android).
// Kept as a separate route for deep-linking / search-result map entry points.
export const MapSearchScreen: React.FC<MapSearchScreenProps> = ({ navigation, route }) => {
  return <MapExploreScreen navigation={navigation} route={route} />;
};
