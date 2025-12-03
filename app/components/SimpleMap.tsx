// components/SimpleMap.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity 
} from "react-native";
import { Location, MapMarker } from '../../types/map.types';

const { width, height } = Dimensions.get('window');

interface SimpleMapProps {
  userLocation: Location;
  userType: 'customer' | 'mechanic';
  markers: MapMarker[];
  onMarkerPress: (markerId: string) => void;
  selectedMarker?: MapMarker | null;
}

const SimpleMap: React.FC<SimpleMapProps> = ({ 
  userLocation, 
  userType,
  markers, 
  onMarkerPress,
  selectedMarker 
}) => {
  const convertToPixelPosition = (lat: number, lng: number): { x: number; y: number } => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  const getUserPinColor = (): string => {
    return userType === 'customer' ? '#1E90FF' : '#FF6B35';
  };

  const getMarkerPinColor = (markerType: 'customer' | 'mechanic'): string => {
    return markerType === 'customer' ? '#1E90FF' : '#32CD32';
  };

  const getUserLabel = (): string => {
    return userType === 'customer' ? 'You (Customer)' : 'You (Mechanic)';
  };

  const getMarkerLabel = (markerType: 'customer' | 'mechanic', name?: string): string => {
    if (name) return name;
    return markerType === 'customer' ? 'Customer' : 'Mechanic';
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapBackground}>
        {/* Grid lines */}
        <View style={styles.gridHorizontal} />
        <View style={styles.gridVertical} />
        
        {/* Current user location */}
        <View 
          style={[
            styles.marker, 
            styles.userMarker,
            { 
              left: convertToPixelPosition(userLocation.lat, userLocation.lng).x - 15,
              top: convertToPixelPosition(userLocation.lat, userLocation.lng).y - 15
            }
          ]} 
        >
          <View style={[styles.userPin, { backgroundColor: getUserPinColor() }]} />
          <Text style={styles.markerLabel}>{getUserLabel()}</Text>
        </View>

        {/* Other markers (mechanics for customers, customers for mechanics) */}
        {markers.map((marker) => {
          const position = convertToPixelPosition(marker.lat, marker.lng);
          const isSelected = selectedMarker?.id === marker.id;
          
          return (
            <TouchableOpacity
              key={marker.id}
              style={[
                styles.marker,
                styles.otherMarker,
                isSelected && styles.selectedMarker,
                { 
                  left: position.x - 15, 
                  top: position.y - 15 
                }
              ]}
              onPress={() => onMarkerPress(marker.id)}
            >
              <View style={[
                styles.otherPin, 
                { backgroundColor: getMarkerPinColor(marker.type) }
              ]} />
              <Text style={styles.markerLabel}>
                {isSelected ? 'Selected' : getMarkerLabel(marker.type, marker.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f4f8',
  },
  mapBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e8f4f8',
    position: 'relative',
  },
  gridHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    top: '50%',
  },
  gridVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    left: '50%',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  userMarker: {
    zIndex: 3,
  },
  otherMarker: {
    zIndex: 2,
  },
  selectedMarker: {
    zIndex: 4,
    transform: [{ scale: 1.2 }],
  },
  userPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  otherPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#333',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
});

export default SimpleMap;