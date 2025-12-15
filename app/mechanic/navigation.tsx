import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { supabase } from "../../lib/supabase";
import LeafletMap from "../components/LeafletMap";
import * as Location from "expo-location";
import { useLocalSearchParams, router } from "expo-router";
import { updateRequestLocation } from "../../lib/requests";

export default function MechanicNavigation() {
  const { requestId } = useLocalSearchParams();
  const [request, setRequest] = useState<any>(null);
  const [mechanicLocation, setMechanicLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mechanicPlaceName, setMechanicPlaceName] = useState<string | null>(null);
  const [customerPlaceName, setCustomerPlaceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const lastGeocodeRef = useRef<{ [key: string]: number }>({});

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchPlaceName = async (loc: { lat: number; lng: number }, isCustomer: boolean) => {
    const key = isCustomer ? "customer" : "mechanic";
    const now = Date.now();
    if (lastGeocodeRef.current[key] && now - lastGeocodeRef.current[key] < 5000) return;
    lastGeocodeRef.current[key] = now;

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.lat}&lon=${loc.lng}`;
      const res = await fetch(url, { headers: { "User-Agent": "demoapp/1.0" } });
      const json = await res.json();
      const name = json.display_name || `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
      if (isCustomer) setCustomerPlaceName(name);
      else setMechanicPlaceName(name);
    } catch (e) {
      console.log("Reverse geocode failed:", e);
    }
  };

  useEffect(() => {
    if (!requestId) return;
    let mounted = true;
    let watcher: any = null;

    const init = async () => {
      setLoading(true);
      try {
        const { data: req } = await supabase.from("requests").select("*").eq("id", requestId).single();
        if (!mounted || !req) return;
        setRequest(req);

        if (req.customer_lat && req.customer_lng) {
          const customerLoc = { lat: req.customer_lat, lng: req.customer_lng };
          setCustomerLocation(customerLoc);
          fetchPlaceName(customerLoc, true);
        }
      } catch (e: any) {
        Alert.alert("Error", e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    init();

    const channel = supabase
      .channel(`public:requests:${requestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests", filter: `id=eq.${requestId}` },
        (payload: any) => {
          if (!mounted) return;
          setRequest(payload.new);
          if (payload.new.customer_lat && payload.new.customer_lng) {
            const customerLoc = { lat: Number(payload.new.customer_lat), lng: Number(payload.new.customer_lng) };
            setCustomerLocation(customerLoc);
            fetchPlaceName(customerLoc, true);
          }
        }
      )
      .subscribe();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const last = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      if (mounted && last) {
        const mechLoc = { lat: last.coords.latitude, lng: last.coords.longitude };
        setMechanicLocation(mechLoc);
        fetchPlaceName(mechLoc, false);
        await updateRequestLocation(requestId as string, mechLoc.lat, mechLoc.lng, true);
      }

      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 3000, distanceInterval: 1 },
        async (loc) => {
          if (!mounted || !loc) return;
          const mechLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setMechanicLocation(prev => {
            if (prev && getDistance(prev.lat, prev.lng, mechLoc.lat, mechLoc.lng) < 3) return prev;
            fetchPlaceName(mechLoc, false);
            updateRequestLocation(requestId as string, mechLoc.lat, mechLoc.lng, true);
            return mechLoc;
          });
        }
      );
    })();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      if (watcher && typeof watcher.remove === "function") watcher.remove();
    };
  }, [requestId]);

  const markers = [
    ...(customerLocation ? [{ id: "customer", ...customerLocation, title: "Customer" }] : []),
    ...(mechanicLocation ? [{ id: "mechanic", ...mechanicLocation, title: "You" }] : []),
  ];

  const polylines =
    mechanicLocation && customerLocation
      ? [{
          id: "route",
          coords: [
            [mechanicLocation.lat, mechanicLocation.lng] as [number, number],
            [customerLocation.lat, customerLocation.lng] as [number, number]
          ],
          color: "#FF6B35"
        }]
      : [];

  const handleComplete = async () => {
    if (!requestId) return;
    try {
      await supabase.from("requests").update({ status: "completed" }).eq("id", requestId);
      Alert.alert("Completed", "Request marked as completed.");
      router.replace("/mechanic/dashboard");
    } catch (e: any) {
      Alert.alert("Error", e.message || String(e));
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1E90FF" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <LeafletMap
          customer={customerLocation}
          markers={markers}
          polylines={polylines}
          fitBoundsMarkers={markers}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request Info</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Car Type:</Text> {request?.car_type}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Issue:</Text> {request?.description}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Status:</Text> {request?.status?.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Locations</Text>
          {customerPlaceName && <Text style={styles.cardText}><Text style={styles.bold}>Customer:</Text> {customerPlaceName}</Text>}
          {mechanicPlaceName && <Text style={styles.cardText}><Text style={styles.bold}>Your Location:</Text> {mechanicPlaceName}</Text>}
        </View>

        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeText}>Mark Arrived / Complete</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapWrap: { height: 400, margin: 16, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 5 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 8 },
  cardText: { fontSize: 14, color: "#555", marginBottom: 4 },
  bold: { fontWeight: "600", color: "#333" },
  completeBtn: { backgroundColor: "#4CAF50", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginBottom: 16, marginTop: 8 },
  completeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
