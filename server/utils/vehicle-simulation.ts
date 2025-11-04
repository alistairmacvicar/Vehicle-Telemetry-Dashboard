import type { Coordinates, Location } from '~~/shared/types/geo.ts';
import type { Vehicle, TelemetryData } from '~~/shared/types/vehicle.ts';
import type { FeatureCollection, LineString } from 'geojson';

const CENTER = { latitude: -34.92855422964225, longitude: 138.59985851659752 };
const RADIUS_KM = 90;
const NUM_VEHICLES = 2;
const TICK_RATE_MS = 1000;
const TANK_CAPACITY_L = 93;
const MAX_HISTORY = 3600;
const EMERGENCY_MIN_HOLD_MS = 20_000;
const EMERGENCY_MAX_HOLD_MS = 60_000;
const MIN_LOCAL_RANGE = 5;
const MAX_LOCAL_RANGE = 50;
export const vehicles: Vehicle[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastTick = Date.now();

type EmergencyState = { isOn: boolean; nextChangeAt: number };
const emergencyStates = new Map<string, EmergencyState>();

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
	endLongitude: number
) {
	const EARTH_RADIUS = 6371;
	const dLat = toRad(endLatitude - startLatitude);
	const dLon = toRad(endLongitude - startLongitude);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(startLatitude)) *
			Math.cos(toRad(endLatitude)) *
			Math.sin(dLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return EARTH_RADIUS * c;
}

function bearingDeg(
	startLatitude: number,
	startLongitude: number,
	endLatitude: number,
	endLongitude: number
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

function pushTelemetry(
	vehicle: Vehicle,
	now: number,
	distanceKm: number,
	instLPer100km: number
) {
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
		100
	);

	const dtSec = TICK_RATE_MS / 1000;
	const alpha = 1 - Math.exp(-dtSec / 60);
	const coolantTarget =
		88 + clamp((vehicle.currentData.speed - 40) * 0.06, -5, 7);
	const oilTarget = 95 + clamp((vehicle.currentData.speed - 40) * 0.05, -8, 10);
	vehicle.currentData.engineCoolantTemp +=
		(coolantTarget - vehicle.currentData.engineCoolantTemp) * alpha +
		rand(-0.2, 0.2);
	vehicle.currentData.engineOilTemp +=
		(oilTarget - vehicle.currentData.engineOilTemp) * alpha + rand(-0.3, 0.3);
	vehicle.currentData.engineCoolantTemp = clamp(
		vehicle.currentData.engineCoolantTemp,
		70,
		100
	);
	vehicle.currentData.engineOilTemp = clamp(
		vehicle.currentData.engineOilTemp,
		75,
		115
	);

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
	if (vehicle.historicalData.length > MAX_HISTORY)
		vehicle.historicalData.shift();
}

function getRouteCoordinates(
	geoJSON: FeatureCollection<LineString>
): Coordinates[] {
	const coords = geoJSON?.features?.[0]?.geometry?.coordinates as
		| Coordinates[]
		| undefined;
	return Array.isArray(coords) ? coords : [];
}

//

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
			coords[vehicle.route.segIndex + 1][0]
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
}: Location) {
    // pick an end point near the start (keep routes short and local)
    const { longitude: endLongitude, latitude: endLatitude } =
        await generateNearbyCoordinates({ longitude: startLongitude, latitude: startLatitude }, MIN_LOCAL_RANGE, MAX_LOCAL_RANGE);

	let geoJSON: FeatureCollection<LineString> = {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [[startLongitude, startLatitude]],
				},
				properties: {},
			},
		],
	};

	try {
		const result = await $fetch(`/api/route/directions`, {
			method: 'GET',
			query: {
				start: `${startLongitude},${startLatitude}`,
				end: `${endLongitude},${endLatitude}`,
			},
		});

		geoJSON = result as FeatureCollection<LineString>;

		console.log(
			`Generated route from (${startLatitude.toFixed(5)}, ${startLongitude.toFixed(5)}) to (${endLatitude.toFixed(5)}, ${endLongitude.toFixed(5)}) with ${getRouteCoordinates(geoJSON).length} points.`
		);
	} catch {
		return { geoJSON };
	}

	return { geoJSON };
}

