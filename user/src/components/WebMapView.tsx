import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface WebMapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  style?: any;
  apiKey: string;
}

export const WebMapView: React.FC<WebMapViewProps> = ({ 
  latitude, 
  longitude, 
  title = '',
  style,
  apiKey 
}) => {
  if (Platform.OS === 'web') {
    // Use Google Maps Embed API for web
    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=14&maptype=roadmap`;
    
    return (
      <View style={[styles.container, style]}>
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={mapUrl}
        />
      </View>
    );
  }

  // For native platforms, use react-native-maps
  const MapModule = require('react-native-maps');
  const MapView = MapModule.default;
  const Marker = MapModule.Marker;

  return (
    <MapView
      style={[styles.container, style]}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker
        coordinate={{ latitude, longitude }}
        title={title}
      />
    </MapView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
});
