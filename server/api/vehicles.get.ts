import { z } from 'zod';
import { vehicles } from '~~/server/utils/vehicle-simulation';
import type { FeatureCollection, LineString } from 'geojson';
import type { Vehicle } from '~~/shared/types/vehicle';

function getRouteCoordinates(geoJSON: FeatureCollection<LineString>) {
    const coords = geoJSON?.features?.[0]?.geometry?.coordinates as
        | [number, number][]
        | undefined;
    return Array.isArray(coords) ? coords : [];
}

function buildRemainingGeoJSON(v: Vehicle): FeatureCollection<LineString> {
    const full = v.route.geoJSON;
    const coords = getRouteCoordinates(full);
    if (v.route.atEnd || coords.length < 2) {
        return { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString>;
    }
    const i = Math.min(Math.max(0, v.route.segIndex), coords.length - 2);
    const current: [number, number] = [v.currentData.longitude, v.currentData.latitude];
    const remaining: [number, number][] = [current, ...coords.slice(i + 1)];
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: remaining },
                properties: {},
            },
        ],
    } as FeatureCollection<LineString>;
}

const QuerySchema = z.object({
	id: z.string(),
});

export default defineEventHandler(async (event) => {
	const query = await getValidatedQuery(event, QuerySchema.safeParse);

	if (!query.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Query Parameters',
		});
	}

	const { id } = query.data;

    if (id === 'all') {
        return vehicles.map((v) => ({
            ...v,
            route: {
                ...v.route,
                // send only remaining path to the client
                geoJSON: buildRemainingGeoJSON(v),
            },
        }));
    }

	const vehicle = vehicles.find((v) => v.id === id);

	if (!vehicle) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Vehicle Not Found',
		});
	}
    return {
        ...vehicle,
        route: {
            ...vehicle.route,
            geoJSON: buildRemainingGeoJSON(vehicle),
        },
    };
});
