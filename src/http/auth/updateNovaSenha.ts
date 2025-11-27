import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { eq } from 'drizzle-orm';
import { confirmarResetSenhaSchema, alterarSenhaSimplesSchema } from '../schemas/passwordReset.ts';
import { hash, compare } from 'bcrypt';

export async function updateNovaSenhaRoutes(app: FastifyInstance) {
  app.post('/password/update-password', async (request, reply) => {
    const { email, novaSenha } = confirmarResetSenhaSchema.parse(request.body);

    try {
      const novaSenhaHash = await hash(novaSenha, 8);

      // Tenta atualizar cliente
      const userCliente = await db.query.usuario.findFirst({
        where: eq(usuario.usuLogin, email)
      });

      if (userCliente) {
        await db.update(usuario).set({
          usuSenha: novaSenhaHash,
          codigoResetSenha: null,
          codigoResetSenhaExpira: null,
        }).where(eq(usuario.usuLogin, email));

        return reply.status(200).send({ message: 'Senha atualizada com sucesso!' });
      }

      // Tenta atualizar prestador
      const userPrestador = await db.query.prestadorServico.findFirst({
        where: eq(prestadorServico.mecLogin, email)
      });

      if (userPrestador) {
        await db.update(prestadorServico).set({
          mecSenha: novaSenhaHash,
          codigoResetSenha: null,
          codigoResetSenhaExpira: null,
        }).where(eq(prestadorServico.mecLogin, email));

        return reply.status(200).send({ message: 'Senha atualizada com sucesso!' });
      }

      return reply.status(404).send({ message: 'Usuário não encontrado.' });

    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      return reply.status(500).send({ message: 'Erro ao atualizar a senha.' });
    }
  });

  // Rota para alteração simples de senha (fornece senha atual e nova senha)
  app.post('/password/change', async (request, reply) => {
    const { email, role, senhaAtual, novaSenha } = alterarSenhaSimplesSchema.parse(request.body);

    try {
      if (role === 'cliente') {
        const userCliente = await db.query.usuario.findFirst({ where: eq(usuario.usuLogin, email) });
        if (!userCliente) {
          return reply.status(404).send({ message: 'Usuário não encontrado.' });
        }
        const senhaValida = await compare(senhaAtual, userCliente.usuSenha);
        if (!senhaValida) {
          return reply.status(400).send({ message: 'Senha atual incorreta.' });
        }
        const novaHash = await hash(novaSenha, 8);
        await db.update(usuario).set({ usuSenha: novaHash }).where(eq(usuario.usuLogin, email));
        return reply.status(200).send({ message: 'Senha alterada com sucesso.' });
      } else if (role === 'prestador') {
        const userPrestador = await db.query.prestadorServico.findFirst({ where: eq(prestadorServico.mecLogin, email) });
        if (!userPrestador) {
          return reply.status(404).send({ message: 'Prestador não encontrado.' });
        }
        const senhaValida = await compare(senhaAtual, userPrestador.mecSenha);
        if (!senhaValida) {
          return reply.status(400).send({ message: 'Senha atual incorreta.' });
        }
        const novaHash = await hash(novaSenha, 8);
        await db.update(prestadorServico).set({ mecSenha: novaHash }).where(eq(prestadorServico.mecLogin, email));
        return reply.status(200).send({ message: 'Senha alterada com sucesso.' });
      }

      return reply.status(400).send({ message: 'Role inválida.' });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return reply.status(500).send({ message: 'Erro ao alterar a senha.' });
    }
  });
}
