import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { supabase, generateUUID } from '../db';
import {
  routeGenerateSchema,
  delaySimulationSchema,
  OrderItem,
  VehicleItem,
  RouteItem,
  RouteStopItem,
  RouteEventItem,
} from '../shared/schemas';
import { solveCVRP } from '../services/optimizer';
import { generateRouteSummary, generateDisruptionExplanation } from '../services/gemini';

export async function generateRoutes(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { route_date, order_ids, vehicle_ids, objective } = routeGenerateSchema.parse(req.body);

    // Fetch selected orders via Supabase
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .in('id', order_ids)
      .eq('user_id', userId);

    if (ordersError || !orders || orders.length === 0) {
      res.status(400).json({ error: 'No valid orders found for route optimization' });
      return;
    }

    // Fetch selected active vehicles via Supabase
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .in('id', vehicle_ids)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (vehiclesError || !vehicles || vehicles.length === 0) {
      res.status(400).json({ error: 'No active vehicles selected for route optimization' });
      return;
    }

    // Run CVRP Solver
    const optimizationResults = await solveCVRP(orders as OrderItem[], vehicles as VehicleItem[], { objective });

    const createdRoutes: RouteItem[] = [];

    for (const optRes of optimizationResults) {
      if (optRes.stops.length === 0) continue;

      const routeId = generateUUID();
      const vehicle = vehicles.find((v) => v.id === optRes.vehicle_id)!;

      // Insert route container
      const { error: routeInsertErr } = await supabase.from('routes').insert({
        id: routeId,
        user_id: userId,
        vehicle_id: vehicle.id,
        route_date,
        status: 'planned',
        total_distance_km: optRes.total_distance_km,
        total_duration_min: optRes.total_duration_min,
      });

      if (routeInsertErr) continue;

      const stopsToInsert = [];
      const stopsDataForGemini: { sequence: number; address: string; priority: string; eta?: string }[] = [];

      for (const stop of optRes.stops) {
        const stopId = generateUUID();
        const order = orders.find((o) => o.id === stop.order_id)!;
        const etaDate = new Date(`${route_date}T${stop.eta}:00`).toISOString();

        stopsToInsert.push({
          id: stopId,
          route_id: routeId,
          order_id: order.id,
          sequence_number: stop.sequence_number,
          eta: etaDate,
          was_rerouted: false,
          status: 'pending',
        });

        // Update order status to assigned
        await supabase.from('orders').update({ status: 'assigned' }).eq('id', order.id);

        stopsDataForGemini.push({
          sequence: stop.sequence_number,
          address: order.address,
          priority: order.priority,
          eta: stop.eta,
        });
      }

      await supabase.from('route_stops').insert(stopsToInsert);

      // Generate AI Summary via Gemini
      const aiSummary = await generateRouteSummary({
        vehicle_name: vehicle.name,
        stops: stopsDataForGemini,
        total_distance_km: optRes.total_distance_km,
        total_duration_min: optRes.total_duration_min,
      });

      await supabase.from('routes').update({ ai_summary: aiSummary }).eq('id', routeId);

      const fullRoute = await fetchFullRouteById(routeId, userId);
      if (fullRoute) createdRoutes.push(fullRoute);
    }

    res.status(201).json({
      message: `Successfully generated ${createdRoutes.length} optimized route(s)`,
      routes: createdRoutes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Route generation failed' });
  }
}

export async function getRoutes(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { date, status } = req.query;

    let queryBuilder = supabase.from('routes').select('*').eq('user_id', userId);

    if (date) {
      queryBuilder = queryBuilder.eq('route_date', date as string);
    }
    if (status) {
      queryBuilder = queryBuilder.eq('status', status as string);
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    const { data: routesList, error } = await queryBuilder;

    if (error || !routesList) {
      res.status(500).json({ error: error?.message || 'Failed to fetch routes' });
      return;
    }

    const fullRoutes: RouteItem[] = [];
    for (const r of routesList) {
      const full = await fetchFullRouteById(r.id, userId);
      if (full) fullRoutes.push(full);
    }

    res.json(fullRoutes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch routes' });
  }
}

export async function getRouteById(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const fullRoute = await fetchFullRouteById(id, userId);
    if (!fullRoute) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }

    res.json(fullRoute);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch route details' });
  }
}

