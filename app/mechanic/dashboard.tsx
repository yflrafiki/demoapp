import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert
} from "react-native";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";

export default function MechanicDashboard() {
  const [mechanic, setMechanic] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadProfileAndRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: me } = await supabase
      .from("mechanics")
      .select("id, name, lat, lng, is_available")
      .eq("auth_id", user.id)
      .single();

    if (!me) {
      router.replace("/login");
      return;
    }

    setMechanic(me);

    const { data: reqs } = await supabase
      .from("requests")
      .select(`
        id, 
        customer_name, 
        customer_phone,
        car_type, 
        description, 
        lat, 
        lng, 
        status, 
        created_at
      `)
      .eq("mechanic_id", me.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(50);

    setRequests(reqs?.map((r: any) => ({
      ...r,
      customer_phone: r.customer_phone || "N/A"
    })) || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadProfileAndRequests();
      setLoading(false);
    };
    init();

    let locInterval: any;
    let channel: any;
    let mounted = true;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: me } = await supabase
          .from("mechanics")
          .select("id")
          .eq("auth_id", user.id)
          .single();
        if (!me) return;

        const startPublish = async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") return;

          const loc = await Location.getCurrentPositionAsync({});
          await supabase
            .from("mechanics")
            .update({ lat: loc.coords.latitude, lng: loc.coords.longitude, is_available: true })
            .eq("id", me.id);
        };

        startPublish();
        locInterval = setInterval(startPublish, 10000);

        channel = supabase
          .channel(`public:requests:mechanic:${me.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "requests",
              filter: `mechanic_id=eq.${me.id}`
            },
            async (payload: any) => {
              if (!mounted) return;

              if (payload.new?.status === 'declined' && payload.old?.status !== 'declined') {
                Alert.alert('Request Cancelled', `${payload.new?.customer_name || 'Customer'} cancelled the request.`);
              }

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newReq = payload.new;
                setRequests(prev => {
                  const idx = prev.findIndex(r => r.id === newReq.id);
                  if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = { ...prev[idx], ...newReq };
                    return updated;
                  } else {
                    return [newReq, ...prev];
                  }
                });
              } else if (payload.eventType === 'DELETE') {
                setRequests(prev => prev.filter(r => r.id !== payload.old?.id));
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.log("Realtime setup failed:", e);
      }
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      if (locInterval) clearInterval(locInterval);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileAndRequests();
    setRefreshing(false);
  };

  const acceptRequest = async (item: any) => {
    try {
      if (!mechanic?.id) throw new Error("Mechanic not found");
      const requests = await import("../../lib/requests");
      setLoading(true);
      await requests.acceptRequest(item.id, mechanic.id);
      router.push({ pathname: "/mechanic/navigation", params: { requestId: item.id } });
      loadProfileAndRequests();
    } catch (e) {
      console.warn("acceptRequest failed:", e);
    }
  };

  const rejectRequest = async (item: any) => {
    await supabase.from("requests").update({ status: "rejected" }).eq("id", item.id);
    loadProfileAndRequests();
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  if (selectedRequest) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedRequest(null)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Request Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.detailCard}>
          {["customer_name", "customer_phone", "car_type", "description"].map((field, idx) => (
            <View key={idx} style={{ marginBottom: idx === 0 ? 12 : 16 }}>
              <Text style={styles.detailLabel}>{field.replace("_", " ").toUpperCase()}</Text>
              <Text style={styles.detailValue}>{selectedRequest[field] || 'N/A'}</Text>
            </View>
          ))}

          {selectedRequest.lat && selectedRequest.lng && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.detailLabel}>LOCATION</Text>
              <Text style={styles.detailValue}>{selectedRequest.lat}, {selectedRequest.lng}</Text>
            </View>
          )}

          <View style={styles.detailActions}>
            {selectedRequest.status === 'pending' ? (
              <TouchableOpacity style={styles.acceptBtn} onPress={() => { acceptRequest(selectedRequest); setSelectedRequest(null); }}>
                <Text style={styles.btnText}>Accept Request</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: '#1976D2' }]} onPress={() => router.push({ pathname: '/mechanic/navigation', params: { requestId: selectedRequest.id } })}>
                <Text style={styles.btnText}>Continue Navigation</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.rejectBtn} onPress={() => { rejectRequest(selectedRequest); setSelectedRequest(null); }}>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>

            {selectedRequest.lat && selectedRequest.lng && (
              <TouchableOpacity style={styles.mapBtn} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${selectedRequest.lat},${selectedRequest.lng}`)}>
                <Text style={styles.btnText}>View on Map</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome,</Text>
      <Text style={styles.name}>{mechanic.name}</Text>

      <TouchableOpacity style={styles.profileCard} onPress={() => router.push("/mechanic/profile")}>
        <Text style={styles.profileTitle}>Profile & Settings</Text>
        <Text style={styles.profileSubtitle}>Edit details or log out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.mapCard} onPress={() => router.push("/mechanic/map-view")}>
        <Text style={styles.mapTitle}>Open Map & Live Requests</Text>
        <Text style={styles.mapSubtitle}>View customer location & accept requests</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Incoming Requests</Text>

      <FlatList
        data={requests}
        keyExtractor={(i) => i.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No pending requests</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedRequest(item)}>
            <Text style={styles.cardTitle}>{item.customer_name}</Text>
            <Text style={styles.cardPhone}>📞 {item.customer_phone}</Text>
            <Text style={styles.cardMeta}>{item.car_type} • {item.description}</Text>

            <View style={styles.row}>
              <TouchableOpacity style={styles.mapBtn} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.lat},${item.lng}`)}>
                <Text style={styles.btnText}>Map</Text>
              </TouchableOpacity>

              {item.status === 'pending' ? (
                <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(item)}>
                  <Text style={styles.btnText}>Accept</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: '#1976D2' }]} onPress={() => router.push({ pathname: '/mechanic/navigation', params: { requestId: item.id } })}>
                  <Text style={styles.btnText}>Continue</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(item)}>
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5", paddingTop: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcome: { fontSize: 20, color: "#555", marginBottom: 4 },
  name: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  profileCard: { backgroundColor: "#1E90FF", padding: 20, borderRadius: 12, marginBottom: 16, elevation: 2 },
  profileTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  profileSubtitle: { color: "#eee", fontSize: 14, marginTop: 4 },
  mapCard: { backgroundColor: "#4CAF50", padding: 20, borderRadius: 12, marginBottom: 24, elevation: 2 },
  mapTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  mapSubtitle: { color: "#eee", fontSize: 14, marginTop: 4 },
  section: { fontSize: 20, fontWeight: "700", marginBottom: 12, color: "#333" },
  empty: { fontSize: 16, color: "#777", textAlign: "center", marginTop: 12 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  cardPhone: { fontSize: 14, color: "#1E90FF", fontWeight: "600", marginBottom: 6 },
  cardMeta: { fontSize: 14, color: "#555" },
  row: { flexDirection: "row", marginTop: 12 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  mapBtn: { backgroundColor: "#333", padding: 10, borderRadius: 8, marginRight: 8 },
  acceptBtn: { backgroundColor: "green", padding: 10, borderRadius: 8, marginRight: 8 },
  rejectBtn: { backgroundColor: "red", padding: 10, borderRadius: 8 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#eee", marginBottom: 20 },
  backBtn: { color: "#1E90FF", fontWeight: "600", fontSize: 14 },
  detailTitle: { fontSize: 20, fontWeight: "700" },
  detailCard: { backgroundColor: "#fff", padding: 20, borderRadius: 12, elevation: 2 },
  detailLabel: { fontSize: 12, fontWeight: "600", color: "#999", textTransform: "uppercase", marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: "500", color: "#333", marginBottom: 12 },
  detailActions: { marginTop: 16, flexDirection: "column" },
});
