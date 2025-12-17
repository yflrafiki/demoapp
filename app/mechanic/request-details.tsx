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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function MechanicRequestDetails() {
  const { requestId } = useLocalSearchParams();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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

      setRequest(req);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'arrived') {
        updateData.arrived_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      Alert.alert('Success', `Request marked as ${newStatus}`);
      loadRequestDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#4CAF50';
      case 'arrived': return '#2196F3';
      case 'completed': return '#9C27B0';
      case 'declined': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'arrived': return 'Arrived at Location';
      case 'completed': return 'Service Completed';
      case 'declined': return 'Declined';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
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
        <Text style={styles.headerTitle}>Job Details</Text>
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

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{request.customer_name || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.value}>{request.customer_phone || 'Not provided'}</Text>
              {request.customer_phone && (
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${request.customer_phone}`)}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚗 Vehicle & Issue</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Car Type:</Text>
            <Text style={styles.value}>{request.car_type || 'Not specified'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Issue:</Text>
            <Text style={styles.value}>{request.description || request.issue || 'No description'}</Text>
          </View>
          {request.price && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Price:</Text>
              <Text style={[styles.value, styles.priceText]}>GH₵{request.price}</Text>
            </View>
          )}
        </View>

        {/* Timeline */}
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
          {request.arrived_at && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Arrived:</Text>
              <Text style={styles.timelineValue}>{new Date(request.arrived_at).toLocaleString()}</Text>
            </View>
          )}
          {request.completed_at && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Completed:</Text>
              <Text style={styles.timelineValue}>{new Date(request.completed_at).toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {request.status === 'accepted' && (
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={[styles.actionButton, styles.arrivedButton]}
              onPress={() => updateRequestStatus('arrived')}
              disabled={updating}
            >
              <Ionicons name="location" size={20} color="#fff" />
              <Text style={styles.buttonText}>Mark as Arrived</Text>
            </TouchableOpacity>
          </View>
        )}

        {request.status === 'arrived' && (
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => updateRequestStatus('completed')}
              disabled={updating}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Mark as Completed</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Button */}
        {(request.status === 'accepted' || request.status === 'arrived') && request.customer_lat && request.customer_lng && (
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={[styles.actionButton, styles.navigationButton]}
              onPress={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${request.customer_lat},${request.customer_lng}`;
                Linking.openURL(url);
              }}
            >
              <Ionicons name="navigate" size={20} color="#fff" />
              <Text style={styles.buttonText}>Navigate to Customer</Text>
            </TouchableOpacity>
          </View>
        )}
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
  infoRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  label: { fontSize: 14, color: '#666', fontWeight: '600', width: 80 },
  value: { fontSize: 14, color: '#333', flex: 1 },
  priceText: { fontWeight: '700', color: '#4CAF50' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  callButton: {
    backgroundColor: '#4CAF50',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  timelineItem: { flexDirection: 'row', marginBottom: 8 },
  timelineLabel: { fontSize: 14, color: '#666', fontWeight: '600', width: 80 },
  timelineValue: { fontSize: 14, color: '#333', flex: 1 },
  actionsCard: { marginBottom: 16 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  arrivedButton: { backgroundColor: '#2196F3' },
  completeButton: { backgroundColor: '#4CAF50' },
  navigationButton: { backgroundColor: '#FF6B35' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});