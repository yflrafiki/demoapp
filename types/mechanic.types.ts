// types/mechanic.types.ts
export interface MechanicRequest {
  id: string;
  customer_id: string;
  mechanic_id: string;
  customer_name: string;
  customer_phone?: string;
  car_type: string;
  issue?: string;
  description?: string;
  status: 'pending' | 'accepted' | 'declined' | 'arrived' | 'completed';
  lat?: number | null;
  lng?: number | null;
  customer_lat?: number | null;
  customer_lng?: number | null;
  mechanic_lat?: number | null;
  mechanic_lng?: number | null;
  price?: number;
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
  rating?: number;
  created_at: string;
}

export interface Location {
  lat: number;
  lng: number;
}