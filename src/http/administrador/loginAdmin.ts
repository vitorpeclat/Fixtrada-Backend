import type { FastifyInstance } from 'fastify';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';

const loginAdminSchema = z.object({
  login: z.string().min(1, 'O login é obrigatório.'),
  senha: z.string().min(1, 'A senha é obrigatória.'),
});

export async function loginAdminRoutes(app: FastifyInstance) {
  app.post('/admin/login', async (request, reply) => {
      const { login, senha } = loginAdminSchema.parse(request.body);

      const user = await db.query.usuario.findFirst({
        where: eq(usuario.usuLogin, login),
      });

      if (!user || !user.usuAtivo || user.usuRole !== 'admin') {
        return reply.status(401).send({ message: 'Credenciais inválidas ou sem permissão de administrador.' });
      }

      const isPasswordCorrect = await compare(senha, user.usuSenha);
      if (!isPasswordCorrect) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const token = await reply.jwtSign(
        {
          sub: user.usuID,
          role: 'admin'
        }
      );

      return reply.status(200).send({ token });
  });
}