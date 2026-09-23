import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { supabase, generateUUID } from '../db';
import { vehicleSchema, vehicleUpdateSchema, VehicleItem } from '../shared/schemas';
import { geocodeAddress } from '../services/geocoding';

export async function getVehicles(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Vehicle Fetch Error]', error);
      res.status(500).json({ error: error.message || 'Failed to fetch vehicles' });
      return;
    }

    res.json(vehicles || []);
  } catch (err: any) {
    console.error('[Vehicle Fetch Catch Error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch vehicles' });
  }
}

export async function createVehicle(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const data = vehicleSchema.parse(req.body);

    let lat = data.depot_lat;
    let lng = data.depot_lng;

    if ((!lat || !lng) && data.depot_address) {
      const geo = await geocodeAddress(data.depot_address);
      lat = geo.lat;
      lng = geo.lng;
    }

    // Ensure user record exists in Supabase users table to avoid FK constraint failures
    const { data: userExists } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
    if (!userExists) {
      console.log(`[Vehicle] User ${userId} not found in database. Auto-creating user record.`);
      await supabase.from('users').insert({
        id: userId,
        email: req.user!.email || 'dispatcher@routewise.ai',
        password_hash: '$2a$10$wT8vWzQ.L7f9f2...dummyhash',
        name: req.user!.name || 'Dispatcher',
      });
    }

    const vehicleId = generateUUID();

    const { data: inserted, error } = await supabase
      .from('vehicles')
      .insert({
        id: vehicleId,
        user_id: userId,
        name: data.name,
        vehicle_type: data.vehicle_type || 'Van',
        max_weight_kg: data.max_weight_kg,
        max_volume_m3: data.max_volume_m3 || null,
        depot_lat: lat,
        depot_lng: lng,
        depot_address: data.depot_address || null,
        is_active: data.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Vehicle Insert Error]', error);
      res.status(500).json({ error: error.message || 'Failed to create vehicle in database' });
      return;
    }

    res.status(201).json(inserted);
  } catch (err: any) {
    console.error('[Vehicle Create Catch Error]', err);
    res.status(500).json({ error: err.message || 'Failed to create vehicle' });
  }
}

export async function updateVehicle(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = vehicleUpdateSchema.parse(req.body);

    if (data.depot_address && (!data.depot_lat || !data.depot_lng)) {
      const geo = await geocodeAddress(data.depot_address);
      data.depot_lat = geo.lat;
      data.depot_lng = geo.lng;
    }

    const { data: updated, error } = await supabase
      .from('vehicles')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to update vehicle' });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update vehicle' });
  }
}

export async function deleteVehicle(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase.from('vehicles').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to delete vehicle' });
      return;
    }

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete vehicle' });
  }
}
