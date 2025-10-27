import { z } from 'zod'
 
const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url().startsWith('postgres://'),
  JWT_SECRET: z.string().default('secret'),

  BREVO_SMTP_HOST: z.string(),
  BREVO_SMTP_PORT: z.coerce.number(),
  BREVO_SMTP_USER: z.string().email(),
  BREVO_SMTP_PASSWORD: z.string(),

  email: z.string().email(),
})

export const env = envSchema.parse(process.env)