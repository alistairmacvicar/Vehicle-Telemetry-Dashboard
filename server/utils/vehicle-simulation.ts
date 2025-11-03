import { Vehicle, TelemetryData } from '../../shared/types/vehicle.ts';

const CENTER = { latitude: -34.92855422964225, longitude: 138.59985851659752 };
const RADIUS_KM = 100;
const NUM_VEHICLES = 5;
const TICK_RATE_MS = 1000;

let vehicles: Vehicle[] = [];
let timer: NodeJS.Timer | null = null;
let lastTick = Date.now();

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
	v: Vehicle,
	now: number,
	distanceKm: number,
	instLPer100km: number
) {
	const idleLph = 0.7 + rand(-0.1, 0.1);
	let litersUsed = 0;
	if (v.speedKmh < 2) {
		litersUsed = (idleLph * (DEFAULT_TICK_MS / 1000)) / 3600;
		instLPer100km = 0;
	} else {
		litersUsed = (instLPer100km * distanceKm) / 100;
	}

	v.odometerKm += Math.max(0, distanceKm);
	v.fuelLevelPct = clamp(
		v.fuelLevelPct - (litersUsed / v.tankCapacityL) * 100,
		0,
		100
	);

	const dtSec = DEFAULT_TICK_MS / 1000;
	const alpha = 1 - Math.exp(-dtSec / 60);
	const coolantTarget = 88 + clamp((v.speedKmh - 40) * 0.06, -5, 7);
	const oilTarget = 95 + clamp((v.speedKmh - 40) * 0.05, -8, 10);
	v.coolantTempC += (coolantTarget - v.coolantTempC) * alpha + rand(-0.2, 0.2);
	v.oilTempC += (oilTarget - v.oilTempC) * alpha + rand(-0.3, 0.3);
	v.coolantTempC = clamp(v.coolantTempC, 70, 100);
	v.oilTempC = clamp(v.oilTempC, 75, 115);

	const point: TelemetryData = {
		timestamp: now,
		odometer: v.odometerKm,
		fuelLevel: v.fuelLevelPct,
		fuelConsumption: instLPer100km,
		engineOilTemp: v.oilTempC,
		engineCoolantTemp: v.coolantTempC,
	};
	v.telemHistory.push(point);
	if (v.telemHistory.length > MAX_HISTORY) v.telemHistory.shift();
}

function moveAlongRoute(v: Vehicle, distanceKm: number) {
	if (v.atEnd || v.route.length < 2 || distanceKm <= 0) return;

	let i = v.segIndex;
	let offset = v.segOffsetKm;

	while (distanceKm > 0 && i < v.route.length - 1) {
		const [lng0, lat0] = v.route[i];
		const [lng1, startLatitude] = v.route[i + 1];
		const segKm = haversineKm(lat0, lng0, startLatitude, lng1);
		const remaining = segKm - offset;

		if (distanceKm < remaining) {
			offset += distanceKm;
			distanceKm = 0;
			break;
		} else {
			distanceKm -= remaining;
			offset = 0;
			i += 1;
		}
	}

	if (i >= v.route.length - 1) {
		// reached end
		const [lngEnd, latEnd] = v.route[v.route.length - 1];
		v.lat = latEnd;
		v.lng = lngEnd;
		v.heading = v.heading; // unchanged
		v.segIndex = v.route.length - 2;
		v.segOffsetKm = haversineKm(
			v.route[v.segIndex][1],
			v.route[v.segIndex][0],
			v.route[v.segIndex + 1][1],
			v.route[v.segIndex + 1][0]
		);
		v.atEnd = true;
		return;
	}

	// interpolate position on current segment
	const [lng0, lat0] = v.route[i];
	const [lng1, startLatitude] = v.route[i + 1];
	const segKm = Math.max(1e-6, haversineKm(lat0, lng0, startLatitude, lng1));
	const t = offset / segKm;

	v.lat = lat0 + (startLatitude - lat0) * t;
	v.lng = lng0 + (lng1 - lng0) * t;
	v.heading = bearingDeg(lat0, lng0, startLatitude, lng1);
	v.segIndex = i;
	v.segOffsetKm = offset;
}

function generateRandomRoute(startLatitude: number, startLongitude: number) {
	const endLatitude = CENTER.latitude + rand(-RADIUS_KM, RADIUS_KM) / 111;
	const endLongitude =
		CENTER.longitude +
		rand(-RADIUS_KM, RADIUS_KM) / (111 * Math.cos(toRad(CENTER.latitude)));

	//TODO: fix type and set as return value on this endpoint
	const route = await $fetch<LngLat[]>(`/api/directions`, {
		method: 'GET',
		query: {
			start: `${startLatitude},${startLongitude}`,
			end: `${endLatitude},${endLongitude}`,
		},
	}).catch(error);
}

function seed(count: number) {
	vehicles = Array.from({ length: count }).map((_, i) => {
		const now = Date.now();
		// start with empty route; client will set one
		const v: Vehicle = {
			id: `veh-${String(i + 1).padStart(3, '0')}`,
			name: `Vehicle ${i + 1}`,
			lat: 0,
			lng: 0,
			heading: 0,
			speedKmh: rand(20, 90),
			updatedAt: now,

			route: [],
			segIndex: 0,
			segOffsetKm: 0,
			atEnd: false,

			odometerKm: rand(5_000, 150_000),
			fuelLevelPct: rand(40, 95),
			tankCapacityL: rand(45, 70),
			consumptionBaseLPer100km: rand(5.5, 12),
			oilTempC: rand(60, 80),
			coolantTempC: rand(60, 75),

			telemHistory: [],
		};
		// initial telemetry point
		pushTelemetry(v, now, 0, 0);
		return v;
	});
}

function tick(dtSec: number) {
	for (const v of vehicles) {
		// small speed wander
		v.speedKmh = clamp(v.speedKmh + rand(-2, 2), 0, 110);

		const distanceKm = v.speedKmh * (dtSec / 3600);
		moveAlongRoute(v, distanceKm);

		if (v.atEnd) {
			const route = generateRandomRoute(v.latitude, v.longitude);
			v.setVehicleRoute(v.id, route);
		}

		// simple instantaneous consumption
		let inst =
			v.consumptionBaseLPer100km +
			0.015 * Math.pow(v.speedKmh, 1.2) +
			rand(-0.3, 0.3);
		inst = clamp(inst, 3.5, 20);

		const now = Date.now();
		pushTelemetry(v, now, distanceKm, inst);
		v.updatedAt = now;

		// if at end, stop moving (you can set a new route via API)
		if (v.atEnd) v.speedKmh = 0;
	}
}

export function startSimulation(
	count = DEFAULT_COUNT,
	tickMs = DEFAULT_TICK_MS
) {
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

export function setVehicleRoute(id: string, route: LngLat[]) {
	const v = getVehicle(id);
	if (!v || !Array.isArray(route) || route.length < 2) return false;
	v.route = route.slice();
	v.segIndex = 0;
	v.segOffsetKm = 0;
	v.atEnd = false;
	// start at route start
	const [lng, lat] = v.route[0];
	v.lng = lng;
	v.lat = lat;
	v.heading = bearingDeg(lat, lng, v.route[1][1], v.route[1][0]);
	return true;
}

export function getVehicleTelemetry(
	id: string,
	since?: number
): TelemetryData[] {
	const v = getVehicle(id);
	if (!v) return [];
	if (since == null) return v.telemHistory.slice();
	return v.telemHistory.filter((t) => t.timestamp >= since);
}
