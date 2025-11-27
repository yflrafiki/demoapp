import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function CustomerDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.welcome}>Welcome back,</Text>
      <Text style={styles.name}>{profile?.name}</Text>

      {/* Quick Info */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Car Type</Text>
        <Text style={styles.cardValue}>{profile?.car_type}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Phone</Text>
        <Text style={styles.cardValue}>{profile?.phone}</Text>
      </View>

      {/* Navigate to Profile */}
      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push("/customer/profile")}
      >
        <Text style={styles.actionTitle}>Profile & Settings</Text>
        <Text style={styles.actionSubtitle}>View or edit your information</Text>
      </TouchableOpacity>

      {/* More dashboard features can be added here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F9F9F9",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcome: {
    fontSize: 20,
    color: "#555",
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 14,
    color: "#888",
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  actionCard: {
    backgroundColor: "#1E90FF",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  actionTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "700",
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#e7e7e7",
    marginTop: 4,
  },
});
