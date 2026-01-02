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
  Image,
} from "react-native";
import * as Location from "expo-location";
import LeafletMap from "../components/LeafletMap";
import { supabase } from "../../lib/supabase";
import { useFocusEffect, router } from "expo-router";
import { Mechanic } from "../../types/mechanic.types";
import { Ionicons } from '@expo/vector-icons';

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

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCustomerLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }

      // Get all mechanics
      const resp = await supabase
        .from("mechanics")
        .select("id,name,phone,lat,lng,is_available,specialization,created_at,profile_image")
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

      <View style={styles.mapContainer}>
        <LeafletMap
          customer={customerLocation}
          markers={[
            ...(customerLocation ? [{
              id: "customer",
              lat: customerLocation.lat,
              lng: customerLocation.lng,
              title: "Your Location",
              type: "customer" as const
            }] : []),
            ...mechanics
              .filter(m => m.lat && m.lng)
              .map(m => ({
                id: m.id,
                lat: Number(m.lat),
                lng: Number(m.lng),
                title: m.name,
                type: "mechanic" as const
              }))
          ]}
        />
      </View>

      <FlatList
        data={mechanics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              style={styles.mechanicCard}
              onPress={() => handleSelectMechanic(item)}
              activeOpacity={0.7}
            >
              <View style={styles.mechanicHeader}>
                <View style={styles.mechanicInfo}>
                  <View style={styles.mechanicAvatar}>
                    {item.profile_image ? (
                      <Image source={{ uri: item.profile_image }} style={styles.profileImage} />
                    ) : (
                      <Ionicons name="person" size={24} color="#1E90FF" />
                    )}
                  </View>
                  <View style={styles.mechanicNameContainer}>
                    <Text style={styles.mechanicName}>{item.name}</Text>
                    <Text style={styles.specialization}>{item.specialization}</Text>
                  </View>
                </View>

              </View>

              <View style={styles.mechanicDetails}>
                <View style={styles.detailsLeft}>
                  <Text style={styles.phone}>📞 {item.phone}</Text>
                </View>
                <View
                  style={[
                    styles.availabilityBadge,
                    { backgroundColor: item.is_available ? "#4CAF50" : "#FF5722" },
                  ]}
                >
                  <View style={styles.availabilityContent}>
                    <View style={[styles.statusDot, { backgroundColor: item.is_available ? "#fff" : "#fff" }]} />
                    <Text style={styles.availabilityText}>
                      {item.is_available ? "Available" : "Busy"}
                    </Text>
                  </View>
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

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/customer/customer-dashboard')}
        >
          <Ionicons name="home-outline" size={24} color="#666" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/customer/history')}
        >
          <Ionicons name="time-outline" size={24} color="#666" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/customer/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.navText}>Notifications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/customer/profile')}
        >
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  mechanicCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  mechanicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  mechanicInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  mechanicAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: 'hidden',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  mechanicNameContainer: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  rating: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF9800",
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mechanicDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailsLeft: {
    flex: 1,
    gap: 8,
  },
  phone: {
    fontSize: 14,
    color: "#1E90FF",
    fontWeight: "600",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  availabilityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  availabilityContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  mapContainer: {
    height: 200,
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
});