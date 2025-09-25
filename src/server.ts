import Fastify from 'fastify'
import { env } from './env.ts'
import { cadastroRoutes } from './http/cadastro.ts';
import { loginRoutes } from './http/login.ts';

const app = Fastify({
  logger: true
})

app.register(cadastroRoutes);
app.register(loginRoutes);

app.get('/health', function (request, reply) {
  reply.send("OK")
})

app.listen({ port: env.PORT, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})