async function generateRandomCoordinates(): Promise<Location> {
	const longitude =
		CENTER.longitude +
		rand(-RADIUS_KM, RADIUS_KM) / (111 * Math.cos(toRad(CENTER.latitude)));
	const latitude = CENTER.latitude + rand(-RADIUS_KM, RADIUS_KM) / 111;

	let coordinates: Location = {
		longitude: 138.59436535241255,
		latitude: -34.928272750293466,
	}; //Adelaide CBD

	try {
		const response = await $fetch<Coordinates>(`/api/route/snap-coordinates`, {
			method: 'GET',
			query: {
				longitude: longitude,
				latitude: latitude,
			},
		});

		coordinates = { longitude: response[0], latitude: response[1] };
	} catch {
		return coordinates;
	}

	return coordinates;
}

async function generateNearbyCoordinates(
    base: Location,
    minKm = 3,
    maxKm = 12
): Promise<Location> {
    const deltaKm = rand(minKm, maxKm);
    const bearing = rand(0, 2 * Math.PI);
    // approximate: convert local km offset to degrees around the base latitude
    const dLat = (deltaKm * Math.cos(bearing)) / 111;
    const dLon = (deltaKm * Math.sin(bearing)) / (111 * Math.cos(toRad(base.latitude)));
    const candidate: Location = {
        longitude: base.longitude + dLon,
        latitude: base.latitude + dLat,
    };

    // try to snap; if snapping fails, use candidate
    try {
        const response = await $fetch<Coordinates>(`/api/route/snap-coordinates`, {
            method: 'GET',
            query: {
                longitude: candidate.longitude,
                latitude: candidate.latitude,
            },
        });
        const snapped: Location = { longitude: response[0], latitude: response[1] };
        // if snapping jumped too far from the base (> 1.8x target max radius), keep the candidate instead
        const dist = haversineKm(base.latitude, base.longitude, snapped.latitude, snapped.longitude);
        if (dist <= maxKm * 1.8) return snapped;
        return candidate;
    } catch {
        return candidate;
    }
}

async function seed(count: number) {
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
		const { longitude, latitude } = await generateRandomCoordinates();
		vehicle.currentData.longitude = longitude;
		vehicle.currentData.latitude = latitude;
		console.log(`vehicle: ${vehicle.id} route generation started`);
		const { geoJSON } = await generateRandomRoute({
			longitude: vehicle.currentData.longitude,
			latitude: vehicle.currentData.latitude,
		});

		setVehicleRoute(vehicle.id, geoJSON);
		pushTelemetry(vehicle, now, 0, 0);
		vehicles.push(vehicle);

		// initialize emergency lights state
		emergencyStates.set(vehicle.id, {
			isOn: false,
			nextChangeAt: now + Math.floor(rand(EMERGENCY_MIN_HOLD_MS, EMERGENCY_MAX_HOLD_MS)),
		});
	}
}

async function tick(dtSec: number) {
	for (const vehicle of vehicles) {
		// small speed wander
		vehicle.currentData.speed = clamp(
			vehicle.currentData.speed + rand(-2, 2),
			0,
			60
		);

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
					state.nextChangeAt = now + Math.floor(
						rand(EMERGENCY_MIN_HOLD_MS, EMERGENCY_MAX_HOLD_MS)
					);
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
			const { geoJSON } = await generateRandomRoute({
				longitude: vehicle.currentData.longitude,
				latitude: vehicle.currentData.latitude,
			});

			setVehicleRoute(vehicle.id, geoJSON);
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

		console.log(
			`[${vehicle.id}] Pos: (${vehicle.currentData.latitude.toFixed(
				5
			)}, ${vehicle.currentData.longitude.toFixed(5)}) Speed: ${vehicle.currentData.speed.toFixed(
				1
			)} km/h Fuel: ${vehicle.currentData.fuelLevel.toFixed(1)}%`
		);
	}
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

export function setVehicleRoute(
	id: string,
	geoJSON: FeatureCollection<LineString>
) {
	const vehicle = getVehicle(id);
	if (!vehicle) return false;
	const coords = getRouteCoordinates(geoJSON);
	if (!Array.isArray(coords) || coords.length < 2) return false;
	vehicle.route.geoJSON = geoJSON;
	vehicle.route.segIndex = 0;
	vehicle.route.segOffset = 0;
	vehicle.route.atEnd = false;
	// start at route start
	const [longitude, latitude] = coords[0];
	vehicle.currentData.longitude = longitude;
	vehicle.currentData.latitude = latitude;
	vehicle.currentData.heading = bearingDeg(
		latitude,
		longitude,
		coords[1][1],
		coords[1][0]
	);
	return true;
}

export function getVehicleTelemetry(
	id: string,
	since?: number
): TelemetryData[] {
	const vehicle = getVehicle(id);
	if (!vehicle) return [];
	if (since == null) return vehicle.historicalData.slice();
	return vehicle.historicalData.filter((t) => t.timestamp >= since);
}
