import type { FastifyInstance } from 'fastify';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { loginSchema } from '../schemas/auth.ts';

export async function loginPrestadorRoutes(app: FastifyInstance) {
  app.post('/prestador/login', async (request, reply) => {
      const { login, senha } = loginSchema.parse(request.body);

      const user = await db.query.prestadorServico.findFirst({
        where: eq(prestadorServico.mecLogin, login),
      });

      if (!user || !user.mecAtivo) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const isPasswordCorrect = await compare(senha, user.mecSenha);
      if (!isPasswordCorrect) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const token = await reply.jwtSign(
        {
          sub: user.mecCNPJ,
          role: 'prestador'
        }
      );

      return reply.status(200).send({
        token,
        user: {
            id: user.mecCNPJ,
            nome: user.mecLogin,
            role: 'prestador',
        },
      });
  });
}
