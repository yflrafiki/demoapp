import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router, useFocusEffect } from "expo-router";

export default function CustomerDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    setProfile(data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Welcome, {profile?.name}</Text>

      {/* Profile Button */}
      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => router.push("/customer/profile")}
      >
        <Text style={styles.profileText}>View / Edit Profile</Text>
      </TouchableOpacity>

      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile?.email}</Text>

        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{profile?.phone}</Text>

        <Text style={styles.label}>Car Type</Text>
        <Text style={styles.value}>{profile?.car_type}</Text>
      </View>

      {/* NEW BUTTONS */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => router.push("/customer/choose-mechanic")}
      >
        <Text style={styles.actionText}>Find Nearby Mechanics</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn2}
        onPress={() => router.push("/customer/send-request")}
      >
        <Text style={styles.actionText}>Send Repair Request</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },

  profileBtn: {
    backgroundColor: "#1E90FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  profileText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#F4F4F4",
    padding: 18,
    borderRadius: 12,
    marginBottom: 25,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#777",
    marginTop: 10,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },

  // ★ NEW BUTTON STYLES ★
  actionBtn: {
    backgroundColor: "#32CD32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  actionBtn2: {
    backgroundColor: "#FF8C00",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 40,
  },
  actionText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
