import { z } from 'zod';

// --- Auth Schemas ---
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// --- Order Schemas ---
export const orderPriorityEnum = z.enum(['standard', 'urgent']);
export const orderCategoryEnum = z.enum(['Standard', 'Fragile', 'Refrigerated', 'Urgent']);
export const orderStatusEnum = z.enum(['pending', 'assigned', 'delivered', 'delayed']);

export const orderSchema = z.object({
  recipient_name: z.string().min(1, 'Recipient name is required'),
  address: z.string().min(3, 'Address is required'),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  weight_kg: z.number().positive('Weight must be greater than 0'),
  volume_m3: z.number().nonnegative('Volume cannot be negative').optional().nullable(),
  priority: orderPriorityEnum.default('standard'),
  category: orderCategoryEnum.optional().default('Standard'),
  time_window_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
  time_window_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
  special_instructions: z.string().optional().nullable(),
});

export const orderUpdateSchema = orderSchema.partial().extend({
  status: orderStatusEnum.optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;

// --- Vehicle Schemas ---
export const vehicleTypeEnum = z.enum(['Bike', 'Van', 'Truck']);

export const vehicleSchema = z.object({
  name: z.string().min(1, 'Vehicle name or ID is required'),
  vehicle_type: vehicleTypeEnum.default('Van'),
  max_weight_kg: z.number().positive('Max weight must be greater than 0'),
  max_volume_m3: z.number().nonnegative('Max volume cannot be negative').optional().nullable(),
  depot_lat: z.number().min(-90).max(90, 'Invalid latitude'),
  depot_lng: z.number().min(-180).max(180, 'Invalid longitude'),
  depot_address: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const vehicleUpdateSchema = vehicleSchema.partial();

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;

// --- Route Generation Schemas ---
export const optimizationObjectiveEnum = z.enum(['minimize_time', 'minimize_distance', 'balance_load']);

export const routeGenerateSchema = z.object({
  route_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  order_ids: z.array(z.string().uuid('Invalid order ID')).min(1, 'Select at least one order'),
  vehicle_ids: z.array(z.string().uuid('Invalid vehicle ID')).min(1, 'Select at least one vehicle'),
  objective: optimizationObjectiveEnum.default('minimize_time'),
});

export type RouteGenerateInput = z.infer<typeof routeGenerateSchema>;

// --- Delay Simulation Schemas ---
export const disruptionTypeEnum = z.enum(['delay', 'closure', 'breakdown', 'extended_stop']);

export const delaySimulationSchema = z.object({
  stop_id: z.string().uuid('Invalid stop ID'),
  event_type: disruptionTypeEnum,
  delay_minutes: z.number().min(0).default(15),
  notes: z.string().optional().nullable(),
});

export type DelaySimulationInput = z.infer<typeof delaySimulationSchema>;

// --- Response & DB Entity Types ---
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  user_id: string;
  recipient_name: string;
  address: string;
  lat: number;
  lng: number;
  weight_kg: number;
  volume_m3: number | null;
  priority: 'standard' | 'urgent';
  category?: 'Standard' | 'Fragile' | 'Refrigerated' | 'Urgent';
  time_window_start: string | null;
  time_window_end: string | null;
  status: 'pending' | 'assigned' | 'delivered' | 'delayed';
  special_instructions?: string | null;
  created_at: string;
}

export interface VehicleItem {
  id: string;
  user_id: string;
  name: string;
  vehicle_type?: 'Bike' | 'Van' | 'Truck';
  max_weight_kg: number;
  max_volume_m3: number | null;
  depot_lat: number;
  depot_lng: number;
  depot_address?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RouteStopItem {
  id: string;
  route_id: string;
  order_id: string;
  sequence_number: number;
  eta: string | null;
  actual_arrival?: string | null;
  was_rerouted: boolean;
  status?: 'pending' | 'arrived' | 'delayed' | 'skipped';
  order?: OrderItem;
}

export interface RouteEventItem {
  id: string;
  route_id: string;
  event_type: 'delay' | 'closure' | 'breakdown' | 'recompute';
  description: string;
  ai_explanation: string | null;
  created_at: string;
}

export interface RouteItem {
  id: string;
  user_id: string;
  vehicle_id: string;
  route_date: string;
  status: 'planned' | 'in_progress' | 'completed';
  total_distance_km: number;
  total_duration_min: number;
  ai_summary: string | null;
  created_at: string;
  vehicle?: VehicleItem;
  stops?: RouteStopItem[];
  events?: RouteEventItem[];
}

export interface DashboardStats {
  active_vehicles_count: number;
  total_orders_today: number;
  total_routes_today: number;
  fleet_utilization_pct: number;
  avg_delivery_time_min: number;
  total_distance_saved_km: number;
  total_fuel_saved_liters: number;
}
