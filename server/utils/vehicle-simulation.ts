import type { Coordinates, Location } from '~~/shared/types/geo.ts';
import type { Vehicle, TelemetryData } from '~~/shared/types/vehicle.ts';
import type { Feature, FeatureCollection, GeoJsonProperties, LineString } from 'geojson';

const NUM_VEHICLES = 10; // Safe limit to avoid rate limiting on startup (~20 calls)
const TICK_RATE_MS = 2000;
const TANK_CAPACITY_L = 93;
const MAX_HISTORY = 3600;
const EMERGENCY_MIN_HOLD_MS = 30_000;
const EMERGENCY_MAX_HOLD_MS = 90_000;
const MIN_LOCAL_RANGE = 3; // Reduced from 5km
const MAX_LOCAL_RANGE = 20; // Reduced from 50km to keep routes local

export const vehicles: Vehicle[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastTick = Date.now();

type EmergencyState = { isOn: boolean; nextChangeAt: number };
const emergencyStates = new Map<string, EmergencyState>();

// API diagnostic tracking & soft queue state
const apiStats = {
  snapCoordinates: { success: 0, failed: 0, errors: new Map<string, number>() },
  directions: { success: 0, failed: 0, errors: new Map<string, number>() },
};

const API_MIN_INTERVAL_MS = 3000; // soft rate limit spacing between outbound calls (aim ~40 calls/min overall)
const MAX_API_RETRIES = 2; // light retry to mask transient network issues
let lastApiCallAt = 0;
const pendingQueue: Array<() => Promise<void>> = [];
let queueActive = false;
// Adaptive backoff state for repeated direction failures
let consecutiveDirectionsFailures = 0;
// Vehicle stuck tracking: if a vehicle can't get a valid route, keep it stationary and eventually relocate
const ROUTE_FAILURE_TIMEOUT_MS = 180_000; // 3 minutes before relocating a stuck vehicle
const vehicleStuckState = new Map<string, { failedAt: number; retryCount: number }>();

function enqueueApiWork(work: () => Promise<void>) {
  pendingQueue.push(work);
  processQueue();
}

async function processQueue() {
  if (queueActive) return;
  queueActive = true;
  while (pendingQueue.length) {
    const now = Date.now();
    // Increase spacing dynamically when we have many consecutive direction failures
    const dynamicInterval =
      API_MIN_INTERVAL_MS + Math.min(consecutiveDirectionsFailures * 1000, 7000);
    const wait = Math.max(0, dynamicInterval - (now - lastApiCallAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const task = pendingQueue.shift();
    if (!task) break;
    lastApiCallAt = Date.now();
    try {
      await task();
    } catch {
      // task itself handles logging; swallow here to keep queue flowing
    }
  }
  queueActive = false;
}

// Safely format different error shapes we may receive from $fetch / server
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function formatError(err: unknown) {
  let statusCode: number | undefined;
  let statusMessage: string | undefined;
  let message: string | undefined;
  let name: string | undefined;
  let code: string | number | undefined;

  if (err instanceof Error) {
    message = err.message;
    name = err.name;
  }

  if (isObject(err)) {
    // treat the error as a generic record to avoid `any`
    const rec = err as Record<string, unknown>;
    // common properties from FetchError / H3Error / libraries
    if (typeof rec.statusCode === 'number') statusCode = rec.statusCode as number;
    if (typeof rec.status === 'number') statusCode = rec.status as number;
    if (typeof rec.statusMessage === 'string') statusMessage = rec.statusMessage as string;
    if (typeof rec.message === 'string') message = message || (rec.message as string);
    if (typeof rec.name === 'string') name = name || (rec.name as string);
    if (typeof rec.code === 'string' || typeof rec.code === 'number')
      code = rec.code as string | number;

    // some fetch errors expose the response object
    const resp = rec.response;
    if (isObject(resp)) {
      const r = resp as Record<string, unknown>;
      if (typeof r.status === 'number') statusCode = statusCode ?? (r.status as number);
      if (typeof r.statusText === 'string')
        statusMessage = statusMessage ?? (r.statusText as string);
    }
  }

  const errorType = statusCode
    ? `HTTP ${statusCode}`
    : message || name || String(code) || 'Unknown error';
  return { errorType, statusCode, statusMessage, message, name, code };
}

function logApiError(endpoint: 'snapCoordinates' | 'directions', error: unknown, context?: string) {
  const stats = apiStats[endpoint];
  stats.failed++;
  if (endpoint === 'directions') consecutiveDirectionsFailures++;

  const info = formatError(error);
  stats.errors.set(info.errorType, (stats.errors.get(info.errorType) || 0) + 1);

  console.error(`❌ ${endpoint} failed:`, {
    ...info,
    context,
    totalFailed: stats.failed,
    errorCounts: Object.fromEntries(stats.errors),
  });
}

function logApiSuccess(endpoint: 'snapCoordinates' | 'directions', context?: string) {
  apiStats[endpoint].success++;
  if (endpoint === 'directions') consecutiveDirectionsFailures = 0; // reset on success
  console.log(`✅ ${endpoint} success:`, {
    context,
    totalSuccess: apiStats[endpoint].success,
  });
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function toRad(d: number) {
  return (d * Math.PI) / 180;
}

function haversineKm(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
) {
  const EARTH_RADIUS = 6371;
  const dLat = toRad(endLatitude - startLatitude);
  const dLon = toRad(endLongitude - startLongitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(startLatitude)) * Math.cos(toRad(endLatitude)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

function bearingDeg(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
) {
  const startLatitudeR = toRad(startLatitude),
    endLatitudeR = toRad(endLatitude);
  const dLon = toRad(endLongitude - startLongitude);
  const y = Math.sin(dLon) * Math.cos(endLatitudeR);
  const x =
    Math.cos(startLatitudeR) * Math.sin(endLatitudeR) -
    Math.sin(startLatitudeR) * Math.cos(endLatitudeR) * Math.cos(dLon);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function pushTelemetry(vehicle: Vehicle, now: number, distanceKm: number, instLPer100km: number) {
  const idleLph = 0.7 + rand(-0.1, 0.1);
  let litersUsed = 0;
  if (vehicle.currentData.speed < 2) {
    litersUsed = (idleLph * (TICK_RATE_MS / 1000)) / 3600;
    instLPer100km = 0;
  } else {
    litersUsed = (instLPer100km * distanceKm) / 100;
  }

  vehicle.currentData.odometer += Math.max(0, distanceKm);
  vehicle.currentData.fuelLevel = clamp(
    vehicle.currentData.fuelLevel - (litersUsed / TANK_CAPACITY_L) * 100,
    0,
    100,
  );

  const dtSec = TICK_RATE_MS / 1000;
  const alpha = 1 - Math.exp(-dtSec / 60);
  const coolantTarget = 88 + clamp((vehicle.currentData.speed - 40) * 0.06, -5, 7);
  const oilTarget = 95 + clamp((vehicle.currentData.speed - 40) * 0.05, -8, 10);
  vehicle.currentData.engineCoolantTemp +=
    (coolantTarget - vehicle.currentData.engineCoolantTemp) * alpha + rand(-0.2, 0.2);
  vehicle.currentData.engineOilTemp +=
    (oilTarget - vehicle.currentData.engineOilTemp) * alpha + rand(-0.3, 0.3);
  vehicle.currentData.engineCoolantTemp = clamp(vehicle.currentData.engineCoolantTemp, 70, 100);
  vehicle.currentData.engineOilTemp = clamp(vehicle.currentData.engineOilTemp, 75, 115);

  const point: TelemetryData = {
    timestamp: now,
    odometer: vehicle.currentData.odometer,
    fuelLevel: vehicle.currentData.fuelLevel,
    fuelConsumption: instLPer100km,
    engineOilTemp: vehicle.currentData.engineOilTemp,
    engineCoolantTemp: vehicle.currentData.engineCoolantTemp,
    emergencyLights: vehicle.currentData.emergencyLights,
  };
  vehicle.historicalData.push(point);
  if (vehicle.historicalData.length > MAX_HISTORY) vehicle.historicalData.shift();
}

function getRouteCoordinates(geoJSON: FeatureCollection<LineString>): Coordinates[] {
  const coords = geoJSON?.features?.[0]?.geometry?.coordinates as Coordinates[] | undefined;
  return Array.isArray(coords) ? coords : [];
}

function buildSpeedProfileFromRoute(geoJSON: FeatureCollection<LineString>) {
  const feature = geoJSON?.features?.[0] as Feature;
  const properties = feature?.properties as GeoJsonProperties;
  // geojson segments aren't strongly typed
  function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
    return Array.isArray(value) && value.every((v) => isObject(v));
  }

  const segments = isArrayOfObjects(properties?.segments) ? properties.segments : undefined;
  const profile: Array<{ from: number; to: number; speedKmh: number }> = [];

  if (Array.isArray(segments)) {
    for (const segment of segments) {
      const steps = segment?.steps as unknown;
      if (!Array.isArray(steps)) continue;
      for (const step of steps) {
        const wayPoints = step?.way_points as [number, number] | undefined;
        const distanceM = Number(step?.distance) || 0;
        const durationS = Number(step?.duration) || 0;
        if (Array.isArray(wayPoints) && wayPoints.length === 2 && wayPoints[1] > wayPoints[0]) {
          const rawSpeed = durationS > 0 ? (3.6 * distanceM) / durationS : 0;
          const speedKmh = clamp(rawSpeed || 0, 5, 120);
          profile.push({ from: wayPoints[0], to: wayPoints[1], speedKmh });
        }
      }
    }
  }

  if (profile.length === 0) {
    const coords = getRouteCoordinates(geoJSON);
    if (coords.length >= 2) {
      profile.push({ from: 0, to: coords.length - 1, speedKmh: 50 });
    }
  }

  return profile;
}

function classifyAdelaideSpeedLimit(rawKmh: number) {
  if (rawKmh >= 90) return 100;
  if (rawKmh >= 75) return 80;
  if (rawKmh >= 58) return 60;
  return 50;
}

function minMovingFloorFor(limitKmh: number) {
  if (limitKmh >= 100) return 30;
  if (limitKmh >= 80) return 30;
  if (limitKmh >= 60) return 20;
  return 10;
}

function moveAlongRoute(vehicle: Vehicle, distance: number) {
  const coords = getRouteCoordinates(vehicle.route.geoJSON);
  const routeLength = coords.length;
  if (vehicle.route.atEnd || routeLength < 2 || distance <= 0) return;

  let i = vehicle.route.segIndex;
  let offset = vehicle.route.segOffset;

  while (distance > 0 && i < routeLength - 1) {
    const [lng0, lat0] = coords[i];
    const [lng1, lat1] = coords[i + 1];
    const segKm = haversineKm(lat0, lng0, lat1, lng1);
    const remaining = segKm - offset;

    if (distance < remaining) {
      offset += distance;
      distance = 0;
      break;
    } else {
      distance -= remaining;
      offset = 0;
      i += 1;
    }
  }

  if (i >= routeLength - 1) {
    // reached end
    const [endLongitude, endLatitude] = coords[routeLength - 1];
    vehicle.currentData.latitude = endLatitude;
    vehicle.currentData.longitude = endLongitude;
    // preserve route; mark indices at end of final segment
    vehicle.route.segIndex = Math.max(0, routeLength - 2);
    vehicle.route.segOffset = haversineKm(
      coords[vehicle.route.segIndex][1],
      coords[vehicle.route.segIndex][0],
      coords[vehicle.route.segIndex + 1][1],
      coords[vehicle.route.segIndex + 1][0],
    );
    vehicle.route.atEnd = true;
    return;
  }

  // interpolate position on current segment
  const [lng0, lat0] = coords[i];
  const [lng1, lat1] = coords[i + 1];
  const segKm = Math.max(1e-6, haversineKm(lat0, lng0, lat1, lng1));
  const t = offset / segKm;

  vehicle.currentData.latitude = lat0 + (lat1 - lat0) * t;
  vehicle.currentData.longitude = lng0 + (lng1 - lng0) * t;
  vehicle.currentData.heading = bearingDeg(lat0, lng0, lat1, lng1);
  // Persist segment tracking relative to full route
  vehicle.route.segIndex = i;
  vehicle.route.segOffset = offset;
}

async function generateRandomRoute({
  longitude: startLongitude,
  latitude: startLatitude,
}: Location): Promise<{ geoJSON: FeatureCollection<LineString> } | null> {
  const startLoc = { longitude: startLongitude, latitude: startLatitude };

  // Wrap API call with retry - if all retries fail, return null (vehicle stays stationary)
  for (let attempt = 0; attempt <= MAX_API_RETRIES; attempt++) {
    // pick an end point near the start (keep routes short and local), pass attempt for dynamic radius reduction
    const { longitude: endLongitude, latitude: endLatitude } = await generateNearbyCoordinates(
      startLoc,
      MIN_LOCAL_RANGE,
      MAX_LOCAL_RANGE,
      attempt,
    );

    try {
      const result = await $fetch(`/api/route/directions`, {
        method: 'GET',
        query: {
          start: `${startLongitude},${startLatitude}`,
          end: `${endLongitude},${endLatitude}`,
        },
      });
      const finalGeo = result as FeatureCollection<LineString>;
      logApiSuccess(
        'directions',
        `(${startLatitude.toFixed(5)}, ${startLongitude.toFixed(5)}) → (${endLatitude.toFixed(5)}, ${endLongitude.toFixed(5)}) attempt ${attempt + 1}`,
      );
      console.log(
        `Generated route from (${startLatitude.toFixed(5)}, ${startLongitude.toFixed(5)}) to (${endLatitude.toFixed(5)}, ${endLongitude.toFixed(5)}) with ${getRouteCoordinates(finalGeo).length} points.`,
      );
      return { geoJSON: finalGeo };
    } catch (error: unknown) {
      logApiError(
        'directions',
        error,
        `start: (${startLatitude.toFixed(5)}, ${startLongitude.toFixed(5)}), end: (${endLatitude.toFixed(5)}, ${endLongitude.toFixed(5)}), attempt ${attempt + 1}`,
      );
      // If all retries exhausted, return null (vehicle will stay stationary)
      if (attempt === MAX_API_RETRIES) {
        console.warn(
          `❌ All ${MAX_API_RETRIES + 1} route generation attempts failed for vehicle at (${startLatitude.toFixed(5)}, ${startLongitude.toFixed(5)}). Vehicle will remain stationary.`,
        );
        return null;
      }
    }
  }

  return null;
}

// Regional ambulance stations across South Australia (verified road locations)
const REGIONAL_STATIONS: Location[] = [
  // Adelaide Metro
  { longitude: 138.6007, latitude: -34.92866 }, // Adelaide CBD - King William St
  { longitude: 138.62376, latitude: -34.92118 }, // North Adelaide - O'Connell St
  { longitude: 138.59851, latitude: -34.94668 }, // South Adelaide - Unley Rd
  { longitude: 138.58195, latitude: -34.90495 }, // West Adelaide - Port Rd
  { longitude: 138.63501, latitude: -34.93845 }, // East Adelaide - Magill Rd

  // Hills & Regional
  { longitude: 138.76234, latitude: -34.96389 }, // Mount Barker
  { longitude: 139.07483, latitude: -35.11949 }, // Murray Bridge
  { longitude: 138.52105, latitude: -34.83611 }, // Gawler
  { longitude: 138.73442, latitude: -34.72553 }, // Elizabeth

  // South Coast
  { longitude: 138.51859, latitude: -35.4697 }, // Victor Harbor
  { longitude: 138.68737, latitude: -35.55326 }, // Goolwa

  // North & Outback
  { longitude: 138.6018, latitude: -34.72998 }, // Salisbury
  { longitude: 137.77556, latitude: -32.49268 }, // Port Augusta
  { longitude: 137.20869, latitude: -31.51997 }, // Port Pirie
  { longitude: 135.85658, latitude: -31.57719 }, // Whyalla

  // Barossa & Mid North
  { longitude: 138.59167, latitude: -34.45 }, // Tanunda (Barossa)
  { longitude: 138.83833, latitude: -34.11667 }, // Clare

  // Fleurieu Peninsula
  { longitude: 138.40833, latitude: -35.16667 }, // McLaren Vale
  { longitude: 138.28333, latitude: -35.61667 }, // Yankalilla
];

// Fallback locations when snap fails (Adelaide metro only, for safety)
const FALLBACK_LOCATIONS: Location[] = REGIONAL_STATIONS.slice(0, 5);

async function generateNearbyCoordinates(
  base: Location,
  minKm = 3,
  maxKm = 12,
  attemptNum = 0,
): Promise<Location> {
  // Dynamically reduce maxKm on repeated failures to increase chances of valid snap
  const finalMaxKm = Math.max(minKm + 1, maxKm - attemptNum * 2);

  // Prefer local fallbacks within the same region to avoid long cross-region routes
  const pickLocalFallback = (radiusKm = 30): Location => {
    const nearby = REGIONAL_STATIONS.filter((loc) => {
      const d = haversineKm(base.latitude, base.longitude, loc.latitude, loc.longitude);
      return d >= minKm && d <= radiusKm;
    });
    if (nearby.length > 0) {
      return nearby[Math.floor(Math.random() * nearby.length)];
    }
    // As a last resort, return the base itself (the caller will generate a short route from here)
    return base;
  };
  const deltaKm = rand(minKm, finalMaxKm);
  const bearing = rand(0, 2 * Math.PI);
  // approximate: convert local km offset to degrees around the base latitude
  const dLat = (deltaKm * Math.cos(bearing)) / 111;
  const dLon = (deltaKm * Math.sin(bearing)) / (111 * Math.cos(toRad(base.latitude)));
  const candidate: Location = {
    longitude: base.longitude + dLon,
    latitude: base.latitude + dLat,
  };

  // try to snap; if snapping fails, pick a different known-good location
  try {
    const response = await $fetch<Coordinates>(`/api/route/snap-coordinates`, {
      method: 'GET',
      query: {
        longitude: candidate.longitude,
        latitude: candidate.latitude,
      },
    });
    const snapped: Location = { longitude: response[0], latitude: response[1] };
    // if snapping jumped too far from the base (> 1.8x target max radius), reject it
    const dist = haversineKm(base.latitude, base.longitude, snapped.latitude, snapped.longitude);
    if (dist <= finalMaxKm * 1.8) {
      logApiSuccess(
        'snapCoordinates',
        `nearby: (${candidate.latitude.toFixed(5)}, ${candidate.longitude.toFixed(5)}) → (${snapped.latitude.toFixed(5)}, ${snapped.longitude.toFixed(5)})`,
      );
      return snapped;
    }
    console.warn(
      `Snap jumped too far: ${dist.toFixed(2)}km > ${(finalMaxKm * 1.8).toFixed(2)}km, using fallback`,
    );
    // Return a local known-good location within the same region when possible
    return pickLocalFallback();
  } catch (error) {
    logApiError(
      'snapCoordinates',
      error,
      `nearby coords from base (${base.latitude.toFixed(5)}, ${base.longitude.toFixed(5)}), candidate: (${candidate.latitude.toFixed(5)}, ${candidate.longitude.toFixed(5)})`,
    );
    // Prefer a local fallback within ~30km of the base to avoid cross-region requests
    return pickLocalFallback();
  }
}

async function seed(count: number) {
  // Distribute vehicles across regions (round-robin to ensure spread)
  const totalStations = REGIONAL_STATIONS.length;

  console.log(`🚑 Initializing ${count} vehicles sequentially to respect API rate limits...`);

  for (let i = 0; i < count; i++) {
    const now = Date.now();

    const vehicle: Vehicle = {
      id: `amb-${String(i + 1).padStart(3, '0')}`,
      name: `Vehicle ${i + 1}`,
      historicalData: [],
      currentData: {
        timestamp: now,
        odometer: rand(5_000, 150_000),
        fuelLevel: rand(40, 95),
        fuelConsumption: rand(5.5, 12),
        engineOilTemp: rand(60, 80),
        engineCoolantTemp: rand(60, 75),
        emergencyLights: false,
        latitude: 0,
        longitude: 0,
        heading: 0,
        speed: rand(10, 60),
      },
      route: {
        geoJSON: {
          type: 'FeatureCollection',
          features: [],
        } as FeatureCollection<LineString>,
        segIndex: 0,
        segOffset: 0,
        atEnd: false,
      },
    };

    // Assign vehicle to a regional station (distributes evenly across SA)
    const stationIndex = i % totalStations;
    const station = REGIONAL_STATIONS[stationIndex];
    vehicle.currentData.longitude = station.longitude;
    vehicle.currentData.latitude = station.latitude;

    console.log(
      `vehicle: ${vehicle.id} assigned to station ${stationIndex + 1}/${totalStations} at (${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)})`,
    );

    // Queue route generation to avoid burst at startup
    enqueueApiWork(async () => {
      const result = await generateRandomRoute({
        longitude: vehicle.currentData.longitude,
        latitude: vehicle.currentData.latitude,
      });
      if (result) {
        setVehicleRoute(vehicle.id, result.geoJSON);
      } else {
        // Mark vehicle as stuck if route generation failed
        vehicleStuckState.set(vehicle.id, {
          failedAt: Date.now(),
          retryCount: 0,
        });
        console.warn(`⚠️ Vehicle ${vehicle.id} could not generate initial route. Will retry.`);
      }
    });
    pushTelemetry(vehicle, now, 0, 0);
    vehicles.push(vehicle);

    // initialize emergency lights state
    emergencyStates.set(vehicle.id, {
      isOn: false,
      nextChangeAt: now + Math.floor(rand(EMERGENCY_MIN_HOLD_MS, EMERGENCY_MAX_HOLD_MS)),
    });
  }

  console.log(`🎉 All ${count} vehicles initialized successfully across SA regions`);
}

async function tick(dtSec: number) {
  for (const vehicle of vehicles) {
    // determine target speed for current route segment if available
    let targetSpeed = 50;
    const profile = vehicle.route.speedProfile;
    if (Array.isArray(profile) && profile.length > 0) {
      const segIdx = vehicle.route.segIndex;
      const match = profile.find((p) => segIdx >= p.from && segIdx < p.to);
      if (match) targetSpeed = match.speedKmh;
    }

    // Quantize to Adelaide defaults and apply jitter/floors (avoid 0 on fast roads)
    const limit = classifyAdelaideSpeedLimit(targetSpeed);
    const jittered = clamp(limit + rand(-4, 4), 0, 110);
    const floor = minMovingFloorFor(limit);
    const current = vehicle.currentData.speed;
    const desired = Math.max(jittered, floor);
    // limit acceleration/deceleration per tick (approx 12 km/h per 2s)
    const maxDelta = 12 * (dtSec / 2);
    const delta = clamp(desired - current, -maxDelta, maxDelta);
    vehicle.currentData.speed = clamp(current + delta, 0, 110);

    // emergency lights state machine with hold times to avoid flicker
    {
      const now = Date.now();
      let state = emergencyStates.get(vehicle.id);
      if (!state) {
        state = {
          isOn: false,
          nextChangeAt: now + Math.floor(rand(EMERGENCY_MIN_HOLD_MS, EMERGENCY_MAX_HOLD_MS)),
        };
        emergencyStates.set(vehicle.id, state);
      }
      if (now >= state.nextChangeAt) {
        // 20% chance to toggle when window elapses; otherwise retry soon
        if (Math.random() < 0.2) {
          state.isOn = !state.isOn;
          state.nextChangeAt = now + Math.floor(rand(EMERGENCY_MIN_HOLD_MS, EMERGENCY_MAX_HOLD_MS));
        } else {
          state.nextChangeAt = now + 5_000;
        }
      }
      vehicle.currentData.emergencyLights = state.isOn;
    }

    // If the route is invalid, trigger regeneration on this tick
    {
      const coords = getRouteCoordinates(vehicle.route.geoJSON);
      if (coords.length < 2) {
        vehicle.route.atEnd = true;
      }
    }

    const distance = vehicle.currentData.speed * (dtSec / 3600);
    moveAlongRoute(vehicle, distance);

    if (vehicle.route.atEnd) {
      // Check if vehicle is stuck and needs relocation
      const stuckState = vehicleStuckState.get(vehicle.id);
      if (stuckState) {
        const timeSinceFailure = Date.now() - stuckState.failedAt;
        if (timeSinceFailure >= ROUTE_FAILURE_TIMEOUT_MS) {
          // Relocate vehicle to a random metro station
          const newStation =
            FALLBACK_LOCATIONS[Math.floor(Math.random() * FALLBACK_LOCATIONS.length)];
          vehicle.currentData.latitude = newStation.latitude;
          vehicle.currentData.longitude = newStation.longitude;
          vehicle.currentData.speed = 0;
          vehicleStuckState.delete(vehicle.id);
          console.log(
            `🚁 Vehicle ${vehicle.id} relocated to metro station (${newStation.latitude.toFixed(5)}, ${newStation.longitude.toFixed(5)}) after ${(timeSinceFailure / 1000).toFixed(0)}s stuck`,
          );
        }
      }

      // Try to generate new route with backoff
      const retryDelayMs = 8_000;
      const nowTime = Date.now();
      const nextAttemptAt = vehicle.nextRouteGenAt;
      if (nextAttemptAt && nowTime < nextAttemptAt) {
        // defer until nextAttemptAt, keep vehicle stationary
        vehicle.currentData.speed = 0;
      } else {
        vehicle.nextRouteGenAt = nowTime + retryDelayMs;
        enqueueApiWork(async () => {
          const result = await generateRandomRoute({
            longitude: vehicle.currentData.longitude,
            latitude: vehicle.currentData.latitude,
          });
          if (result) {
            setVehicleRoute(vehicle.id, result.geoJSON);
            vehicleStuckState.delete(vehicle.id); // Clear stuck state on success
            console.log(`✅ Vehicle ${vehicle.id} successfully generated new route`);
            // Clear scheduled attempt once successful
            vehicle.nextRouteGenAt = undefined;
          } else {
            // Track failure
            const existing = vehicleStuckState.get(vehicle.id);
            if (existing) {
              existing.retryCount++;
            } else {
              vehicleStuckState.set(vehicle.id, {
                failedAt: nowTime,
                retryCount: 1,
              });
            }
            console.warn(
              `⚠️ Vehicle ${vehicle.id} route generation failed. Retry count: ${vehicleStuckState.get(vehicle.id)?.retryCount || 0}`,
            );
          }
        });
      }
    }

    let inst =
      vehicle.currentData.fuelConsumption +
      0.015 * Math.pow(vehicle.currentData.speed, 1.2) +
      rand(-0.3, 0.3);
    inst = clamp(inst, 3.5, 20);

    const now = Date.now();
    pushTelemetry(vehicle, now, distance, inst);
    vehicle.currentData.timestamp = now;

    if (vehicle.route.atEnd) vehicle.currentData.speed = 0;

    // logging disabled to reduce server overhead per tick
  }
}

function printApiStats() {
  console.log('\n📊 API Statistics Summary:');
  console.log('  Snap Coordinates:', {
    success: apiStats.snapCoordinates.success,
    failed: apiStats.snapCoordinates.failed,
    successRate:
      apiStats.snapCoordinates.success + apiStats.snapCoordinates.failed > 0
        ? `${((apiStats.snapCoordinates.success / (apiStats.snapCoordinates.success + apiStats.snapCoordinates.failed)) * 100).toFixed(1)}%`
        : 'N/A',
    errors: Object.fromEntries(apiStats.snapCoordinates.errors),
  });
  console.log('  Directions:', {
    success: apiStats.directions.success,
    failed: apiStats.directions.failed,
    successRate:
      apiStats.directions.success + apiStats.directions.failed > 0
        ? `${((apiStats.directions.success / (apiStats.directions.success + apiStats.directions.failed)) * 100).toFixed(1)}%`
        : 'N/A',
    errors: Object.fromEntries(apiStats.directions.errors),
  });
  console.log('');
}

export function startSimulation(count = NUM_VEHICLES, tickMs = TICK_RATE_MS) {
  if (timer) return;
  seed(count);
  lastTick = Date.now();
  timer = setInterval(() => {
    const now = Date.now();
    const dtSec = (now - lastTick) / 1000;
    lastTick = now;
    tick(dtSec);
  }, tickMs);

  // Print API stats every 2 minutes
  setInterval(printApiStats, 120_000);
}

export function stopSimulation() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function getVehicles(): Vehicle[] {
  return vehicles.slice();
}
export function getVehicle(id: string): Vehicle | undefined {
  return vehicles.find((v) => v.id === id);
}

export function setVehicleRoute(id: string, geoJSON: FeatureCollection<LineString>) {
  const vehicle = getVehicle(id);
  if (!vehicle) return false;
  const coords = getRouteCoordinates(geoJSON);
  if (!Array.isArray(coords) || coords.length < 2) return false;
  vehicle.route.geoJSON = geoJSON;
  vehicle.route.speedProfile = buildSpeedProfileFromRoute(geoJSON);
  vehicle.route.segIndex = 0;
  vehicle.route.segOffset = 0;
  vehicle.route.atEnd = false;
  // start at route start
  const [longitude, latitude] = coords[0];
  vehicle.currentData.longitude = longitude;
  vehicle.currentData.latitude = latitude;
  vehicle.currentData.heading = bearingDeg(latitude, longitude, coords[1][1], coords[1][0]);
  return true;
}

export function getVehicleTelemetry(id: string, since?: number): TelemetryData[] {
  const vehicle = getVehicle(id);
  if (!vehicle) return [];
  if (since == null) return vehicle.historicalData.slice();
  return vehicle.historicalData.filter((t) => t.timestamp >= since);
}
