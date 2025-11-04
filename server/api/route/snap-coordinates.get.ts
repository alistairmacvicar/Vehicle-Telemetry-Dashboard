import { z } from 'zod';
import env from '~/lib/env';
import type { Coordinates } from '~~/shared/types/geo.ts';

const QuerySchema = z.object({
	longitude: z.string(),
	latitude: z.string(),
});

type ORSResponse = {
	locations: [
		{
			location: Coordinates;
		},
	];
};

const URL = 'https://api.openrouteservice.org/v2/snap/driving-car';

export default defineEventHandler(async (event) => {
	const query = await getValidatedQuery(event, QuerySchema.safeParse);

	if (!query.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Query Parameters',
		});
	}

	const { longitude, latitude } = query.data;

	let result: ORSResponse;

	try {
		result = await $fetch<ORSResponse>(URL, {
			method: 'POST',
			headers: {
				Authorization: env.ORS_API_KEY,
			},
			body: {
				locations: [[longitude, latitude]],
				radius: 350,
			},
		});
	} catch (error) {
		console.log(error);
		throw createError({ statusCode: 502, statusMessage: 'Upstream error' });
	}

	const coordinates = result?.locations?.[0]?.location;

	if (!Array.isArray(coordinates) || coordinates.length < 2) {
		throw createError({
			statusCode: 502,
			statusMessage: 'No route found',
		});
	}

	return coordinates as Coordinates;
});
