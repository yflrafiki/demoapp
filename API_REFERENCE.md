# API Reference & Code Examples

## Quick Reference Guide

### Authentication

#### Customer Sign Up
```typescript
import { supabase } from '@/lib/supabase';

const { data: authData, error: authError } = await supabase.auth.signUp({
  email: 'customer@example.com',
  password: 'password123',
});

if (!authError && authData.user) {
  await supabase.from('customers').insert({
    auth_id: authData.user.id,
    name: 'John Doe',
    email: 'customer@example.com',
    phone: '+1234567890',
    car_type: 'Toyota Camry',
  });
}
```

#### Mechanic Sign Up
```typescript
const phoneDigits = phone.replace(/\D/g, '');
const email = `${phoneDigits}@mech.auto`;

const { data: authData } = await supabase.auth.signUp({
  email,
  password: 'password123',
});

await supabase.from('mechanics').insert({
  auth_id: authData.user.id,
  name: 'Jane Smith',
  phone: '+1234567890',
  specialization: 'Engine Repair',
});
```

#### Login
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: userEmail,
  password: userPassword,
});

if (!error) {
  const { id } = data.user;
  // Check if customer or mechanic
}
```

---

### Request Management

#### Create Service Request
```typescript
import { createRequest } from '@/lib/requests';

await createRequest({
  customerId: 'customer-uuid',
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  carType: 'Toyota Camry',
  description: 'Engine won\'t start',
  lat: 40.7128,
  lng: -74.0060,
});
```

#### Get Customer's Requests
```typescript
import { getCustomerRequests } from '@/lib/requests';

const requests = await getCustomerRequests('customer-uuid');
// Returns: Array<MechanicRequest>
```

#### Get Pending Requests for Mechanic
```typescript
import { getPendingRequestsForMechanic } from '@/lib/requests';

const pendingRequests = await getPendingRequestsForMechanic('specialization');
// Returns all pending requests
```

#### Accept Request
```typescript
import { acceptRequest } from '@/lib/requests';

await acceptRequest('request-uuid', 'mechanic-uuid');
// Sets mechanic_id and status to 'accepted'
```

#### Decline Request
```typescript
import { declineRequest } from '@/lib/requests';

await declineRequest('request-uuid');
// Clears mechanic_id and sets status to 'declined'
```

#### Complete Request
```typescript
import { completeRequest } from '@/lib/requests';

await completeRequest('request-uuid');
// Sets status to 'completed'
```

---

### Location Services

#### Get Current Location
```typescript
import { getCurrentLocation } from '@/lib/location';

const location = await getCurrentLocation();
// Returns: { lat: number, lng: number }
// Or null if permission denied
```

#### Update Request Location
```typescript
import { updateRequestLocation } from '@/lib/requests';

// Update customer location
await updateRequestLocation(requestId, lat, lng, false);

// Update mechanic location
await updateRequestLocation(requestId, lat, lng, true);
```

#### Track Mechanic Location (Real-time)
```typescript
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
if (status === 'granted') {
  const location = await Location.getCurrentPositionAsync();
  
  // Update in database
  await supabase
    .from('mechanics')
    .update({
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    })
    .eq('id', mechanicId);
  
  // Repeat every 5 seconds
  setInterval(async () => {
    const loc = await Location.getCurrentPositionAsync();
    // Update database...
  }, 5000);
}
```

---

### Real-time Subscriptions

#### Listen for Request Updates
```typescript
const channel = supabase
  .channel('public:requests')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'requests',
      filter: `id=eq.${requestId}`
    },
    (payload) => {
      console.log('Request updated:', payload.new);
      // Update UI
    }
  )
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

#### Listen for All Requests of Mechanic
```typescript
const channel = supabase
  .channel(`mechanic:${mechanicId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'requests',
    },
    (payload) => {
      loadRequests();
    }
  )
  .subscribe();
```

---

### UI Components Usage

#### Request Card Component
```typescript
<TouchableOpacity
  style={styles.requestCard}
  onPress={() => handleSelectRequest(item)}
>
  <View style={styles.requestHeader}>
    <Text style={styles.carType}>{item.car_type}</Text>
    <View style={[styles.statusBadge, 
      { backgroundColor: getStatusColor(item.status) }
    ]}>
      <Text style={styles.statusText}>{item.status}</Text>
    </View>
  </View>
  
  <Text style={styles.issue} numberOfLines={2}>
    {item.description}
  </Text>
  
  <Text style={styles.createdAt}>
    {new Date(item.created_at).toLocaleDateString()}
  </Text>
