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
} from "react-native";
import * as Location from "expo-location";
import LeafletMap from "../components/LeafletMap";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, router } from "expo-router";
import { createRequest } from "../../lib/requests";
import { MechanicRequest } from "../../types/mechanic.types";

export default function SendRequest() {
  const { requestId, mechanicId } = useLocalSearchParams();
  const [customer, setCustomer] = useState<any>(null);
  const [request, setRequest] = useState<MechanicRequest | null>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [mechanic, setMechanic] = useState<any>(null);
  const [mechanicLocation, setMechanicLocation] = useState<any>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [carType, setCarType] = useState("");
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!requestId) return;
    let mounted = true;
    let channel: any;

    (async () => {
      try {
        // subscribe to request updates
        channel = supabase
          .channel(`public:requests:${requestId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` },
            (payload: any) => {
              if (!mounted) return;
              if (payload.new) setRequest(payload.new as MechanicRequest);
              // if mechanic location included in request, update
              if (payload.new?.mechanic_lat && payload.new?.mechanic_lng) {
                setMechanicLocation({ lat: Number(payload.new.mechanic_lat), lng: Number(payload.new.mechanic_lng) });
              }
            }
          )
          .subscribe();

        // also subscribe to mechanic row when assigned
        const currentReq = requestId ? (await supabase.from('requests').select('*').eq('id', requestId).single()).data : null;
        const mechId = currentReq?.mechanic_id;
        if (mechId) {
          const mechChannel = supabase
            .channel(`public:mechanics:${mechId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mechanics', filter: `id=eq.${mechId}` }, (payload: any) => {
              if (!mounted) return;
              setMechanic(payload.new);
              if (payload.new?.lat && payload.new?.lng) setMechanicLocation({ lat: Number(payload.new.lat), lng: Number(payload.new.lng) });
            })
            .subscribe();

          // attach to main channel cleanup
          channel = channel; // keep reference
        }
      } catch (e) {
        console.log('customer request subscribe failed', e);
      }
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [requestId]);

  // Reverse geocode helper (small, uses Nominatim)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'demoapp/1.0' } });
      if (!res.ok) return null;
      const json = await res.json();
      return json.display_name || null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (mechanicLocation?.lat && mechanicLocation?.lng) {
        const n = await reverseGeocode(mechanicLocation.lat, mechanicLocation.lng);
        if (active) setPlaceName(n);
      }
    })();
    return () => { active = false; };
  }, [mechanicLocation]);

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

      // Get customer profile
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      setCustomer(customerData);

      // If editing existing request, load it
      if (requestId) {
        const { data: reqData } = await supabase
          .from("requests")
          .select("*")
          .eq("id", requestId)
          .single();

        if (reqData) {
          setRequest(reqData);
          setCarType(reqData.car_type || "");
          setIssue(reqData.description || reqData.issue || "");
          // if mechanic is already assigned and has coords, show them
          if (reqData.mechanic_lat && reqData.mechanic_lng) {
            setMechanicLocation({ lat: Number(reqData.mechanic_lat), lng: Number(reqData.mechanic_lng) });
          }
          if (reqData.mechanic_id) {
            const { data: mech } = await supabase.from('mechanics').select('*').eq('id', reqData.mechanic_id).single();
            if (mech) setMechanic(mech);
          }
        }
      }

      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCustomerLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !customer) throw new Error("User not found");

      if (requestId && request) {
        // Update existing request
        const { error } = await supabase
          .from("requests")
          .update({
            car_type: carType,
            description: issue,
            issue: issue,
          })
          .eq("id", requestId);

        if (error) throw error;
        Alert.alert("Success", "Request updated!");
      } else {
        // Create new request
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

  const handleDelete = async () => {
    if (!requestId || !request) return;
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            setSending(true);
            await supabase.from('requests').update({ status: 'declined' }).eq('id', requestId);
            Alert.alert('Cancelled', 'Your request was cancelled.');
            router.replace('/customer/customer-dashboard');
          } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
          } finally {
            setSending(false);
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {requestId ? "Edit Request" : "Create Request"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Information</Text>
          <Text style={styles.info}>Name: {customer?.name}</Text>
          <Text style={styles.info}>Phone: {customer?.phone}</Text>
          {customerLocation && (
            <Text style={styles.info}>
                  Location: {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
            </Text>
          )}
        </View>

          {/* Live map when mechanic assigned/accepted */}
          {request?.status === 'accepted' && (
            <View style={{ height: 300, marginHorizontal: 16, marginBottom: 16 }}>
              <LeafletMap
                customer={customerLocation}
                markers={[
                  ...(customerLocation ? [{ id: 'customer', lat: customerLocation.lat, lng: customerLocation.lng, title: customer?.name || 'You' }] : []),
                  ...(mechanicLocation ? [{ id: 'mechanic', lat: mechanicLocation.lat, lng: mechanicLocation.lng, title: placeName || mechanic?.name || 'Mechanic' }] : []),
                ]}
                polylines={mechanicLocation && customerLocation ? [{ id: 'route', coords: [[mechanicLocation.lat, mechanicLocation.lng], [customerLocation.lat, customerLocation.lng]], color: '#FF6B35' }] : []}
              />

              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <Text style={{ color: '#333', fontWeight: '600' }}>Mechanic: {mechanic?.name || 'Assigned'}</Text>
                {placeName ? <Text style={{ color: '#666' }}>{placeName}</Text> : mechanicLocation ? <Text style={{ color: '#666' }}>{mechanicLocation.lat.toFixed(4)}, {mechanicLocation.lng.toFixed(4)}</Text> : null}
              </View>
            </View>
          )}

        <Text style={styles.label}>Car Type</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Toyota Camry, Honda Civic"
          value={carType}
          onChangeText={setCarType}
          editable={!sending}
        />

        <Text style={styles.label}>Issue Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the problem with your vehicle"
          value={issue}
          onChangeText={setIssue}
          multiline
          numberOfLines={6}
          editable={!sending}
        />

        <TouchableOpacity
          style={[styles.button, sending && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {requestId ? "Update Request" : "Send Request"}
            </Text>
          )}
        </TouchableOpacity>

        {requestId && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#F44336', marginTop: 8 }]}
            onPress={handleDelete}
            disabled={sending}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cancel Request</Text>}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backText: {
    color: "#1E90FF",
    fontWeight: "600",
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  info: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
    color: "#333",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#1E90FF",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
