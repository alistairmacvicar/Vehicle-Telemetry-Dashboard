import type { Coordinates, Location } from './geo';

export interface TelemetryData {
	timestamp: number;
	odometer: number;
	fuelLevel: number;
	fuelConsumption: number;
	engineOilTemp: number;
	engineCoolantTemp: number;
	emergencyLights: boolean;
}

export interface Vehicle {
	id: string;
	name: string;
	historicalData: TelemetryData[];
	currentData: TelemetryData &
		Location & {
			heading: number;
			speed: number;
		};
	route: {
		directions: Coordinates[];
		segIndex: number;
		segOffset: number;
		atEnd: boolean;
	};
}
