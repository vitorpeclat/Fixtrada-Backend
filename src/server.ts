// src/server.ts

import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import fastifyIO from 'fastify-socket.io'; // <<< Importar o plugin
// Remova: import websocketPlugin from '@fastify/websocket';
// Remova: import { Server } from 'socket.io'; // O tipo pode vir de fastify.d.ts agora
import { env } from './env.ts';
import { setupSocketIO } from './ws/socketHandler.ts';
// --- Importe TODAS as suas rotas HTTP aqui ---
import { cadastroClienteRoutes } from './http/cliente/cadastroCliente.ts';
import { cadastroPrestadorRoutes } from './http/prestador/cadastroPrestador.ts';
import { loginClienteRoutes } from './http/cliente/loginCliente.ts';
import { loginPrestadorRoutes } from './http/prestador/loginPrestador.ts';
import { vehicleClienteRoutes } from './http/cliente/vehiclesCliente.ts';
import { serviceClienteRoutes } from './http/cliente/serviceCliente.ts';
import { verificacaoEmailClienteRoutes } from './http/cliente/verificacaoEmail.ts';
import { updateClienteRoutes } from './http/cliente/updateCliente.ts';
import { historicoClienteRoutes } from './http/cliente/historicoCliente.ts';
import { avaliarServicoRoutes } from './http/cliente/avaliarServico.ts';
import { solicitarResetSenhaRoutes } from './http/auth/solicitarResetSenha.ts'; // Exemplo
import { confirmarResetSenhaRoutes } from './http/auth/confirmarResetSenha.ts'; // Exemplo
import { updatePrestadorRoutes } from './http/prestador/updatePrestador.ts'; // Exemplo
import { servicosPrestadorRoutes } from './http/prestador/servicosPrestador.ts';
import { historicoPrestadorRoutes } from './http/prestador/historicoPrestador.ts';
import { loginAdminRoutes } from './http/administrador/loginAdmin.ts';
import { contasAdminRoutes } from './http/administrador/contasAdmin.ts';
import { tiposServicoAdminRoutes } from './http/administrador/tiposServicoAdmin.ts';
import { outrosAdminRoutes } from './http/administrador/outrosAdmin.ts';
import { findNearbyPrestadoresRoutes } from './http/services/findNearbyPrestadores.ts'; // Exemplo
// --- Fim das importações de rotas ---
import { z } from 'zod';

const app = Fastify({ logger: true });

// Registra o plugin JWT
app.register(jwt, {
  secret: env.JWT_SECRET,
  decode: { complete: true },
  sign: {
    expiresIn: '7d',
  }
});

// <<< Registra o plugin fastify-socket.io >>>
app.register(fastifyIO as any, {
  cors: {
    origin: "*", // Ajuste para seu ambiente de frontend em produção
    methods: ["GET", "POST"]
  }
});

// Registra as rotas HTTP da aplicação
app.register(cadastroClienteRoutes);
app.register(cadastroPrestadorRoutes);
app.register(loginClienteRoutes);
app.register(loginPrestadorRoutes);
app.register(vehicleClienteRoutes);
app.register(serviceClienteRoutes);
app.register(verificacaoEmailClienteRoutes);
app.register(updateClienteRoutes);
app.register(historicoClienteRoutes);
app.register(avaliarServicoRoutes);
// Registre as rotas pendentes implementadas
app.register(solicitarResetSenhaRoutes);
app.register(confirmarResetSenhaRoutes);
app.register(updatePrestadorRoutes);
app.register(servicosPrestadorRoutes);
app.register(historicoPrestadorRoutes);
app.register(loginAdminRoutes);
app.register(contasAdminRoutes);
app.register(tiposServicoAdminRoutes);
app.register(outrosAdminRoutes);
app.register(findNearbyPrestadoresRoutes);


// Handler de erro (Zod e geral)
app.setErrorHandler((error, _, reply) => {
  if (error instanceof z.ZodError) {
    return reply
      .status(400)
      .send({ message: 'Validation error.', issues: error.format() })
  }
  // Log do erro
  app.log.error(error);
  // Resposta genérica para o cliente
  return reply.status(500).send({ message: 'Internal server error.' });
});

// Rota Health Check
app.get('/health', function (request, reply) {
  reply.send("OK");
});


// <<< Configuração do Socket.IO movida para app.ready >>>
app.ready(err => {
  if (err) throw err;

  // 'app.io' agora está disponível graças ao plugin fastify-socket.io
  if (app.io) {
      setupSocketIO(app.io); // Passe a instância para seu handler
      console.log('Socket.IO server iniciado via plugin fastify-socket.io.');

      // Exemplo: Se precisar de lógica de conexão diretamente aqui (alternativa ao handler)
      // app.io.on('connection', (socket) => {
      //   console.log('Socket conectado via app.ready:', socket.id);
      //   // ... outros listeners ...
      // });

  } else {
      console.error("Falha ao inicializar o Socket.IO com fastify-socket.io. Verifique o registro do plugin.");
  }
});


// Inicia o servidor
app.listen({ port: env.PORT, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  // O logger padrão do Fastify geralmente já loga esta informação.
  // console.log(`Server listening at ${address}`);
});
