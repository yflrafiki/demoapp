import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function MechanicDashboard() {
  const [mechanic, setMechanic] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false); // ⭐ NEW
  const router = useRouter();

  const loadProfileAndRequests = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: me } = await supabase
      .from("mechanics")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (!me) {
      router.replace("/login");
      return;
    }

    setMechanic(me);

    const { data: reqs } = await supabase
      .from("requests")
      .select("*")
      .eq("mechanic_id", me.id)
      .eq("status", "pending");

    setRequests(reqs || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadProfileAndRequests();
      setLoading(false);
    };

    init();

    let channel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: me } = await supabase
        .from("mechanics")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (!me) return;

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
          loadProfileAndRequests
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ⭐ NEW REFRESH HANDLER
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileAndRequests();
    setRefreshing(false);
  };

  const acceptRequest = async (item: any) => {
    await supabase.from("requests").update({ status: "accepted" }).eq("id", item.id);
    loadProfileAndRequests();
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.welcome}>Welcome,</Text>
      <Text style={styles.name}>{mechanic.name}</Text>

      {/* Profile navigation */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => router.push("/mechanic/profile")}
      >
        <Text style={styles.profileTitle}>Profile & Settings</Text>
        <Text style={styles.profileSubtitle}>Edit details or log out</Text>
      </TouchableOpacity>

      {/* Map Button */}
      <TouchableOpacity
        style={styles.mapCard}
        onPress={() => router.push("/mechanic/map-view")}
      >
        <Text style={styles.mapTitle}>Open Map & Live Requests</Text>
        <Text style={styles.mapSubtitle}>View customer location & accept requests</Text>
      </TouchableOpacity>

      {/* Requests Section */}
      <Text style={styles.section}>Incoming Requests</Text>

      <FlatList
        data={requests}
        keyExtractor={(i) => i.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> // ⭐ ADDED
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No pending requests</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.customer_name}</Text>
            <Text style={styles.cardMeta}>
              {item.car_type} • {item.description}
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() =>
                  Linking.openURL(`https://www.google.com/maps?q=${item.lat},${item.lng}`)
                }
              >
                <Text style={styles.btnText}>Map</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => acceptRequest(item)}
              >
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => rejectRequest(item)}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    marginTop: 40 
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  welcome: { fontSize: 20, color: "#666" },
  name: { fontSize: 28, fontWeight: "700", marginBottom: 20 },

  profileCard: {
    backgroundColor: "#1E90FF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  profileTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  profileSubtitle: { color: "#eee", fontSize: 14, marginTop: 4 },

  mapCard: {
    backgroundColor: "#4CAF50",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30
  },
  mapTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  mapSubtitle: { color: "#eee", fontSize: 14, marginTop: 4 },

  section: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  empty: { fontSize: 16, color: "#777", textAlign: "center", marginTop: 10 },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2
  },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  cardMeta: { fontSize: 14, color: "#555" },

  row: { flexDirection: "row", marginTop: 12 },
  btnText: { color: "#fff", fontWeight: "600" },

  mapBtn: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 8,
    marginRight: 8
  },
  acceptBtn: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 8,
    marginRight: 8
  },
  rejectBtn: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 8
  }
});
