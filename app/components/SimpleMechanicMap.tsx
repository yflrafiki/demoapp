// components/SimpleMechanicMap.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity 
} from 'react-native';
import { Location, MapMarker } from '../../types/map.types';

const { width, height } = Dimensions.get('window');

interface SimpleMechanicMapProps {
  mechanicLocation: Location;
  markers: MapMarker[];
  onMarkerPress: (markerId: string) => void;
  selectedMarker?: MapMarker | null;
}

const SimpleMechanicMap: React.FC<SimpleMechanicMapProps> = ({ 
  mechanicLocation, 
  markers, 
  onMarkerPress,
  selectedMarker 
}) => {
  // Convert coordinates to pixel positions
  const convertToPixelPosition = (lat: number, lng: number): { x: number; y: number } => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapBackground}>
        {/* Grid lines for reference */}
        <View style={styles.gridHorizontal} />
        <View style={styles.gridVertical} />
        
        {/* Mechanic location */}
        <View 
          style={[
            styles.marker, 
            styles.mechanicMarker,
            { 
              left: convertToPixelPosition(mechanicLocation.lat, mechanicLocation.lng).x - 15,
              top: convertToPixelPosition(mechanicLocation.lat, mechanicLocation.lng).y - 15
            }
          ]} 
        >
          <View style={styles.mechanicPin} />
          <Text style={styles.markerLabel}>You</Text>
        </View>

        {/* Customer request markers */}
        {markers.map((marker) => {
          const position = convertToPixelPosition(marker.lat, marker.lng);
          const isSelected = selectedMarker?.id === marker.id;
          
          return (
            <TouchableOpacity
              key={marker.id}
              style={[
                styles.marker,
                styles.customerMarker,
                isSelected && styles.selectedMarker,
                { 
                  left: position.x - 15, 
                  top: position.y - 15 
                }
              ]}
              onPress={() => onMarkerPress(marker.id)}
            >
              <View style={styles.customerPin} />
              <Text style={styles.markerLabel}>
                {isSelected ? 'Selected' : 'Customer'}
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
  mechanicMarker: {
    zIndex: 3,
  },
  customerMarker: {
    zIndex: 2,
  },
  selectedMarker: {
    zIndex: 4,
    transform: [{ scale: 1.2 }],
  },
  mechanicPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  customerPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1E90FF',
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

export default SimpleMechanicMap;