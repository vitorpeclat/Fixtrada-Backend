import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';

export interface JwtUserPayload extends jwt.JwtPayload {
  sub: string;
  role: 'cliente' | 'prestador';
}

const JWT_SECRET = process.env.JWT_SECRET || 'uma-chave-secreta-para-desenvolvimento';

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ message: 'Token de autenticação não fornecido.' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.default.verify(token, JWT_SECRET) as JwtUserPayload;
    
    // Adiciona os dados do usuário decodificados na requisição para uso posterior
    request.user = decoded; // Agora o TypeScript reconhece 'request.user'

  } catch (error) {
    return reply.status(401).send({ message: 'Token inválido ou expirado.' });
  }
}