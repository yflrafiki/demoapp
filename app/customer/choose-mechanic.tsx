import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { useFocusEffect, router } from "expo-router";
import { Mechanic } from "../../types/mechanic.types";
import LeafletMap from "../components/LeafletMap";

export default function ChooseMechanic() {
  const [customer, setCustomer] = useState<any>(null);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to mechanics table changes so we see updated locations in real-time
  useEffect(() => {
    let channel: any;
    (async () => {
      try {
        channel = supabase
          .channel("public:mechanics")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "mechanics" },
            (payload) => {
              // For simplicity, reload full mechanics list when anything changes
              loadData();
            }
          )
          .subscribe();
      } catch (e) {
        console.log("Mechanics realtime subscribe failed", e);
      }
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      console.log("choose-mechanic: auth user:", { id: user.id, email: user.email });

      // Get customer profile
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      setCustomer(customerData);

      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCustomerLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }

      // Get all mechanics
      const resp = await supabase
        .from("mechanics")
        .select("id,name,lat,lng,is_available,specialization,rating,created_at")
        .order("created_at", { ascending: false });

      // Diagnostic logging: show full response so we can see errors/policies
      console.log("choose-mechanic: supabase mechanics resp:", resp);

      const mechanicsData = resp.data;
      const mechanicsError = resp.error;
      if (mechanicsError) {
        console.warn("choose-mechanic: mechanics query error:", mechanicsError);
      }

      setMechanics((mechanicsData as any) || []);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location required", "Please enable location in app settings to see nearby mechanics.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setCustomerLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e: any) {
      Alert.alert("Location error", e.message || String(e));
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const handleSelectMechanic = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
  };

  const handleProceedToRequest = () => {
    if (!selectedMechanic) {
      Alert.alert("Error", "Please select a mechanic first");
      return;
    }

    router.push({
      pathname: "/customer/send-request",
      params: { mechanicId: selectedMechanic.id },
    });
  };

  const markers = mechanics
    .filter((m) => m.lat !== null && m.lat !== undefined && m.lng !== null && m.lng !== undefined)
    .map((m) => ({
      id: m.id,
      lat: typeof m.lat === "string" ? parseFloat(m.lat) : (m.lat as number),
      lng: typeof m.lng === "string" ? parseFloat(m.lng) : (m.lng as number),
      title: m.name,
      subtitle: m.specialization,
    }));

  // Debug: log markers and expose a quick refresh
  useEffect(() => {
    console.log("choose-mechanic: mechanics count=", mechanics.length, "markers=", markers);
  }, [mechanics, markers]);

  const handleMarkerPress = (id: string | number) => {
    const mech = mechanics.find((m) => String(m.id) === String(id));
    if (mech) setSelectedMechanic(mech);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Finding nearby mechanics...</Text>
      </View>
    );
  }

  if (selectedMechanic) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedMechanic(null)}>
            <Text style={styles.backText}>← Back to List</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mechanic Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{selectedMechanic.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{selectedMechanic.phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Specialization:</Text>
              <Text style={styles.value}>{selectedMechanic.specialization}</Text>
            </View>
          </View>

          {selectedMechanic.rating && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Rating</Text>
              <Text style={styles.ratingText}>
                ⭐ {selectedMechanic.rating.toFixed(1)} / 5.0
              </Text>
            </View>
          )}

          {customerLocation && selectedMechanic.lat && selectedMechanic.lng && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Distance</Text>
              <Text style={styles.distance}>
                {calculateDistance(
                  customerLocation.lat,
                  customerLocation.lng,
                  selectedMechanic.lat,
                  selectedMechanic.lng
                )}{" "}
                km away
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleProceedToRequest}
          >
            <Text style={styles.confirmButtonText}>Send Request to {selectedMechanic.name}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select a Mechanic</Text>
        <View style={{ width: 40 }} />
      </View>

      { !customerLocation && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationBannerText}>Location is disabled. Enable to see distances.</Text>
          <TouchableOpacity onPress={requestLocation} style={styles.locationButton}>
            <Text style={styles.locationButtonText}>Allow Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map view showing nearby mechanics */}
      <View style={styles.mapContainer}>
        <LeafletMap customer={customerLocation} markers={markers} onMarkerPress={handleMarkerPress} />

        {/* Debug badge: shows how many markers we detected and allows quick refresh */}
        <View style={styles.mapDebugContainer} pointerEvents="box-none">
          <View style={styles.mapDebugBadge}>
            <Text style={styles.mapDebugText}>{markers.length} markers</Text>
          </View>
          <TouchableOpacity style={styles.mapDebugButton} onPress={loadData}>
            <Text style={styles.mapDebugButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {markers.length === 0 && (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>No mechanic locations available</Text>
          </View>
        )}
      </View>

      <FlatList
        data={mechanics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const distance =
            customerLocation && item.lat && item.lng
              ? calculateDistance(
                  customerLocation.lat,
                  customerLocation.lng,
                  item.lat,
                  item.lng
                )
              : null;

          return (
            <TouchableOpacity
              style={styles.mechanicCard}
              onPress={() => handleSelectMechanic(item)}
            >
              <View style={styles.mechanicHeader}>
                <View style={styles.mechanicInfo}>
                  <Text style={styles.mechanicName}>{item.name}</Text>
                  <Text style={styles.specialization}>{item.specialization}</Text>
                </View>
                {item.rating && (
                  <Text style={styles.rating}>⭐ {item.rating.toFixed(1)}</Text>
                )}
              </View>

              <View style={styles.mechanicDetails}>
                <Text style={styles.phone}>📞 {item.phone}</Text>
                {distance && (
                  <Text style={styles.distanceText}>{distance} km away</Text>
                )}
                <View
                  style={[
                    styles.availabilityBadge,
                    { backgroundColor: item.is_available ? "#4CAF50" : "#999" },
                  ]}
                >
                  <Text style={styles.availabilityText}>
                    {item.is_available ? "Available" : "Unavailable"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No mechanics available</Text>
            <Text style={styles.emptySubText}>
              Please try again later
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backText: {
    color: "#1E90FF",
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  mechanicCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1E90FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mechanicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  mechanicInfo: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  specialization: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  rating: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF9800",
  },
  mechanicDetails: {
    gap: 8,
  },
  phone: {
    fontSize: 13,
    color: "#1E90FF",
    fontWeight: "600",
  },
  distanceText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  availabilityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  ratingText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF9800",
  },
  distance: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E90FF",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  locationBanner: {
    backgroundColor: "#fff3e0",
    padding: 12,
    margin: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationBannerText: {
    color: "#8a6d3b",
    flex: 1,
    marginRight: 12,
  },
  locationButton: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locationButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  mapContainer: {
    height: 260,
    width: "100%",
    backgroundColor: "#fff",
  },
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  mapOverlayText: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    color: "#666",
  },
  mapDebugContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    zIndex: 20,
  },
  mapDebugBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mapDebugText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  mapDebugButton: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mapDebugButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});