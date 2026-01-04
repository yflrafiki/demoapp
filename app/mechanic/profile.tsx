import React, { useState, useCallback } from "react";
import {  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,  Alert, ScrollView} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { supabase } from "../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function MechanicProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

    setProfile({ ...data, email: user.email });
    setLoading(false);
  };

  // 🔥 Refresh WHENEVER screen is focused (fix)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const uploadImage = async (uri: string) => {
    try {
      // Convert image to base64 for simple storage
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process image');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      allowsMultipleSelection: false,
      exif: false,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;
        
        const imageUrl = await uploadImage(result.assets[0].uri);
        
        await supabase
          .from('mechanics')
          .update({ profile_image: imageUrl })
          .eq('auth_id', user.id);
        
        setProfile(prev => ({ ...prev, profile_image: imageUrl }));
        Alert.alert('Success', 'Profile picture updated!');
      } catch (error: any) {
        console.error('Profile image update error:', error);
        Alert.alert('Error', error.message || 'Failed to upload image. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Picture Section */}
      <View style={styles.profilePictureSection}>
        <TouchableOpacity style={styles.profileImageContainer} onPress={pickImage} disabled={uploading}>
          {profile?.profile_image ? (
            <Image source={{ uri: profile.profile_image }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={40} color="#666" />
            </View>
          )}
          <View style={styles.cameraIcon}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{profile?.name || 'Mechanic'}</Text>
        <Text style={styles.profileSpecialization}>{profile?.specialization || 'Service Provider'}</Text>
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

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <Text style={styles.value}>{profile?.email || 'N/A'}</Text>
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
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/mechanic/dashboard')}
        >
          <Ionicons name="home-outline" size={24} color="#666" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/mechanic/history')}
        >
          <Ionicons name="time-outline" size={24} color="#666" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/mechanic/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.navText}>Notifications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#1E90FF" />
          <Text style={styles.navTextActive}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  navTextActive: {
    fontSize: 10,
    color: '#1E90FF',
    marginTop: 4,
    fontWeight: '700',
  },
  profilePictureSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 24,
    elevation: 2,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#1E90FF',
    resizeMode: 'cover',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E90FF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileSpecialization: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
