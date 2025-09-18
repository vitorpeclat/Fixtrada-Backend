import type { FastifyInstance } from 'fastify';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as jwt from 'jsonwebtoken';
import { db } from '../db/connection.ts';
import { prestadorServico } from '../db/schema/prestadorServico.ts';
import { usuario } from '../db/schema/usuario.ts';
import { loginSchema } from './validators/auth.validators.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'uma-chave-secreta-para-desenvolvimento';

export async function loginRoutes(app: FastifyInstance) {
  // Endpoint para Login (RF002)
  app.post('/login', async (request, reply) => {
    try {
      const { login, senha } = loginSchema.parse(request.body);

      let user: any = await db.query.usuario.findFirst({
        where: eq(usuario.usuLogin, login),
      });

      let userType = 'cliente';
      
      if (!user) {
        user = await db.query.prestadorServico.findFirst({
          where: eq(prestadorServico.mecLogin, login),
        });
        userType = 'prestador';
      }

      if (!user || (user.usuAtivo === false) || (user.mecAtivo === false)) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }
      
      const senhaCorreta = await compare(senha, user.usuSenha || user.mecSenha);

      if (!senhaCorreta) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const token = jwt.sign(
        { 
          sub: user.usuID || user.mecCNPJ,
          role: userType 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return reply.status(200).send({ 
        message: 'Login bem-sucedido!',
        token: token,
        user: {
            id: user.usuID || user.mecCNPJ,
            nome: user.usuNome || user.mecLogin,
            role: userType,
        }
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