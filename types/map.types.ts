// types/map.types.ts
export interface Location {
  lat: number;
  lng: number;
}

export interface Mechanic {
  id: string;
  auth_id: string;
  name: string;
  phone: string;
  service?: string;
  specialization?: string;
  profile_image?: string;
  lat: number | null;
  lng: number | null;
  online: string; // Your table has this as string 'true'/'false'
  is_available?: boolean;
  rating?: number;
  created_at?: string;
}

export interface Customer {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  phone: string;
  car_type: string;
  lat: number | null;
  lng: number | null;
  created_at?: string;
}

export interface MechanicRequest {
  id: string;
  customer_id: string | null;
  mechanic_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  car_type: string | null;
  description: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'arrived' | 'completed';
  lat?: number | null;
  lng?: number | null;
  customer_lat: number | null;
  customer_lng: number | null;
  mechanic_lat?: number | null;
  mechanic_lng?: number | null;
  created_at: string;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'customer' | 'mechanic';
  name?: string;
}