import type { Location } from './geo';
import type { FeatureCollection, LineString } from 'geojson';

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
    geoJSON: FeatureCollection<LineString>;
    segIndex: number;
    segOffset: number;
    atEnd: boolean;
    speedProfile?: Array<{
      from: number;
      to: number;
      speedKmh: number;
    }>;
  };
  nextRouteGenAt?: number;
}
