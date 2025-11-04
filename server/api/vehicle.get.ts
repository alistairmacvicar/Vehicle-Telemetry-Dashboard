import { z } from 'zod';
import { vehicles } from '~~/server/utils/vehicle-simulation';

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
		return vehicles;
	}

	const vehicle = vehicles.find((v) => v.id === id);

	if (!vehicle) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Vehicle Not Found',
		});
	}
	return vehicle;
});
