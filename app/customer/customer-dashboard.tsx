import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { MechanicRequest } from "../../types/mechanic.types";
import { getCustomerRequests } from "../../lib/requests";

export default function CustomerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [requests, setRequests] = useState<MechanicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "completed" | "declined">("all");

  const filteredRequests = requests.filter(r => filter === "all" || r.status === filter);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadRequests();
        fetchCustomerProfile();
      }
    }, [user?.id])
  );

  useEffect(() => {
    if (!user?.id) return;
    let channel: any;
    let profileChannel: any;

    (async () => {
      try {
        const { data: customerData } = await supabase.from("customers").select("id").eq("auth_id", user.id).single();
        if (!customerData) return;

        // Requests updates
        channel = supabase
          .channel(`public:requests:customer:${customerData.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "requests",
              filter: `customer_id=eq.${customerData.id}`
            },
            (payload) => {
              if (payload.new?.status === "completed" && payload.old?.status === "accepted") {
                Alert.alert("Mechanic Arrived ✓", "The mechanic has arrived and completed the service.");
              }
              setRequests(prev => prev.map(r => r.id === (payload.new as MechanicRequest)?.id ? (payload.new as MechanicRequest) : r));
            }
          )
          .subscribe();

        // Profile updates
        profileChannel = supabase
          .channel(`public:customers:customer:${customerData.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "customers",
              filter: `id=eq.${customerData.id}`
            },
            (payload: any) => {
              if (payload.new?.name) setCustomerName(payload.new.name);
            }
          )
          .subscribe();

      } catch (e) {
        console.log("Realtime subscription failed", e);
      }
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        try {
          const { data: customerRow } = await supabase
            .from("customers")
            .select("id, name")
            .eq("auth_id", user.id)
            .maybeSingle();
          if (customerRow) setCustomerName(customerRow.name || null);
        } catch (e) {}
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to get user");
    }
  };

  const fetchCustomerProfile = async () => {
    if (!user?.id) return;
    try {
      const { data: customerRow } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (customerRow) setCustomerName(customerRow.name || null);
    } catch (e) {
      console.log('Failed to fetch customer profile', e);
    }
  };

  const loadRequests = async () => {
    if (!user?.id) return;
    try {
      const data = await getCustomerRequests(user.id);
      if (data && data.length > 0) {
        const enriched = await Promise.all(
          data.map(async (req: any) => {
            if (req.mechanic_id) {
              try {
                const { data: mech } = await supabase.from('mechanics').select('name, phone').eq('id', req.mechanic_id).single();
                return { ...req, mechanic_name: mech?.name, mechanic_phone: mech?.phone };
              } catch (e) { return req; }
            }
            return req;
          })
        );
        setRequests(enriched || []);
      } else {
        setRequests(data || []);
      }
    } catch (err: any) {
      if (!refreshing) Alert.alert("Error", "Failed to load requests: " + err.message);
    } finally {
      if (!refreshing) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Error", "Failed to logout");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#FFA500";
      case "accepted": return "#4CAF50";
      case "completed": return "#2196F3";
      case "declined": return "#F44336";
      default: return "#666";
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('requests').update({ status: 'declined' }).eq('id', requestId);
            Alert.alert('Cancelled', 'Your request was cancelled.');
            loadRequests();
          } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
          }
        }
      }
    ]);
  };

  const renderRequest = ({ item }: { item: any }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.carType}>{item.car_type}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.issue} numberOfLines={2}>{item.issue || item.description}</Text>

      {item.status === "accepted" && item.mechanic_name && (
        <View style={styles.mechanicCard}>
          <Text style={styles.mechanicLabel}>Assigned Mechanic</Text>
          <Text style={styles.mechanicName}>{item.mechanic_name}</Text>
          {item.mechanic_phone && <Text style={styles.mechanicPhone}>📞 {item.mechanic_phone}</Text>}
          <Text style={styles.acceptedTime}>
            Accepted • {item.accepted_at ? new Date(item.accepted_at).toLocaleDateString() : ""}
          </Text>
        </View>
      )}

      <Text style={styles.createdAt}>{new Date(item.created_at).toLocaleDateString()}</Text>

      {item.status === 'accepted' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.viewMapBtn}
            onPress={() => router.push({ pathname: '/customer/send-request', params: { requestId: item.id } })}
          >
            <Text style={styles.actionBtnText}>View on Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelRequest(item.id)}
          >
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello{customerName ? `, ${customerName}` : ''} 👋</Text>
          <Text style={styles.title}>My Requests</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/customer/edit-profile')}>
            <Text style={styles.profileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.topActions}>
        <TouchableOpacity style={styles.requestBtn} onPress={() => router.push('/customer/choose-mechanic')}>
          <Text style={styles.requestBtnText}>Request Mechanic</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {["all", "pending", "accepted", "completed", "declined"].map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterBtn, filter === status && styles.filterBtnActive]}
            onPress={() => setFilter(status as any)}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredRequests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No requests yet</Text>
            <Text style={styles.emptySubText}>Tap the button below to request a mechanic</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#eee" },
  title: { fontSize: 24, fontWeight: "700", color: "#333" },
  logoutText: { color: "#FF6B6B", fontWeight: "600", fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
  requestCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#1E90FF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  carType: { fontSize: 16, fontWeight: "700", color: "#333" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  issue: { fontSize: 14, color: "#666", marginBottom: 8 },
  mechanicCard: { backgroundColor: '#F0F8FF', borderRadius: 8, padding: 12, marginVertical: 12, borderLeftWidth: 3, borderLeftColor: '#4CAF50' },
  mechanicLabel: { fontSize: 11, fontWeight: '600', color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  mechanicName: { fontSize: 16, fontWeight: '700', color: '#333' },
  mechanicPhone: { fontSize: 13, color: '#555', marginTop: 4 },
  acceptedTime: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginTop: 6 },
  createdAt: { fontSize: 12, color: "#999" },
  greeting: { fontSize: 16, color: '#666', marginBottom: 4 },
  profileBtn: { backgroundColor: '#EEE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  profileBtnText: { color: '#333', fontWeight: '600' },
  topActions: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  requestBtn: { backgroundColor: '#1E90FF', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  requestBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  viewMapBtn: { flex: 1, backgroundColor: '#1E90FF', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#F44336', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 100 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 8 },
  emptySubText: { fontSize: 14, color: "#999" },
  filterBar: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#f0f0f0" },
  filterBtnActive: { backgroundColor: "#1E90FF" },
  filterText: { color: "#333", fontWeight: "600", fontSize: 12 },
  filterTextActive: { color: "#fff" },
});
