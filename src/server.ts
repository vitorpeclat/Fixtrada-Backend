// ============================================================================
// SERVIDOR PRINCIPAL - Fixtrada Backend
// ============================================================================
// Configuração central do servidor Fastify com autenticação JWT e WebSocket
// ============================================================================

import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import fastifyIO from 'fastify-socket.io';
import { env } from './env.ts';
import { networkInterfaces } from 'os';
import { setupSocketIO } from './ws/socketHandler.ts';
import { z } from 'zod';

// ============================================================================
// IMPORTAÇÃO DE ROTAS - CLIENTE
// ============================================================================
import { cadastroClienteRoutes } from './http/cliente/cadastroCliente.ts';
import { loginClienteRoutes } from './http/cliente/loginCliente.ts';
import { vehicleClienteRoutes } from './http/cliente/vehiclesCliente.ts';
import { serviceClienteRoutes } from './http/cliente/serviceCliente.ts';
import { verificacaoEmailClienteRoutes } from './http/cliente/verificacaoEmail.ts';
import { updateClienteRoutes } from './http/cliente/updateCliente.ts';
import { historicoClienteRoutes } from './http/cliente/historicoCliente.ts';
import { avaliarServicoRoutes } from './http/cliente/avaliarServico.ts';

// ============================================================================
// IMPORTAÇÃO DE ROTAS - PRESTADOR
// ============================================================================
import { cadastroPrestadorRoutes } from './http/prestador/cadastroPrestador.ts';
import { loginPrestadorRoutes } from './http/prestador/loginPrestador.ts';
import { updatePrestadorRoutes } from './http/prestador/updatePrestador.ts';
import { servicosPrestadorRoutes } from './http/prestador/servicosPrestador.ts';
import { historicoPrestadorRoutes } from './http/prestador/historicoPrestador.ts';

// ============================================================================
// IMPORTAÇÃO DE ROTAS - ADMINISTRADOR
// ============================================================================
import { loginAdminRoutes } from './http/administrador/loginAdmin.ts';
import { contasAdminRoutes } from './http/administrador/contasAdmin.ts';
import { tiposServicoAdminRoutes } from './http/administrador/tiposServicoAdmin.ts';
import { outrosAdminRoutes } from './http/administrador/outrosAdmin.ts';

// ============================================================================
// IMPORTAÇÃO DE ROTAS - SERVIÇOS GERAIS
// ============================================================================
import { solicitarResetSenhaRoutes } from './http/auth/solicitarResetSenha.ts';
import { confirmarResetSenhaRoutes } from './http/auth/confirmarResetSenha.ts';
import { findNearbyPrestadoresRoutes } from './http/services/findNearbyPrestadores.ts';
import { meusChatsRoutes } from './http/chats.ts';
import { tiposServicoRoutes } from './http/tiposServico.ts';
import { enderecosRoutes } from './http/enderecos.ts';

const app = Fastify({ logger: true });

// ============================================================================
// CONFIGURAÇÃO DE PLUGINS
// ============================================================================
// JWT: Autenticação baseada em tokens
app.register(jwt, {
  secret: env.JWT_SECRET,
  decode: { complete: true },
  sign: {
    expiresIn: '7d',
  }
});

// Socket.IO: Comunicação em tempo real
app.register(fastifyIO as any, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ============================================================================
// REGISTRO DE ROTAS - CLIENTE
// ============================================================================
app.register(cadastroClienteRoutes);
app.register(loginClienteRoutes);
app.register(vehicleClienteRoutes);
app.register(serviceClienteRoutes);
app.register(verificacaoEmailClienteRoutes);
app.register(updateClienteRoutes);
app.register(historicoClienteRoutes);
app.register(avaliarServicoRoutes);

// ============================================================================
// REGISTRO DE ROTAS - PRESTADOR
// ============================================================================
app.register(cadastroPrestadorRoutes);
app.register(loginPrestadorRoutes);
app.register(updatePrestadorRoutes);
app.register(servicosPrestadorRoutes);
app.register(historicoPrestadorRoutes);

// ============================================================================
// REGISTRO DE ROTAS - ADMINISTRADOR
// ============================================================================
app.register(loginAdminRoutes);
app.register(contasAdminRoutes);
app.register(tiposServicoAdminRoutes);
app.register(outrosAdminRoutes);

// ============================================================================
// REGISTRO DE ROTAS - SERVIÇOS GERAIS
// ============================================================================
app.register(solicitarResetSenhaRoutes);
app.register(confirmarResetSenhaRoutes);
app.register(findNearbyPrestadoresRoutes);
app.register(meusChatsRoutes);
app.register(tiposServicoRoutes);
app.register(enderecosRoutes);

// ============================================================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ============================================================================
app.setErrorHandler((error, _, reply) => {
  if (error instanceof z.ZodError) {
    return reply
      .status(400)
      .send({ message: 'Validation error.', issues: error.format() })
  }
  app.log.error(error);
  return reply.status(500).send({ message: 'Internal server error.' });
});

// ============================================================================
// ROTA DE HEALTH CHECK
// ============================================================================
app.get('/health', function (request, reply) {
  reply.send("OK");
});

// ============================================================================
// CONFIGURAÇÃO DO SOCKET.IO
// ============================================================================
app.ready(err => {
  if (err) throw err;

  if (app.io) {
      setupSocketIO(app.io);
      console.log('Socket.IO server iniciado com sucesso.');
  } else {
      console.error("Falha ao inicializar o Socket.IO. Verifique o registro do plugin.");
  }
});

// ============================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================================
app.listen({ port: env.PORT, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
  const interfaces = networkInterfaces();
  if (interfaces) {
    console.log('Available on (listening on 0.0.0.0):');
    for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name];
        if (nets) {
            for (const net of nets) {
                if (net.family === 'IPv4' && !net.internal) {
                    console.log(`- http://${net.address}:${env.PORT}`);
                }
            }
        }
    }
  }
});
