import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function MechanicDashboard() {
  const insets = useSafeAreaInsets();
  const [mechanic, setMechanic] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [completedRequests, setCompletedRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ pending: 0, accepted: 0, completed: 0 });
  const router = useRouter();

  // Update stats and organize requests when requests change
  useEffect(() => {
    const pending = requests.filter(r => r.status === 'pending');
    const accepted = requests.filter(r => r.status === 'accepted');
    const completed = requests.filter(r => r.status === 'completed');
    
    setIncomingRequests(pending);
    setActiveRequests(accepted);
    setCompletedRequests(completed);
    setStats({ pending: pending.length, accepted: accepted.length, completed: completed.length });
  }, [requests]);

  const loadProfileAndRequests = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        Alert.alert('Authentication Error', 'Please login again.');
        router.replace("/login");
        return;
      }
      
      if (!user) {
        console.log('No user found, redirecting to login');
        router.replace("/login");
        return;
      }

      console.log('User authenticated:', user.id);

      // Get mechanic profile
      const mechanicResult = await supabase
        .from("mechanics")
        .select("id, name, lat, lng, is_available")
        .eq("auth_id", user.id)
        .single();

      console.log('Mechanic query result:', mechanicResult);

      if (mechanicResult.error) {
        console.error('Mechanic query error:', mechanicResult.error);
        Alert.alert('Profile Error', 'Mechanic profile not found. Please contact support.');
        return;
      }

      if (!mechanicResult.data) {
        console.log('No mechanic profile found');
        Alert.alert('Profile Missing', 'No mechanic profile found for this account.');
        return;
      }

      setMechanic(mechanicResult.data);

      // Get requests
      const requestsResult = await supabase
        .from("requests")
        .select(`id, customer_name, customer_phone, car_type, description, lat, lng, status, created_at, mechanic_id`)
        .eq("mechanic_id", mechanicResult.data.id)
        .in("status", ["pending", "accepted", "completed"])
        .order("created_at", { ascending: false })
        .limit(10);

      setRequests(requestsResult.data || []);
      console.log('Dashboard loaded successfully');
    } catch (error) {
      console.error('Loading error:', error);
      Alert.alert('Error', 'Failed to load dashboard. Please try again.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadProfileAndRequests();
      setLoading(false);
    };
    init();
  }, []);

  // Separate effect for location and realtime setup
  useEffect(() => {
    if (!mechanic?.id) return;
    
    let locInterval: any;
    let channel: any;
    let mounted = true;

    const setupLocationAndRealtime = async () => {
      try {
        // Setup location updates
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const updateLocation = async () => {
              try {
                const loc = await Location.getCurrentPositionAsync({ 
                  accuracy: Location.Accuracy.Balanced
                });
                await supabase
                  .from("mechanics")
                  .update({ lat: loc.coords.latitude, lng: loc.coords.longitude, is_available: true })
                  .eq("id", mechanic.id);
              } catch (e) {
                console.log('Location update failed:', e);
              }
            };
            
            updateLocation();
            locInterval = setInterval(updateLocation, 60000);
          }
        } catch (locationError) {
          console.log('Location permission error:', locationError);
        }


      } catch (e) {
        console.log("Setup failed:", e);
      }
    };

    setupLocationAndRealtime();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      if (locInterval) clearInterval(locInterval);
    };
  }, [mechanic?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfileAndRequests();
    setRefreshing(false);
  }, []);

  const acceptRequest = async (item: any) => {
    try {
      if (!mechanic?.id) throw new Error("Mechanic not found");
      const requests = await import("../../lib/requests");
      setLoading(true);
      await requests.acceptRequest(item.id, mechanic.id);
      
      // Send notification to customer
      Alert.alert(
        'Request Accepted ✓',
        `You have accepted ${item.customer_name}'s request. Customer will be notified.`
      );
      
      router.push({ pathname: "/mechanic/navigation", params: { requestId: item.id } });
      loadProfileAndRequests();
    } catch (e) {
      console.warn("acceptRequest failed:", e);
    }
  };

  const rejectRequest = async (item: any) => {
    try {
      await supabase.from("requests").update({ status: "rejected" }).eq("id", item.id);
      
      // Send notification to customer
      Alert.alert(
        'Request Declined',
        `You have declined ${item.customer_name}'s request. Customer will be notified.`
      );
      
      loadProfileAndRequests();
    } catch (e) {
      console.warn("rejectRequest failed:", e);
    }
  };

  const completeRequest = async (item: any) => {
    try {
      await supabase.from("requests").update({ status: "completed" }).eq("id", item.id);
      
      Alert.alert(
        'Service Completed ✓',
        `You have marked ${item.customer_name}'s request as completed. Customer will be notified.`
      );
      
      loadProfileAndRequests();
    } catch (e) {
      console.warn("completeRequest failed:", e);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  if (selectedRequest) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedRequest(null)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Request Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.detailCard}>
          {["customer_name", "customer_phone", "car_type", "description"].map((field, idx) => (
            <View key={idx} style={{ marginBottom: idx === 0 ? 12 : 16 }}>
              <Text style={styles.detailLabel}>{field.replace("_", " ").toUpperCase()}</Text>
              <Text style={styles.detailValue}>{selectedRequest[field] || 'N/A'}</Text>
            </View>
          ))}

          {selectedRequest.lat && selectedRequest.lng && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.detailLabel}>CUSTOMER LOCATION</Text>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={18} color="#EF4444" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationAddress}>GPS Coordinates</Text>
                  <Text style={styles.locationCoords}>
                    Lat: {parseFloat(selectedRequest.lat).toFixed(4)}°
                  </Text>
                  <Text style={styles.locationCoords}>
                    Lng: {parseFloat(selectedRequest.lng).toFixed(4)}°
                  </Text>
                </View>
              </View>
              <Text style={styles.locationSubtext}>📍 Use "View on Map" button for navigation</Text>
            </View>
          )}

          <View style={styles.detailActions}>
            {selectedRequest.status === 'pending' ? (
              <TouchableOpacity style={styles.acceptBtn} onPress={() => { acceptRequest(selectedRequest); setSelectedRequest(null); }}>
                <Text style={styles.btnText}>Accept Request</Text>
              </TouchableOpacity>
            ) : selectedRequest.status === 'accepted' ? (
              <TouchableOpacity style={styles.completeBtn} onPress={() => { completeRequest(selectedRequest); setSelectedRequest(null); }}>
                <Text style={styles.btnText}>Mark Complete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: '#1976D2' }]} onPress={() => router.push({ pathname: '/mechanic/navigation', params: { requestId: selectedRequest.id } })}>
                <Text style={styles.btnText}>Continue Navigation</Text>
              </TouchableOpacity>
            )}
            
            {selectedRequest.status === 'pending' && (
              <TouchableOpacity style={styles.rejectBtn} onPress={() => { rejectRequest(selectedRequest); setSelectedRequest(null); }}>
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
            )}

            {selectedRequest.lat && selectedRequest.lng && (
              <TouchableOpacity style={styles.mapBtn} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${selectedRequest.lat},${selectedRequest.lng}`)}>
                <Text style={styles.btnText}>View on Map</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {mechanic?.name ? mechanic.name.charAt(0).toUpperCase() : "M"}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>Welcome back, {mechanic?.name || 'Mechanic'} 👋</Text>
              <Text style={styles.subtitle}>Professional Service Provider</Text>
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: mechanic?.is_available ? '#4CAF50' : '#FF5722' }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {mechanic?.is_available ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="hourglass-outline" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{stats.accepted}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy-outline" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>



        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 Incoming Requests</Text>
              <Text style={styles.countBadge}>{incomingRequests.length}</Text>
            </View>
            <FlatList
              data={incomingRequests.slice(0, 2)}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.requestCard, styles.incomingCard]} onPress={() => setSelectedRequest(item)}>
                  <View style={styles.requestHeader}>
                    <View style={styles.customerInfo}>
                      <View style={styles.customerAvatar}>
                        <Ionicons name="person" size={20} color="#FF9800" />
                      </View>
                      <View>
                        <Text style={styles.customerName}>{item.customer_name}</Text>
                        <Text style={styles.carType}>{item.car_type}</Text>
                      </View>
                    </View>
                    <View style={[styles.requestStatus, { backgroundColor: '#FF9800' + '20' }]}>
                      <Text style={[styles.requestStatusText, { color: '#FF9800' }]}>New</Text>
                    </View>
                  </View>
                  <Text style={styles.requestDescription} numberOfLines={2}>
                    {item.description || 'No description provided'}
                  </Text>
                  <View style={styles.requestActions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => acceptRequest(item)}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${item.customer_phone}`)}>
                      <Ionicons name="call" size={16} color="#4CAF50" />
                      <Text style={[styles.actionBtnText, { color: '#4CAF50' }]}>Call</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Active Requests */}
        {activeRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔧 Active Jobs</Text>
              <Text style={styles.countBadge}>{activeRequests.length}</Text>
            </View>
            <FlatList
              data={activeRequests.slice(0, 2)}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.requestCard, styles.activeCard]} onPress={() => setSelectedRequest(item)}>
                  <View style={styles.requestHeader}>
                    <View style={styles.customerInfo}>
                      <View style={styles.customerAvatar}>
                        <Ionicons name="person" size={20} color="#4CAF50" />
                      </View>
                      <View>
                        <Text style={styles.customerName}>{item.customer_name}</Text>
                        <Text style={styles.carType}>{item.car_type}</Text>
                      </View>
                    </View>
                    <View style={[styles.requestStatus, { backgroundColor: '#4CAF50' + '20' }]}>
                      <Text style={[styles.requestStatusText, { color: '#4CAF50' }]}>Active</Text>
                    </View>
                  </View>
                  <Text style={styles.requestDescription} numberOfLines={2}>
                    {item.description || 'No description provided'}
                  </Text>
                  <View style={styles.requestActions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={() => completeRequest(item)}>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/mechanic/navigation', params: { requestId: item.id } })}>
                      <Ionicons name="navigate" size={16} color="#2196F3" />
                      <Text style={[styles.actionBtnText, { color: '#2196F3' }]}>Navigate</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Recent Completed */}
        {completedRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✅ Recently Completed</Text>
              <TouchableOpacity onPress={() => router.push('/mechanic/history')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={completedRequests.slice(0, 2)}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.requestCard, styles.completedCard]} onPress={() => setSelectedRequest(item)}>
                  <View style={styles.requestHeader}>
                    <View style={styles.customerInfo}>
                      <View style={styles.customerAvatar}>
                        <Ionicons name="person" size={20} color="#2196F3" />
                      </View>
                      <View>
                        <Text style={styles.customerName}>{item.customer_name}</Text>
                        <Text style={styles.carType}>{item.car_type}</Text>
                      </View>
                    </View>
                    <View style={[styles.requestStatus, { backgroundColor: '#2196F3' + '20' }]}>
                      <Text style={[styles.requestStatusText, { color: '#2196F3' }]}>Completed</Text>
                    </View>
                  </View>
                  <Text style={styles.requestDescription} numberOfLines={2}>
                    {item.description || 'No description provided'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Empty State */}
        {requests.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySubtitle}>New service requests will appear here</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <View style={styles.navIconContainer}>
              <Ionicons name="home" size={22} color="#1E90FF" />
            </View>
            <Text style={styles.navTextActive}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push('/mechanic/history')}
          >
            <View style={styles.navIconContainer}>
              <Ionicons name="time-outline" size={22} color="#666" />
            </View>
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push('/mechanic/notifications')}
          >
            <View style={styles.navIconContainer}>
              <Ionicons name="notifications-outline" size={22} color="#666" />
            </View>
            <Text style={styles.navText}>Alerts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push('/mechanic/profile')}
          >
            <View style={styles.navIconContainer}>
              <Ionicons name="person-outline" size={22} color="#666" />
            </View>
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#FF9800';
    case 'accepted': return '#4CAF50';
    case 'completed': return '#2196F3';
    default: return '#666';
  }
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    marginTop: 40,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '70%',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    flexShrink: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
    maxWidth: '30%',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },

  requestsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  seeAllText: {
    fontSize: 12,
    color: '#1E90FF',
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '70%',
  },
  customerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    flexShrink: 1,
  },
  carType: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
    flexShrink: 1,
  },
  requestStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: '30%',
  },
  requestStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  requestDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  requestActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    gap: 3,
    minWidth: 60,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
  },
  continueBtn: {
    backgroundColor: '#2196F3',
  },
  countBadge: {
    backgroundColor: '#1E90FF',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 24,
    textAlign: 'center',
  },
  incomingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    color: '#1E90FF',
    fontWeight: '600',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 20,
    lineHeight: 22,
  },
  detailActions: {
    marginTop: 8,
    gap: 12,
  },
  bottomNav: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 50,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  navText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  navTextActive: {
    fontSize: 10,
    color: '#1E90FF',
    marginTop: 4,
    fontWeight: '700',
    textAlign: 'center',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  mapBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  locationInfo: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  locationSubtext: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  completeBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
