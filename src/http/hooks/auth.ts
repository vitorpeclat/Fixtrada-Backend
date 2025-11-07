import { FastifyRequest, FastifyReply } from 'fastify';

export interface JwtUserPayload {
  sub: string;
  role: 'cliente' | 'prestador' | 'admin';
}

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    // O método jwtVerify() já extrai o token do header "Authorization: Bearer ..."
    // e o verifica. Se for válido, o payload é retornado.
    // Se for inválido ou ausente, ele lança um erro que é pego pelo catch.
    const payload = await request.jwtVerify<JwtUserPayload>();
    request.user = payload;
  } catch (error) {
    return reply.status(401).send({ message: 'Token de autenticação inválido ou expirado.' });
  }
}