-- Garuda Path Production PostgreSQL Schema for Supabase

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'Van',
  max_weight_kg NUMERIC NOT NULL,
  max_volume_m3 NUMERIC,
  depot_lat NUMERIC NOT NULL,
  depot_lng NUMERIC NOT NULL,
  depot_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  volume_m3 NUMERIC,
  priority TEXT CHECK (priority IN ('standard','urgent')) DEFAULT 'standard',
  category TEXT DEFAULT 'Standard',
  time_window_start TIME,
  time_window_end TIME,
  status TEXT CHECK (status IN ('pending','assigned','delivered','delayed')) DEFAULT 'pending',
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id),
  route_date DATE NOT NULL,
  status TEXT CHECK (status IN ('planned','in_progress','completed')) DEFAULT 'planned',
  total_distance_km NUMERIC,
  total_duration_min NUMERIC,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  sequence_number INT NOT NULL,
  eta TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  was_rerouted BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS route_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('delay','closure','breakdown','recompute')),
  description TEXT,
  ai_explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
