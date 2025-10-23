// src/@types/fastify.d.ts

import 'fastify';
import { JwtUserPayload } from '../http/hooks/auth.ts';
import { Server as SocketIOServer } from 'socket.io'; // <<< Importar o tipo Server do socket.io

declare module 'fastify' {
  export interface FastifyRequest {
    user: JwtUserPayload;
  }

  // <<< Adicionar/Verificar a interface para o decorator io >>>
  export interface FastifyInstance {
    io: SocketIOServer;
  }
}