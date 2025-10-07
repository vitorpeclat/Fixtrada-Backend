import 'fastify'
import { JwtUserPayload } from '../http/hooks/auth.ts'

declare module 'fastify' {
  export interface FastifyRequest {
    user: JwtUserPayload
  }
}