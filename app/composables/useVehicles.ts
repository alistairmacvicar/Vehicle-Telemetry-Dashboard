import type { Vehicle } from '~~/shared/types/vehicle';

export function useVehicles() {
	const key = 'vehicles-list';

	const { data: vehicles } = useFetch<Vehicle[]>('/api/vehicles', {
		method: 'GET',
		query: { id: 'all' },
		key,
	});

	const polling = useState<boolean>('vehiclesPolling', () => false);
	const timer = useState<ReturnType<typeof setInterval> | null>(
		'vehiclesPollingTimer',
		() => null
	);

	function startPolling(intervalMs = 1000) {
		// Ensure timers are only created on the client
		if (import.meta.server) return;
		if (polling.value) return;
		polling.value = true;
		timer.value = setInterval(() => {
			refreshNuxtData(key);
		}, intervalMs);
	}

	function stopPolling() {
		if (timer.value) {
			clearInterval(timer.value);
			timer.value = null;
		}
		polling.value = false;
	}

	function getVehicleById(id: string | null | undefined) {
		if (!id || !vehicles.value) return null;
		return vehicles.value.find((v) => v.id === id) || null;
	}

	return { vehicles, startPolling, stopPolling, getVehicleById };
}
