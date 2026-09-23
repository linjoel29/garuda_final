import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { supabase, generateUUID } from '../db';
import { orderSchema, orderUpdateSchema, OrderItem } from '../shared/schemas';
import { geocodeAddress } from '../services/geocoding';

export async function getOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { status, priority, search } = req.query;

    let queryBuilder = supabase.from('orders').select('*').eq('user_id', userId);

    if (status) {
      queryBuilder = queryBuilder.eq('status', status as string);
    }
    if (priority) {
      queryBuilder = queryBuilder.eq('priority', priority as string);
    }
    if (search) {
      queryBuilder = queryBuilder.or(`recipient_name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    const { data: orders, error } = await queryBuilder;

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to fetch orders' });
      return;
    }

    res.json(orders || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const data = orderSchema.parse(req.body);

    let lat = data.lat;
    let lng = data.lng;

    if (!lat || !lng) {
      const geo = await geocodeAddress(data.address);
      lat = geo.lat;
      lng = geo.lng;
    }

    const orderId = generateUUID();

    const { data: inserted, error } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId,
        recipient_name: data.recipient_name,
        address: data.address,
        lat,
        lng,
        weight_kg: data.weight_kg,
        volume_m3: data.volume_m3 || null,
        priority: data.priority || 'standard',
        category: data.category || 'Standard',
        time_window_start: data.time_window_start || null,
        time_window_end: data.time_window_end || null,
        status: 'pending',
        special_instructions: data.special_instructions || null,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to create order' });
      return;
    }

    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
}

export async function updateOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = orderUpdateSchema.parse(req.body);

    if (data.address && (!data.lat || !data.lng)) {
      const geo = await geocodeAddress(data.address);
      data.lat = geo.lat;
      data.lng = geo.lng;
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to update order' });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update order' });
  }
}

export async function deleteOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase.from('orders').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to delete order' });
      return;
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete order' });
  }
}

export async function bulkImportOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { csvText, orders: jsonOrders } = req.body;

    let itemsToProcess: any[] = [];

    if (jsonOrders && Array.isArray(jsonOrders)) {
      itemsToProcess = jsonOrders;
    } else if (csvText && typeof csvText === 'string') {
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        res.status(400).json({ error: 'CSV file must contain a header and at least 1 data row' });
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/["']/g, ''));
        const rowObj: Record<string, string> = {};
        headers.forEach((h, index) => {
          rowObj[h] = values[index] || '';
        });

        itemsToProcess.push({
          recipient_name: rowObj['recipient_name'] || rowObj['recipient'] || rowObj['name'] || `Customer #${i}`,
          address: rowObj['address'] || rowObj['location'] || 'Hampankatta, Mangaluru, Karnataka',
          weight_kg: parseFloat(rowObj['weight_kg'] || rowObj['weight'] || '10'),
          volume_m3: parseFloat(rowObj['volume_m3'] || rowObj['volume'] || '0.5'),
          priority: (rowObj['priority'] || 'standard').toLowerCase() === 'urgent' ? 'urgent' : 'standard',
          category: rowObj['category'] || 'Standard',
          time_window_start: rowObj['time_window_start'] || rowObj['start_time'] || '09:00',
          time_window_end: rowObj['time_window_end'] || rowObj['end_time'] || '17:00',
          special_instructions: rowObj['special_instructions'] || rowObj['instructions'] || '',
        });
      }
    } else {
      res.status(400).json({ error: 'Provide csvText string or orders array for bulk import' });
      return;
    }

    const rowsToInsert = [];
    for (const item of itemsToProcess) {
      const geo = await geocodeAddress(item.address);
      rowsToInsert.push({
        id: generateUUID(),
        user_id: userId,
        recipient_name: item.recipient_name,
        address: item.address,
        lat: geo.lat,
        lng: geo.lng,
        weight_kg: Number(item.weight_kg) || 10,
        volume_m3: Number(item.volume_m3) || 0.5,
        priority: item.priority === 'urgent' ? 'urgent' : 'standard',
        category: item.category || 'Standard',
        time_window_start: item.time_window_start || null,
        time_window_end: item.time_window_end || null,
        status: 'pending',
        special_instructions: item.special_instructions || null,
      });
    }

    const { data: createdOrders, error } = await supabase.from('orders').insert(rowsToInsert).select();

    if (error) {
      res.status(500).json({ error: error.message || 'Bulk import failed' });
      return;
    }

    res.status(201).json({
      message: `Successfully imported ${createdOrders?.length || 0} orders`,
      count: createdOrders?.length || 0,
      orders: createdOrders,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Bulk import failed' });
  }
}
