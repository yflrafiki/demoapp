import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as Location from "expo-location";
import LeafletMap from "../components/LeafletMap";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function ChooseMechanic() {
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const loadMechanics = async () => {
    const { data } = await supabase.from("mechanics").select("*");

    if (!data) {
      Alert.alert("Error", "Failed to load mechanics");
      return;
    }

    // Filter only mechanics with location
    const filtered = data.filter(
      (m) => m.lat && m.lng
    );

    setMechanics(filtered);
  };

  const getCustomerLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Enable location to continue.");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setCustomerLocation({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude
    });
  };

  const loadAll = async () => {
    setLoading(true);
    await getCustomerLocation();
    await loadMechanics();
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const sendRequest = async () => {
    if (!selected) return;

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    // fetch customer profile
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (!customer) {
      Alert.alert("Profile error");
      return;
    }

    const { error } = await supabase.from("requests").insert({
      customer_id: customer.id,
      customer_name: customer.name,
      car_type: customer.car_type,
      mechanic_id: selected.id,
      lat: customerLocation.lat,
      lng: customerLocation.lng,
      description: "Need service",
      status: "pending"
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Request sent to mechanic!");
      router.push("/customer/customer-dashboard");
    }
  };

  if (loading || !customerLocation)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading nearby mechanics...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapWrapper}>
        <LeafletMap
          customer={customerLocation}
          markers={mechanics.map((m) => ({
            id: m.id,
            lat: m.lat,
            lng: m.lng
          }))}
          onMarkerPress={(id) => {
            const mech = mechanics.find((m) => m.id === id);
            setSelected(mech);
          }}
        />
      </View>

      {/* Bottom Preview */}
      {selected && (
        <View style={styles.bottomSheet}>
          <Text style={styles.name}>{selected.name}</Text>
          <Text style={styles.service}>{selected.service_type}</Text>
          <Text style={styles.phone}>📞 {selected.phone}</Text>

          <TouchableOpacity style={styles.sendBtn} onPress={sendRequest}>
            <Text style={styles.sendText}>Send Request</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  mapWrapper: { flex: 1 },

  bottomSheet: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    elevation: 10
  },

  name: {
    fontSize: 22,
    fontWeight: "700"
  },

  service: {
    fontSize: 16,
    color: "#555",
    marginTop: 4
  },

  phone: {
    fontSize: 14,
    color: "#333",
    marginVertical: 8
  },

  sendBtn: {
    backgroundColor: "#1E90FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10
  },

  sendText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },

  close: {
    textAlign: "center",
    marginTop: 10,
    color: "#888"
  }
});
