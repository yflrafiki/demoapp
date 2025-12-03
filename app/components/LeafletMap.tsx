// components/LeafletMap.tsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

type Marker = { id: string | number; lat: number; lng: number; title?: string; subtitle?: string };
type Polyline = { id: string | number; coords: Array<[number, number]>; color?: string };

export default function LeafletMap({
  customer,
  markers,
  polylines,
  onMarkerPress,
}: {
  customer: { lat: number; lng: number } | null;
  markers: Marker[];
  polylines?: Polyline[];
  onMarkerPress?: (id: string | number) => void;
}) {
  // Use a broad ref type because react-native-webview's ref typing
  // can be overly strict in some TypeScript setups.
  const webviewRef = useRef<any>(null);

  // send markers, polylines & center to webview whenever markers/customer/polylines change
  useEffect(() => {
    if (!webviewRef.current) return;
    const payloadObj: any = { type: "set-data", data: { center: customer, markers } };
    if (polylines) payloadObj.data.polylines = polylines;
    webviewRef.current.postMessage?.(JSON.stringify(payloadObj));
  }, [markers, customer, polylines]);

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
        const polylines = {}; // id -> polyline layer
        let hasInitialized = false; // only fitBounds once on first markers

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

        function setPolylines(newPolylines) {
          // remove old polylines
          Object.keys(polylines).forEach(k => {
            map.removeLayer(polylines[k]);
            delete polylines[k];
          });
          newPolylines.forEach(p => {
            try {
              const coords = p.coords.map(c => [c[0], c[1]]);
              const pl = L.polyline(coords, { color: p.color || '#3388ff' }).addTo(map);
              polylines[String(p.id)] = pl;
            } catch (e) {}
          });
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

          // If we have markers and no explicit center, fit map to markers ONLY on first load
          try {
            if (newMarkers.length > 0 && !hasInitialized) {
              hasInitialized = true;
              const latlngs = newMarkers.map(m => [m.lat, m.lng]);
              map.fitBounds(latlngs, { padding: [50, 50] });
            }
          } catch (e) {
            // ignore fit bounds errors
          }
        }

        // Receive messages from React Native
        function handleMessage(e) {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'set-data') {
              const center = msg.data.center;
              const mks = msg.data.markers || [];
              const pls = msg.data.polylines || [];
              setCenter(center);
              setMarkers(mks);
              setPolylines(pls);
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
        ref={webviewRef}
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
