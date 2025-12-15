import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";

export default function MechanicProfile() {
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
      .from("mechanics")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    setProfile(data);
    setLoading(false);
  };

  // 🔥 Refresh WHENEVER screen is focused (fix)
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Profile Card */}
      <View style={styles.card}>
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.value}>{profile?.name || 'N/A'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <Text style={styles.value}>{profile?.phone || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Service Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Service Type</Text>
            <Text style={styles.value}>{profile?.specialization || 'Not specified'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Availability</Text>
            <Text style={[styles.value, { color: profile?.is_available ? '#4CAF50' : '#FF9800' }]}>
              {profile?.is_available ? '🟢 Available' : '🔴 Unavailable'}
            </Text>
          </View>
        </View>
      </View>

      {/* Edit Button */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => router.push("/mechanic/edit-profile")}
      >
        <Text style={styles.editText}>Edit Profile</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

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

  backBtn: {
    color: "#1E90FF",
    fontWeight: "600",
    fontSize: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
  },

  profileSection: {
    padding: 16,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E90FF",
    textTransform: "uppercase",
    marginBottom: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
  },

  field: {
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  editBtn: {
    backgroundColor: "#1E90FF",
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  editText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  logoutBtn: {
    backgroundColor: "#FF6B6B",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
