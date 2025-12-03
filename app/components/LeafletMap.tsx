// components/LeafletMap.tsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

type Marker = { id: string | number; lat: number; lng: number; title?: string; subtitle?: string };

export default function LeafletMap({
  customer,
  markers,
  onMarkerPress,
}: {
  customer: { lat: number; lng: number } | null;
  markers: Marker[];
  onMarkerPress?: (id: string | number) => void;
}) {
  const webviewRef = useRef<WebView | null>(null);

  // send markers & center to webview whenever markers/customer change
  useEffect(() => {
    if (!webviewRef.current) return;
    const payload = JSON.stringify({ type: "set-data", data: { center: customer, markers } });
    // postMessage works better than injectJS for dynamic content
    webviewRef.current.postMessage(payload);
  }, [markers, customer]);

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type === "marker-press" && onMarkerPress) {
        onMarkerPress(msg.id);
      }
    } catch (e) {
      // ignore
    }
  };

  const html = `
  <!doctype html>
  <html>
    <head>
      <meta name="viewport" content="initial-scale=1, maximum-scale=1">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <style>html,body,#map{height:100%;margin:0;padding:0} .marker-popup {font-size:14px;}</style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map').setView([0,0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        const markers = {}; // id -> marker

        function setCenter(center) {
          if (!center) return;
          map.setView([center.lat, center.lng], 15);
          // optionally add a center marker
          if (markers.__center) {
            markers.__center.setLatLng([center.lat, center.lng]);
          } else {
            markers.__center = L.circleMarker([center.lat, center.lng], { radius:8, color:'#1E90FF' }).addTo(map).bindPopup("You");
          }
        }

        function setMarkers(newMarkers) {
          // Remove markers not present
          const ids = newMarkers.map(m => String(m.id));
          Object.keys(markers).forEach(k => {
            if (k === "__center") return;
            if (!ids.includes(k)) {
              map.removeLayer(markers[k]);
              delete markers[k];
            }
          });

          // Add / update
          newMarkers.forEach(m => {
            const id = String(m.id);
            if (markers[id]) {
              markers[id].setLatLng([m.lat, m.lng]);
              markers[id].bindPopup('<div class="marker-popup"><b>' + (m.title||'') + '</b><br/>' + (m.subtitle||'') + '</div>');
            } else {
              const mk = L.marker([m.lat, m.lng]).addTo(map);
              mk.bindPopup('<div class="marker-popup"><b>' + (m.title||'') + '</b><br/>' + (m.subtitle||'') + '</div>');
              mk.on('click', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker-press', id: m.id }));
              });
              markers[id] = mk;
            }
          });
        }

        // Receive messages from React Native
        function handleMessage(e) {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'set-data') {
              const center = msg.data.center;
              const mks = msg.data.markers || [];
              setCenter(center);
              setMarkers(mks);
            }
          } catch(err) {}
        }

        // Support both event types for WebView
        document.addEventListener('message', handleMessage);
        window.addEventListener('message', handleMessage);
      </script>
    </body>
  </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        ref={(r) => (webviewRef.current = r)}
        source={{ html }}
        onMessage={onMessage}
        allowFileAccess
        javaScriptEnabled
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
});
