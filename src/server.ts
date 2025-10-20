import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { env } from './env.ts'
import { cadastroClienteRoutes } from './http/cliente/cadastroCliente.ts';
import { cadastroPrestadorRoutes } from './http/prestador/cadastroPrestador.ts';
import { loginClienteRoutes } from './http/cliente/loginCliente.ts';
import { loginPrestadorRoutes } from './http/prestador/loginPrestador.ts';
import { vehicleClienteRoutes } from './http/cliente/vehiclesCliente.ts';
import { serviceClienteRoutes } from './http/cliente/serviceCliente.ts';
import { verificacaoEmailClienteRoutes } from './http/cliente/verificacaoEmail.ts';
import { updateClienteRoutes } from './http/cliente/updateCliente.ts';
import { z } from 'zod';

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
app.register(cadastroClienteRoutes);
app.register(cadastroPrestadorRoutes);
app.register(loginClienteRoutes);
app.register(loginPrestadorRoutes);
app.register(vehicleClienteRoutes);
app.register(serviceClienteRoutes);
app.register(verificacaoEmailClienteRoutes);
app.register(updateClienteRoutes)

app.setErrorHandler((error, _, reply) => {
  if (error instanceof z.ZodError) {
    return reply
      .status(400)
      .send({ message: 'Validation error.', issues: error.format() })
  }

  app.log.error(error)

  return reply.status(500).send({ message: 'Internal server error.' })
})

app.get('/health', function (request, reply) {
  reply.send("OK")
})

app.listen({ port: env.PORT, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})