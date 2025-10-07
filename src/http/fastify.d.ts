import 'fastify'
import { JwtUserPayload } from './hooks/auth'

declare module 'fastify' {
  export interface FastifyRequest {
    user: JwtUserPayload
  }
}