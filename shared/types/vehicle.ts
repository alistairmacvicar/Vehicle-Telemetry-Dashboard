export interface TelemetryData {
	timestamp: number;
	odometer: number;
	fuelLevel: number;
	fuelConsumption: number;
	engineOilTemp: number;
	engineCoolantTemp: number;
}

export interface Vehicle {
	id: string;
	name: string;
	updatedAt: number;
	data?: TelemetryData[];
	location: {
		latitude: number;
		longitude: number;
		speed: number;
		heading: number;
	};
}
