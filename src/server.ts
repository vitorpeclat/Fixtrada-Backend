import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { env } from './env.ts'
import { cadastroRoutes } from './http/cadastro.ts';
import { loginRoutes } from './http/login.ts';
import { profileRoutes } from './http/profile.ts';
import { vehicleRoutes } from './http/vehicles.ts';
import { serviceRoutes } from './http/services.ts';

const app = Fastify({
  logger: true
})

// Registra o plugin JWT
app.register(jwt, {
  secret: env.JWT_SECRET,
  decode: { complete: true }, // para acessar o payload completo
  sign: {
    expiresIn: '7d',
  }
});

// Registra as rotas da aplicação
app.register(cadastroRoutes);
app.register(loginRoutes);
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