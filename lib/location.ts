import * as Location from "expo-location";

export async function getCurrentLocation() {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const pos = await Location.getCurrentPositionAsync({});
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  };
}
