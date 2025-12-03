# Customer-Mechanic Service App - Complete Setup Guide

## ✅ Project Features Implemented

### 1. **Authentication System**
- ✅ Customer signup with email, phone, and password
- ✅ Mechanic signup with phone (converted to email format: `{phone}@mech.auto`)
- ✅ Login system for both roles
- ✅ Supabase auth integration with role-based routing

**Files:**
- `app/login.tsx` - Main login screen
- `app/auth/signup-customer.tsx` - Customer registration
- `app/auth/signup-mechanic.tsx` - Mechanic registration
- `app/auth/select-role.tsx` - Role selection

### 2. **Customer Features**
- ✅ Customer Dashboard - View all submitted requests
- ✅ Create/Send Service Request with:
  - Car type
  - Issue description
  - Real-time location tracking
  - Customer phone and name
- ✅ View request status (Pending, Accepted, Declined, Completed)
- ✅ Edit existing requests
- ✅ Profile management (view and edit)
- ✅ Logout functionality

**Files:**
- `app/customer/customer-dashboard.tsx` - Main dashboard
- `app/customer/send-request.tsx` - Create/edit requests
- `app/customer/profile.tsx` - View profile
- `app/customer/edit-profile.tsx` - Edit profile

### 3. **Mechanic Features**
- ✅ Mechanic Dashboard - Overview and quick access
- ✅ Mechanic Requests Inbox - View all pending requests
- ✅ Live Map & Requests Screen - See customer locations
- ✅ Real-time location tracking (updates every 5 seconds)
- ✅ Accept/Decline incoming requests
- ✅ Navigation integration (Google Maps navigation)
- ✅ Distance calculation between mechanic and customer
- ✅ Profile management (view and edit)
- ✅ Logout functionality

**Files:**
- `app/mechanic/dashboard.tsx` - Main dashboard
- `app/mechanic/requests-inbox.tsx` - Inbox with accept/decline
- `app/mechanic/map-view.tsx` - Live map with location tracking
- `app/mechanic/profile.tsx` - View profile
- `app/mechanic/edit-profile.tsx` - Edit profile

### 4. **Database Features**
- ✅ Real-time request updates
- ✅ Location tracking for mechanics
- ✅ Request status management (pending → accepted → completed)
- ✅ Customer phone tracking
- ✅ Mechanic availability status

**Library Functions:**
- `lib/requests.ts` - Complete request management:
  - `createRequest()` - Create new service request
  - `getCustomerRequests()` - Get customer's requests
  - `getMechanicRequests()` - Get mechanic's accepted requests
  - `getPendingRequestsForMechanic()` - Get all pending requests
  - `acceptRequest()` - Accept a request
  - `declineRequest()` - Decline a request
  - `completeRequest()` - Mark as completed
  - `updateRequestLocation()` - Update customer/mechanic location

### 5. **Location Services**
- ✅ Real-time GPS tracking
- ✅ Location permission handling
- ✅ Distance calculation (haversine formula)
- ✅ Google Maps navigation integration
- ✅ Location updates stored in database

**Library Functions:**
- `lib/location.ts` - Location utilities:
  - `getCurrentLocation()` - Get current GPS position

---

## 📊 Database Schema

### Customers Table
```sql
- id (uuid)
- auth_id (uuid, FK to auth.users)
- name (text)
- email (text)
- phone (text)
- car_type (text, optional)
- lat (float, optional)
- lng (float, optional)
- created_at (timestamp)
```

### Mechanics Table
```sql
- id (uuid)
- auth_id (uuid, FK to auth.users)
- name (text)
- phone (text)
- specialization (text)
- lat (float, optional)
- lng (float, optional)
- is_available (boolean)
- rating (float, optional)
- created_at (timestamp)
```

### Requests Table
```sql
- id (uuid)
- customer_id (uuid, FK to customers)
- mechanic_id (uuid, FK to mechanics, nullable)
- customer_name (text)
- customer_phone (text)
- car_type (text)
- issue (text)
- description (text, optional)
- status (enum: pending, accepted, declined, arrived, completed)
- lat (float) - Customer initial location
- lng (float) - Customer initial location
- customer_lat (float, optional)
- customer_lng (float, optional)
- mechanic_lat (float, optional)
- mechanic_lng (float, optional)
- price (float, optional)
- created_at (timestamp)
- accepted_at (timestamp, optional)
- completed_at (timestamp, optional)
```

