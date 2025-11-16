// ============================================================================
// ROTAS: Login de Cliente
// ============================================================================
// Autenticação de clientes com email/CPF e senha

import type { FastifyInstance } from 'fastify';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { loginSchema } from '../schemas/auth.ts';

export async function loginClienteRoutes(app: FastifyInstance) {
  // ========================================================================
  // POST /cliente/login
  // ========================================================================
  // Autenticação do cliente retornando JWT token
  app.post('/cliente/login', async (request, reply) => {
    try {
      const { login, senha } = loginSchema.parse(request.body);
      
      // Buscar usuário no banco de dados
      const user = await db.query.usuario.findFirst({
        where: eq(usuario.usuLogin, login),
      });
      
      // Validar se usuário existe e está ativo
      if (!user || !user.usuAtivo) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      // Validar senha
      const isPasswordCorrect = await compare(senha, user.usuSenha);
      if (!isPasswordCorrect) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      // Gerar token JWT
      const token = await reply.jwtSign(
        {
          sub: user.usuID,
          role: 'cliente'
        }
      );

      // Retornar token e dados do usuário
      return reply.status(200).send({
        token,
        user: {
            id: user.usuID,
            email: user.usuLogin,
            nome: user.usuNome,
            role: 'cliente',
            telefone: user.usuTelefone,
            dataNascimento: user.usuDataNasc,
        },
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados de login inválidos.', issues: error.format() });
      }
      return reply.status(500).send({ message: 'Erro interno no servidor.' });
    }
  });
}
