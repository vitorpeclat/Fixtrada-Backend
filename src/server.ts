import Fastify from 'fastify'
import { env } from './env.ts' // <<< CORREÇÃO APLICADA AQUI
import { cadastroRoutes } from './http/cadastro.ts';
import { loginRoutes } from './http/login.ts';

const app = Fastify({
  logger: true
})

// Registra os plugins de rotas
app.register(cadastroRoutes);
app.register(loginRoutes);

// Rota de verificação de saúde da API
app.get('/health', function (request, reply) {
  reply.send("OK")
})

// Inicia o servidor
app.listen({ port: env.PORT, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})

