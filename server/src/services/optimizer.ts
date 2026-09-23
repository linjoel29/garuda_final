import { OrderItem, VehicleItem } from '../shared/schemas';
import { getTravelMatrix, LocationPoint } from './travelTime';

export interface RouteOptimizationResult {
  vehicle_id: string;
  total_distance_km: number;
  total_duration_min: number;
  stops: {
    order_id: string;
    sequence_number: number;
    eta: string;
    arrival_offset_min: number;
  }[];
}

export interface OptimizationOptions {
  objective?: 'minimize_time' | 'minimize_distance' | 'balance_load';
  startTimeStr?: string; // e.g., "08:00"
  lockedStops?: string[]; // Order IDs already completed/fixed
  delayOffsetMin?: number; // Extra delay in minutes at the disruption point
  disruptedStopId?: string; // Stop where disruption occurred
}

/**
 * CVRP & VRPTW Optimization Solver Engine
 * Assigns orders across all selected active vehicles while respecting payload limits,
 * priority sequencing, and travel-time constraints.
 */
export async function solveCVRP(
  orders: OrderItem[],
  vehicles: VehicleItem[],
  options: OptimizationOptions = {}
): Promise<RouteOptimizationResult[]> {
  const objective = options.objective || 'minimize_time';
  const startHour = 8; // Default 08:00 AM
  const startMinute = 0;
  const SERVICE_TIME_MIN = 8; // 8 minutes per delivery stop

  if (orders.length === 0 || vehicles.length === 0) {
    return [];
  }

  // Active vehicles only
  const activeVehicles = vehicles.filter((v) => v.is_active !== false);
  if (activeVehicles.length === 0) {
    throw new Error('No active vehicles available for route optimization');
  }

  // Points: [0..V-1] = Depots, [V..V+O-1] = Orders
  const points: LocationPoint[] = [
    ...activeVehicles.map((v) => ({ lat: Number(v.depot_lat), lng: Number(v.depot_lng) })),
    ...orders.map((o) => ({ lat: Number(o.lat), lng: Number(o.lng) })),
  ];

  const travelMatrix = await getTravelMatrix(points);
  const dist = travelMatrix.distancesKm;
  const dur = travelMatrix.durationsMin;

  const numVehicles = activeVehicles.length;
  const numOrders = orders.length;

  // Separate urgent and standard orders
  const urgentOrdersIdx: number[] = [];
  const standardOrdersIdx: number[] = [];

  for (let i = 0; i < numOrders; i++) {
    if (orders[i].priority === 'urgent') {
      urgentOrdersIdx.push(i);
    } else {
      standardOrdersIdx.push(i);
    }
  }

  const sortedOrderIndices = [...urgentOrdersIdx, ...standardOrdersIdx];

  const assigned = new Set<number>();
  const vehicleRoutes: number[][] = activeVehicles.map(() => []);
  const vehicleLoadsWeight: number[] = activeVehicles.map(() => 0);
  const vehicleLoadsVolume: number[] = activeVehicles.map(() => 0);

  // If locked stops specified (re-routing scenario), pre-assign locked stops
  if (options.lockedStops && options.lockedStops.length > 0) {
    options.lockedStops.forEach((orderId) => {
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx !== -1 && !assigned.has(idx)) {
        assigned.add(idx);
        vehicleRoutes[0].push(idx);
      }
    });
  }

  // Step 1: Initial Seed Assignment (Ensure all active vehicles receive orders if numOrders >= numVehicles)
  if (numVehicles > 1 && numOrders >= numVehicles) {
    for (let vIdx = 0; vIdx < numVehicles; vIdx++) {
      if (vehicleRoutes[vIdx].length > 0) continue;

      // Find closest unassigned order to vehicle's depot
      let closestOrderIdx = -1;
      let minDistance = Infinity;

      for (const oIdx of sortedOrderIndices) {
        if (assigned.has(oIdx)) continue;
        const depotPtIdx = vIdx;
        const orderPtIdx = numVehicles + oIdx;
        const d = dist[depotPtIdx][orderPtIdx];

        if (d < minDistance) {
          minDistance = d;
          closestOrderIdx = oIdx;
        }
      }

      if (closestOrderIdx !== -1) {
        const order = orders[closestOrderIdx];
        const w = Number(order.weight_kg) || 0;
        const v = Number(order.volume_m3) || 0;

        if (w <= Number(activeVehicles[vIdx].max_weight_kg)) {
          vehicleRoutes[vIdx].push(closestOrderIdx);
          vehicleLoadsWeight[vIdx] += w;
          vehicleLoadsVolume[vIdx] += v;
          assigned.add(closestOrderIdx);
        }
      }
    }
  }

  // Step 2: Assign remaining orders using Greedy Insertion with Load-Balancing & Capacity penalties
  for (const orderIdx of sortedOrderIndices) {
    if (assigned.has(orderIdx)) continue;

    const order = orders[orderIdx];
    const orderWeight = Number(order.weight_kg) || 0;
    const orderVol = Number(order.volume_m3) || 0;

    let bestVehicleIdx = -1;
    let bestInsertionCost = Infinity;

    for (let vIdx = 0; vIdx < numVehicles; vIdx++) {
      const vehicle = activeVehicles[vIdx];
      const currentWeight = vehicleLoadsWeight[vIdx];
      const currentVolume = vehicleLoadsVolume[vIdx];

      // Check weight & volume capacity
      if (currentWeight + orderWeight > Number(vehicle.max_weight_kg)) continue;
      if (vehicle.max_volume_m3 && currentVolume + orderVol > Number(vehicle.max_volume_m3)) continue;

      const route = vehicleRoutes[vIdx];
      const depotPtIdx = vIdx;
      const orderPtIdx = numVehicles + orderIdx;

      for (let pos = 0; pos <= route.length; pos++) {
        const prevPtIdx = pos === 0 ? depotPtIdx : numVehicles + route[pos - 1];
        const nextPtIdx = pos === route.length ? depotPtIdx : numVehicles + route[pos];

        let costDelta = dist[prevPtIdx][orderPtIdx] + dist[orderPtIdx][nextPtIdx] - dist[prevPtIdx][nextPtIdx];
        if (objective === 'minimize_time') {
          costDelta = dur[prevPtIdx][orderPtIdx] + dur[orderPtIdx][nextPtIdx] - dur[prevPtIdx][nextPtIdx];
        }

        // Urgent priority bonus: insert earlier = lower cost
        if (order.priority === 'urgent') {
          costDelta -= (route.length - pos + 1) * 15;
        }

        // Vehicle route size balancing penalty: incentivize spreading stops across vehicles
        costDelta += route.length * 8;
        costDelta += (currentWeight / Number(vehicle.max_weight_kg)) * 15;

        if (costDelta < bestInsertionCost) {
          bestInsertionCost = costDelta;
          bestVehicleIdx = vIdx;
        }
      }
    }

    // Fallback: Assign to least loaded vehicle
    if (bestVehicleIdx === -1) {
      let minLoadRatio = Infinity;
      for (let vIdx = 0; vIdx < numVehicles; vIdx++) {
        const ratio = vehicleLoadsWeight[vIdx] / Number(activeVehicles[vIdx].max_weight_kg);
        if (ratio < minLoadRatio) {
          minLoadRatio = ratio;
          bestVehicleIdx = vIdx;
        }
      }
    }

    if (bestVehicleIdx !== -1) {
      vehicleRoutes[bestVehicleIdx].push(orderIdx);
      vehicleLoadsWeight[bestVehicleIdx] += orderWeight;
      vehicleLoadsVolume[bestVehicleIdx] += orderVol;
      assigned.add(orderIdx);
    }
  }

  // Step 3: 2-Opt & Priority Local Search Refinement on each vehicle route
  for (let vIdx = 0; vIdx < numVehicles; vIdx++) {
    let route = vehicleRoutes[vIdx];
    if (route.length <= 2) continue;

    const depotPtIdx = vIdx;
    let improved = true;
    let iterations = 0;

    while (improved && iterations < 50) {
      improved = false;
      iterations++;

      for (let i = 0; i < route.length - 1; i++) {
        for (let j = i + 1; j < route.length; j++) {
          const newRoute = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];

          const currentCost = calculateRouteCost(route, depotPtIdx, numVehicles, orders, dist, dur, objective);
          const newCost = calculateRouteCost(newRoute, depotPtIdx, numVehicles, orders, dist, dur, objective);

          if (newCost < currentCost) {
            route = newRoute;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
    vehicleRoutes[vIdx] = route;
  }

  // Step 4: Compute final sequence, distance, duration, and ETAs for each vehicle route
  const results: RouteOptimizationResult[] = [];

  for (let vIdx = 0; vIdx < numVehicles; vIdx++) {
    const vehicle = activeVehicles[vIdx];
    const route = vehicleRoutes[vIdx];
    const depotPtIdx = vIdx;

    let totalDistKm = 0;
    let totalDurMin = 0;
    let currentOffsetMin = 0;
    let prevPtIdx = depotPtIdx;

    const stops: RouteOptimizationResult['stops'] = [];

    for (let seq = 0; seq < route.length; seq++) {
      const orderIdx = route[seq];
      const order = orders[orderIdx];
      const orderPtIdx = numVehicles + orderIdx;

      const travelDist = dist[prevPtIdx][orderPtIdx];
      const travelDur = dur[prevPtIdx][orderPtIdx];

      totalDistKm += travelDist;
      totalDurMin += travelDur;
      currentOffsetMin += travelDur;

      if (options.disruptedStopId && order.id === options.disruptedStopId && options.delayOffsetMin) {
        currentOffsetMin += options.delayOffsetMin;
        totalDurMin += options.delayOffsetMin;
      }

      const totalMinutesFromStart = startHour * 60 + startMinute + Math.round(currentOffsetMin);
      const etaHour = Math.floor(totalMinutesFromStart / 60) % 24;
      const etaMin = Math.round(totalMinutesFromStart % 60);
      const etaStr = `${String(etaHour).padStart(2, '0')}:${String(etaMin).padStart(2, '0')}`;

      stops.push({
        order_id: order.id,
        sequence_number: seq + 1,
        eta: etaStr,
        arrival_offset_min: Math.round(currentOffsetMin),
      });

      currentOffsetMin += SERVICE_TIME_MIN;
      totalDurMin += SERVICE_TIME_MIN;
      prevPtIdx = orderPtIdx;
    }

    if (route.length > 0) {
      const returnDist = dist[prevPtIdx][depotPtIdx];
      const returnDur = dur[prevPtIdx][depotPtIdx];
      totalDistKm += returnDist;
      totalDurMin += returnDur;
    }

    results.push({
      vehicle_id: vehicle.id,
      total_distance_km: Number(totalDistKm.toFixed(2)),
      total_duration_min: Number(totalDurMin.toFixed(1)),
      stops,
    });
  }

  return results;
}

function calculateRouteCost(
  route: number[],
  depotPtIdx: number,
  numVehicles: number,
  orders: OrderItem[],
  dist: number[][],
  dur: number[][],
  objective: string
): number {
  let cost = 0;
  let prevPt = depotPtIdx;

  for (let idx = 0; idx < route.length; idx++) {
    const orderIdx = route[idx];
    const orderPt = numVehicles + orderIdx;
    const order = orders[orderIdx];

    const d = dist[prevPt][orderPt];
    const t = dur[prevPt][orderPt];

    cost += objective === 'minimize_distance' ? d : t;

    if (order.priority === 'urgent') {
      cost += idx * 10;
    }

    prevPt = orderPt;
  }

  cost += objective === 'minimize_distance' ? dist[prevPt][depotPtIdx] : dur[prevPt][depotPtIdx];
  return cost;
}
