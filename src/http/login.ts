import type { FastifyInstance } from 'fastify';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as jwt from 'jsonwebtoken';
import { db } from '../db/connection.ts';
import { prestadorServico } from '../db/schema/prestadorServico.ts';
import { usuario } from '../db/schema/usuario.ts';
import { loginSchema } from './validators/auth.validators.ts';

// Chave secreta para assinar o JWT. Em produção, use uma variável de ambiente segura.
const JWT_SECRET = process.env.JWT_SECRET || 'uma-chave-secreta-para-desenvolvimento';

export async function loginRoutes(app: FastifyInstance) {
  
  app.post('/login', async (request, reply) => {
    try {
      const { login, senha } = loginSchema.parse(request.body);

      // 1. Tenta encontrar um cliente (usuário) com o login fornecido
      let user: any = await db.query.usuario.findFirst({
        where: eq(usuario.usuLogin, login),
      });
      let role = 'cliente';

      // 2. Se não encontrar um cliente, tenta encontrar um prestador
      if (!user) {
        user = await db.query.prestadorServico.findFirst({
          where: eq(prestadorServico.mecLogin, login),
        });
        role = 'prestador';
      }

      // 3. Se não encontrou nenhum dos dois, retorna erro de credenciais
      if (!user) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      // 4. Compara a senha fornecida com o hash salvo no banco
      const senhaCorreta = await compare(senha, user.usuSenha || user.mecSenha);

      if (!senhaCorreta) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      // 5. Gera o Token JWT
      const token = jwt.sign(
        { 
          sub: user.usuID || user.mecCNPJ, // ID único do usuário/prestador
          role: role,                     // Papel (cliente ou prestador)
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' } // Token expira em 7 dias
      );

      // Remove a senha da resposta por segurança
      const { usuSenha, mecSenha, ...userInfo } = user;

      return reply.status(200).send({ 
        message: 'Login bem-sucedido!',
        token,
        user: {
          id: userInfo.usuID || userInfo.mecCNPJ,
          nome: userInfo.usuNome || `Prestador ${userInfo.mecCNPJ}`, // Ajuste conforme necessário
          role,
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', issues: error.format() });
      }
      console.error(error);
      return reply.status(500).send({ message: 'Erro interno no servidor.' });
    }
  });
}