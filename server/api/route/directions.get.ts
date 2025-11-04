import { z } from 'zod';
import env from '~/lib/env';
import type { Coordinates } from '~~/shared/types/geo.ts';

const QuerySchema = z.object({
	start: z.string(),
	end: z.string(),
});

type ORSResponse = {
	type: 'FeatureCollection';
	features: Array<{
		type: 'Feature';
		geometry: { type: 'LineString'; coordinates: Coordinates[] };
	}>;
};

const URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

export default defineEventHandler(async (event) => {
	const query = await getValidatedQuery(event, QuerySchema.safeParse);

	if (!query.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Query Parameters',
		});
	}

	const { start, end } = query.data;

	let result: ORSResponse;

	try {
		result = await $fetch<ORSResponse>(URL, {
			method: 'GET',
			query: {
				api_key: env.ORS_API_KEY,
				start,
				end,
			},
		});
	} catch (error) {
		console.log(error);
		throw createError({ statusCode: 502, statusMessage: 'Upstream error' });
	}

	const coordinates = result?.features?.[0]?.geometry?.coordinates?.length;

	if (!Array.isArray(coordinates) || coordinates.length < 2) {
		throw createError({
			statusCode: 502,
			statusMessage: 'No route found',
		});
	}

	return coordinates as Coordinates[];
});
