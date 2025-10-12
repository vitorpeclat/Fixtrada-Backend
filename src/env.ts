import { z } from 'zod'
 
const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url().startsWith('postgres://'),
  JWT_SECRET: z.string().default('secret'),
})
export const env = envSchema.parse(process.env)