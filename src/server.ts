import Fastify from 'fastify'
import { env } from './env.ts'
import { cadastroRoutes } from './http/cadastro.ts';
import { loginRoutes } from './http/login.ts';
// IMPORTAÇÕES ADICIONADAS
import { profileRoutes } from './http/profile.ts';
import { vehicleRoutes } from './http/vehicles.ts';
import { serviceRoutes } from './http/services.ts';

const app = Fastify({
  logger: true
})

// Adiciona um decorador para armazenar os dados do usuário na requisição
app.decorateRequest('user', null)

app.register(cadastroRoutes);
app.register(loginRoutes);
// REGISTROS ADICIONADOS
app.register(profileRoutes);
app.register(vehicleRoutes);
app.register(serviceRoutes);


app.get('/health', function (request, reply) {
  reply.send("OK")
})

app.listen({ port: env.PORT, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})