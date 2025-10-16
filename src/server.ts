import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { env } from './env.ts'
import { cadastroClienteRoutes } from './http/cliente/cadastroCliente.ts';
import { cadastroPrestadorRoutes } from './http/prestador/cadastroPrestador.ts';
import { loginClienteRoutes } from './http/cliente/loginCliente.ts';
import { loginPrestadorRoutes } from './http/prestador/loginPrestador.ts';
import { vehicleClienteRoutes } from './http/cliente/vehiclesCliente.ts';
import { serviceClienteRoutes } from './http/cliente/serviceCliente.ts';
import { updateClienteRoutes } from './http/cliente/updateCliente.ts';

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
app.register(updateClienteRoutes)


app.get('/health', function (request, reply) {
  reply.send("OK")
})

app.listen({ port: env.PORT, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})