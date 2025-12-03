import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { acceptRequest, declineRequest, getPendingRequestsForMechanic } from "../../lib/requests";
import { MechanicRequest } from "../../types/mechanic.types";

export default function MechanicInbox() {
  const [mechanic, setMechanic] = useState<any>(null);
  const [requests, setRequests] = useState<MechanicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getCurrentMechanic();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (mechanic?.id) {
        loadPendingRequests();
      }
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
    }
  };

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingRequests();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (request: MechanicRequest) => {
    try {
      if (!mechanic?.id) throw new Error("Mechanic not found");
      
      await acceptRequest(request.id, mechanic.id);
      Alert.alert("Success", "Request accepted! Customer will be notified.");
      loadPendingRequests();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDeclineRequest = async (request: MechanicRequest) => {
    try {
      await declineRequest(request.id);
      Alert.alert("Success", "Request declined");
      loadPendingRequests();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderRequest = ({ item }: { item: MechanicRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestInfo}>
        <Text style={styles.customerName}>{item.customer_name}</Text>
        <Text style={styles.carType}>{item.car_type}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.issue || item.description}
        </Text>
        <Text style={styles.phone}>📞 {item.customer_phone}</Text>
        <Text style={styles.timeAgo}>{getTimeAgo(item.created_at)}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item)}
        >
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(item)}
        >
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Incoming Requests</Text>
        <TouchableOpacity onPress={() => router.push("/mechanic/dashboard")}>
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubText}>
              New requests will appear here
            </Text>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  backText: {
    color: "#FF6B35",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  requestCard: {
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
  requestInfo: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  carType: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#888",
    marginBottom: 8,
  },
  phone: {
    fontSize: 13,
    color: "#FF6B35",
    fontWeight: "600",
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: "#999",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  declineButton: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
});
