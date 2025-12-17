import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Linking,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function RequestDetails() {
  const { requestId } = useLocalSearchParams();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      const { data: req } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (req && req.mechanic_id) {
        const { data: mech } = await supabase
          .from('mechanics')
          .select('name, phone, rating, profile_image, specialization')
          .eq('id', req.mechanic_id)
          .single();
        
        setRequest({
          ...req,
          mechanic_name: mech?.name,
          mechanic_phone: mech?.phone,
          mechanic_rating: mech?.rating,
          mechanic_profile_image: mech?.profile_image,
          mechanic_specialization: mech?.specialization,
        });
      } else {
        setRequest(req);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'declined': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Awaiting Mechanic';
      case 'accepted': return 'Mechanic Assigned';
      case 'completed': return 'Service Completed';
      case 'declined': return 'Request Declined';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text>Request not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
              {getStatusText(request.status)}
            </Text>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚗 Vehicle Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Car Type:</Text>
            <Text style={styles.value}>{request.car_type || 'Not specified'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Issue:</Text>
            <Text style={styles.value}>{request.description || request.issue || 'No description'}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{request.customer_name || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{request.customer_phone || 'Not provided'}</Text>
          </View>
        </View>

        {/* Mechanic Info */}
        {request.mechanic_name && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔧 Assigned Mechanic</Text>
            <View style={styles.mechanicInfo}>
              <View style={styles.mechanicAvatar}>
                {request.mechanic_profile_image ? (
                  <Image source={{ uri: request.mechanic_profile_image }} style={styles.profileImage} />
                ) : (
                  <FontAwesome5 name="user-cog" size={24} color="#4CAF50" />
                )}
              </View>
              <View style={styles.mechanicDetails}>
                <Text style={styles.mechanicName}>{request.mechanic_name}</Text>
                {request.mechanic_specialization && (
                  <Text style={styles.specialization}>{request.mechanic_specialization}</Text>
                )}
                {request.mechanic_rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{request.mechanic_rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              {request.mechanic_phone && (
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${request.mechanic_phone}`)}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Request Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Timeline</Text>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Created:</Text>
            <Text style={styles.timelineValue}>{new Date(request.created_at).toLocaleString()}</Text>
          </View>
          {request.accepted_at && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Accepted:</Text>
              <Text style={styles.timelineValue}>{new Date(request.accepted_at).toLocaleString()}</Text>
            </View>
          )}
          {request.completed_at && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Completed:</Text>
              <Text style={styles.timelineValue}>{new Date(request.completed_at).toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          {request.status === 'pending' && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push({ 
                pathname: '/customer/edit-request', 
                params: { requestId: request.id } 
              })}
            >
              <Ionicons name="create" size={20} color="#fff" />
              <Text style={styles.buttonText}>Edit Request</Text>
            </TouchableOpacity>
          )}
          
          {request.status === 'accepted' && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => router.push({ 
                pathname: '/customer/send-request', 
                params: { requestId: request.id } 
              })}
            >
              <Ionicons name="map" size={20} color="#fff" />
              <Text style={styles.buttonText}>View on Map</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  content: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: { fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  label: { fontSize: 14, color: '#666', fontWeight: '600', width: 80 },
  value: { fontSize: 14, color: '#333', flex: 1 },
  mechanicInfo: { flexDirection: 'row', alignItems: 'center' },
  mechanicAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  profileImage: { width: 50, height: 50, borderRadius: 25, resizeMode: 'cover' },
  mechanicDetails: { flex: 1 },
  mechanicName: { fontSize: 16, fontWeight: '700', color: '#333' },
  specialization: { fontSize: 12, color: '#666', marginTop: 2 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  ratingText: { fontSize: 12, color: '#666', fontWeight: '600' },
  callButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineItem: { flexDirection: 'row', marginBottom: 8 },
  timelineLabel: { fontSize: 14, color: '#666', fontWeight: '600', width: 80 },
  timelineValue: { fontSize: 14, color: '#333', flex: 1 },
  actionsCard: { marginBottom: 20 },
  mapButton: {
    backgroundColor: '#1E90FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});