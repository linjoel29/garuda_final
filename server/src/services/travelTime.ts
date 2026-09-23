import axios from 'axios';

export interface LocationPoint {
  lat: number;
  lng: number;
}

export interface TravelMatrixResult {
  distancesKm: number[][]; // [i][j] distance in km
  durationsMin: number[][]; // [i][j] duration in minutes
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng points.
 */
export function haversineDistanceKm(p1: LocationPoint, p2: LocationPoint): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates travel time & distance matrix using Google Maps Distance Matrix API
 * with direct Haversine distance matrix fallback.
 */
export async function getTravelMatrix(points: LocationPoint[]): Promise<TravelMatrixResult> {
  const n = points.length;
  if (n === 0) {
    return { distancesKm: [], durationsMin: [] };
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  // 1. Google Maps Distance Matrix API
  if (googleKey) {
    try {
      const originsStr = points.map((p) => `${p.lat},${p.lng}`).join('|');
      const destinationsStr = originsStr;

      const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: originsStr,
          destinations: destinationsStr,
          key: googleKey,
          mode: 'driving',
        },
        timeout: 5000,
      });

      if (response.data && response.data.status === 'OK' && response.data.rows) {
        const distancesKm: number[][] = [];
        const durationsMin: number[][] = [];

        for (let i = 0; i < n; i++) {
          distancesKm[i] = [];
          durationsMin[i] = [];
          const elements = response.data.rows[i].elements;
          for (let j = 0; j < n; j++) {
            const el = elements[j];
            if (el && el.status === 'OK') {
              distancesKm[i][j] = Number((el.distance.value / 1000).toFixed(2));
              durationsMin[i][j] = Number((el.duration.value / 60).toFixed(2));
            } else {
              const d = haversineDistanceKm(points[i], points[j]) * 1.25;
              distancesKm[i][j] = Number(d.toFixed(2));
              durationsMin[i][j] = Number(((d / 30) * 60).toFixed(2));
            }
          }
        }

        return { distancesKm, durationsMin };
      }
    } catch (err: any) {
      console.warn(`[TravelTime] Google Maps Distance Matrix API call failed (${err.message}). Using Haversine fallback.`);
    }
  } else {
    console.log('[TravelTime] GOOGLE_MAPS_API_KEY is not set. Using Haversine distance matrix.');
  }

  // 2. Fallback: Haversine distance matrix + estimated urban velocity (30 km/h)
  const distancesKm: number[][] = [];
  const durationsMin: number[][] = [];

  for (let i = 0; i < n; i++) {
    distancesKm[i] = [];
    durationsMin[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distancesKm[i][j] = 0;
        durationsMin[i][j] = 0;
      } else {
        const dist = haversineDistanceKm(points[i], points[j]);
        const roadDist = dist * 1.25;
        const dur = (roadDist / 30) * 60;
        distancesKm[i][j] = Number(roadDist.toFixed(2));
        durationsMin[i][j] = Number(dur.toFixed(2));
      }
    }
  }

  return { distancesKm, durationsMin };
}
