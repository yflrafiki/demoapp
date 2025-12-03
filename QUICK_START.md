# Quick Start Guide - 5 Minutes Setup

## 🚀 Get Started in 5 Minutes

### Step 1: Environment Setup (1 min)
```bash
# Create .env.local file in project root
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 2: Install Dependencies (1 min)
```bash
npm install
```

### Step 3: Start the App (1 min)
```bash
npm start
```

### Step 4: Choose Platform (1 min)
```
Press:
- 'i' for iOS simulator
- 'a' for Android emulator
- 'w' for Web browser
```

### Step 5: Test the App (1 min)
```
1. Sign up as CUSTOMER
2. Sign up as MECHANIC (different tab/device)
3. Customer creates request
4. Mechanic sees it in inbox
5. Mechanic accepts it
6. Done! ✅
```

---

## 📚 File Structure Cheat Sheet

```
Most Important Files:
├── app/login.tsx                      # Start here
├── app/customer/customer-dashboard    # Customer home
├── app/mechanic/dashboard             # Mechanic home
├── app/mechanic/map-view              # Live map
├── app/customer/send-request          # Request form
├── lib/requests.ts                    # Core logic
└── types/mechanic.types.ts            # Data types
```

---

## 🔑 Key Logins for Testing

### Test Customer Account
```
Email: customer@test.com
Password: password123
```

### Test Mechanic Account
```
Phone: 1234567890
Password: password123
(Converts to: 1234567890@mech.auto)
```

---

## 🎮 Quick Feature Demo

### Create a Request (Customer)
1. Login as customer
2. Tap "+ Request Mechanic" button
3. Fill in: Car Type (e.g., "Toyota Camry")
4. Fill in: Issue (e.g., "Engine won't start")
5. Tap "Send Request"
6. ✅ Request created!

### Accept a Request (Mechanic)
1. Login as mechanic
2. Tap "Incoming Requests"
3. See customer request
4. Tap "Accept" or "Navigate"
5. ✅ Request accepted!

### View Live Map (Mechanic)
1. After accepting request
2. Tap "Open Map & Live Requests"
3. See your real-time location
4. See customer location
5. Tap "Open Navigation"
6. ✅ Navigate to customer!

---

## 🐛 Troubleshooting

### "User not found" Error
**Problem**: Can't find customer/mechanic after signup
**Solution**: Check Supabase database → customers/mechanics table

### Location Permission Denied
**Problem**: Map doesn't show location
**Solution**: Settings → App → Location → Allow "Always"

### Real-time Updates Not Working
**Problem**: Requests don't update in real-time
**Solution**: Check Supabase realtime is enabled

### Can't Login
**Problem**: Login fails with "Invalid credentials"
**Solution**: 
- For customer: use email you registered
- For mechanic: use phone number (converts to email@mech.auto)

---

## 📊 Database Schema Quick Reference

### Create These Tables in Supabase:

#### customers
```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY,
  auth_id uuid REFERENCES auth.users,
  name text,
  email text,
  phone text,
  car_type text,
  lat float,
  lng float,
  created_at timestamp
);
```

#### mechanics
```sql
CREATE TABLE mechanics (
  id uuid PRIMARY KEY,
  auth_id uuid REFERENCES auth.users,
  name text,
  phone text,
  specialization text,
  lat float,
  lng float,
  is_available boolean,
  created_at timestamp
);
```

#### requests
```sql
CREATE TABLE requests (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers,
  mechanic_id uuid REFERENCES mechanics,
  customer_name text,
  customer_phone text,
  car_type text,
  issue text,
  description text,
  status text,
  lat float,
  lng float,
  customer_lat float,
  customer_lng float,
  mechanic_lat float,
  mechanic_lng float,
  created_at timestamp,
  accepted_at timestamp,
  completed_at timestamp
);
```

---

## 🎯 Navigation Cheat Sheet

### Customer Screens
```
/login
  ↓
/customer/customer-dashboard (main)
  ├─ → /customer/send-request (new request)
  ├─ → /customer/profile
  └─ → /customer/edit-profile
```

### Mechanic Screens
```
/login
  ↓
/mechanic/dashboard (main)
  ├─ → /mechanic/requests-inbox (see requests)
  ├─ → /mechanic/map-view (live map)
  ├─ → /mechanic/profile
  └─ → /mechanic/edit-profile
```

---

## 🔧 Common Tasks

### Create a New Screen
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function NewScreen() {
  return (
    <View style={styles.container}>
      <Text>New Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
```

### Query Data from Database
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('requests')
  .select('*')
  .eq('customer_id', customerId);
```

### Update Data in Database
```typescript
await supabase
  .from('requests')
  .update({ status: 'accepted' })
  .eq('id', requestId);
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.id);
```

---

## 📱 Screen Size References

For responsive design:
```typescript
// Small phones
width < 375px

// Standard phones
375px ≤ width < 414px

// Large phones
width ≥ 414px
```

---

## ⚡ Performance Tips

1. **Use FlatList** instead of ScrollView for long lists
2. **Memoize components** with React.memo() to prevent re-renders
3. **Lazy load images** with Image component
4. **Debounce location updates** to reduce database writes
5. **Use useCallback** for event handlers

---

## 🎨 Color Palette

Used Throughout the App:
```typescript
Primary: #1E90FF (Blue)      // Customer
Secondary: #FF6B35 (Orange)  // Mechanic
Success: #4CAF50 (Green)     // Accepted/Approved
Error: #F44336 (Red)         // Declined/Error
Warning: #FFA500 (Orange)    // Pending
Neutral: #666 (Gray)         // Text
Light: #f5f5f5 (Light Gray)  // Backgrounds
```

---

## 📞 Helpful Resources

- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev
- **React Native**: https://reactnative.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Expo Router**: https://expo.github.io/router

---

## ✅ Before Going to Production

- [ ] Test on real device
- [ ] Test offline functionality
- [ ] Test with slow network
- [ ] Test all user flows
- [ ] Test on different screen sizes
- [ ] Get Supabase RLS policies set up
- [ ] Set up error logging
- [ ] Set up analytics
- [ ] Test push notifications
- [ ] Security audit

---

## 🚀 Next: Advanced Features

After mastering basics, add:
1. Payment processing
2. Push notifications
3. Chat messaging
4. Ratings system
5. Admin dashboard
6. Analytics

---

## 💡 Pro Tips

1. Use `console.log()` for debugging
2. Check Supabase logs in dashboard
3. Use React DevTools for debugging
4. Test on physical device, not just emulator
5. Keep components small and focused
6. Use TypeScript for type safety

---

**Good luck building! 🚀**

Need help? Check:
1. APP_SETUP_GUIDE.md (detailed)
2. ARCHITECTURE.md (technical)
3. API_REFERENCE.md (code examples)

Happy coding! 😄
