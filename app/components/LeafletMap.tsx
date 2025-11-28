import React from "react";
import { WebView } from "react-native-webview";

export default function LeafletMap({ customer, markers, onMarkerPress }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
      <style>html, body, #map { height:100%; margin:0; padding:0 }</style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    </head>
    <body>
      <div id="map"></div>

      <script>
        var map = L.map('map').setView([${customer.lat}, ${customer.lng}], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // Customer pin (blue)
        L.marker([${customer.lat}, ${customer.lng}], {
          title: "You"
        }).addTo(map).bindPopup("Your Location");

        // Mechanics pins
        const markers = ${JSON.stringify(markers)};

        markers.forEach(m => {
          const marker = L.marker([m.lat, m.lng]).addTo(map);
          marker.on("click", () => {
            window.ReactNativeWebView.postMessage(m.id);
          });
        });
      </script>
    </body>
    </html>
  `;

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      onMessage={(event) => onMarkerPress(event.nativeEvent.data)}
      style={{ flex: 1 }}
    />
  );
}
