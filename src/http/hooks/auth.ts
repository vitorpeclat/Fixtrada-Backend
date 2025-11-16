// ============================================================================
// MIDDLEWARE: Autenticação JWT
// ============================================================================
// Valida e extrai informações do token JWT das requisições

import { FastifyRequest, FastifyReply } from 'fastify';

export interface JwtUserPayload {
  sub: string;
  role: 'cliente' | 'prestador' | 'admin';
}

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<JwtUserPayload>();
    request.user = payload;
  } catch (error) {
    return reply.status(401).send({ message: 'Token de autenticação inválido ou expirado.' });
  }
}