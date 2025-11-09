import { z } from 'zod';
import tryParseEnv from './try-parse-env';

const env = z.object({
  NODE_ENV: z.string(),
  ORS_API_KEY: z.string(),
});

export type EnvSchema = z.infer<typeof env>;

tryParseEnv(env);

// eslint-disable-next-line n/no-process-env -- Validated with Zod schema
export default env.parse(process.env);