---

## 🔄 User Flow

### Customer Flow
1. **Sign Up** → Enter name, email, phone, password
2. **Login** → View customer dashboard
3. **Create Request** → Fill car type and issue description
4. **Wait for Mechanic** → See request status update
5. **See Mechanic** → View mechanic location on map (coming soon)
6. **Complete Service** → Request marked as completed

### Mechanic Flow
1. **Sign Up** → Enter name, phone, specialization
2. **Login** → View mechanic dashboard
3. **Browse Requests** → See pending requests from all customers
4. **Accept Request** → Get assigned to customer
5. **Navigate** → Use Google Maps to find customer
6. **Complete Service** → Mark request as completed

---

## 🎯 Request Lifecycle

```
┌─────────────────┐
│    PENDING      │  ← Customer creates request
└────────┬────────┘
         │
    ┌────▼───────────────────┐
    │ Mechanic sees request   │
    └────┬───────────────────┘
         │
    ┌────▼──────────┐
    │  ACCEPT/      │
    │  DECLINE      │
    └────┬──────────┘
         │
    ┌────▼─────────────┐
    │    ACCEPTED      │  ← Mechanic on the way
    └────┬─────────────┘
         │
    ┌────▼──────────────────┐
    │  Mechanic navigates   │
    │  to customer location │
    └────┬─────────────────┘
         │
    ┌────▼──────────────┐
    │    COMPLETED      │  ← Service finished
    └────────────────────┘
```

---

## 📱 Screen Navigation Map

```
login.tsx
├── Successful Login
│   ├── Customer → customer-dashboard.tsx
│   └── Mechanic → mechanic-dashboard.tsx
└── New User → select-role.tsx
    ├── signup-customer.tsx
    └── signup-mechanic.tsx

customer-dashboard.tsx
├── → send-request.tsx (Create new request)
├── → customer/profile.tsx
└── → customer/edit-profile.tsx

mechanic-dashboard.tsx
├── → mechanic/profile.tsx
├── → mechanic/edit-profile.tsx
├── → requests-inbox.tsx
│   ├── Accept Request
│   └── Decline Request
└── → map-view.tsx
    ├── View Live Requests
    ├── Accept Request
    ├── Decline Request
    ├── Navigate (Google Maps)
    └── View Distance & Details
```

---

## 🔑 Key Features & Implementation

### 1. Real-Time Location Tracking
- Mechanics update location every 5 seconds when on map screen
- Customer location captured when creating request
- Both visible in database and on map for navigation

### 2. Request Management
- Create → Accept/Decline → Complete flow
- Status tracking with timestamps
- Phone contact info always available

### 3. Navigation Integration
- Direct Google Maps navigation links
- Distance calculation in kilometers
- Real-time distance updates as mechanic approaches

### 4. Responsive UI
- Clean, modern design
- Status color coding (orange=pending, green=accepted, red=declined)
- Real-time refresh functionality
- Loading states and error handling

---

## 🚀 Deployment & Environment Setup

### Required Environment Variables
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Run the App
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

---

## 📝 Next Steps & Enhancements

1. **Payment Integration** - Add Stripe for service payments
2. **Ratings & Reviews** - Customer review system for mechanics
3. **Push Notifications** - Real-time notifications for request updates
4. **Chat Feature** - In-app messaging between customer and mechanic
5. **Mechanic Verification** - Admin dashboard for mechanic verification
6. **Service History** - Archive of completed requests
7. **Emergency SOS** - Quick help button for customers
8. **Multiple Service Providers** - Allow customers to request multiple mechanics

---

## 🐛 Troubleshooting

### "User not found" errors
- Ensure customer/mechanic record is created after auth signup
- Check database constraints

### Location not updating
- Verify location permissions are granted
- Check GPS is enabled on device
- Ensure Expo location package is properly installed

### Requests not appearing
- Verify request status is "pending"
- Check customer_id and mechanic_id are correct
- Ensure real-time subscriptions are active

---

## 📞 Support & Contact

For issues or questions, check:
- Supabase documentation: https://supabase.com/docs
- Expo documentation: https://docs.expo.dev
- React Native docs: https://reactnative.dev

---

**Last Updated:** December 3, 2025
**App Version:** 1.0.0
