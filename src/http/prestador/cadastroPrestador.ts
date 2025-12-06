import type { FastifyInstance } from 'fastify';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { endereco } from '../../db/schema/endereco.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { criarPrestadorSchema } from '../schemas/auth.ts';
import { customAlphabet } from 'nanoid';
import { getMailClient } from '../../lib/mail.ts';
import nodemailer from 'nodemailer';
import { env } from '../../env.ts';

export async function cadastroPrestadorRoutes(app: FastifyInstance) {
  
  app.post('/prestador/cadastro', async (request, reply) => {
      const dadosValidados = criarPrestadorSchema.parse(request.body);

      const prestadorExistente = await db.query.prestadorServico.findFirst({
        where: (fields, { or }) => or(
          eq(fields.mecCNPJ, dadosValidados.mecCNPJ),
          eq(fields.mecLogin, dadosValidados.mecLogin)
        ),
      });

      if (prestadorExistente) {
        return reply.status(409).send({ message: 'CNPJ ou e-mail já cadastrado.' });
      }

      const codigoVerificacao = customAlphabet('0123456789', 6)();
      const agora = new Date();
      const mecCodigoVerificacaoExpira = new Date(agora.getTime() + 60 * 60 * 1000); // 1 hora

      const [newPrestador] = await db.transaction(async (tx) => {
        await tx.insert(endereco)
          .values(dadosValidados.endereco)
          .onConflictDoNothing();
        
        const senhaHash = await hash(dadosValidados.mecSenha, 8);
        
        return await tx.insert(prestadorServico).values({
          mecNome: dadosValidados.mecNome,
          mecCNPJ: dadosValidados.mecCNPJ,
          mecLogin: dadosValidados.mecLogin,
          mecSenha: senhaHash,
          mecEnderecoNum: dadosValidados.mecEnderecoNum,
          fk_endereco_endCEP: dadosValidados.endereco.endCEP,
          latitude: dadosValidados.latitude,
          longitude: dadosValidados.longitude,
          mecAtivo: true,
          mecCodigoVerificacao: codigoVerificacao,
          mecCodigoVerificacaoExpira: mecCodigoVerificacaoExpira,
        }).returning({
          mecCNPJ: prestadorServico.mecCNPJ,
          mecLogin: prestadorServico.mecLogin,
          mecNome: prestadorServico.mecNome,
        });
      });

      const token = await reply.jwtSign(
        {
          sub: newPrestador.mecCNPJ,
          role: 'prestador'
        }
      );

      const mail = await getMailClient();
      const message = await mail.sendMail({
          from: `Fixtrada <${env.email}>`,
          to: dadosValidados.mecLogin,
          subject: 'Código de Verificação de E-mail',
          text: `Seu código de verificação é: ${codigoVerificacao}`,
      });

      return reply.status(201).send({
        message: 'Prestador cadastrado com sucesso! Um código de verificação foi enviado para o seu e-mail.',
        token,
        user: {
          id: newPrestador.mecCNPJ,
          email: newPrestador.mecLogin,
          nome: newPrestador.mecNome,
          role: 'prestador',
        },
      });
  });
}