import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, router } from "expo-router";

export default function SendRequest() {
  const { mechanic_id } = useLocalSearchParams(); // mechanic passed from choose screen
  const [mechanic, setMechanic] = useState<any>(null);

  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load chosen mechanic
  const loadMechanic = async () => {
    const { data } = await supabase
      .from("mechanics")
      .select("*")
      .eq("id", mechanic_id)
      .single();

    setMechanic(data);
  };

  // Get customer profile + location
  const loadCustomerLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission required.");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setCustomerLocation({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    });
  };

  const loadAll = async () => {
    setLoading(true);
    await loadMechanic();
    await loadCustomerLocation();
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const sendRequest = async () => {
    if (!description.trim()) {
      Alert.alert("Required", "Describe the problem first.");
      return;
    }

    setSending(true);

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (!customer) {
      Alert.alert("Error", "Customer profile not found.");
      setSending(false);
      return;
    }

    // Insert request
    const { error } = await supabase.from("requests").insert({
      customer_id: customer.id,
      customer_name: customer.name,
      car_type: customer.car_type,
      mechanic_id: mechanic.id,
      lat: customerLocation.lat,
      lng: customerLocation.lng,
      description,
      status: "pending",
    });

    if (error) {
      Alert.alert("Failed", error.message);
    } else {
      Alert.alert("Success", "Request sent successfully!");
      router.replace("/customer/customer-dashboard");
    }

    setSending(false);
  };

  if (loading || !mechanic || !customerLocation)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Send Request</Text>

      {/* Mechanic details */}
      <View style={styles.card}>
        <Text style={styles.mechName}>{mechanic.name}</Text>
        <Text style={styles.mechService}>{mechanic.service_type}</Text>
        <Text style={styles.mechPhone}>📞 {mechanic.phone}</Text>
      </View>

      {/* Description input */}
      <Text style={styles.label}>Describe the issue</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: My car won't start..."
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* Send Button */}
      <TouchableOpacity
        style={styles.sendBtn}
        onPress={sendRequest}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sendText}>Send Request</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { fontSize: 28, fontWeight: "700", marginBottom: 20 },

  card: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  mechName: { fontSize: 20, fontWeight: "700" },
  mechService: { fontSize: 16, color: "#555" },
  mechPhone: { marginTop: 6, color: "#333" },

  label: { marginBottom: 6, fontWeight: "600" },

  input: {
    height: 120,
    backgroundColor: "#eee",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 20,
  },

  sendBtn: {
    backgroundColor: "#1E90FF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  sendText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
});
