import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NativeMapProps {
  customer: { lat: number; lng: number } | null;
  markers: any[];
  polylines?: any[];
  onMarkerPress?: (id: string | number) => void;
  style?: any;
}

export default function NativeMap(props: NativeMapProps) {
  return (
    <View style={[styles.container, props.style]}>
      <Text style={styles.placeholder}>Map view disabled</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    color: '#666',
    fontSize: 16,
  },
});