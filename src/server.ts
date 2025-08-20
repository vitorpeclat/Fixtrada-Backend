import Fastify from 'fastify'
import { env } from './env.ts'

const app = Fastify({
  logger: true
})

// Declare a route
app.get('/health', function (request, reply) {
  reply.send("OK")
})

app.get('/login', function (request, reply) {
  reply.send("envie seus dados")
})

// Run the server!
app.listen({ port: env.PORT }, function (err, address) {
  if (err) {
    app.log.error(err)
  }
})