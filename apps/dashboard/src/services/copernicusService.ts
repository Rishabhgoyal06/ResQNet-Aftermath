/**
 * Copernicus Data Space Ecosystem (CDSE) / Sentinel Hub Integration
 * Authenticates against identity.dataspace.copernicus.eu and processes real Sentinel-2 L2A multispectral imagery.
 */

const CLIENT_ID: string = (import.meta as any).env?.VITE_CDSE_CLIENT_ID || '';
const CLIENT_SECRET: string = (import.meta as any).env?.VITE_CDSE_CLIENT_SECRET || '';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Fetch OAuth2 Bearer Token from Copernicus Data Space Ecosystem
 */
export async function getCopernicusToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const res = await fetch(
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    throw new Error(`Copernicus Auth Failed (HTTP ${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 1800) * 1000;
  return cachedToken!;
}

export type SentinelPreset = 'TRUE_COLOR' | 'FALSE_COLOR' | 'NDWI_WATER';

const EVALSCRIPTS: Record<SentinelPreset, string> = {
  TRUE_COLOR: `//VERSION=3
function setup() {
  return {
    input: ["B04", "B03", "B02"],
    output: { bands: 3 }
  };
}
function evaluatePixel(samples) {
  return [samples.B04 * 2.5, samples.B03 * 2.5, samples.B02 * 2.5];
}`,

  FALSE_COLOR: `//VERSION=3
function setup() {
  return {
    input: ["B08", "B04", "B03"],
    output: { bands: 3 }
  };
}
function evaluatePixel(samples) {
  return [samples.B08 * 2.8, samples.B04 * 2.2, samples.B03 * 1.8];
}`,

  NDWI_WATER: `//VERSION=3
function setup() {
  return {
    input: ["B03", "B08"],
    output: { bands: 3 }
  };
}
function evaluatePixel(samples) {
  let ndwi = (samples.B03 - samples.B08) / (samples.B03 + samples.B08 + 0.0001);
  if (ndwi > 0.0) {
    return [0.0, 0.75, 1.0]; // Highlighted aqua-blue water
  } else {
    return [0.15, 0.18, 0.22]; // Neutral dark land background
  }
}`,
};

export interface ProcessedSentinelImage {
  imageUrl: string;
  leafletBounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  preset: SentinelPreset;
  timeRange: { from: string; to: string };
  capturedDate: string;
}

// In-memory cache for fetched tiles to avoid refetching on pan/zoom
const imageCache = new Map<string, ProcessedSentinelImage>();

/**
 * Request real Sentinel-2 L2A optical imagery from Copernicus Process API
 */
export async function fetchCopernicusSentinelImage(
  center: [number, number],
  preset: SentinelPreset = 'TRUE_COLOR',
  postDate: string = '2024-07-30',
  bboxDelta: number = 0.08
): Promise<ProcessedSentinelImage | null> {
  const [lat, lng] = center;
  const west = lng - bboxDelta;
  const east = lng + bboxDelta;
  const south = lat - bboxDelta;
  const north = lat + bboxDelta;

  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${preset}_${postDate}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  // Calculate search window: 15 days before and after event date
  const targetDate = new Date(postDate);
  const fromDate = new Date(targetDate.getTime() - 15 * 86400000).toISOString().split('T')[0] + 'T00:00:00Z';
  const toDate = new Date(targetDate.getTime() + 15 * 86400000).toISOString().split('T')[0] + 'T23:59:59Z';

  try {
    const token = await getCopernicusToken();

    const body = {
      input: {
        bounds: {
          bbox: [west, south, east, north],
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                from: fromDate,
                to: toDate,
              },
              maxCloudCoverage: 70,
            },
          },
        ],
      },
      output: {
        width: 768,
        height: 768,
        responses: [
          {
            identifier: 'default',
            format: { type: 'image/jpeg' },
          },
        ],
      },
      evalscript: EVALSCRIPTS[preset],
    };

    const response = await fetch('https://sh.dataspace.copernicus.eu/api/v1/process', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'image/jpeg',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Copernicus Process API warning (${response.status}):`, errText);
      return null;
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    const result: ProcessedSentinelImage = {
      imageUrl,
      leafletBounds: [
        [south, west],
        [north, east],
      ],
      preset,
      timeRange: { from: fromDate, to: toDate },
      capturedDate: postDate,
    };

    imageCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Failed to retrieve Copernicus Sentinel-2 image:', error);
    return null;
  }
}
