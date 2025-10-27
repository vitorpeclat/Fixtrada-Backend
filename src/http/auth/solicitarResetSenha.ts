import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { eq } from 'drizzle-orm';
import { solicitarResetSenhaSchema } from '../schemas/passwordReset.ts'; // ajuste o path
import { customAlphabet } from 'nanoid';
import { getMailClient } from '../../lib/mail.ts';
import { env } from '../../env.ts';
import nodemailer from 'nodemailer';

// Gera um código numérico de 6 dígitos
const generateCode = customAlphabet('0123456789', 6);

export async function solicitarResetSenhaRoutes(app: FastifyInstance) {
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
      const message = await mail.sendMail({
        from: `Fixtrada <${env.email}>`,
        to: email,
        subject: 'Recuperação de Senha Fixtrada',
        text: `Seu código para redefinir a senha é: ${codigoReset}. Este código expira em 15 minutos.`,
        // html: `<p>Seu código para redefinir a senha é: <strong>${codigoReset}</strong>. Este código expira em 15 minutos.</p>` // Opcional
      });

       console.log('URL E-mail Recuperação (Teste): ', nodemailer.getTestMessageUrl(message));

      return reply.status(200).send({ message: 'Se o e-mail estiver cadastrado, um código de recuperação será enviado.' });

    } catch (error) {
      console.error("Erro ao solicitar reset:", error);
      return reply.status(500).send({ message: 'Erro ao processar a solicitação.' });
    }
  });
}
