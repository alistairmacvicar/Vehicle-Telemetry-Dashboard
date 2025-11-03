import { z } from 'zod';
import env from '~/lib/env';

const QuerySchema = z.object({
	start: z.string(),
	end: z.string(),
});

const URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

export default defineEventHandler(async (event) => {
	const query = await getValidatedQuery(event, QuerySchema.safeParse);
	console.log(query);

	if (!query.success) {
		setResponseStatus(event, 400, 'Invalid Query Parameters');
	}

	const { start, end } = query.data;

	return await $fetch(URL, {
		method: 'GET',
		query: {
			api_key: env.ORS_API_KEY,
			start,
			end,
		},
	});
});
