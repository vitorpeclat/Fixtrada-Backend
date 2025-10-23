import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { and, eq, gt } from 'drizzle-orm';
import { confirmarResetSenhaSchema } from '../schemas/passwordReset.ts'; // ajuste o path
import { hash } from 'bcrypt';

export async function confirmarResetSenhaRoutes(app: FastifyInstance) {
  app.post('/password/confirm-reset', async (request, reply) => {
    const { email, codigo, novaSenha } = confirmarResetSenhaSchema.parse(request.body);

    const agora = new Date();

    // Tenta encontrar cliente ou prestador com o código válido e não expirado
    const userCliente = await db.query.usuario.findFirst({
      where: and(
        eq(usuario.usuLogin, email),
        eq(usuario.codigoResetSenha, codigo),
        gt(usuario.codigoResetSenhaExpira, agora)
      )
    });

    const userPrestador = userCliente ? null : await db.query.prestadorServico.findFirst({
      where: and(
        eq(prestadorServico.mecLogin, email),
        eq(prestadorServico.codigoResetSenha, codigo), // Adapte nome do campo
        gt(prestadorServico.codigoResetSenhaExpira, agora) // Adapte nome do campo
      )
    });

    if (!userCliente && !userPrestador) {
      return reply.status(400).send({ message: 'Código inválido ou expirado.' });
    }

    try {
      const novaSenhaHash = await hash(novaSenha, 8);

      if (userCliente) {
        await db.update(usuario).set({
          usuSenha: novaSenhaHash,
          codigoResetSenha: null, // Limpa o código após uso
          codigoResetSenhaExpira: null,
        }).where(eq(usuario.usuLogin, email));
      } else if (userPrestador) {
        await db.update(prestadorServico).set({
          mecSenha: novaSenhaHash,
          codigoResetSenha: null, // Adapte nome do campo
          codigoResetSenhaExpira: null, // Adapte nome do campo
        }).where(eq(prestadorServico.mecLogin, email));
      }

      return reply.status(200).send({ message: 'Senha redefinida com sucesso!' });

    } catch (error) {
      console.error("Erro ao confirmar reset:", error);
      return reply.status(500).send({ message: 'Erro ao redefinir a senha.' });
    }
  });
}
