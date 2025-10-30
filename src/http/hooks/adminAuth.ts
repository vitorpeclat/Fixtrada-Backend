import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtUserPayload } from './auth.ts'; // Reutiliza a interface

export async function adminAuthHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<JwtUserPayload>();
    request.user = payload;

    if (request.user.role !== 'admin') {
        return reply.status(403).send({ message: 'Acesso negado. Rota exclusiva para administradores.' });
    }

  } catch (error) {
    return reply.status(401).send({ message: 'Token de autenticação inválido ou expirado.' });
  }
}