export async function simulateDelay(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id: routeId } = req.params;
    const { stop_id, event_type, delay_minutes, notes } = delaySimulationSchema.parse(req.body);

    const fullRoute = await fetchFullRouteById(routeId, userId);
    if (!fullRoute) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }

    const affectedStop = fullRoute.stops?.find((s) => s.id === stop_id || s.order_id === stop_id);
    if (!affectedStop) {
      res.status(404).json({ error: 'Stop not found in this route' });
      return;
    }

    const vehicle = fullRoute.vehicle;
    if (!vehicle) {
      res.status(400).json({ error: 'Vehicle not found for route' });
      return;
    }

    const oldRouteAddresses = fullRoute.stops?.map((s) => s.order?.address || '') || [];

    // Mark affected stop as delayed / rerouted
    await supabase
      .from('route_stops')
      .update({ status: 'delayed', was_rerouted: true })
      .eq('id', affectedStop.id);

    // Re-optimize remaining pending stops
    const remainingOrders =
      fullRoute.stops
        ?.filter((s) => s.sequence_number >= affectedStop.sequence_number && s.order)
        .map((s) => s.order!) || [];

    const optResults = await solveCVRP(remainingOrders, [vehicle], {
      disruptedStopId: affectedStop.order_id,
      delayOffsetMin: delay_minutes,
    });

    if (optResults.length > 0 && optResults[0].stops.length > 0) {
      const newStops = optResults[0].stops;
      for (const ns of newStops) {
        const etaDate = new Date(`${fullRoute.route_date}T${ns.eta}:00`).toISOString();
        await supabase
          .from('route_stops')
          .update({ sequence_number: ns.sequence_number, eta: etaDate, was_rerouted: true })
          .eq('route_id', routeId)
          .eq('order_id', ns.order_id);
      }

      await supabase
        .from('routes')
        .update({
          total_distance_km: optResults[0].total_distance_km,
          total_duration_min: optResults[0].total_duration_min,
          status: 'in_progress',
        })
        .eq('id', routeId);
    }

    const updatedRoute = await fetchFullRouteById(routeId, userId);
    const newRouteAddresses = updatedRoute?.stops?.map((s) => s.order?.address || '') || [];

    // Generate Gemini AI explanation
    const aiExplanation = await generateDisruptionExplanation({
      event_type,
      affected_stop: affectedStop.order?.recipient_name || affectedStop.order?.address || 'Stop',
      old_route: oldRouteAddresses,
      new_route: newRouteAddresses,
      time_delta_min: delay_minutes,
    });

    const eventId = generateUUID();
    const eventDescription = `${event_type.toUpperCase()}: ${delay_minutes} min disruption at ${affectedStop.order?.recipient_name || 'stop'}. ${notes || ''}`.trim();

    await supabase.from('route_events').insert({
      id: eventId,
      route_id: routeId,
      event_type: event_type === 'extended_stop' ? 'delay' : event_type,
      description: eventDescription,
      ai_explanation: aiExplanation,
    });

    const refreshedRoute = await fetchFullRouteById(routeId, userId);
    res.json({
      message: 'Route dynamically recomputed',
      route: refreshedRoute,
      event: {
        id: eventId,
        route_id: routeId,
        event_type,
        description: eventDescription,
        ai_explanation: aiExplanation,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Delay simulation failed' });
  }
}

async function fetchFullRouteById(routeId: string, userId: string): Promise<RouteItem | null> {
  const { data: routes } = await supabase.from('routes').select('*').eq('id', routeId).eq('user_id', userId);
  if (!routes || routes.length === 0) return null;

  const route = routes[0] as RouteItem;

  // Fetch Vehicle
  if (route.vehicle_id) {
    const { data: vehicles } = await supabase.from('vehicles').select('*').eq('id', route.vehicle_id);
    if (vehicles && vehicles.length > 0) route.vehicle = vehicles[0] as VehicleItem;
  }

  // Fetch Stops joined with Orders
  const { data: stops } = await supabase
    .from('route_stops')
    .select('*')
    .eq('route_id', routeId)
    .order('sequence_number', { ascending: true });

  if (stops) {
    const stopsWithOrders: RouteStopItem[] = [];
    for (const s of stops as RouteStopItem[]) {
      if (s.order_id) {
        const { data: orders } = await supabase.from('orders').select('*').eq('id', s.order_id);
        if (orders && orders.length > 0) s.order = orders[0] as OrderItem;
      }
      stopsWithOrders.push(s);
    }
    route.stops = stopsWithOrders;
  }

  // Fetch Events
  const { data: events } = await supabase
    .from('route_events')
    .select('*')
    .eq('route_id', routeId)
    .order('created_at', { ascending: false });

  route.events = (events as RouteEventItem[]) || [];

  return route;
}
