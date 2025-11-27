import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";

export default function CustomerProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  // Refresh when returning from Edit Profile
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Customer Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{profile?.name}</Text>

        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{profile?.phone}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile?.email}</Text>

        <Text style={styles.label}>Car Type</Text>
        <Text style={styles.value}>{profile?.car_type}</Text>
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => router.push("/customer/edit-profile")}
      >
        <Text style={styles.editText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F9F9F9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 28, fontWeight: "700", marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    elevation: 2,
  },
  label: { fontSize: 14, color: "#888", marginTop: 10 },
  value: { fontSize: 18, fontWeight: "600", marginTop: 4 },
  editBtn: {
    backgroundColor: "#1E90FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  editText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  logoutBtn: {
    backgroundColor: "red",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
