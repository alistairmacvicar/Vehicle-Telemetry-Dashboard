import type { TelemetryData } from '~~/shared/types/vehicle';
import type { DataRecord } from '~~/shared/types/data';

type MetricKey =
	| 'odometer'
	| 'fuelLevel'
	| 'fuelConsumption'
	| 'engineOilTemp'
	| 'engineCoolantTemp';

export function telemetryToSeries(
	data: TelemetryData[] | undefined,
	key: MetricKey
): DataRecord[] {
	if (!data?.length) return [];
	return data
		.filter((d) => typeof d.timestamp === 'number' && typeof d[key] === 'number')
		.sort((a, b) => a.timestamp - b.timestamp)
		.map((d) => ({ x: d.timestamp, y: d[key] as number }));
}

export function booleanSeries(
	data: TelemetryData[] | undefined,
	key: 'emergencyLights'
): DataRecord[] {
	if (!data?.length) return [];
	return data
		.sort((a, b) => a.timestamp - b.timestamp)
		.map((d) => ({ x: d.timestamp, y: d[key] ? 1 : 0 }));
}
