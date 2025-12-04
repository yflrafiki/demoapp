import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { useFocusEffect, router } from "expo-router";
import { acceptRequest, declineRequest, updateRequestLocation } from "../../lib/requests";
import { MechanicRequest } from "../../types/mechanic.types";

export default function MechanicMap() {
  const [mechanic, setMechanic] = useState<any>(null);
  const [requests, setRequests] = useState<MechanicRequest[]>([]);
  const [mechanicLocation, setMechanicLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MechanicRequest | null>(null);
  const [locationTracking, setLocationTracking] = useState(false);

  useEffect(() => {
    getCurrentMechanic();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (mechanic?.id) {
        loadRequests();
        startLocationTracking();
      }
      return () => {
        stopLocationTracking();
      };
    }, [mechanic?.id])
  );

  const getCurrentMechanic = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: mechanicData } = await supabase
        .from("mechanics")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (mechanicData) {
        setMechanic(mechanicData);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const { data } = await supabase
        .from("requests")
        .select("*")
        .eq("mechanic_id", mechanic.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setRequests(data || []);
    } catch (err: any) {
      Alert.alert("Error", "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission is needed to show your location");
        return;
      }

      setLocationTracking(true);

      // Get initial location
      const location = await Location.getCurrentPositionAsync({});
      setMechanicLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      // Update mechanic location in database
      if (mechanic?.id) {
        await supabase
          .from("mechanics")
          .update({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          })
          .eq("id", mechanic.id);
        // Also update any currently accepted requests with mechanic coords
        try {
          const { data: acceptedRequests } = await supabase
            .from("requests")
            .select("id")
            .eq("mechanic_id", mechanic.id)
            .eq("status", "accepted");
          if (acceptedRequests && acceptedRequests.length > 0) {
            for (const r of acceptedRequests) {
              await updateRequestLocation(r.id, location.coords.latitude, location.coords.longitude, true);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Set up location updates every 5 seconds
      const interval = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setMechanicLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });

          if (mechanic?.id) {
            await supabase
              .from("mechanics")
              .update({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
              })
              .eq("id", mechanic.id);
            // update accepted requests with latest mechanic location
            try {
              const { data: acceptedRequests } = await supabase
                .from("requests")
                .select("id")
                .eq("mechanic_id", mechanic.id)
                .eq("status", "accepted");
              if (acceptedRequests && acceptedRequests.length > 0) {
                for (const r of acceptedRequests) {
                  await updateRequestLocation(r.id, loc.coords.latitude, loc.coords.longitude, true);
                }
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (err) {
          console.log("Error updating location:", err);
        }
      }, 5000);

      return () => clearInterval(interval);
    } catch (err: any) {
      Alert.alert("Error", "Failed to start location tracking");
    }
  };

  const stopLocationTracking = () => {
    setLocationTracking(false);
  };

  const handleAcceptRequest = async (request: MechanicRequest) => {
    try {
      if (!mechanic?.id) throw new Error("Mechanic not found");

      await acceptRequest(request.id, mechanic.id);
      // Navigate to in-app navigation screen so mechanic can follow customer
      router.push({ pathname: "/mechanic/navigation", params: { requestId: request.id } });
      loadRequests();
      setSelectedRequest(null);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDeclineRequest = async (request: MechanicRequest) => {
    try {
      await declineRequest(request.id);
      Alert.alert("Success", "Request declined");
      loadRequests();
      setSelectedRequest(null);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
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

  const openMapNavigation = (request: MechanicRequest) => {
    if (!request.lat || !request.lng) {
      Alert.alert("No Location", "Customer location not available");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  if (selectedRequest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedRequest(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Request Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{selectedRequest.customer_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{selectedRequest.customer_phone}</Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Car Type:</Text>
              <Text style={styles.value}>{selectedRequest.car_type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Issue:</Text>
              <Text style={styles.value}>{selectedRequest.issue || selectedRequest.description}</Text>
            </View>
          </View>

          {mechanicLocation && selectedRequest.lat && selectedRequest.lng && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Distance</Text>
              <Text style={styles.distance}>
                {calculateDistance(
                  mechanicLocation.lat,
                  mechanicLocation.lng,
                  selectedRequest.lat,
                  selectedRequest.lng
                )}{" "}
                km away
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.navigationButton}
            onPress={() => openMapNavigation(selectedRequest)}
          >
            <Text style={styles.navigationButtonText}>Open Navigation</Text>
          </TouchableOpacity>

          <View style={styles.actionButtonsContainer}>
            {selectedRequest.status === 'pending' ? (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(selectedRequest)}
              >
                <Text style={styles.actionButtonText}>Accept Request</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.acceptButton, { backgroundColor: '#1976D2' }]}
                onPress={() => router.push({ pathname: '/mechanic/navigation', params: { requestId: selectedRequest.id } })}
              >
                <Text style={styles.actionButtonText}>Continue Navigation</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDeclineRequest(selectedRequest)}
            >
              <Text style={styles.actionButtonText}>Decline Request</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/mechanic/dashboard")}>
          <Text style={styles.backButton}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {mechanicLocation && (
        <View style={styles.locationStatus}>
          <View style={styles.statusIndicator} />
          <Text style={styles.statusText}>
            Your location: {mechanicLocation.lat.toFixed(4)}, {mechanicLocation.lng.toFixed(4)}
          </Text>
        </View>
      )}

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.requestItem}
            onPress={() => setSelectedRequest(item)}
          >
            <View style={styles.requestHeader}>
              <Text style={styles.customerName}>{item.customer_name}</Text>
              <Text style={styles.carType}>{item.car_type}</Text>
            </View>

            <Text style={styles.description} numberOfLines={2}>
              {item.issue || item.description}
            </Text>

            {mechanicLocation && item.lat && item.lng && (
              <Text style={styles.distance}>
                {calculateDistance(
                  mechanicLocation.lat,
                  mechanicLocation.lng,
                  item.lat,
                  item.lng
                )}{" "}
                km away
              </Text>
            )}

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => openMapNavigation(item)}
              >
                <Text style={styles.quickButtonText}>Navigate</Text>
              </TouchableOpacity>
              {item.status === 'pending' ? (
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={() => handleAcceptRequest(item)}
                >
                  <Text style={styles.quickButtonText}>Accept</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.quickButton, { backgroundColor: '#1976D2' }]}
                  onPress={() => router.push({ pathname: '/mechanic/navigation', params: { requestId: item.id } })}
                >
                  <Text style={styles.quickButtonText}>Continue</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.quickButtonDanger}
                onPress={() => handleDeclineRequest(item)}
              >
                <Text style={styles.quickButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubText}>You're all caught up!</Text>
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
  backButton: {
    color: "#FF6B35",
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  locationStatus: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  statusText: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  requestItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  carType: {
    fontSize: 12,
    backgroundColor: "#FFF3E0",
    color: "#E65100",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  distance: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "600",
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  quickButtonDanger: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  quickButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
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
  navigationButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  navigationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  declineButton: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
