import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

export default function MechanicMapPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_KEY";

  useEffect(() => {
    (async () => {
      // Request permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission denied");
        return;
      }

      // Get initial location
      let location = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      // Watch for location updates
      const subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // update every 5 seconds
          distanceInterval: 5, // or when moved 5 meters
        },
        (loc) => {
          setCoords({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      );

      return () => subscriber.remove();
    })();
  }, []);

  if (!coords) {
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  }

  // Google Static Map with dynamic marker
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=15&size=600x600&markers=color:red%7C${coords.lat},${coords.lng}&key=${GOOGLE_MAPS_API_KEY}`;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: mapUrl }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 20,
  },
});
