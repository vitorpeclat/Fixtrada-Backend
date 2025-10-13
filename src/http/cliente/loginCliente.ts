import type { FastifyInstance } from 'fastify';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { loginSchema } from '../schemas/auth.ts';

export async function loginClienteRoutes(app: FastifyInstance) {
  app.post('/cliente/login', async (request, reply) => {
    try {
      const { login, senha } = loginSchema.parse(request.body);

      const user = await db.query.usuario.findFirst({
        where: eq(usuario.usuLogin, login),
      });

      if (!user || !user.usuAtivo) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const isPasswordCorrect = await compare(senha, user.usuSenha);
      if (!isPasswordCorrect) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const token = await reply.jwtSign(
        {
          sub: user.usuID,
          role: 'cliente'
        }
      );

      return reply.status(200).send({
        token,
        user: {
            id: user.usuID,
            nome: user.usuNome,
            role: 'cliente',
        },
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados de login inválidos.', issues: error.format() });
      }
      console.error(error);
      return reply.status(500).send({ message: 'Erro interno no servidor.' });
    }
  });
}
