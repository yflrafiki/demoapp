import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import LeafletMap from "../components/LeafletMap";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, router } from "expo-router";
import { createRequest, updateRequestLocation } from "../../lib/requests";
import { MechanicRequest } from "../../types/mechanic.types";

export default function SendRequest() {
  const { requestId, mechanicId } = useLocalSearchParams();
  const [customer, setCustomer] = useState<any>(null);
  const [request, setRequest] = useState<MechanicRequest | null>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [mechanic, setMechanic] = useState<any>(null);
  const [mechanicLocation, setMechanicLocation] = useState<any>(null);
  const [customerPlaceName, setCustomerPlaceName] = useState<string | null>(null);
  const [mechanicPlaceName, setMechanicPlaceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [carType, setCarType] = useState("");
  const [issue, setIssue] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!requestId) return;
    let mounted = true;
    const channel = supabase
      .channel(`public:requests:${requestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests", filter: `id=eq.${requestId}` },
        (payload: any) => {
          if (!mounted) return;
          setRequest(payload.new);
          if (payload.new?.mechanic_lat && payload.new?.mechanic_lng) {
            setMechanicLocation({
              lat: Number(payload.new.mechanic_lat),
              lng: Number(payload.new.mechanic_lng),
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  // Reverse geocode customer location
  useEffect(() => {
    let active = true;
    (async () => {
      if (customerLocation?.lat && customerLocation?.lng) {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${customerLocation.lat}&lon=${customerLocation.lng}`;
          const res = await fetch(url, { headers: { "User-Agent": "demoapp/1.0" } });
          const json = await res.json();
          if (active) setCustomerPlaceName(json.display_name || null);
        } catch (e) {
          console.log("Customer reverse geocode failed:", e);
        }
      }
    })();
    return () => { active = false; };
  }, [customerLocation]);

  // Reverse geocode mechanic location
  useEffect(() => {
    let active = true;
    (async () => {
      if (mechanicLocation?.lat && mechanicLocation?.lng) {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${mechanicLocation.lat}&lon=${mechanicLocation.lng}`;
          const res = await fetch(url, { headers: { "User-Agent": "demoapp/1.0" } });
          const json = await res.json();
          if (active) setMechanicPlaceName(json.display_name || null);
        } catch (e) {
          console.log("Mechanic reverse geocode failed:", e);
        }
      }
    })();
    return () => { active = false; };
  }, [mechanicLocation]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");

      const { data: customerData } = await supabase.from("customers").select("*").eq("auth_id", user.id).single();
      setCustomer(customerData);

      if (requestId) {
        const { data: reqData } = await supabase.from("requests").select("*").eq("id", requestId).single();
        if (reqData) {
          setRequest(reqData);
          setCarType(reqData.car_type || "");
          setIssue(reqData.description || reqData.issue || "");
          if (reqData.mechanic_lat && reqData.mechanic_lng) {
            setMechanicLocation({
              lat: Number(reqData.mechanic_lat),
              lng: Number(reqData.mechanic_lng),
            });
          }
          if (reqData.mechanic_id) {
            const { data: mech } = await supabase.from("mechanics").select("*").eq("id", reqData.mechanic_id).single();
            if (mech) setMechanic(mech);
          }
        }
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const last = await Location.getCurrentPositionAsync({});
        setCustomerLocation({ lat: last.coords.latitude, lng: last.coords.longitude });

        await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, timeInterval: 3000, distanceInterval: 1 },
          async (loc) => {
            if (!loc) return;
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            setCustomerLocation({ lat, lng });
            if (requestId) await updateRequestLocation(requestId as string, lat, lng, false);
          }
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!carType.trim() || !issue.trim()) {
      Alert.alert("Required", "Please fill in all fields");
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !customer) throw new Error("User not found");

      if (requestId && request) {
        await supabase.from("requests").update({ car_type: carType, description: issue }).eq("id", requestId);
        Alert.alert("Success", "Request updated!");
      } else {
        await createRequest({
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          carType,
          description: issue,
          lat: customerLocation?.lat ?? null,
          lng: customerLocation?.lng ?? null,
          mechanicId: (mechanicId as string) || null,
        });
        Alert.alert("Success", "Request created!");
      }
      router.replace("/customer/customer-dashboard");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Information</Text>
            <Text style={styles.info}>Name: {customer?.name}</Text>
            <Text style={styles.info}>Phone: {customer?.phone}</Text>
            {customerLocation && (
              <Text style={styles.info}>
                Your Location: {customerPlaceName || `${customerLocation.lat.toFixed(6)}, ${customerLocation.lng.toFixed(6)}`}
              </Text>
            )}
            {mechanicLocation && (
              <Text style={styles.info}>
                Mechanic Location: {mechanicPlaceName || `${mechanicLocation.lat.toFixed(6)}, ${mechanicLocation.lng.toFixed(6)}`}
              </Text>
            )}
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <LeafletMap
              customer={customerLocation}
              markers={[
                ...(customerLocation ? [{ id: "customer", ...customerLocation, title: "You" }] : []),
                ...(mechanicLocation ? [{ id: "mechanic", ...mechanicLocation, title: mechanic?.name || "Mechanic" }] : []),
              ]}
              polylines={
                customerLocation && mechanicLocation
                  ? [{ id: "route", coords: [[mechanicLocation.lat, mechanicLocation.lng], [customerLocation.lat, customerLocation.lng]], color: "#FF6B35" }]
                  : []
              }
            />
          </View>

          <Text style={styles.label}>Car Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Toyota Camry"
            placeholderTextColor="#999"
            value={carType}
            onChangeText={setCarType}
            editable={!sending}
          />
          <Text style={styles.label}>Issue Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your issue"
            placeholderTextColor="#999"
            value={issue}
            onChangeText={setIssue}
            multiline
            numberOfLines={6}
            editable={!sending}
          />

          <TouchableOpacity style={[styles.button, sending && styles.buttonDisabled]} onPress={handleSubmit} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{requestId ? "Update Request" : "Send Request"}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  content: { padding: 16, backgroundColor: "#fff" },
  card: { backgroundColor: "#f5f5f5", borderRadius: 12, padding: 16, marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  info: { fontSize: 14, color: "#333", marginBottom: 8 },
  mapContainer: { height: 400, marginBottom: 16, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#000" },
  input: { 
    borderWidth: 1, 
    borderColor: "#ddd", 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    fontSize: 14, 
    marginBottom: 16, 
    color: "#333",
    backgroundColor: "#fff"
  },
  textArea: { height: 120, textAlignVertical: "top" },
  button: { backgroundColor: "#1E90FF", paddingVertical: 16, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});