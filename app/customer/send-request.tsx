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
  SafeAreaView,
} from "react-native";
import * as Location from "expo-location";
import LeafletMap from "../components/LeafletMap";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, router } from "expo-router";
import { createRequest } from "../../lib/requests";
import { MechanicRequest } from "../../types/mechanic.types";
import { Ionicons } from '@expo/vector-icons';

export default function SendRequest() {
  const { requestId, mechanicId } = useLocalSearchParams();
  const [customer, setCustomer] = useState<any>(null);
  const [request, setRequest] = useState<MechanicRequest | null>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [customerAddress, setCustomerAddress] = useState<string>("");
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
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [requestId]);

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
        }
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCustomerLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        
        // Get human-readable address
        try {
          const address = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
          
          if (address && address.length > 0) {
            const addr = address[0];
            const readableAddress = [
              addr.streetNumber,
              addr.street,
              addr.city,
              addr.region
            ].filter(Boolean).join(", ");
            
            setCustomerAddress(readableAddress || "Address not available");
          } else {
            setCustomerAddress("Address not available");
          }
        } catch (err) {
          setCustomerAddress("Address not available");
        }
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
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {requestId ? "Update Request" : "New Request"}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      
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
            {customerAddress && (
              <Text style={styles.info}>
                Location: {customerAddress}
              </Text>
            )}
          </View>

          <View style={styles.mapContainer}>
            <LeafletMap
              customer={customerLocation}
              markers={customerLocation ? [{
                id: "customer",
                lat: customerLocation.lat,
                lng: customerLocation.lng,
                title: "Your Location",
                type: "customer"
              }] : []}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  keyboardView: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  content: { padding: 16, backgroundColor: "#F8FAFC", paddingBottom: 100 },
  card: { 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    padding: 20, 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    marginBottom: 16, 
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
  },
  info: { 
    fontSize: 15, 
    color: "#333", 
    marginBottom: 12,
    paddingLeft: 8,
    lineHeight: 22,
  },
  mapContainer: { height: 300, marginBottom: 16, backgroundColor: "#fff", borderRadius: 8, overflow: "hidden" },

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
});