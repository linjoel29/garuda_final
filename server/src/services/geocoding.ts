import axios from 'axios';

export interface GeoLocation {
  lat: number;
  lng: number;
  formatted_address: string;
}

// Default Depot: Central Logistics Hub, Hampankatta, Mangaluru, Karnataka 575001
const DEFAULT_LAT = 12.8702;
const DEFAULT_LNG = 74.8427;

export async function geocodeAddress(address: string): Promise<GeoLocation> {
  const trimmed = address.trim();
  if (!trimmed) {
    return {
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      formatted_address: 'Central Logistics Hub, Hampankatta, Mangaluru, Karnataka 575001',
    };
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  // Attempt 1: Google Maps Geocoding API if GOOGLE_MAPS_API_KEY is configured
  if (googleKey) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: trimmed,
          key: googleKey,
        },
        timeout: 4000,
      });

      if (response.data && response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formatted_address: result.formatted_address || trimmed,
        };
      }
    } catch (err) {
      console.warn(`[Geocoding] Google Maps lookup failed for "${trimmed}". Trying Nominatim.`);
    }
  }

  // Attempt 2: OpenStreetMap Nominatim Geocoding API
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: trimmed.includes('Mangalore') || trimmed.includes('Mangaluru') ? trimmed : `${trimmed}, Mangaluru, Karnataka`,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'RouteWiseAI-Mangalore-Logistics/1.0',
      },
      timeout: 4000,
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formatted_address: result.display_name || trimmed,
      };
    }
  } catch (err) {
    console.warn(`[Geocoding] Nominatim lookup failed for "${trimmed}". Using Mangalore fallback generator.`);
  }

  // Attempt 3: Deterministic fallback coordinates around Mangaluru city center based on string hash
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }

  const offsetLat = ((Math.abs(hash) % 100) - 50) * 0.0015; // +/- ~1.5 km
  const offsetLng = ((Math.abs(hash * 3) % 100) - 50) * 0.0015;

  return {
    lat: Number((DEFAULT_LAT + offsetLat).toFixed(6)),
    lng: Number((DEFAULT_LNG + offsetLng).toFixed(6)),
    formatted_address: trimmed,
  };
}
