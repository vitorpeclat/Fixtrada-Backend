import type { FastifyInstance } from 'fastify';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { criarClienteSchema } from '../schemas/auth.ts';
import { customAlphabet } from 'nanoid';
import { getMailClient } from '../../lib/mail.ts';
import nodemailer from 'nodemailer';
import { env } from '../../env.ts';

export async function cadastroClienteRoutes(app: FastifyInstance) {
  
  app.post('/cliente/cadastro', async (request, reply) => {
      const dadosValidados = criarClienteSchema.parse(request.body);

      const clienteExistente = await db.query.usuario.findFirst({
        columns: {
          usuID: true,
          usuLogin: true,
          usuCpf: true,
        },
        where: (fields, { or }) => or(
          eq(fields.usuLogin, dadosValidados.usuLogin),
          eq(fields.usuCpf, dadosValidados.usuCpf)
        ),
      });

      if (clienteExistente) {
        return reply.status(409).send({ message: 'E-mail ou CPF já cadastrado.' });
      }

      const senhaHash = await hash(dadosValidados.usuSenha, 8);
      const codigoVerificacao = customAlphabet('0123456789', 6)();
      const agora = new Date();
      const usuCodigoVerificacaoExpira = new Date(agora.getTime() + 60 * 60 * 1000); // 1 hora

      const [newUser] = await db.insert(usuario).values({
          ...dadosValidados,
          usuSenha: senhaHash,
          usuAtivo: true,
          usuCodigoVerificacao: codigoVerificacao,
          usuCodigoVerificacaoExpira: usuCodigoVerificacaoExpira,
      }).returning({
          usuID: usuario.usuID,
          usuLogin: usuario.usuLogin,
          usuNome: usuario.usuNome,
          usuTelefone: usuario.usuTelefone,
          usuDataNasc: usuario.usuDataNasc,
      });
      const token = await reply.jwtSign(
        {
          sub: newUser.usuID,
          role: 'cliente'
        }
      );

      const mail = await getMailClient();
      const message = await mail.sendMail({
          from: `Fixtrada <${env.email}>`,
          to: dadosValidados.usuLogin,
          subject: 'Código de Verificação de E-mail',
          text: `Seu código de verificação é: ${codigoVerificacao}`,
      });
      
      return reply.status(201).send({
        message: 'Cliente cadastrado com sucesso! Um código de verificação foi enviado para o seu e-mail.',
        token,
        user: {
            id: newUser.usuID,
            email: newUser.usuLogin,
            nome: newUser.usuNome,
            role: 'cliente',
            telefone: newUser.usuTelefone,
            dataNascimento: newUser.usuDataNasc,
        },
      });
  });
}