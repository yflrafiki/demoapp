import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

type Marker = { id: string | number; lat: number; lng: number; title?: string; subtitle?: string };
type Polyline = { id: string | number; coords: Array<[number, number]>; color?: string };

export default function LeafletMap({
  customer,
  markers,
  polylines,
  fitBoundsMarkers,
  onMarkerPress,
}: {
  customer: { lat: number; lng: number } | null;
  markers: Marker[];
  polylines?: Polyline[];
  fitBoundsMarkers?: Marker[];
  onMarkerPress?: (id: string | number) => void;
}) {
  const webviewRef = useRef<any>(null);

  useEffect(() => {
    if (!webviewRef.current) return;

    const payload: any = {
      type: "set-data",
      data: { center: customer, markers },
    };

    if (polylines) payload.data.polylines = polylines;
    if (fitBoundsMarkers) payload.data.fitBoundsMarkers = fitBoundsMarkers;

    webviewRef.current.postMessage?.(JSON.stringify(payload));
  }, [markers, customer, polylines, fitBoundsMarkers]);

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type === "marker-press" && onMarkerPress) {
        onMarkerPress(msg.id);
      }
    } catch {}
  };

  const html = `
  <!doctype html>
  <html>
    <head>
      <meta name="viewport" content="initial-scale=1, maximum-scale=1">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <style>
        html,body,#map{height:100%;margin:0;padding:0}
        .marker-popup {font-size:14px;}
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map').setView([0,0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        const markers = {};
        const polylines = {};
        let lastFitBounds = 0;

        function animateMarker(marker, newLat, newLng, duration = 1000) {
          const start = marker.getLatLng();
          const end = L.latLng(newLat, newLng);
          const startTime = performance.now();
          function frame(time) {
            const progress = Math.min((time - startTime) / duration, 1);
            const lat = start.lat + (end.lat - start.lat) * progress;
            const lng = start.lng + (end.lng - start.lng) * progress;
            marker.setLatLng([lat, lng]);
            if (progress < 1) requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }

        function setPolylines(newPolylines) {
          Object.keys(polylines).forEach(k => {
            map.removeLayer(polylines[k]);
            delete polylines[k];
          });
          newPolylines.forEach(p => {
            const coords = p.coords.map(c => [c[0], c[1]]);
            polylines[String(p.id)] = L.polyline(coords, { color: p.color || '#3388ff' }).addTo(map);
          });
        }

        function setMarkers(newMarkers, fitMarkers) {
          const ids = newMarkers.map(m => String(m.id));

          Object.keys(markers).forEach(k => {
            if (!ids.includes(k)) {
              map.removeLayer(markers[k]);
              delete markers[k];
            }
          });

          newMarkers.forEach(m => {
            const id = String(m.id);
            const latlng = [m.lat, m.lng];

            if (markers[id]) {
              animateMarker(markers[id], m.lat, m.lng);
              markers[id].bindPopup('<div class="marker-popup"><b>' + (m.title||'') + '</b><br/>' + (m.subtitle||'') + '</div>');
            } else {
              const mk = L.marker(latlng).addTo(map);
              mk.bindPopup('<div class="marker-popup"><b>' + (m.title||'') + '</b><br/>' + (m.subtitle||'') + '</div>');
              mk.on('click', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type:'marker-press', id:m.id }));
              });
              markers[id] = mk;
            }
          });

          // Auto-fit bounds
          if (fitMarkers && fitMarkers.length > 0) {
            const now = Date.now();
            if (now - lastFitBounds > 1000) {
              const latlngs = fitMarkers.map(m => [m.lat, m.lng]);
              map.fitBounds(latlngs, { padding: [50, 50] });
              lastFitBounds = now;
            }
          }
        }

        function handleMessage(e) {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'set-data') {
              if (msg.data.center) map.setView([msg.data.center.lat, msg.data.center.lng], 15);
              setMarkers(msg.data.markers || [], msg.data.fitBoundsMarkers || []);
              setPolylines(msg.data.polylines || []);
            }
          } catch(err) {}
        }

        document.addEventListener("message", handleMessage);
        window.addEventListener("message", handleMessage);
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
