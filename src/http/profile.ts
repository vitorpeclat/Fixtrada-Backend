import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.ts';
import { eq } from 'drizzle-orm';
import { authHook } from './hooks/auth.ts';
import { usuario } from '../db/schema/usuario.ts';
import { updateUserSchema } from './schemas/profile.ts';

export async function profileRoutes(app: FastifyInstance) {
  
  // Adiciona o hook de autenticação para todas as rotas deste arquivo
  app.addHook('onRequest', authHook);

  // Endpoint para editar dados cadastrais (RF004)
  app.put('/profile', async (request, reply) => {
    try {
      const { sub: userId, role } = request.user; // O @ts-ignore não é mais necessário

      // Valida o corpo da requisição
      const dadosValidados = updateUserSchema.parse(request.body);

      if (role !== 'cliente') {
        return reply.status(403).send({ message: 'Acesso negado. Apenas clientes podem editar este perfil.' });
      }

      const user = await db.update(usuario)
        .set(dadosValidados)
        .where(eq(usuario.usuID, userId))
        .returning();

      if (user.length === 0) {
        return reply.status(404).send({ message: 'Usuário não encontrado.' });
      }

      return reply.status(200).send({ user: user[0] });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', issues: error.format() });
      }
      console.error(error);
      return reply.status(500).send({ message: 'Erro interno no servidor.' });
    }
  });

  // RF003 - Recuperação de Senha (Exemplo de estrutura)
  // A implementação completa requer um serviço de e-mail (ex: Nodemailer, SendGrid)
  app.post('/password/recover', async (request, reply) => {
      // Lógica:
      // 1. Receber o email do usuário.
      // 2. Gerar um token de recuperação de senha com tempo de expiração.
      // 3. Salvar este token no banco de dados associado ao usuário.
      // 4. Enviar um e-mail para o usuário com um link contendo o token.
      return reply.status(501).send({ message: 'Funcionalidade ainda não implementada.' });
  });

  app.post('/password/reset', async (request, reply) => {
      // Lógica:
      // 1. Receber o token, a nova senha e a confirmação da senha.
      // 2. Validar se o token existe no banco e não está expirado.
      // 3. Se válido, atualizar a senha do usuário com o hash da nova senha.
      // 4. Invalidar o token de recuperação.
      return reply.status(501).send({ message: 'Funcionalidade ainda não implementada.' });
  });
}