import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, generateUUID } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { registerSchema, loginSchema } from '../shared/schemas';

const JWT_SECRET = process.env.JWT_SECRET || 'garudapath_super_secret_jwt_key_2026';

export async function registerUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const { data: existing, error: checkError } = await supabase.from('users').select('id').eq('email', email);
    
    if (checkError) {
      console.error('[Register Check Error]', checkError);
      res.status(500).json({ error: checkError.message || 'Database error during email check. Please verify Supabase tables exist.' });
      return;
    }

    if (existing && existing.length > 0) {
      res.status(400).json({ error: 'Email is already registered' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = generateUUID();

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email,
      password_hash: passwordHash,
      name,
    });

    if (insertError) {
      console.error('[Register Insert Error]', insertError);
      res.status(500).json({ error: insertError.message || 'Failed to create user in database.' });
      return;
    }

    // Create seed depot vehicle & sample orders for quick testing
    try {
      await createSeedDataForUser(userId);
    } catch (seedErr) {
      console.warn('[Seed Data Warning] Could not insert seed vehicles/orders:', seedErr);
    }

    const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
    res.status(201).json({
      user: { id: userId, email, name },
      token,
    });
  } catch (err: any) {
    console.error('[Register Catch Error]', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
}

export async function loginUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, password_hash, name')
      .eq('email', email);

    if (error) {
      console.error('[Login Supabase Error]', error);
      res.status(500).json({ error: error.message || 'Database error during login.' });
      return;
    }

    if (!users || users.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err: any) {
    console.error('[Login Catch Error]', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user: req.user });
}

async function createSeedDataForUser(userId: string) {
  const v1Id = generateUUID();
  const v2Id = generateUUID();

  await supabase.from('vehicles').insert([
    {
      id: v1Id,
      user_id: userId,
      name: 'Mangalore Express Van 101',
      vehicle_type: 'Van',
      max_weight_kg: 1200,
      max_volume_m3: 10,
      depot_lat: 12.8702,
      depot_lng: 74.8427,
      depot_address: 'Central Logistics Hub, Hampankatta, Mangaluru, Karnataka 575001',
      is_active: true,
    },
    {
      id: v2Id,
      user_id: userId,
      name: 'Coastal Cargo Bike 01',
      vehicle_type: 'Bike',
      max_weight_kg: 150,
      max_volume_m3: 2,
      depot_lat: 12.8702,
      depot_lng: 74.8427,
      depot_address: 'Central Logistics Hub, Hampankatta, Mangaluru, Karnataka 575001',
      is_active: true,
    },
  ]);

  const sampleOrders = [
    {
      id: generateUUID(),
      user_id: userId,
      recipient_name: 'KMC Hospital Pharmacy Attavar',
      address: 'KMC Hospital Road, Attavar, Mangaluru, Karnataka 575001',
      lat: 12.8645,
      lng: 74.8432,
      weight_kg: 85,
      volume_m3: 0.8,
      priority: 'urgent',
      category: 'Refrigerated',
      time_window_start: '09:00',
      time_window_end: '12:00',
      status: 'pending',
      special_instructions: 'Urgent medical supplies to Attavar reception desk.',
    },
    {
      id: generateUUID(),
      user_id: userId,
      recipient_name: 'City Centre Mall Retail Depot',
      address: 'KS Rao Rd, Hampankatta, Mangaluru, Karnataka 575001',
      lat: 12.8722,
      lng: 74.8415,
      weight_kg: 240,
      volume_m3: 2.1,
      priority: 'standard',
      category: 'Standard',
      time_window_start: '10:00',
      time_window_end: '14:00',
      status: 'pending',
      special_instructions: 'Deliver to loading bay B near KS Rao Road.',
    },
    {
      id: generateUUID(),
      user_id: userId,
      recipient_name: 'AJ Hospital Medical Equipment Center',
      address: 'NH-66, Kuntikan, Mangaluru, Karnataka 575004',
      lat: 12.8981,
      lng: 74.8542,
      weight_kg: 120,
      volume_m3: 1.2,
      priority: 'urgent',
      category: 'Fragile',
      time_window_start: '09:30',
      time_window_end: '11:30',
      status: 'pending',
      special_instructions: 'Handle diagnostic equipment with care at Kuntikan.',
    },
    {
      id: generateUUID(),
      user_id: userId,
      recipient_name: 'Nexus Forum Fiza Mall',
      address: 'Pandeshwar, Mangaluru, Karnataka 575001',
      lat: 12.8596,
      lng: 74.8378,
      weight_kg: 95,
      volume_m3: 0.9,
      priority: 'standard',
      category: 'Standard',
      time_window_start: '11:00',
      time_window_end: '16:00',
      status: 'pending',
      special_instructions: 'Deliver to Pandeshwar main store entrance.',
    },
    {
      id: generateUUID(),
      user_id: userId,
      recipient_name: 'NITK Surathkal Tech Innovation Center',
      address: 'NITK Campus, Surathkal, Mangaluru, Karnataka 575025',
      lat: 13.0108,
      lng: 74.7943,
      weight_kg: 180,
      volume_m3: 1.5,
      priority: 'urgent',
      category: 'Standard',
      time_window_start: '10:00',
      time_window_end: '15:00',
      status: 'pending',
      special_instructions: 'Check in with NITK gate security at Surathkal.',
    },
  ];

  await supabase.from('orders').insert(sampleOrders);
}
