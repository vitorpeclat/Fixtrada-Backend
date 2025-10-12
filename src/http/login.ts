import type { FastifyInstance } from 'fastify';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/connection.ts';
import { prestadorServico } from '../db/schema/prestadorServico.ts';
import { usuario } from '../db/schema/usuario.ts';
import { loginSchema } from './schemas/auth.ts';

export async function loginRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    try {
      const { login, senha } = loginSchema.parse(request.body);

      // Tenta encontrar como cliente primeiro
      let user: any = await db.query.usuario.findFirst({ // 'any' para acomodar os dois tipos
        where: eq(usuario.usuLogin, login),
      });
      let userType = 'cliente';
      
      // Se não for cliente, tenta encontrar como prestador
      if (!user) {
        user = await db.query.prestadorServico.findFirst({
          where: eq(prestadorServico.mecLogin, login),
        });
        userType = 'prestador';
      }
      
      // Verifica se o usuário existe e se está ativo
      const isUserActive = userType === 'cliente' ? user?.usuAtivo : user?.mecAtivo;
      if (!user || !isUserActive) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }
      
      // Verifica a senha
      const isPasswordCorrect = await compare(senha, user.usuSenha || user.mecSenha);
      if (!isPasswordCorrect) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const token = await reply.jwtSign(
        {
          sub: user.usuID || user.mecCNPJ,
          role: userType
        }
      );

      return reply.status(200).send({
        token,
        user: {
            id: user.usuID || user.mecCNPJ,
            nome: user.usuNome || user.mecLogin,
            role: userType,
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