</TouchableOpacity>
```

#### Navigation Helper
```typescript
import { Linking } from 'react-native';

const openMapsNavigation = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url);
};
```

#### Distance Calculation
```typescript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

// Usage
const distance = calculateDistance(40.7128, -74.0060, 40.7580, -73.9855);
console.log(`${distance} km away`);
```

---

### Navigation Examples

#### Navigate to Screen with Params
```typescript
import { router } from 'expo-router';

// Navigate with params
router.push({
  pathname: '/customer/send-request',
  params: { requestId: '123' }
});

// Access in component
const { requestId } = useLocalSearchParams();
```

#### Replace Route (Navigate & Pop)
```typescript
router.replace('/customer/customer-dashboard');
```

#### Go Back
```typescript
router.back();
```

---

### Form Validation Examples

#### Customer Signup Validation
```typescript
const validateCustomerSignup = (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}) => {
  if (!data.name.trim()) {
    Alert.alert('Error', 'Enter your full name');
    return false;
  }
  
  if (!data.email.includes('@')) {
    Alert.alert('Error', 'Enter a valid email');
    return false;
  }
  
  if (data.phone.replace(/\D/g, '').length < 10) {
    Alert.alert('Error', 'Enter a valid phone number');
    return false;
  }
  
  if (data.password.length < 6) {
    Alert.alert('Error', 'Password must be at least 6 characters');
    return false;
  }
  
  if (data.password !== data.confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
    return false;
  }
  
  return true;
};
```

---

### Error Handling Examples

#### Try-Catch with User Feedback
```typescript
try {
  setLoading(true);
  
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('customer_id', customerId);
  
  if (error) throw error;
  
  setRequests(data);
} catch (err: any) {
  Alert.alert('Error', err.message || 'Something went wrong');
} finally {
  setLoading(false);
}
```

#### Handling Async Operations
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Do work...
    
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

### Hook Usage Examples

#### useFocusEffect - Load Data When Screen Focused
```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

useFocusEffect(
  useCallback(() => {
    loadData(); // Called every time screen is focused
    
    return () => {
      // Cleanup if needed
    };
  }, [])
);
```

#### useEffect - Component Mount
```typescript
useEffect(() => {
  getCurrentUser();
  
  return () => {
    // Cleanup
  };
}, []); // Empty dependency array = run once on mount
```

---

### Environment Variables

```
.env.local
├─ EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
└─ EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

// Access in code
import { supabase } from '@/lib/supabase';
```

---

### TypeScript Types

```typescript
export interface MechanicRequest {
  id: string;
  customer_id: string;
  mechanic_id: string;
  customer_name: string;
  customer_phone?: string;
  car_type: string;
  issue?: string;
  description?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  lat?: number | null;
  lng?: number | null;
  customer_lat?: number | null;
  customer_lng?: number | null;
  mechanic_lat?: number | null;
  mechanic_lng?: number | null;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
}

export interface Mechanic {
  id: string;
  auth_id: string;
  name: string;
  phone: string;
  specialization: string;
  lat: number | null;
  lng: number | null;
  is_available: boolean;
  created_at: string;
}
```

---

### Common Patterns

#### Refresh Control Pattern
```typescript
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  await loadData();
  setRefreshing(false);
};

<FlatList
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
  // ...
/>
```

#### Status Badge Pattern
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#FFA500';
    case 'accepted':
      return '#4CAF50';
    case 'completed':
      return '#2196F3';
    case 'declined':
      return '#F44336';
    default:
      return '#666';
  }
};

<View style={{ backgroundColor: getStatusColor(status) }}>
  <Text>{status.toUpperCase()}</Text>
</View>
```

---

## Debugging Tips

### Check User Session
```typescript
const checkAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user);
};
```

### Debug Database Query
```typescript
const { data, error } = await supabase
  .from('requests')
  .select('*');

if (error) {
  console.error('Query error:', error);
}
console.log('Query result:', data);
```

### Monitor Real-time Subscription
```typescript
const channel = supabase
  .channel('debug')
  .on('postgres_changes', { event: '*' }, (payload) => {
    console.log('Real-time update:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });
```

---

**Document Version:** 1.0  
**Last Updated:** December 3, 2025
