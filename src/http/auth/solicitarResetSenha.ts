// ============================================================================
// ROTAS: Solicitação de Recuperação de Senha
// ============================================================================
// POST /password/request-reset - Solicitar código para resetar senha

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { eq } from 'drizzle-orm';
import { solicitarResetSenhaSchema } from '../schemas/passwordReset.ts';
import { customAlphabet } from 'nanoid';
import { getMailClient } from '../../lib/mail.ts';
import { env } from '../../env.ts';

const generateCode = customAlphabet('0123456789', 6);

export async function solicitarResetSenhaRoutes(app: FastifyInstance) {
  // ========================================================================
  // POST /password/request-reset - Solicitar código de recuperação
  // ========================================================================
  app.post('/password/request-reset', async (request, reply) => {
    const { email } = solicitarResetSenhaSchema.parse(request.body);

    const userCliente = await db.query.usuario.findFirst({ where: eq(usuario.usuLogin, email) });
    const userPrestador = userCliente ? null : await db.query.prestadorServico.findFirst({ where: eq(prestadorServico.mecLogin, email) });

    if (!userCliente && !userPrestador) {
      // Resposta genérica para não revelar se o e-mail existe
      return reply.status(200).send({ message: 'Se o e-mail estiver cadastrado, um código de recuperação será enviado.' });
    }

    const codigoReset = generateCode();
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 15 * 60 * 1000); // Expira em 15 minutos

    try {
      if (userCliente) {
        await db.update(usuario).set({
          codigoResetSenha: codigoReset,
          codigoResetSenhaExpira: expiraEm,
        }).where(eq(usuario.usuLogin, email));
      } else if (userPrestador) {
        await db.update(prestadorServico).set({
          codigoResetSenha: codigoReset, // Adapte o nome do campo se necessário
          codigoResetSenhaExpira: expiraEm,
        }).where(eq(prestadorServico.mecLogin, email));
      }

      // Enviar e-mail
      const mail = await getMailClient();
      await mail.sendMail({
        from: `Fixtrada <${env.email}>`,
        to: email,
        subject: 'Recuperação de Senha Fixtrada',
        text: `Seu código para redefinir a senha é: ${codigoReset}. Este código expira em 15 minutos.`,
      });

      return reply.status(200).send({ message: 'Se o e-mail estiver cadastrado, um código de recuperação será enviado.' });

    } catch (error) {
      console.error("Erro ao solicitar reset:", error);
      return reply.status(500).send({ message: 'Erro ao processar a solicitação.' });
    }
  });
}
