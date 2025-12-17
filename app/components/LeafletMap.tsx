import React from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

interface LeafletMapProps {
  customer: { lat: number; lng: number } | null;
  markers: Array<{
    id: string | number;
    lat: number;
    lng: number;
    title?: string;
    type?: 'customer' | 'mechanic' | 'default';
  }>;
  style?: any;
}

export default function LeafletMap({ customer, markers, style }: LeafletMapProps) {
  const center = customer ? [customer.lat, customer.lng] : [37.7749, -122.4194];
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${center[0]}, ${center[1]}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        const markers = ${JSON.stringify(markers)};
        
        markers.forEach(marker => {
          const color = marker.type === 'customer' ? 'red' : marker.type === 'mechanic' ? 'green' : 'blue';
          L.marker([marker.lat, marker.lng])
            .addTo(map)
            .bindPopup(marker.title || 'Location');
        });
        
        if (markers.length > 1) {
          const group = new L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
          map.fitBounds(group.getBounds().pad(0.1));
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});