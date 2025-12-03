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
  const [requests, setRequests] = useState<MechanicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadRequests();
      }
    }, [user?.id])
  );

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to get user");
    }
  };

  const loadRequests = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await getCustomerRequests(user.id);
      setRequests(data || []);
    } catch (err: any) {
      Alert.alert("Error", "Failed to load requests: " + err.message);
    } finally {
      setLoading(false);
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
      case "pending":
        return "#FFA500";
      case "accepted":
        return "#4CAF50";
      case "completed":
        return "#2196F3";
      case "declined":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const renderRequest = ({ item }: { item: MechanicRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => {
        router.push({
          pathname: "/customer/send-request",
          params: { requestId: item.id },
        });
      }}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.carType}>{item.car_type}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.issue} numberOfLines={2}>
        {item.issue || item.description}
      </Text>

      {item.status === "accepted" && (
        <Text style={styles.mechanicInfo}>
          Mechanic accepted • {item.accepted_at
            ? new Date(item.accepted_at).toLocaleDateString()
            : ""}
        </Text>
      )}

      <Text style={styles.createdAt}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
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
        <Text style={styles.title}>My Requests</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No requests yet</Text>
            <Text style={styles.emptySubText}>
              Tap the button below to request a mechanic
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/customer/choose-mechanic")}
      >
        <Text style={styles.fabText}>+ Request Mechanic</Text>
      </TouchableOpacity>
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
  logoutText: {
    color: "#FF6B6B",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1E90FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  carType: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  issue: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  mechanicInfo: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    marginBottom: 4,
  },
  createdAt: {
    fontSize: 12,
    color: "#999",
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#1E90FF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});