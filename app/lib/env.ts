import { z } from 'zod';
import tryParseEnv from './try-parse-env';

const EnvSchema = z.object({
	NODE_ENV: z.string(),
	ORS_API_KEY: z.string(),
});

export type EnvSchema = z.infer<typeof EnvSchema>;

tryParseEnv(EnvSchema);

export default EnvSchema.parse(process.env);
