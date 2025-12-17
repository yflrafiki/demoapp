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
  ScrollView,
  SafeAreaView,
  Linking,
  Image,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { MechanicRequest } from "../../types/mechanic.types";
import { getCustomerRequests } from "../../lib/requests";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

// Status constants for consistency
const STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
  DECLINED: "declined",
} as const;

export default function CustomerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [requests, setRequests] = useState<MechanicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "completed" | "declined">("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    completed: 0,
    declined: 0,
  });

  // Update stats when requests change
  useEffect(() => {
    const newStats = {
      total: requests.length,
      pending: requests.filter(r => r.status === STATUS.PENDING).length,
      accepted: requests.filter(r => r.status === STATUS.ACCEPTED).length,
      completed: requests.filter(r => r.status === STATUS.COMPLETED).length,
      declined: requests.filter(r => r.status === STATUS.DECLINED).length,
    };
    setStats(newStats);
  }, [requests]);

  const filteredRequests = requests.filter(r => filter === "all" || r.status === filter);

  // Initialize user on component mount
  useEffect(() => {
    const initUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          try {
            const { data: customerRow } = await supabase
              .from("customers")
              .select("id, name")
              .eq("auth_id", user.id)
              .maybeSingle();
            if (customerRow) setCustomerName(customerRow.name || null);
          } catch (e) {
            console.log("Error fetching customer profile", e);
          }
        }
      } catch (err: any) {
        Alert.alert("Error", "Failed to get user");
      }
    };
    
    initUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadRequests();
        fetchCustomerProfile();
      }
    }, [user?.id])
  );

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;
    let channel: any;
    let profileChannel: any;

    const setupSubscriptions = async () => {
      try {
        const { data: customerData } = await supabase.from("customers").select("id").eq("auth_id", user.id).single();
        if (!customerData) return;

        // Requests updates
        channel = supabase
          .channel(`public:requests:customer:${customerData.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "requests",
              filter: `customer_id=eq.${customerData.id}`
            },
            (payload) => {
              const newStatus = payload.new?.status;
              const oldStatus = payload.old?.status;
              
              if (newStatus === "accepted" && oldStatus === "pending") {
                Alert.alert(
                  "🚗 Request Accepted!", 
                  "A mechanic has accepted your request and is on the way!"
                );
              } else if (newStatus === "rejected" && oldStatus === "pending") {
                Alert.alert(
                  "⚠️ Request Declined", 
                  "The mechanic declined your request. You can try requesting another mechanic."
                );
              } else if (newStatus === "completed" && oldStatus === "accepted") {
                Alert.alert(
                  "✓ Service Completed", 
                  "The mechanic has completed the service. Thank you for using our service!"
                );
              }
              
              setRequests(prev => prev.map(r => r.id === (payload.new as MechanicRequest)?.id ? (payload.new as MechanicRequest) : r));
            }
          )
          .subscribe();

        // Profile updates
        profileChannel = supabase
          .channel(`public:customers:customer:${customerData.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "customers",
              filter: `id=eq.${customerData.id}`
            },
            (payload: any) => {
              if (payload.new?.name) setCustomerName(payload.new.name);
            }
          )
          .subscribe();

      } catch (e) {
        console.log("Realtime subscription failed", e);
      }
    };

    setupSubscriptions();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  const fetchCustomerProfile = async () => {
    if (!user?.id) return;
    try {
      const { data: customerRow } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (customerRow) setCustomerName(customerRow.name || null);
    } catch (e) {
      console.log('Failed to fetch customer profile', e);
    }
  };

  const loadRequests = async () => {
    if (!user?.id) return;
    try {
      const data = await getCustomerRequests(user.id);
      if (data && data.length > 0) {
        const enriched = await Promise.all(
          data.map(async (req: any) => {
            if (req.mechanic_id) {
              try {
                const { data: mech } = await supabase.from('mechanics').select('name, phone, rating, profile_image').eq('id', req.mechanic_id).single();
                return { 
                  ...req, 
                  mechanic_name: mech?.name, 
                  mechanic_phone: mech?.phone,
                  mechanic_rating: mech?.rating,
                  mechanic_profile_image: mech?.profile_image 
                };
              } catch (e) { return req; }
            }
            return req;
          })
        );
        setRequests(enriched || []);
      } else {
        setRequests(data || []);
      }
    } catch (err: any) {
      if (!refreshing) Alert.alert("Error", "Failed to load requests: " + err.message);
    } finally {
      if (!refreshing) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleCancelRequest = async (requestId: string) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('requests').update({ status: 'declined' }).eq('id', requestId);
            Alert.alert('Cancelled', 'Your request was cancelled.');
            loadRequests();
          } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
          }
        }
      }
    ]);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Error", "Failed to logout");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case STATUS.PENDING: return <Ionicons name="time-outline" size={20} color="#FFA500" />;
      case STATUS.ACCEPTED: return <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />;
      case STATUS.COMPLETED: return <Ionicons name="checkmark-done-circle-outline" size={20} color="#2196F3" />;
      case STATUS.DECLINED: return <Ionicons name="close-circle-outline" size={20} color="#F44336" />;
      default: return <Ionicons name="help-circle-outline" size={20} color="#666" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case STATUS.PENDING: return "Awaiting Mechanic";
      case STATUS.ACCEPTED: return "Mechanic Assigned";
      case STATUS.COMPLETED: return "Service Completed";
      case STATUS.DECLINED: return "Request Declined";
      default: return status;
    }
  };

  const renderRequest = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => router.push({ 
        pathname: '/customer/request-details', 
        params: { requestId: item.id } 
      })}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <View style={styles.carInfo}>
          <Ionicons name="car-sport-outline" size={24} color="#1E90FF" />
          <View style={styles.carDetails}>
            <Text style={styles.carType}>{item.car_type}</Text>
            <Text style={styles.licensePlate}>{item.license_plate || "No plate"}</Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.issueContainer}>
        <Ionicons name="warning-outline" size={16} color="#FF6B6B" style={styles.issueIcon} />
        <Text style={styles.issue} numberOfLines={2}>{item.issue || item.description || "No description"}</Text>
      </View>

      {item.status === STATUS.ACCEPTED && item.mechanic_name && (
        <View style={styles.mechanicCard}>
          <View style={styles.mechanicHeader}>
            <FontAwesome5 name="user-cog" size={20} color="#4CAF50" />
            <Text style={styles.mechanicLabel}>ASSIGNED MECHANIC</Text>
          </View>
          
          <View style={styles.mechanicDetails}>
            <View style={styles.mechanicInfoContainer}>
              <View style={styles.mechanicAvatar}>
                {item.mechanic_profile_image ? (
                  <Image source={{ uri: item.mechanic_profile_image }} style={styles.mechanicProfileImage} />
                ) : (
                  <FontAwesome5 name="user-cog" size={20} color="#4CAF50" />
                )}
              </View>
              <View>
                <Text style={styles.mechanicName}>{item.mechanic_name}</Text>
                {item.mechanic_rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{item.mechanic_rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
            
            {item.mechanic_phone && (
              <TouchableOpacity 
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${item.mechanic_phone}`)}
              >
                <Ionicons name="call-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          
          {item.accepted_at && (
            <Text style={styles.acceptedTime}>
              <Ionicons name="time-outline" size={12} color="#4CAF50" /> Accepted • {new Date(item.accepted_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      <View style={styles.requestFooter}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#999" />
          <Text style={styles.createdAt}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      {item.status === STATUS.ACCEPTED && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.viewMapBtn}
            onPress={() => router.push({ 
              pathname: '/customer/send-request', 
              params: { requestId: item.id } 
            })}
          >
            <Ionicons name="map-outline" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>View on Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelRequest(item.id)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#1E90FF"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {customerName ? customerName.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>Welcome back{customerName ? `, ${customerName}` : ''} 👋</Text>
              <Text style={styles.subtitle}>Your vehicle assistance dashboard</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FFA500' }]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.accepted}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.primaryAction}
            onPress={() => router.push('/customer/choose-mechanic')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="add-circle" size={28} color="#fff" />
            </View>
            <Text style={styles.primaryActionText}>New Request</Text>
            <Text style={styles.actionSubtext}>Get roadside assistance</Text>
          </TouchableOpacity>
          

        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {[
              { key: "all", label: "All Requests", count: stats.total },
              { key: STATUS.PENDING, label: "Pending", count: stats.pending },
              { key: STATUS.ACCEPTED, label: "Active", count: stats.accepted },
              { key: STATUS.COMPLETED, label: "Completed", count: stats.completed },
              { key: STATUS.DECLINED, label: "Declined", count: stats.declined },
            ].map(({ key, label, count }) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterTab, filter === key && styles.filterTabActive]}
                onPress={() => setFilter(key as any)}
              >
                <Text style={[styles.filterTabText, filter === key && styles.filterTabTextActive]}>
                  {label}
                </Text>
                <View style={[styles.countBadge, filter === key && styles.countBadgeActive]}>
                  <Text style={[styles.countText, filter === key && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Requests List */}
        <View style={styles.requestsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <TouchableOpacity onPress={() => setFilter("all")}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {filteredRequests.length > 0 ? (
            <FlatList
              data={filteredRequests.slice(0, 5)} // Show only 5 most recent
              renderItem={renderRequest}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No requests found</Text>
              <Text style={styles.emptyStateText}>
                {filter === "all" 
                  ? "You haven't made any requests yet"
                  : `No ${filter} requests at the moment`}
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => router.push('/customer/choose-mechanic')}
              >
                <Text style={styles.emptyStateButtonText}>Request Assistance</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#1E90FF" />
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/customer/history')}
        >
          <Ionicons name="time-outline" size={24} color="#666" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/customer/notifications')}
        >
          <View style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={24} color="#666" />
            {/* You can add logic to show badge count based on actual notifications */}
            {/* <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>3</Text>
            </View> */}
          </View>
          <Text style={styles.navText}>Notifications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/customer/profile')}
        >
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "#FFA500";
    case "accepted": return "#4CAF50";
    case "completed": return "#2196F3";
    case "declined": return "#F44336";
    default: return "#666";
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingsBtn: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#EEE',
    marginHorizontal: 8,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  primaryAction: {
    backgroundColor: '#1E90FF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  actionIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  actionSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    position: 'absolute',
    bottom: 12,
    left: 86,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  secondaryAction: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryActionText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  filterContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  filterTabActive: {
    backgroundColor: '#1E90FF',
    borderColor: '#1E90FF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  countTextActive: {
    color: '#fff',
  },
  requestsContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1E90FF',
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  carDetails: {
    marginLeft: 12,
  },
  carType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  licensePlate: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  issueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  issueIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  issue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  mechanicCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  mechanicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mechanicLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4CAF50',
    textTransform: 'uppercase',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  mechanicDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mechanicInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mechanicAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  mechanicProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  callButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptedTime: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  createdAt: {
    fontSize: 12,
    color: '#999',
  },
  priceContainer: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  viewMapBtn: {
    flex: 1,
    backgroundColor: '#1E90FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  messageBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  notificationIcon: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});